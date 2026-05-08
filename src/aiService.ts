export const executeAiWithFallback = async (
  apiKeys: string[],
  activeKeyIndex: number,
  setActiveKeyIndex: (index: number) => void,
  taskFn: (genAI: any) => Promise<any>
) => {
  if (!apiKeys || apiKeys.length === 0) {
    throw new Error("Không tìm thấy API Key nào. Vui lòng thêm API Key.");
  }

  let lastError: any = null;

  const createWebAPI = (apiKey: string) => {
    return {
      models: {
        generateContent: async ({ model, contents }: { model: string, contents: string }) => {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: contents
                }]
              }]
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP Error: ${response.status} - ${JSON.stringify(errorData)}`);
          }

          const data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
             return { text: data.candidates[0].content.parts[0].text };
          }
          throw new Error("Invalid response format from API");
        }
      }
    };
  };

  const tryWithKey = async (index: number) => {
    const webAI = createWebAPI(apiKeys[index]);
    const result = await taskFn(webAI);
    return result;
  };

  for (let i = activeKeyIndex; i < apiKeys.length; i++) {
    try {
      const result = await tryWithKey(i);
      if (i !== activeKeyIndex) {
        setActiveKeyIndex(i);
      }
      return result;
    } catch (err: any) {
      console.warn(`API Key at index ${i} failed:`, err);
      lastError = err;
    }
  }

  for (let i = 0; i < activeKeyIndex; i++) {
    try {
      const result = await tryWithKey(i);
      setActiveKeyIndex(i);
      return result;
    } catch (err: any) {
      console.warn(`API Key at index ${i} failed:`, err);
      lastError = err;
    }
  }

  throw new Error("Tất cả API keys đều bị lỗi. Vui lòng kiểm tra lại.\n\nChi tiết: " + (lastError?.message || "Unknown"));
};
