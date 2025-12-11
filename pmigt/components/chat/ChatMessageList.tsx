// src/components/chat/ChatMessageList.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UIMessage } from "@/src/types";
import { AIMessageCard } from "./AIMessageCard";
import { UserMessageCard } from "./UserMessageCard";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, ArrowDown } from "lucide-react";

interface ChatMessageListProps {
  messages: UIMessage[];
  isHistoryLoading?: boolean;
  onMediaClick: (url: string, type: "image" | "video") => void;
  onRegenerate: (message: UIMessage) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isHistoryLoading,
  onMediaClick,
  onRegenerate,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Refs
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // State
  const [isSticky, setIsSticky] = useState(true);
  const prevLen = useRef(0);
  const justFinishedRef = useRef(false);

  // Mask
  const [revealReady, setRevealReady] = useState(false);
  const [maskVisible, setMaskVisible] = useState(false);

  // Guard flags
  const restoringRef = useRef(false);

  // --- utils ---
  const nextPaint = () =>
    new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  const desiredBottom = (v: HTMLDivElement) => Math.max(0, v.scrollHeight - v.clientHeight);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const vp = rootRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (!vp) return;
    viewportRef.current = vp;
    vp.style.overscrollBehavior = "contain";
    (vp.style as any).overflowAnchor = "none";
  }, []);

  const calcNearBottom = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return true;
    const dist = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
    return dist <= 64;
  }, []);

  const toBottom = useCallback(
    (instant = false) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const behavior: ScrollBehavior = instant || prefersReducedMotion ? "auto" : "smooth";
      requestAnimationFrame(() => vp.scrollTo({ top: desiredBottom(vp), behavior }));
    },
    [prefersReducedMotion]
  );

  const waitStable = useCallback(
    (cap = 1200) =>
      new Promise<void>((resolve) => {
        const container = listRef.current;
        if (!container) return resolve();
        let done = false;
        let idleTimer: any;
        const end = () => {
          if (done) return;
          done = true;
          ro.disconnect();
          mo.disconnect();
          clearTimeout(idleTimer);
          clearTimeout(capTimer);
          resolve();
        };
        const ro = new ResizeObserver(() => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(end, 150);
        });
        ro.observe(container);

        const bindMedia = (node: ParentNode) => {
          node.querySelectorAll("img,video").forEach((el) => {
            if (el instanceof HTMLImageElement) {
              if (!el.complete) el.addEventListener("load", () => ro.observe(container), { once: true });
            } else if (el instanceof HTMLVideoElement) {
              if (el.readyState < 1) {
                el.addEventListener("loadedmetadata", () => ro.observe(container), { once: true });
                el.addEventListener("loadeddata", () => ro.observe(container), { once: true });
              }
            }
          });
        };
        bindMedia(container);

        const mo = new MutationObserver((muts) => {
          muts.forEach((m) =>
            m.addedNodes.forEach((n) => n instanceof HTMLElement && bindMedia(n))
          );
        });
        mo.observe(container, { childList: true, subtree: true });

        idleTimer = setTimeout(end, 150);
        const capTimer = setTimeout(end, cap);
      }),
    []
  );

  const snapToBottomHard = useCallback(async () => {
    const vp = viewportRef.current;
    if (!vp) return;
    restoringRef.current = true;

    const prevBehavior = vp.style.scrollBehavior;
    vp.style.scrollBehavior = "auto"; // 避免回弹

    const setOnce = () => (vp.scrollTop = desiredBottom(vp));

    // setOnce();
    // await nextPaint();
    // setOnce();
    // await nextPaint();
    // setOnce();

    await waitStable(1200);
    setOnce();

    vp.style.scrollBehavior = prevBehavior ?? "";
    restoringRef.current = false;
  }, [waitStable]);

  // 历史加载完成后处理：空列表必须立刻放行遮罩
  useEffect(() => {
    if (isHistoryLoading) {
      setMaskVisible(true);
      setRevealReady(false);
      return;
    }

    if (!isHistoryLoading) {
      if (messages.length > 0) {
        justFinishedRef.current = true;
        (async () => {
          await snapToBottomHard();
          setRevealReady(true);
          setTimeout(() => setMaskVisible(false), 120);
        })();
      } else {
        // 空态不需要等待，直接显示欢迎视图
        setRevealReady(true);
        setMaskVisible(false);
      }
    }
  }, [isHistoryLoading, messages.length, snapToBottomHard]);

  // 恢复期：一旦有滚动偏离，立即纠正
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onScroll = () => {
      if (restoringRef.current) {
        const target = desiredBottom(vp);
        if (vp.scrollTop !== target) vp.scrollTop = target;
      }
      setIsSticky(calcNearBottom());
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    setIsSticky(calcNearBottom());
    return () => vp.removeEventListener("scroll", onScroll);
  }, [calcNearBottom]);

  // 新消息：仅在粘底时平滑
  useEffect(() => {
    if (isHistoryLoading) return;
    const isNew = messages.length > prevLen.current;
    if (isNew && isSticky) toBottom(false);
    if (messages.length > 0 && justFinishedRef.current) {
      toBottom(true);
      justFinishedRef.current = false;
    }
    prevLen.current = messages.length;
  }, [messages, isHistoryLoading, isSticky, toBottom]);

  const showMask = (isHistoryLoading || !revealReady || maskVisible) && viewportRef.current;
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id;

  const MaskPortal =
    showMask && viewportRef.current
      ? createPortal(
          <AnimatePresence>
            <motion.div
              key="mask"
              className="absolute inset-0 z-[60] flex items-center justify-center bg-white/95 backdrop-blur-sm"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            >
              <div className="flex flex-col items-center gap-3 text-gray-600">
                <div className="h-10 w-10 rounded-full border-4 border-gray-300 border-t-indigo-500 animate-spin" />
                <p className="text-sm font-medium">
                  {isHistoryLoading ? "恢复会话中..." : "准备视图..."}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>,
          viewportRef.current as HTMLDivElement
        )
      : null;

  return (
    <ScrollArea
      ref={rootRef as any}
      className="
        relative flex-1 p-6
        bg-gradient-to-b from-[#f7faff] via-white to-[#f9fbff]
        [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_95%,transparent)]
      "
    >
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full bg-fuchsia-300/35 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/5 w-[360px] h-[360px] rounded-full bg-blue-300/30 blur-3xl animate-float-slower" />
      </div>

      {/* 列表（始终挂载） */}
      <div
        ref={listRef}
        className="space-y-6 max-w-4xl mx-auto w-full pb-14 min-h-[calc(100vh-200px)]"
        style={{ overflowAnchor: "none" as any }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const key = (msg.id ?? i) as React.Key;
            const isAi = msg.sender === "ai";
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {isAi ? (
                  <AIMessageCard
                    message={msg}
                    onMediaClick={onMediaClick}
                    isLastAIMessage={msg.id === lastMessageId && msg.sender === "ai"}
                    onRegenerate={onRegenerate}
                  />
                ) : (
                  <UserMessageCard message={msg} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div className="h-4 w-full" />
      </div>

      {/* 空态覆盖（不卸载列表） */}
      <AnimatePresence>
        {messages.length === 0 && !isHistoryLoading && revealReady && (
          <motion.div
            key="welcome"
            className="absolute inset-0 z-10 flex items-center justify-center p-8 pointer-events-none"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="pointer-events-auto w-full max-w-xl rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md shadow-[0_12px_40px_rgba(45,91,255,0.12)] px-8 py-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md">
                <Sparkles size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">开始新的创作会话</h3>
              <p className="mt-2 text-sm text-gray-500">输入你的想法，或上传一张图片作为参考。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 回到底部按钮：与内容列同轴、居中 */}
      <AnimatePresence>
        {!isSticky && !isHistoryLoading && revealReady && (
          <motion.div
            key="jump-container"
            className="absolute inset-x-0 bottom-6 z-[55] pointer-events-none"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
          >
            <div className="max-w-4xl mx-auto flex justify-center">
              <button
                onClick={() => toBottom(false)}
                className="pointer-events-auto rounded-full px-3.5 py-2 text-sm font-medium
                           bg-white shadow-xl border border-gray-200 hover:bg-gray-50
                           flex items-center gap-2"
              >
                <ArrowDown size={16} />
                回到底部
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 遮罩渲染到 viewport，始终正中 */}
      {MaskPortal}

      <style>{`
        @keyframes float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes float-slower { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .animate-float-slow{ animation: float-slow 12s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 16s ease-in-out infinite; }
      `}</style>
    </ScrollArea>
  );
};
