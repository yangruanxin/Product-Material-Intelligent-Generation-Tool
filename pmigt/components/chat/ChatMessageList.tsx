"use client";

import React, { useCallback, useEffect, useRef} from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from '@/src/types/index';
import { AIMessageCard } from './AIMessageCard';
import { UserMessageCard } from './UserMessageCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ChatMessageListProps {
  messages: UIMessage[];
  isHistoryLoading?: boolean;
  onMediaClick: (url: string, type: 'image' | 'video') => void;
  onRegenerate: (message: UIMessage) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isHistoryLoading,
  onMediaClick,
  onRegenerate
}) => {
  // 底部锚点 Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 容器 Ref (用于 ResizeObserver)
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  // 追踪上一轮的消息长度，用于判断是“新增消息”还是“全量加载”
  const prevMessagesLength = useRef(0);
  // 追踪是否是历史记录加载完成后的第一次渲染
  const isJustFinishedLoading = useRef(false);

  // --- 核心滚动方法：使用 scrollIntoView ---
  const scrollToBottom = useCallback((instant: boolean = false) => {
    // 加上 requestAnimationFrame 确保在 DOM 渲染后的下一帧执行，避免被 React 渲染过程打断
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: instant ? 'auto' : 'smooth',
          block: 'end', 
        });
      }
    });
  }, []);

  // 1. 监听 isHistoryLoading 变化
  useEffect(() => {
    // 当 loading 从 true 变为 false 时
    if (!isHistoryLoading && messages.length > 0) {
      isJustFinishedLoading.current = true;
      // 强制瞬间滚动到底部，不使用动画
      scrollToBottom(true);
      
      // 双重保险：防止图片加载导致的高度塌陷，100ms后再滚一次
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [isHistoryLoading, messages.length, scrollToBottom]);

  // 2. 监听消息列表变化
  useEffect(() => {
    // 如果正在加载历史，不处理
    if (isHistoryLoading) return;

    const isNewMessageAdded = messages.length > prevMessagesLength.current;
    
    // 如果是新增了消息（用户发送或AI回复），平滑滚动
    if (isNewMessageAdded) {
      scrollToBottom(false); // smooth
    } else if (messages.length > 0 && isJustFinishedLoading.current) {
      // 这里的逻辑是为了处理 React 严格模式下可能的重复执行
      scrollToBottom(true); // instant
      isJustFinishedLoading.current = false;
    }

    // 更新长度记录
    prevMessagesLength.current = messages.length;
  }, [messages, isHistoryLoading, scrollToBottom]);

  // 3. 监听容器尺寸变化 (处理图片懒加载撑开高度的情况)
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      // 只有在非加载状态下，且确实有内容时，才进行修正滚动
      if (!isHistoryLoading && messages.length > 0) {
         // 只有当用户原本就在接近底部的时候，才自动吸附到底部
         // 简单起见，这里假设如果正在生成内容，就吸附
         const lastMsg = messages[messages.length - 1];
         if (lastMsg?.loading || lastMsg?.sender === 'user') {
            scrollToBottom(false); 
         }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [isHistoryLoading, messages, scrollToBottom]);


  const isNewSession = messages.length === 0 && !isHistoryLoading;

  // 获取最后一条消息用于判断
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageId = lastMessage ? lastMessage.id : null;

  return (
    <ScrollArea
      className="
        flex-1 p-6 relative
        bg-gradient-to-b from-[#f7faff] via-white to-[#f9fbff]
        /* 这里的 mask-image 会导致顶部有一点渐变消失，如果不喜欢可以去掉 */
        [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_95%,transparent)]
      "
    >
      {/* 装饰背景 */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full bg-fuchsia-300/35 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/5 w-[360px] h-[360px] rounded-full bg-blue-300/30 blur-3xl animate-float-slower" />
      </div>

      {/* 历史消息加载 Loading 遮罩 */}
      <AnimatePresence>
        {isHistoryLoading && (
          <motion.div
            key="history-loading"
            // z-50 确保覆盖一切
            className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-indigo-500 animate-spin" />
              </div>
              <p className="text-sm font-medium">恢复会话中...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isNewSession ? (
        // 空状态欢迎页
        <div className="absolute inset-0 flex items-center justify-center p-8 z-10">
           <motion.div
            className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md shadow-[0_12px_40px_rgba(45,91,255,0.12)] px-8 py-10 text-center"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md">
              <Sparkles size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">开始新的创作会话</h3>
            <p className="mt-2 text-sm text-gray-500">
              输入你的想法，或上传一张图片作为参考。
            </p>
          </motion.div>
        </div>
      ) : (
        <div ref={listContainerRef} className="space-y-6 max-w-4xl mx-auto w-full pb-4 min-h-[calc(100vh-200px)]">
          {/* min-h 设置是为了确保只有一条消息时也有足够高度撑开，避免滚动条诡异跳动 */}
          
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const messageKey = (msg.id ?? i) as React.Key;
              const isAi = msg.sender === 'ai';
              return (
                <motion.div
                  key={messageKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  // 移除 layout prop，防止 Framer Motion 在列表变化时自动计算布局导致跳动
                  className="will-change-transform"
                >
                  {isAi ? (
                    <AIMessageCard
                      message={msg}
                      onMediaClick={onMediaClick}
                      isLastAIMessage={msg.id === lastMessageId && msg.sender === 'ai'}
                      onRegenerate={onRegenerate}
                    />
                  ) : (
                    <UserMessageCard message={msg} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* 这里的 div 是滚动的目标，加一点高度 padding */}
          <div ref={messagesEndRef} className="h-4 w-full" />
        </div>
      )}

      <style>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes float-slower { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .animate-float-slow{ animation: float-slow 12s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 16s ease-in-out infinite; }
      `}</style>
    </ScrollArea>
  );
};