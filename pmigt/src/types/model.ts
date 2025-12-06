// src/types/model.ts

/**
 * 所有的模型 ID 类型
 */
export type ModelId = 
    // Agent / LLM
    'deepseek-v3.2' | 'deepseek-r1' | 'doubao-seed-vision' | 'doubao-seed-thinking' |
    // Image / Seedream
    'doubao-seedream4.5' | 'doubao-seedream4' |
    // Video / Seedance
    'doubao-seedance-pro' | 'doubao-seedance-pro-fast';

/**
 * 通用模型数据结构
 */
export interface AppModel {
    id: ModelId;
    name: string;
    endpoint: string | undefined; // 必须通过环境变量获取
    group: 'agent' | 'image' | 'video';
    description: string;
}

/**
 * 所有模式下可用的模型列表，通过 process.env 引用环境变量。
 * ⚠️ 确保在你的 .env.local 文件中定义了这些变量！
 */
export const ALL_MODELS: AppModel[] = [
    // --- Agent 模式 (文本/多模态) ---
    { 
        id: 'deepseek-v3.2', 
        name: 'DeepSeek V3.2 (推荐)', 
        endpoint: process.env.NEXT_PUBLIC_DEEPSEEK_V3_2_ENDPOINT_ID, 
        group: 'agent',
        description: '通用高性能 LLM，适用于复杂逻辑和文案。'
    },
    { 
        id: 'doubao-seed-vision', 
        name: 'Doubao Seed Vision', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEED_1_6_VISION_ENDPOINT_ID, 
        group: 'agent',
        description: '豆包视觉模型，擅长结合图片分析和创作。'
    },
    { 
        id: 'doubao-seed-thinking', 
        name: 'Doubao Seed Thinking', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEED_1_6_THINKING_ENDPOINT_ID, 
        group: 'agent',
        description: '豆包思维模型，适合逻辑推理和结构化输出。'
    },
    { 
        id: 'deepseek-r1', 
        name: 'DeepSeek R1', 
        endpoint: process.env.NEXT_PUBLIC_DEEPSEEK_R1_ENDPOINT_ID, 
        group: 'agent',
        description: 'R1 系列模型，高性能文本处理。'
    },

    // --- Image 模式 (文生图/图生图) ---
    { 
        id: 'doubao-seedream4.5', 
        name: 'Doubao Seedream 4.5 ', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEEDREAM4_5_ENDPOINT_ID, 
        group: 'image',
        description: '新一代文生图模型，图像质量更高。'
    },
    { 
        id: 'doubao-seedream4', 
        name: 'Doubao Seedream 4', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEEDREAM4_ENDPOINT_ID, 
        group: 'image',
        description: '经典文生图模型，快速生成。'
    },

    // --- Video 模式 (文生视频) ---
    { 
        id: 'doubao-seedance-pro', 
        name: 'Doubao Seedance Pro', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEEDANCE_1_PRO_ENDPOINT_ID, 
        group: 'video',
        description: '高质量视频生成，适用于复杂的动态场景。'
    },
    { 
        id: 'doubao-seedance-pro-fast', 
        name: 'Doubao Seedance Pro Fast ', 
        endpoint: process.env.NEXT_PUBLIC_DOUBAO_SEEDANCE_1_PRO_FAST_ENDPOINT_ID, 
        group: 'video',
        description: '快速视频生成，缩短等待时间。'
    },
];

/**
 * 导出不同模式的筛选列表
 */
export const AGENT_MODELS = ALL_MODELS.filter(m => m.group === 'agent' && m.endpoint);
export const IMAGE_MODELS = ALL_MODELS.filter(m => m.group === 'image' && m.endpoint);
export const VIDEO_MODELS = ALL_MODELS.filter(m => m.group === 'video' && m.endpoint);

/**
 * 默认模型 ID
 */
export const DEFAULT_AGENT_MODEL_ID: ModelId = AGENT_MODELS[0]?.id || 'deepseek-v3.2';
export const DEFAULT_IMAGE_MODEL_ID: ModelId = IMAGE_MODELS[0]?.id || 'doubao-seedream4.5';
export const DEFAULT_VIDEO_MODEL_ID: ModelId = VIDEO_MODELS[0]?.id || 'doubao-seedance-pro';

// ------------------- 辅助函数 -------------------

/**
 * 根据模式获取对应的模型列表
 */
export const getModelsByMode = (mode: 'agent' | 'image' | 'video') => {
    switch (mode) {
        case 'agent':
            return AGENT_MODELS;
        case 'image':
            return IMAGE_MODELS;
        case 'video':
            return VIDEO_MODELS;
        default:
            return [];
    }
};

/**
 * 根据模式获取对应的默认模型 ID
 */
export const getDefaultModelIdByMode = (mode: 'agent' | 'image' | 'video'): ModelId => {
    switch (mode) {
        case 'agent':
            return DEFAULT_AGENT_MODEL_ID;
        case 'image':
            return DEFAULT_IMAGE_MODEL_ID;
        case 'video':
            return DEFAULT_VIDEO_MODEL_ID;
        default:
            // 假设 'agent' 是默认模式
            return DEFAULT_AGENT_MODEL_ID; 
    }
}