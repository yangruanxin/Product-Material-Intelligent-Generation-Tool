// 用户消息卡片
import React, { useState } from 'react';
import { UIMessage } from '@/src/types/index'; 

interface UserMessageCardProps {
    message: UIMessage;
}

/**
 * 用户消息卡片组件
 * 如果消息包含图片 URL，则在图片加载时显示骨架屏。
 */
export const UserMessageCard: React.FC<UserMessageCardProps> = ({ message }) => {
    const { text, imageUrl } = message;
    // 跟踪图片是否加载完成的状态
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div className="flex w-full flex-col items-end gap-2">

            {/* 用户文字气泡 */}
            <div
                className="
                    inline-block max-w-[75%]
                    px-4 py-3 rounded-2xl shadow-md
                    whitespace-pre-wrap break-words
                    bg-gradient-to-r from-[#f73c3ca9] to-[#4a3bf2]
                    text-white text-sm rounded-br-none
                "
            >
                {text}
            </div>

            {/* 用户发送的图片（若存在）*/}
            {imageUrl && (
                <div className="inline-block max-w-[60%] rounded-xl overflow-hidden shadow">
                    <img
                        src={imageUrl}
                        alt="用户图片"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                        className={`rounded-xl w-full h-auto max-h-72 object-cover ${
                            imageLoaded ? "block" : "hidden"
                        }`}
                    />
                </div>
            )}
        </div>
    );
};