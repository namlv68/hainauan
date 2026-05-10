
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

  const tryWithKey = async (index: number) => {
    // We create a "fake" SDK object that compatibility-wise calls our server API
    const wrappedAI = {
      models: {
        generateContent: async ({ model, contents, config }: { model: string, contents: string, config?: any }) => {
          const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: apiKeys[index],
              model,
              contents,
              config
            })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`AI API failed: ${errData.error || response.statusText}`);
          }

          return await response.json();
        }
      }
    };
    return await taskFn(wrappedAI);
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
