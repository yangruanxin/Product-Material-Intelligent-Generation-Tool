//消息框
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';
import { AIMessageCard } from './AIMessageCard';
import { UserMessageCard } from './UserMessageCard';
import { WelcomeMessage } from './WelcomeMessage';

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
            // scrollIntoView方法将元素滚动到视图中
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth"
            })
        }
    }, [messages]);

    // 检查消息是否为空
    const isNewSession = messages.length === 0;

    return (
        <ScrollArea className="flex-1 p-6 bg-white">
            {isNewSession ? (
                // 若为新会话 渲染欢迎界面
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="max-w-2xl w-full h-auto">
                        <WelcomeMessage />
                    </div>
                </div>
            ) : (
                <div className="space-y-6 max-w-4xl mx-auto w-full">
                    {messages.map((msg, i) => {
                        return msg.sender === "ai" ? (
                            <AIMessageCard
                                key={i}
                                message={msg}
                            />
                        ) : (
                            <UserMessageCard key={i} message={msg} />
                        );
                    })}

                    {/* 空的 div 作为滚动的目标锚点 */}
                    <div ref={messagesEndRef} />
                </div>)}
        </ScrollArea>
    );
};