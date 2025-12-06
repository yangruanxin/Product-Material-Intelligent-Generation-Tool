// 数据库里的单条消息结构 (对应 messages 表)
export interface Message {
  id: string;
  created_at: string;
  role: 'user' | 'assistant';
  content: string;        // 数据库里存的是字符串
  image_url: string | null; // 允许为空，且使用 snake_case
  video_url: string | null;
  audio_url: string | null;
  session_id: string;
  user_id: string;
}

// 数据库里的会话结构 (对应 sessions 表)
export interface Session {
  id: string;
  created_at: string;
  name: string | null;
  user_id: string;
}

// AI 生成的具体内容结构 (前端解析 Message.content 后的结果)
// 当 role === 'assistant' 时，content 字符串 JSON.parse 后应该是这个样子
export interface AIContent {
  title: string;            // 商品标题
  selling_points: string[]; // 卖点数组
  atmosphere: string;       // 氛围描述
}


// UI中显示的单条消息结构
export interface UIMessage{
  id?: string;
  text?: string;
  sender: "user" | "ai";
  imageUrl?: string;
  videoUrl?: string;
  loading?: boolean;

  isImageTask?: boolean;
  isVideoTask?: boolean;
}

// UI中的会话数据结构
export interface UISession {
  id: string;
  name: string;
}