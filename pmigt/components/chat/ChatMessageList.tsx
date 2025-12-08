//消息框
import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';
import { AIMessageCard } from './AIMessageCard';
import { UserMessageCard } from './UserMessageCard';

interface ChatMessageListProps {
    messages: UIMessage[];
    isHistoryLoading?: boolean;//判断历史消息是否正在加载
    onMediaClick: (url: string, type: 'image' | 'video') => void;
    onRegenerate:(message: UIMessage) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages,isHistoryLoading,onMediaClick,onRegenerate}) => {
    //创建一个 Ref 来引用聊天内容的容器 DOM 元素
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // 获取最后一条消息（如果有的话）
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMessageId = lastMessage ? lastMessage.id : null;

    const scrollToBottom = useCallback(
        (behavior: ScrollBehavior = 'smooth') => {
            const root = scrollAreaRef.current;
            if (!root) return;

            const viewport = root.querySelector(
                '[data-radix-scroll-area-viewport]'
            ) as HTMLDivElement | null;

            if (!viewport) return;

            viewport.scrollTo({
                top: viewport.scrollHeight,
                behavior,
            });
        },
    []);
    
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        // 根据消息数量变化，滚一次到底
        if (messages.length > 0) {
            const behavior: ScrollBehavior = 'smooth'; 
            scrollToBottom(behavior);
        }

        // 监听内容高度变化（图片加载等），补一次滚动
        const ro = new ResizeObserver(() => {
            // 内容高度变化时，平滑滚到底
            scrollToBottom('smooth');
        });

        ro.observe(containerRef.current);

        return () => ro.disconnect();
    }, [messages.length, scrollToBottom]);

    // 判断是否为新会话
    const isNewSession = messages.length === 0&&!isHistoryLoading;

    return (
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 bg-white relative">
            {/* 若为历史消息加载中 */}
            {isHistoryLoading && (
                <div
                className="
                    absolute inset-0 z-10
                    flex items-center justify-center
                    bg-white/75 dark:bg-black/60
                    backdrop-blur-sm
                "
                >
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-300">
                    {/* 转圈圈 */}
                    <div
                    className="
                        h-10 w-10
                        rounded-full
                        border-4
                        border-gray-300 dark:border-gray-600
                        border-t-[#464546]
                        animate-spin
                    "
                    />
                    <p className="text-sm">正在加载历史记录…</p>
                </div>
                </div>
            )}

            {isNewSession? (
                // 若为新会话 渲染欢迎界面
                <div className="absolute inset-0 flex items-center justify-center p-8">
                </div>
            ) : (
                <div ref={containerRef} className="space-y-6 max-w-4xl mx-auto w-full">
                    {messages.map((msg, i) => {
                        const messageKey = msg.id || i;
                        return msg.sender === "ai" ? (
                            <AIMessageCard
                                key={messageKey}
                                message={msg}
                                onMediaClick={onMediaClick}
                                isLastAIMessage={
                                    msg.id === lastMessageId && // 确保是最后一条消息
                                    msg.sender === 'ai'        // 确保发送者是 AI
                                }
                                onRegenerate={onRegenerate}
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