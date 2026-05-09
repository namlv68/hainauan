import React, { useState, useEffect } from 'react';
import { Camera, Users, Sword, Zap, Copy, Check, Clock, Flame, ChevronUp, ChevronDown, MonitorPlay, Star, Search, Shirt, ShoppingBag, Key, Link, Settings, Download } from 'lucide-react';
import { executeAiWithFallback } from './aiService';

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem('actionAppState');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Lỗi parse saved state:", e);
  }
  return {};
};

const App = () => {
  const savedState = loadSavedState();
  const [numCharacters, setNumCharacters] = useState<number>(savedState.numCharacters ?? 1);
  const [outfitMode, setOutfitMode] = useState<string>(savedState.outfitMode ?? 'Cameo');
  const [settingMode, setSettingMode] = useState<string>(savedState.settingMode ?? 'Cameo');
  const charNamesList = ["NAM", "THƯ", "NGỌC"];
  const [theme, setTheme] = useState<string>(savedState.theme ?? 'Wuxia');
  const [customAction, setCustomAction] = useState<string>(savedState.customAction ?? '');
  const [duration, setDuration] = useState<number>(savedState.duration ?? 12);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<{ id: number, index: number, vi: string, en: string, zh: string }[] | null>(savedState.generatedPrompts ?? null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCommerceMode, setIsCommerceMode] = useState<boolean>(savedState.isCommerceMode ?? false);
  const [productName, setProductName] = useState<string>(savedState.productName ?? '');
  const [cameraStyle, setCameraStyle] = useState<string>(savedState.cameraStyle ?? 'Handheld');
  const [combatStyle, setCombatStyle] = useState<string>(savedState.combatStyle ?? 'HandToHand');
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);

  useEffect(() => {
    const stateObj = { numCharacters, outfitMode, settingMode, theme, customAction, duration, isCommerceMode, productName, cameraStyle, combatStyle, generatedPrompts };
    localStorage.setItem('actionAppState', JSON.stringify(stateObj));
  }, [numCharacters, outfitMode, settingMode, theme, customAction, duration, isCommerceMode, productName, cameraStyle, combatStyle, generatedPrompts]);

  const handleSyncTranslation = async (index: number, contentOverride?: string) => {
    if (!generatedPrompts || !apiKeys.length || translatingIdx !== null) return;
    const currentVi = contentOverride || generatedPrompts[index].vi;
    if (!currentVi.trim()) return;

    setTranslatingIdx(index);
    try {
      const responseText = await executeAiWithFallback(apiKeys, activeApiKeyIndex, setActiveApiKeyIndex, async (genAI) => {
        const promptText = `
Dịch kịch bản nấu ăn hài sau đây từ Tiếng Việt sang Tiếng Anh và Tiếng Trung.
Giữ nguyên các mốc thời gian (0-3s, 3-6s, ...) và các nhãn tiêu đề.
Nội dung phải hài hước, sinh động và giữ đúng tinh thần của bản gốc.
BẮT BUỘC giữ nguyên các tên riêng nhân vật: ${charNamesList.join(", ")}. Không được dịch hoặc thay đổi các tên này.
Không trả về bất kỳ lời giải thích nào, chỉ trả về JSON thô.

Nội dung Tiếng Việt:
${currentVi}

Cấu trúc JSON yêu cầu:
{
  "en": "...",
  "zh": "..."
}
`;
        const res = await genAI.models.generateContent({
           model: 'gemini-1.5-flash',
           contents: promptText
        });
        return res.text;
      });

      if (responseText) {
        let cleaned = responseText;
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) cleaned = match[0];
        const result = JSON.parse(cleaned);
        
        if (result.en && result.zh) {
          const updated = [...generatedPrompts];
          updated[index] = { ...updated[index], en: result.en, zh: result.zh };
          setGeneratedPrompts(updated);
        }
      }
    } catch (e) {
      console.error("Translation error:", e);
    } finally {
      setTranslatingIdx(null);
    }
  };

  const updatePromptText = (index: number, lang: 'vi' | 'en' | 'zh', newVal: string) => {
    if (!generatedPrompts) return;
    const updated = [...generatedPrompts];
    updated[index] = { ...updated[index], [lang]: newVal };
    setGeneratedPrompts(updated);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setGeneratedPrompts(null);
  };

  const AutoResizeTextarea = ({ value, onChange, onBlur, placeholder, className }: any) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    };

    useEffect(() => {
      adjustHeight();
    }, [value]);

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        rows={1}
      />
    );
  };

  // API Key State
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(true);
  const [tempApiKeysInput, setTempApiKeysInput] = useState<string>('');
  const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number>(0);

  useEffect(() => {
    const storedKeys = localStorage.getItem('geminiApiKeys');
    if (storedKeys) {
      try {
        const parsed = JSON.parse(storedKeys);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApiKeys(parsed);
          setTempApiKeysInput(parsed.join('\n'));
          setShowApiKeyModal(false);
        }
      } catch (e) {
        console.error("Lỗi parse API Keys:", e);
      }
    }
  }, []);

  const handleSaveApiKeys = () => {
    const keys = tempApiKeysInput.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length > 0) {
      setApiKeys(keys);
      localStorage.setItem('geminiApiKeys', JSON.stringify(keys));
      setShowApiKeyModal(false);
      setActiveApiKeyIndex(0);
    } else {
      alert("Vui lòng nhập ít nhất 1 API key.");
    }
  };

  const themes = [
    { 
      id: 'MasterChef', name: 'MasterChef Thảm Họa', icon: '👨‍🍳', desc: 'Cuộc thi nấu ăn đầy căng thẳng nhưng vô số sai sót lố bịch.',
      outfit: { vi: 'Đồng phục siêu đầu bếp vấy bẩn đủ loại nước sốt.', en: 'Master chef uniform stained with various sauces.', zh: '沾满各种酱汁的主厨制服。' },
      setting: { vi: 'Trường quay bếp MasterChef hoành tráng nhưng bốc khói mịt mù.', en: 'Grand MasterChef studio kitchen but filled with smoke.', zh: '盛大的厨艺大师工作室厨房，但烟雾缭绕。' }
    },
    { 
      id: 'StreetFood', name: 'Ẩm thực đường phố', icon: '🍜', desc: 'Quán vỉa hè xào chảo múa lửa cháy rực cực tấu hài.',
      outfit: { vi: 'Tạp dề hoa văn cũ kĩ, vắt khăn trên cổ rực rỡ dính đầy mỡ.', en: 'Old floral apron, colorful towel around the neck stained with grease.', zh: '旧花纹围裙，脖子上围着沾满油脂的彩色毛巾。' },
      setting: { vi: 'Quán nhậu vỉa hè đông đúc, chảo lửa bốc cao tận mặt người.', en: 'Crowded street food stall, wok flames reaching peoples faces.', zh: '拥挤的街头美食摊位，炒锅火焰几乎烧到人脸。' }
    },
    { 
      id: 'BakingDisaster', name: 'Thảm họa nướng bánh', icon: '🎂', desc: 'Làm bánh kem bị nổ tung, bột mì bay mù mịt dính đầy mặt.',
      outfit: { vi: 'Tạp dề hường dính đầy bột mì trắng xóa từ đầu đến chân.', en: 'Pink apron completely covered in white flour from head to toe.', zh: '粉色围裙从头到脚都沾满了白面粉。' },
      setting: { vi: 'Căn bếp phong cách châu Âu bừa bộn ngập trong bão bột mì và kem.', en: 'Messy European-style kitchen flooded with a storm of flour and cream.', zh: '凌乱的欧式厨房被面粉和奶油风暴淹没。' }
    },
    { 
      id: 'NinjaChef', name: 'Ninja xào rau', icon: '🥷', desc: 'Dùng phi tiêu thái hành, dao kiếm Nhật băm thịt chém gió.',
      outfit: { vi: 'Đồ ninja điêu luyện nhưng đeo tạp dề hình Hello Kitty hoặc Mèo Máy.', en: 'Skilled ninja outfit but wearing a Hello Kitty or Robot Cat apron.', zh: '精湛的忍者装备，却系着Hello Kitty或机器猫围裙。' },
      setting: { vi: 'Nhà bếp kiểu võ đường Nhật Bản, nguyên liệu bị chém bay ngang dọc.', en: 'Japanese dojo style kitchen, ingredients slashed and flying mid-air.', zh: '日本风格的武道场厨房，食材被劈砍在大半空中飞舞。' }
    },
    { 
      id: 'ZombieKitchen', name: 'Zombie làm bếp', icon: '🧟', desc: 'Zombie lóng ngóng nấu món canh tay người hay nhãn cầu mắt.',
      outfit: { vi: 'Quần áo phục vụ nhà hàng cao cấp rách bươm, dính đầy siro màu đỏ nhớt.', en: 'Tattered high-end restaurant server uniform, crawling with red syrup slime.', zh: '破烂的高级餐厅服务员制服，爬满了红色的糖浆黏液。' },
      setting: { vi: 'Nhà bếp hoang tàn u ám mạng nhện nhưng trang trí bàn ăn nến lấp lánh.', en: 'Gloomy cobweb-filled ruined kitchen with strangely sparkling candlelit tables.', zh: '阴沉的满是蜘蛛网的废墟厨房，却有着奇怪闪烁的烛光餐桌。' }
    },
    { 
      id: 'CampingFire', name: 'Nấu ăn sinh tồn rừng', icon: '🏕️', desc: 'Cố đun nước sôi giữa rừng sâu nhưng gây cháy nguyên cái lều.',
      outfit: { vi: 'Đồ dã ngoại phượt thủ rằn ri nón bèo phủ đầy nhọ nồi đen thui.', en: 'Camouflage jungle backpacker gear and boonie hat covered in black soot.', zh: '沾满黑烟灰的迷彩丛林背包客装备和宽檐丛林帽。' },
      setting: { vi: 'Khu cắm trại ban đêm bên bờ suối, bếp củi lửa đang bùng bốc cháy xém cái võng.', en: 'Nighttime stream campsite, campfire viciously burning up a hammock nearby.', zh: '小溪边的夜间营地，篝火猛烈地燃烧着附近的吊床。' }
    },
    { 
      id: 'SciFiKitchen', name: 'Bếp không gian tương lai', icon: '🤖', desc: 'Robot phụ bếp nổi điên, dùng súng laser nấu nướng lấn cấn.',
      outfit: { vi: 'Đồ bảo hộ phi hành gia không gian bạc bóng loáng dính dầu nhớt cơ khí.', en: 'Shiny silver space astronaut suit smeared with dark mechanical oil.', zh: '闪亮的银色太空宇航服沾满了深色机械机油。' },
      setting: { vi: 'Trạm vũ trụ với chảo bay lơ lửng vô trọng lực, tia laser bắn chiên thịt đỏ rực.', en: 'Space station with zero-gravity floating woks, red laser beams violently frying meat.', zh: '带有零重力漂浮炒锅的太空站，红色激光束在猛烈油炸肉块。' }
    },
    { 
      id: 'GordonCritique', name: 'Áp lực siêu đầu bếp', icon: '🤬', desc: 'La hét chửi bới khách mời vì luộc trứng cũng không xong.',
      outfit: { vi: 'Áo chef trắng cao cấp phẳng phiu nhưng xộc xệch cà vạt vì tức giận.', en: 'Premium pristine white chef jacket but with a loosened tie due to immense anger.', zh: '高级洁白的厨师服，但因为极度愤怒而领带松垮。' },
      setting: { vi: 'Nhà hàng 5 sao thượng hạng vỡ dĩa ly lả tả do thức ăn bị ném dữ dội vào tường.', en: 'Supreme 5-star restaurant with shattered plates due to aggressive food tossing at the wall.', zh: '顶级五星级餐厅里盘子碎裂，因为食物被猛烈地扔向墙面。' }
    },
    { 
      id: 'WuxiaCooking', name: 'Túy quyền tửu điếm', icon: '🍶', desc: 'Chưởng lực nấu mì, uống rượu múa chảo như cao thủ phái Võ Đang.',
      outfit: { vi: 'Tà áo cổ trang thùng thình mỏng manh luộm thuộm lấm tấm nước tương.', en: 'Baggy and messy ancient light gown speckled with soy sauce splashes.', zh: '松垮凌乱的古代轻薄长袍，沾满点点酱油渍。' },
      setting: { vi: 'Gian bếp bằng gỗ quán trọ thời kỳ võ hiệp cổ đại bốc khói ngùn ngụt ngả nghiêng.', en: 'Wooden kitchen of an ancient wuxia inn heavily smoking and tilting apart.', zh: '古代武侠客栈的木制厨房，烟雾弥漫，摇摇欲坠。' }
    },
    { 
      id: 'GiantFood', name: 'Đồ ăn khổng lồ', icon: '🍔', desc: 'Vật lộn đu bám miếng thịt bò to như chiếc ô tô để nướng.',
      outfit: { vi: 'Quần áo công nhân khoác thêm găng tay làm lố vì nguyên liệu bự.', en: 'Construction worker clothing with comedic oversized heat-resistant gloves.', zh: '带有滑稽的超大耐热手套的建筑工人服装。' },
      setting: { vi: 'Căn bếp phong cách Alice ở Xứ Thần Tiên với quả cà chua khổng lồ cỡ cái tủ.', en: 'Alice in Wonderland style setup with a giant tomato the size of a cabinet.', zh: '爱丽丝梦游仙境风格的场景，有着柜子那么大的巨型西红柿。' }
    },
    { 
      id: 'RomanticDate', name: 'Hẹn hò thảm họa', icon: '🕯️', desc: 'Nấu ăn để cưa cẩm ấn tượng nhưng cháy đen khét lẹt cả bữa tiệc.',
      outfit: { vi: 'Suit tuxedo hoặc váy dạ tiệc lấp lánh nhưng bị cháy xém lủng một lỗ kỳ cục.', en: 'Glittery tuxedo or evening gown but with an awkwardly burned out giant hole.', zh: '闪闪发光的燕尾服或晚礼服，但滑稽地烧出了一个大洞。' },
      setting: { vi: 'Bàn tiệc tình yêu nến trải hoa hồng xinh đẹp giờ ngập ngụa bọt chữa cháy.', en: 'Romantic rose candlelit dining table now overwhelmed with fire extinguisher foam.', zh: '原本铺满玫瑰蜡烛的浪漫餐桌现在却被灭火器的泡沫淹没。' }
    },
    { 
      id: 'MagicPot', name: 'Nồi hầm phép thuật', icon: '🧙‍♀️', desc: 'Phù thuỷ nấu lẩu gây ra các vụ nổ hóa học sủi bọt nực cười.',
      outfit: { vi: 'Áo choàng đen pháp sư rộng thùng thình dính sình lầy với nón chóp cao bị gập.', en: 'Baggy black wizard cloak stained with sludge and a bent tall pointy hat.', zh: '宽松的黑色巫师斗篷上沾满污泥，搭配折弯的尖顶高帽。' },
      setting: { vi: 'Hầm tối phù thủy với vạc dầu khổng lồ đang sủi bọt bong bóng tím vàng điên rồ.', en: 'Dark wizard dungeon with a giant cauldron bubbling crazy purple-yellow fumes.', zh: '黑暗的巫师地牢，巨大的坩埚冒出疯狂冒泡的紫黄色烟雾。' }
    },
    { 
      id: 'CoupleCooking', name: 'Vợ chồng nấu ăn', icon: '💑', desc: 'Vợ chồng hạnh phúc nấu ăn nhưng gây ra loạt tai nạn hài hước.',
      outfit: { vi: 'Đồ đôi tạp dề cute nhưng dơ bẩn lem luốc đồ ăn.', en: 'Cute matching couple aprons but heavily stained with food.', zh: '可爱的情侣围裙，但沾满食物污渍。' },
      setting: { vi: 'Nhà bếp căn hộ nhỏ ấm cúng nhưng bị bày bừa lộn xộn.', en: 'Cozy small apartment kitchen but completely messed up.', zh: '舒适的小公寓厨房但完全弄乱了。' }
    },
    { 
      id: 'Custom', name: 'Kịch bản tùy chọn', icon: '✍️', desc: 'Ngữ cảnh hài nấu ăn tùy chọn.',
      outfit: { vi: 'Trang phục đầu bếp đặc chế lố bịch phù hợp với hoàn cảnh tùy chọn.', en: 'Specially tailored comedic chef outfit fitted to the custom scenario.', zh: '根据自定义场景特别量身定制的滑稽主厨制服。' },
      setting: { vi: 'Bối cảnh nhà bếp tấu hài siêu thực sống động dựa theo nội dung tùy chỉnh.', en: 'Highly surreal comedic kitchen setup based on the custom content.', zh: '根据自定义内容精心打造的极具超现实喜剧效的厨房场景。' }
    }
  ];

  const cameraStyles = [
    { id: 'Medium', name: 'Bắt Trọn Biểu Cảm', icon: '🎥', descriptions: { vi: 'Máy quay cận trung, lấy rõ hành động quăng ném thức ăn và biểu cảm hoảng hốt.', en: 'Medium shot, capturing clearly the food tossing actions and terrified facial expressions.', zh: '中景，清晰捕捉抛掷食物的动作和惊恐的面部表情。' } },
    { id: 'Handheld', name: 'Hỗn Loạn Rung Lắc', icon: '📳', descriptions: { vi: 'Máy quay cầm tay rung lắc mạnh, chạy theo sự cuống cuồng cứu vãn món ăn.', en: 'Aggressively shaky handheld camera, tracking the frantic attempt to save the dish.', zh: '剧烈摇晃的手持镜头，跟踪着疯狂抢救菜肴的尝试。' } },
    { id: 'SlowMo', name: 'Slow Motion Tấu Hài', icon: '⏳', descriptions: { vi: 'Quay chậm (SlowMo) chi tiết hạt đường bay, nước luộc văng hay cú trượt ngã.', en: 'Slow motion focusing on flying sugar, splashing boiling water, or hilarious faceplants.', zh: '慢动作特写，专注于飞舞的糖、飞溅的沸水，或是搞笑的脸着地摔倒。' } },
    { id: 'FoodPorn', name: 'Close-Up Cà Khịa', icon: '🥩', descriptions: { vi: 'Góc siêu cận sắc nét tinh tế (như food vlog) nhưng trớ trêu thay thức ăn lại đen thui.', en: 'Extreme delicate macro close-up (like a food vlog) but ironically highlighting burnt food.', zh: '极其细腻的微距特写（如美食短视频），但讽刺地突出了烧焦的食物。' } },
    { id: 'Drone', name: 'Toàn Cảnh Chiến Trường', icon: '🚁', descriptions: { vi: 'Lia máy góc rộng từ trên cao, khoe toàn bộ bề bộn tàn phá kinh hoàng của gian bếp.', en: 'Wide high-angle tracking shot, showing the absolute horrific mess of the kitchen.', zh: '宽广的高角度跟踪镜头，展示厨房里令人震惊的脏乱差。' } },
  ];

  const combatStyles = [
    { id: 'Clumsy', name: 'Vụng Về (Mr. Bean)', icon: '🤪', descriptions: { vi: 'Lóng ngóng hậu đậu, trượt vỏ chuối đập đầu, tạo hiệu ứng domino kéo đổ kệ chén.', en: 'Clumsy fumbling, slipping on peels hitting head, creating disastrous plate-rack dominoes.', zh: '笨手笨脚，踩到果皮滑倒撞头，导致多米诺骨牌般弄倒餐具架。' } },
    { id: 'KungFu', name: 'Kungfu Múa Chảo', icon: '🍳', descriptions: { vi: 'Mài dao tia lửa bay, múa chão uyển chuyển trượt tay văng nguyên nồi canh đi xa.', en: 'Spark-flying knife sharpening, graceful wok tossing ending with accidently launching soup away.', zh: '磨刀火花四溅，优美的颠勺最后却不小心把汤锅扔飞。' } },
    { id: 'Rage', name: 'Cục Súc Biểu Cảm', icon: '🤬', descriptions: { vi: 'Đập bàn nhào bột bạo lực quạu quọ, thớt văng nát bấy nát vụn với biểu cảm lố.', en: 'Violently smashing dough angrily, destroying cutting boards with exaggerated raging faces.', zh: '生闷气地猛烈砸面团，用夸张的愤怒表情砸烂案板。' } },
    { id: 'Magic', name: 'Ảo thuật Ảo Ma', icon: '✨', descriptions: { vi: 'Rắc muối từ trên cao (Salt Bae) trúng mắt nhau, thái đồ ăn nhắm mắt làm mù mịt.', en: 'High Salt Bae blind sprinkling hitting eyes, chopping blindfolded resulting in chaotic messes.', zh: '盲目高空撒盐（撒盐哥风格）击中眼睛，蒙眼切菜造成混乱的烂摊子。' } },
    { id: 'Overconfident', name: 'Ra Dẻ Ảo Tưởng', icon: '😎', descriptions: { vi: 'Nhếch mép cực tự tin khoe kĩ năng flambé xịt lửa, để rồi lửa táp cháy trụi lông mày.', en: 'Highly overconfident flamboyant flambé skills, ending with fire burning off their eyebrows.', zh: '超级自信炫耀火焰烹饪，结果火苗烧光了他们的眉毛。' } },
    { id: 'CoupleTagTeam', name: 'Phối hợp Vợ Chồng', icon: '💞', descriptions: { vi: 'Chồng tung chảo vợ múa dao nhưng toàn trượt tay đập gáo vào nhau.', en: 'Husband tossing wok, wife tossing knives but constantly hitting each other.', zh: '丈夫抛炒锅，妻子挥舞刀子，却常常互相击打。' } },
    { id: 'RomanticMishap', name: 'Lãng Mạn Bất Ổn', icon: '😘', descriptions: { vi: 'Chồng ôm eo vợ từ phía sau định lãng mạn nhưng gạt tay đổ lọ tiêu hắt xì văng cả nồi canh.', en: 'Husband hugging wife romantically from behind but knocks over pepper causing epic sneezing.', zh: '丈夫从背后浪漫地拥抱妻子，却打翻了胡椒粉导致戏剧性打喷嚏。' } }
  ];

  const handleDurationChange = (type: 'plus' | 'minus') => {
    if (type === 'plus') setDuration(prev => prev + 12);
    else setDuration(prev => Math.max(12, prev - 12));
  };

  const generatePrompts = async () => {
    if (apiKeys.length === 0) {
      alert("Vui lòng nhập API Key để sử dụng các tính năng AI của hệ thống.");
      setShowApiKeyModal(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedPrompts(null);
    const sessionSeed = Math.floor(Math.random() * 1000000);

    const themeObj = themes.find(t => t.id === theme) || themes[0];
    const numPrompts = Math.floor(duration / 12);
    let aiResult: any = null;

    try {
      const responseStr = await executeAiWithFallback(apiKeys, activeApiKeyIndex, setActiveApiKeyIndex, async (genAI) => {
        const promptText = `
Tạo một kịch bản phim hài nấu ăn hoàn toàn độc đáo, ngẫu nhiên và không lặp lại.
Chủ đề: ${themeObj.name} (${theme === 'Custom' && customAction ? customAction : themeObj.desc})
Phong cách nấu ăn (tấu hài): ${combatStyles.find(c => c.id === combatStyle)?.name}
Góc máy: ${cameraStyles.find(c => c.id === cameraStyle)?.name}
Số lượng đoạn (parts): ${numPrompts} (mỗi đoạn 12s)

Yêu cầu:
1. Bối cảnh (Setting): ${settingMode === 'Cameo' ? 'Giữ nguyên bối cảnh cameo gốc, trả về kết quả RẤT NGẮN GỌN (1 câu)' : 'Sáng tạo một bối cảnh bếp núc hoảng loạn mới lạ, RẤT NGẮN GỌN (1-2 câu ngắn)'}
2. Trang phục (Outfit): ${outfitMode === 'Cameo' ? 'Giữ nguyên trang phục cameo gốc, trả về RẤT NGẮN GỌN (vài từ)' : 'Sáng tạo một trang phục đầu bếp kỳ quặc mới, RẤT NGẮN GỌN (1 câu)'}
3. Hành động (Action): Mô tả chung NGẮN GỌN (1 câu) về diễn biến của toàn bộ thảm họa nấu ăn hài hước, sử dụng tên các nhân vật (${charNamesList.slice(0, numCharacters).join(", ")}).
4. Timelines: CHI TIẾT TỪNG HÀNH ĐỘNG. Mảng chứa đúng ${numPrompts} phần tử, mỗi phần tử là diễn biến chi tiết cho đoạn 12s đó, chia theo các mốc 0-3s, 3-6s, 6-9s, 9-12s. Không lặp lại nội dung giữa các đoạn, phải liên kết thành chuỗi hành động trọn vẹn hài hước, đoạn sau nối tiếp đoạn trước. Tiền tố dòng đầu luôn là "Timeline Chi Tiết:". BẮT BUỘC SỬ DỤNG TÊN CỦA CÁC NHÂN VẬT NÀY (${charNamesList.slice(0, numCharacters).join(", ")}) TRONG NỘI DUNG TIMELINES ĐỂ MÔ TẢ HÀNH ĐỘNG CHÍNH MÀ HỌ GÂY RA.

Trả về kết quả dưới dạng JSON hợp lệ (RAW JSON, không bọc trong markdown \`\`\`json):
{
  "setting": { "vi": "...", "en": "...", "zh": "..." },
  "outfit": { "vi": "...", "en": "...", "zh": "..." },
  "action": { "vi": "...", "en": "...", "zh": "..." },
  "timelines": [
    {
       "vi": "Timeline Chi Tiết:\\n0-3s:...\\n3-6s:...\\n6-9s:...\\n9-12s:...",
       "en": "Detailed Timeline:\\n0-3s:...\\n3-6s:...\\n6-9s:...\\n9-12s:...",
       "zh": "详细时间轴:\\n0-3s:...\\n3-6s:...\\n6-9s:...\\n9-12s:..."
    }
  ]
}
`;
        const response = await genAI.models.generateContent({
           model: 'gemini-1.5-flash',
           contents: promptText,
           config: {
             temperature: 0.9
           }
        });
        return response.text;
      });

      if (responseStr) {
         let cleanedStr = responseStr;
         const match = responseStr.match(/\{[\s\S]*\}/);
         if (match) {
            cleanedStr = match[0];
         }
         aiResult = JSON.parse(cleanedStr);
      }
    } catch (e: any) {
       console.warn("AI Generation failed:", e);
       alert("Lỗi khi kết nối AI để tạo kịch bản mới: " + e.message + "\\nVui lòng thử lại.");
       setIsGenerating(false);
       return;
    }

    if (!aiResult || !aiResult.timelines || aiResult.timelines.length < numPrompts) {
      alert("AI không trả về đủ dữ liệu kịch bản. Vui lòng thử lại.");
      setIsGenerating(false);
      return;
    }

    const promptList: any[] = [];

    for (let i = 0; i < numPrompts; i++) {
        const createPromptForLang = (langKey: "vi" | "en" | "zh") => {
          const actionText = aiResult.action[langKey];
          let settingVal = aiResult.setting[langKey];
          if (settingMode === 'Cameo') {
            settingVal = {
              vi: "Bối cảnh Cameo gốc",
              en: "Original Cameo setting",
              zh: "原始 Cameo 背景"
            }[langKey] || "Cameo setting";
          }

          const timelineContent = aiResult.timelines[i]?.[langKey] || "";

          const labels = {
            vi: ["Bối cảnh", "Thể loại", "Phong cách", "Nhân sự", "Trang phục", "Góc quay", "Ánh sáng", "Hành động / Nấu ăn", "Lưu ý", "Quảng cáo Sản phẩm"],
            en: ["Setting", "Genre", "Style", "Kitchen Staff", "Outfit", "Camera Angle", "Lighting", "Action / Cooking Style", "Note", "Product Placement"],
            zh: ["背景", "类型", "风格", "厨房员工", "服装", "相机角度", "灯光", "动作 / 烹饪风格", "注意", "产品放置"]
          }[langKey];

          const styleVal = {
            vi: "Cinematic 4K, siêu chân thực, sắc nét đến từng chi tiết băng hạt bột mì bay trôi nổi.",
            en: "Cinematic 4K, hyper-realistic, sharp details showing flying flour particles.",
            zh: "电影级 4K，超逼真，清晰的细节显示飞扬的面粉颗粒。"
          }[langKey];

          const roleLabels = {
            vi: ["Bếp trưởng (Main Chef)", "Phụ bếp phá hoại (Clumsy Assistant)", "Người nếm thử thảm họa (Unlucky Taster)"],
            en: ["Main Chef", "Clumsy Assistant", "Unlucky Taster"],
            zh: ["主厨", "笨拙的助手", "倒霉的试吃员"]
          }[langKey] || [];

          const charNamesToUse = charNamesList.slice(0, numCharacters);
          const charStr = charNamesToUse.map((name, index) => `${name} (${roleLabels[index]})`).join(" and ");

          let outfitDesc = aiResult.outfit[langKey];
          let outfitStr = charNamesToUse.map(name => `${name}: ${outfitDesc}`).join(", ");
          if (outfitMode === 'Cameo') {
            outfitStr = charNamesToUse.map(name => `${name}: ${
              {
                vi: "Trang phục Cameo gốc",
                en: "Original Cameo outfit",
                zh: "原始 Cameo 服装"
              }[langKey] || "Cameo outfit"
            }`).join(", ");
          }

          const selectedCameraObj = cameraStyles.find(c => c.id === cameraStyle);
          const cameraVal = selectedCameraObj?.descriptions[langKey];

          const selectedCombatObj = combatStyles.find(c => c.id === combatStyle);
          const combatVal = selectedCombatObj?.descriptions[langKey];

          const lightVal = {
            vi: "Ánh sáng tương phản cao (High-contrast), bóng đổ sắc nét tạo chiều sâu điện ảnh.",
            en: "High-contrast lighting, sharp shadows creating cinematic depth.",
            zh: "高对比度照明，锐利的阴影产生电影深度。"
          }[langKey];

          const noTextNote = {
            vi: "KHÔNG chèn thêm bất kỳ văn bản, chữ, logo lạ nào vào hình ảnh.",
            en: "DO NOT add any text, typography, or random logos onto the image.",
            zh: "请勿在图片中添加任何文字、排版或随机徽标。"
          }[langKey];

          let finalPrompt = `${labels[0]}: ${settingVal}\n${labels[1]}: ${actionText}\n${labels[2]}: ${styleVal}\n${labels[3]}: ${charStr}\n${labels[4]}: ${outfitStr}\n${labels[5]}: ${cameraVal}\n${labels[6]}: ${lightVal}\n${labels[7]}: ${combatVal}`;

          if (isCommerceMode && productName) {
            const productDesc = {
              vi: `Sản phẩm "${productName}" được tích hợp tự nhiên vào bối cảnh nấu ăn hối hả (có thể bị văng, cầm trên tay, ngã đè lên), giữ ĐÚNG kiểu mẫu và màu sắc gốc tuyệt đối.`,
              en: `Product "${productName}" naturally integrated into the frantic cooking scene (held, thrown, or dropped), keeping the EXACT original styling and colors perfectly.`,
              zh: `产品 "${productName}" 自然地融入疯狂的烹饪场景，保持完全一致的原始原始颜色。`
            }[langKey];
            finalPrompt += `\n${labels[9]}: ${productDesc}`;
          }

          finalPrompt += `\n\n${timelineContent}\n\n${labels[8]}: ${noTextNote}`;

          return finalPrompt;
        };

        promptList.push({
          id: sessionSeed + i,
          index: i + 1,
          vi: createPromptForLang('vi'),
          en: createPromptForLang('en'),
          zh: createPromptForLang('zh')
        });
      }

      setGeneratedPrompts(promptList);
      setIsGenerating(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadAllPrompts = () => {
    if (!generatedPrompts) return;
    
    let content = "=== KỊCH BẢN NẤU ĂN HÀI ===\n\n";
    generatedPrompts.forEach((prompt) => {
      content += `PART ${prompt.index}\n`;
      content += `-------------------\n`;
      content += `[TIẾNG VIỆT]\n${prompt.vi}\n\n`;
      content += `[ENGLISH]\n${prompt.en}\n\n`;
      content += `[CHINESE]\n${prompt.zh}\n\n`;
      content += `===================\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kich-ban-nau-an-${new Date().getTime()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 font-sans flex flex-col items-center">
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-4 text-orange-500">
              <Key size={24} />
              <h2 className="text-xl font-black uppercase">Cấu hình API Key (AI)</h2>
            </div>
            <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
              Vui lòng nhập danh sách API Key của Google Gemini để sử dụng tính năng tạo và dịch tự động. 
            </p>
            <textarea
              value={tempApiKeysInput}
              onChange={(e) => setTempApiKeysInput(e.target.value)}
              placeholder={`AIzaSy...\nAIzaSy...`}
              className="w-full h-32 bg-black border border-neutral-800 rounded-xl p-4 text-xs font-mono text-neutral-300 mb-4 focus:outline-none focus:border-orange-600 transition-colors"
            ></textarea>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveApiKeys}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold text-white hover:opacity-90 active:scale-95 transition-all"
              >
                Lưu Danh Sách API Key
              </button>
              {apiKeys.length > 0 && (
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="w-full py-2 bg-neutral-800 rounded-xl font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-end max-w-2xl">
        <button 
          onClick={() => setShowApiKeyModal(true)}
          className="text-xs font-bold text-neutral-500 hover:text-orange-400 flex items-center gap-1 transition-colors"
        >
          <Key size={12} /> Cấu hình API ({apiKeys.length} keys)
        </button>
      </div>

      <div className="w-full max-w-2xl mb-8 mt-4 text-center">
        <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-orange-600 via-red-500 to-yellow-500 bg-clip-text text-transparent flex items-center justify-center gap-2 uppercase">
          <Flame className="text-red-500" /> Cooking Comedy Pro
        </h1>
        <p className="text-neutral-400 mt-2 text-sm font-medium italic">"Đạo diễn siêu đầu bếp thảm họa & tấu hài bằng AI"</p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* Core Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-orange-400 text-[10px] font-black uppercase">
              <Users size={12} /> Nhân sự bếp
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map(num => (
                <button key={num} onClick={() => setNumCharacters(num)} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${numCharacters === num ? 'bg-orange-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-500'}`}>
                  {num} Người
                </button>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-purple-400 text-[10px] font-black uppercase">
              <Shirt size={12} /> Trang phục bếp
            </div>
            <div className="flex gap-1">
              <button onClick={() => setOutfitMode('Cameo')} className={`flex-1 py-1 px-1 rounded-lg font-bold text-[10px] transition-all ${outfitMode === 'Cameo' ? 'bg-purple-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-500'}`}>Cameo</button>
              <button onClick={() => setOutfitMode('AI')} className={`flex-1 py-1 px-1 rounded-lg font-bold text-[10px] transition-all ${outfitMode === 'AI' ? 'bg-purple-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-500'}`}>AI Theme</button>
            </div>
          </div>

          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-emerald-400 text-[10px] font-black uppercase">
              <MonitorPlay size={12} /> Không Gian Bếp
            </div>
            <div className="flex gap-1">
              <button onClick={() => setSettingMode('Cameo')} className={`flex-1 py-1 px-1 rounded-lg font-bold text-[10px] transition-all ${settingMode === 'Cameo' ? 'bg-emerald-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-500'}`}>Cameo</button>
              <button onClick={() => setSettingMode('Theme')} className={`flex-1 py-1 px-1 rounded-lg font-bold text-[10px] transition-all ${settingMode === 'Theme' ? 'bg-emerald-600 text-white shadow-md' : 'bg-neutral-800 text-neutral-500'}`}>Tùy chọn</button>
            </div>
          </div>
        </div>

        {/* Extended Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-red-500 text-[10px] font-black uppercase">
              <Star size={12} /> Chủ Đề Nấu Ăn
            </div>
            <select value={theme} onChange={(e) => handleThemeChange(e.target.value)} className="w-full bg-neutral-800 text-white p-2 rounded-lg border-none text-xs font-bold h-[34px] focus:ring-0 mb-3 outline-none">
              {themes.map(t => (
                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
              ))}
            </select>
            {theme === 'Custom' && (
              <div className="animate-in fade-in zoom-in duration-300">
                <input
                  type="text"
                  placeholder="Mô tả bối cảnh nấu ăn (VD: Nấu lẩu ngoài đường rầy xê lửa)"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-red-600 transition-all text-xs font-medium outline-none"
                />
              </div>
            )}
          </div>

          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-yellow-400 text-[10px] font-black uppercase">
              <Flame size={12} /> Phong Cách Nấu
            </div>
            <select value={combatStyle} onChange={(e) => setCombatStyle(e.target.value)} className="w-full bg-neutral-800 text-white p-2 rounded-lg border-none text-xs font-bold h-[34px] focus:ring-0 outline-none mb-3">
              {combatStyles.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 mt-4 mb-2 text-cyan-400 text-[10px] font-black uppercase">
              <Camera size={12} /> Kỹ thuật quay/Góc máy
            </div>
            <select value={cameraStyle} onChange={(e) => setCameraStyle(e.target.value)} className="w-full bg-neutral-800 text-white p-2 rounded-lg border-none text-xs font-bold h-[34px] focus:ring-0 outline-none">
              {cameraStyles.map(es => (
                <option key={es.id} value={es.id}>{es.icon} {es.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer controls */}
        <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-lg col-span-1 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center justify-between gap-4 flex-1">
             <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase font-mono">
                <Clock size={12} /> Độ dài kịch bản (12s/part)
             </div>
             <div className="flex items-center justify-between bg-neutral-800 rounded-lg p-1 min-w-[100px]">
                <button onClick={() => handleDurationChange('minus')} className="p-2 hover:text-white transition-colors" disabled={duration <= 12}><ChevronDown size={14}/></button>
                <span className="font-black text-sm">{duration}s</span>
                <button onClick={() => handleDurationChange('plus')} className="p-2 hover:text-white transition-colors"><ChevronUp size={14}/></button>
             </div>
           </div>
           <div className="w-[1px] h-8 bg-neutral-800 hidden md:block"></div>
           <div className="flex items-center justify-between gap-4 flex-1">
             <div className="flex items-center gap-2 text-pink-400 text-[10px] font-black uppercase font-mono">
               <ShoppingBag size={12} /> Quảng Cáo Tài Trợ (Tham Chiếu)
             </div>
             <button
               onClick={() => setIsCommerceMode(!isCommerceMode)}
               className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                 isCommerceMode ? 'bg-pink-600' : 'bg-neutral-700'
               }`}
             >
               <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isCommerceMode ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
           </div>
        </div>

        {isCommerceMode && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-4 bg-neutral-900/50 p-4 rounded-2xl border border-pink-900/50 shadow-lg">
            <input
              type="text"
              placeholder="Nhập vật phẩm thương hiệu mong muốn xuất hiện (VD: Lon Bò Húc, Chai nước mắm, Tương ớt...)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-pink-500 transition-all text-sm outline-none"
            />
            <p className="text-[10px] text-pink-500/70 mt-2 italic font-medium">
              * Khuyến cáo: AI sẽ gắn mã nhúng buộc xuất hiện vật phẩm này trong video.
            </p>
          </div>
        )}

        <button
          onClick={generatePrompts}
          disabled={isGenerating || (theme === 'Custom' && !customAction)}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-2xl font-black text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 mt-4"
        >
          {isGenerating ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : <><Zap size={22} fill="currentColor" /> XUẤT KỊCH BẢN NẤU ĂN HÀI</>}
        </button>

        {generatedPrompts && (
          <div className="space-y-10 mt-8 pb-20">
            <div className="flex justify-center">
               <button 
                 onClick={downloadAllPrompts}
                 className="flex items-center gap-2 px-6 py-3 bg-neutral-800 border border-neutral-700 rounded-xl font-bold text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 transition-all active:scale-95 shadow-lg"
               >
                 <Download size={18} /> TẢI XUỐNG TẤT CẢ KỊCH BẢN (.TXT)
               </button>
            </div>

            {generatedPrompts.map((prompt, pIdx) => (
              <div key={prompt.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black text-neutral-400">
                      {pIdx % 3 === 0 ? 'PART 1: MỞ ĐẦU, SƠ CHẾ & SỰ CỐ BẤT NGỜ' : pIdx % 3 === 1 ? 'PART 2: TẤU HÀI ÁC LIỆT ĐỈNH ĐIỂM BẾP NÚC' : 'PART 3: CÚ CHỐT & MÓN ĂN THẢM HỌA'}
                   </div>
                   <div className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded">
                     Video Part {prompt.index}
                   </div>
                </div>

                <div className="space-y-4">
                  {[
                    { lang: 'vi', label: 'TIẾNG VIỆT', content: prompt.vi, color: 'border-blue-500/20' },
                    { lang: 'en', label: 'ENGLISH', content: prompt.en, color: 'border-emerald-500/20' },
                    { lang: 'zh', label: 'CHINESE', content: prompt.zh, color: 'border-amber-500/20' }
                  ].map((item) => {
                    const uniqueKey = `${prompt.id}-${item.lang}`;
                    return (
                      <div key={item.lang} className={`bg-neutral-900/60 rounded-2xl border ${item.color} overflow-hidden transition-all duration-300 ${translatingIdx === pIdx && item.lang !== 'vi' ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="bg-neutral-800/40 px-4 py-2 flex justify-between items-center border-b border-neutral-800/50">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black tracking-tighter text-neutral-400">{item.label}</span>
                            {translatingIdx === pIdx && item.lang !== 'vi' && (
                              <div className="flex gap-1">
                                <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-1 h-1 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => copyToClipboard(item.content, uniqueKey)}
                            className={`flex items-center gap-1 text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                                copiedKey === uniqueKey ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                            }`}
                          >
                            {copiedKey === uniqueKey ? <Check size={12} /> : <Copy size={12} />} {copiedKey === uniqueKey ? 'COPIED' : 'COPY PROMPT'}
                          </button>
                        </div>
                        <div className="p-4">
                          <AutoResizeTextarea 
                            className="w-full bg-transparent text-[11.5px] md:text-xs leading-[1.6] text-neutral-300/90 whitespace-pre-wrap font-sans border-none focus:ring-0 outline-none resize-none overflow-hidden"
                            value={item.content}
                            onChange={(e: any) => updatePromptText(pIdx, item.lang as 'vi' | 'en' | 'zh', e.target.value)}
                            onBlur={(e: any) => item.lang === 'vi' && handleSyncTranslation(pIdx, e.target.value)}
                            placeholder={item.lang === 'vi' ? "Nhập kịch bản Tiếng Việt..." : `Bản dịch ${item.label} sẽ hiển thị tại đây...`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="h-16 w-full shrink-0"></div>
      
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full text-center py-4 bg-neutral-950/90 backdrop-blur-sm border-t border-neutral-800/80 z-50">
        <p className="text-neutral-500 text-xs font-medium">
          Hỗ trợ liên hệ Nam: <a href="tel:0981028794" className="text-orange-500 hover:text-orange-400 opacity-90 transition-opacity">0981028794</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
