//消息框
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';
import { AIMessageCard } from './AIMessageCard';
import { UserMessageCard } from './UserMessageCard';

interface ChatMessageListProps {
    messages: UIMessage[];
    isLoading: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages,isLoading }) => {
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
                {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                return msg.sender === "ai" ? (
                    <AIMessageCard 
                        key={i} 
                        message={msg} 
                        loading={isLoading && isLast}
                    />
                ) : (
                    <UserMessageCard key={i} message={msg} />
                );
            })}

                {/* 空的 div 作为滚动的目标锚点 */}
                <div ref={messagesEndRef} />
            </div>
        </ScrollArea>
    );
};