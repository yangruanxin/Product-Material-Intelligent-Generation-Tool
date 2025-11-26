//消息框
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';

interface ChatMessageListProps {
    messages: UIMessage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages }) => {
    //创建一个 Ref 来引用聊天内容的容器 DOM 元素
    const messagesEndRef = useRef<HTMLDivElement>(null);
    //监听消息变化并执行滚动
    useEffect(() => {
        // 检测Ref是否已存在且已经挂载
        if (messagesEndRef.current) {
            // 是呀scrollIntoView方法将元素滚动到视图中
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth"
            })
        }
    }, [messages]);

    return (
        <ScrollArea className="flex-1 p-6 bg-white">
            <div className="space-y-6 max-w-4xl mx-auto w-full">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${
                            msg.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-md whitespace-pre-wrap break-words ${
                                msg.sender === "user"
                                    ? "bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-white rounded-br-none" 
                                    : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                            }`}
                        >
                            {/* 渲染文字 */}
                            <p className="text-sm">{msg.text}</p>
                            {/* 渲染图片(若存在) */}
                            {msg.imageUrl && (
                                <div className="mb-2">
                                    <img
                                        src={msg.imageUrl}
                                        alt="发送的图片"
                                        className="rounded-lg max-w-full h-auto object-cover max-h-64"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* 空的 div 作为滚动的目标锚点 */}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
};