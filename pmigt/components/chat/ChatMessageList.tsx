//消息框
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';
import { AIMessageCard } from './AIMessageCard';
import { UserMessageCard } from './UserMessageCard';
import { WelcomeMessage } from './WelcomeMessage';

interface ChatMessageListProps {
    messages: UIMessage[];
    isHistoryLoading?: boolean;//判断是新会话还是历史消息正在加载
}

// // 聊天记录骨架 UI
// const HistoryLoadingSkeleton: React.FC = () => {
//   // 做 4–5 条假消息，左右交错，看起来像过去的聊天记录
//   const items = [0, 1, 2, 3, 4];

//   return (
//     <div className="space-y-4 max-w-4xl mx-auto w-full py-4">
//       {items.map((i) => {
//         const isLeft = i % 2 === 0;
//         return (
//           <div
//             key={i}
//             className={`flex gap-3 ${isLeft ? "justify-start" : "justify-end"}`}
//           >
//             {/* 左侧 AI 骨架头像 */}
//             {isLeft && (
//               <div className="flex-shrink-0">
//                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
//               </div>
//             )}

//             {/* 聊天气泡骨架 */}
//             <div className="flex-1 max-w-[70%]">
//               <div className="rounded-2xl p-3 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 animate-pulse">
//                 <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
//                 <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700 mb-2" />
//                 <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
//               </div>
//             </div>

//             {/* 右侧“用户”骨架头像 */}
//             {!isLeft && (
//               <div className="flex-shrink-0">
//                 <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
//               </div>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// };

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages,isHistoryLoading }) => {
    //创建一个 Ref 来引用聊天内容的容器 DOM 元素
    const messagesEndRef = useRef<HTMLDivElement>(null);
    //监听消息变化并执行滚动
    useEffect(() => {
        // 检测Ref是否已存在且已经挂载
        if (messagesEndRef.current&& messages.length > 0) {
            // scrollIntoView方法将元素滚动到视图中
            messagesEndRef.current.scrollIntoView({
                behavior: "smooth"
            })
        }
    }, [messages]);

    // 检查消息是否为空
    const isNewSession = !isHistoryLoading && messages.length === 0;

    return (
        <ScrollArea className="flex-1 p-6 bg-white">
            {/* 若为历史消息加载中 */}
            {isHistoryLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                </div>
            )}
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
                        const messageKey = msg.id || i;
                        return msg.sender === "ai" ? (
                            <AIMessageCard
                                key={messageKey}
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