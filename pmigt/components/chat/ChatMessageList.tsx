"use client";

import React, { useCallback, useLayoutEffect, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMessageId = lastMessage ? lastMessage.id : null;

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const root = scrollAreaRef.current;
      if (!root) return;
      const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    },
    []
  );

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    if (messages.length > 0) {
      scrollToBottom('smooth');
    }

    const ro = new ResizeObserver(() => {
      // 图片/富媒体加载后高度变化需要补一次滚动
      scrollToBottom('smooth');
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [messages.length, scrollToBottom]);

  const isNewSession = messages.length === 0 && !isHistoryLoading;

  return (
    <ScrollArea
      ref={scrollAreaRef}
      className="
        flex-1 p-6 relative
        bg-gradient-to-b from-[#f7faff] via-white to-[#f9fbff]
        [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]
      "
    >
      {/* 装饰柔光 */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full bg-fuchsia-300/35 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/5 w-[360px] h-[360px] rounded-full bg-blue-300/30 blur-3xl animate-float-slower" />
      </div>

      {/* 历史消息加载遮罩 */}
      <AnimatePresence>
        {isHistoryLoading && (
          <motion.div
            key="history-loading"
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-3 text-gray-600">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 rounded-full animate-ping bg-indigo-200/30" />
              </div>
              <p className="text-sm">正在加载历史记录…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isNewSession ? (
        // 空状态欢迎卡
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <motion.div
            className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md shadow-[0_12px_40px_rgba(45,91,255,0.12)] px-8 py-10 text-center"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md">
              <Sparkles size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">开始新的创作会话</h3>
            <p className="mt-2 text-sm text-gray-500">
              输入你的想法，或上传一张图片作为参考。AI 将在这里与您对话并展示结果。
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-[12px] text-indigo-700">
              <span>提示：</span>
              <kbd className="rounded bg-white px-1.5 py-0.5 shadow">Enter</kbd>
              发送
              <span className="mx-1">·</span>
              <kbd className="rounded bg-white px-1.5 py-0.5 shadow">Shift</kbd>+
              <kbd className="rounded bg-white px-1.5 py-0.5 shadow">Enter</kbd>
              换行
            </div>
          </motion.div>
        </div>
      ) : (
        <div ref={containerRef} className="space-y-6 max-w-4xl mx-auto w-full">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const messageKey = (msg.id ?? i) as React.Key;
              const isAi = msg.sender === 'ai';

              return (
                <motion.div
                  key={messageKey}
                  initial={{ opacity: 0, y: 10, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                  className={isAi
                    ? "will-change-transform"
                    : "will-change-transform"
                  }
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

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 局部动画 Keyframes：背景柔浮动 */}
      <style>{`
        @keyframes float-slow   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes float-slower { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .animate-float-slow{ animation: float-slow 12s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 16s ease-in-out infinite; }
      `}</style>
    </ScrollArea>
  );
};