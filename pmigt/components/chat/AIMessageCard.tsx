//展示AI回复的消息
import React from 'react';
import { UIMessage } from '@/src/types/index'; 
import AiAvatar from './AI_avatar';

// 格式化 JSON 风格的文本
const formatMessageText = (text: string) => {
    // AI 的成功回复包含“标题”、“卖点”等结构
    const lines = text.trim().split('\n');
    return (
        <div className="space-y-2">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;

                // 粗体强调关键词（标题、卖点）
                if (trimmedLine.startsWith('标题：') || trimmedLine.startsWith('卖点：') || trimmedLine.startsWith('氛围：')) {
                    // 按中文冒号分隔
                    const [key, value] = trimmedLine.split(/：(.+)/s);
                    return (
                        <p key={index} className="text-gray-700 dark:text-gray-300">
                            <strong className="font-semibold text-gray-900 dark:text-white">{key}：</strong>
                            {value}
                        </p>
                    );
                }
                
                // 普通文本
                return (
                    <p key={index} className="text-gray-700 dark:text-gray-300">
                        {trimmedLine}
                    </p>
                );
            })}
        </div>
    );
};

interface AIMessageCardProps {
    message: UIMessage;
}

/**
 * AI 回复消息卡片组件。
 * 根据消息是否包含图片 URL，渲染纯文本或图文混合布局。
 */
export const AIMessageCard: React.FC<AIMessageCardProps> = ({ message}) => {
    const { text, imageUrl, loading } = message;
    
    //若在加载
    if (loading) {
        return (
        <div className="flex gap-3 items-start">
            {/* 头像骨架 */}
            <div className="animate-pulse">
                <AiAvatar />
            </div>

            {/* 气泡骨架 */}
            <div className="flex-1 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
            </div>
        </div>
        );
    }

    // 纯文本卡片
    if (!imageUrl) {
        return (
            <div className="flex items-start space-x-4 max-w-[80%]">
                
                {/* AI 头像*/}
                <div className="relative mt-2">
                    <AiAvatar size={40}/>
                </div>

                {/* 文本气泡 */}
                <div
                    className="
                        flex-1 min-w-0 p-4
                        bg-white/70 dark:bg-gray-900/70
                        backdrop-blur-xl
                        rounded-2xl rounded-tl-none 
                        shadow-lg border border-gray-200/60 dark:border-gray-700/60
                        text-gray-800 dark:text-gray-200
                        leading-relaxed text-[15px]
                    "
                >
                    {formatMessageText(text??"")}
                </div>
            </div>
        );
    }

    // 图文混合卡片 (生成氛围图片)
    return (
        <div className="flex items-start space-x-4 max-w-[80%]">
            {/* AI 头像 */}
            <div className="relative mt-2">
                <AiAvatar size={40}/>
            </div>

            {/* 主体内容 */}
            <div className="
                flex flex-col md:flex-row gap-6 p-5
                bg-white/70 dark:bg-gray-900/70
                backdrop-blur-xl
                rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60
            ">
                {/* 左侧文案 */}
                <div className="flex-1 p-5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-800/40 shadow-inner">
                    {/* 顶部渐变条 */}
                    <div className="h-1 w-20 rounded-full bg-gradient-to-r from-[#00ccff] to-[#ff006a] mb-4"></div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        ✨ 营销文案
                    </h3>

                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-[15px]">
                        {formatMessageText(text??"")}
                    </div>
                </div>

                {/* 右侧图片 */}
                <div className="
                    w-full md:w-1/2 rounded-xl overflow-hidden
                    border border-primary-500/40 bg-white/40 backdrop-blur-sm shadow-lg
                    hover:shadow-2xl hover:scale-[1.01] transition-all duration-300
                ">
                    <div className="relative">
                        <img
                            src={imageUrl}
                            alt="AI生成主图"
                            className="object-cover w-full aspect-square"
                        />

                        {/* 氛围标 */}
                        <div className="
                            absolute top-3 right-3 px-3 py-1
                            text-xs font-medium text-white
                            rounded-full shadow-md
                            bg-gradient-to-r from-[#00ccff] to-[#ff006a]
                        ">
                            主图素材
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};