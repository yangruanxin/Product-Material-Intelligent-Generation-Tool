"use client";

import React from "react";
import { UISession } from "@/src/types";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { MessageCircle, Sparkles } from "lucide-react";

interface SessionListProps {
  sessions: UISession[];
  activeSessionId: string | null;
  onSessionChange: (id: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSessionChange,
}) => {
  const hasSessions = sessions && sessions.length > 0;

  if (!hasSessions) {
    // 空状态提示（仅样式，无业务改动）
    return (
      <ScrollArea className="flex-1 p-4">
        <div
          className="
            mt-8 rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm
            shadow-[0_10px_28px_rgba(0,0,0,0.08)] px-5 py-7 text-center
          "
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl
                          bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md">
            <MessageCircle size={20} />
          </div>

          <h3 className="text-base font-bold text-gray-900">
            还没有会话
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            开启一段对话吧：输入你的想法，或上传一张图片作为参考。
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full
                          border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-[12px] text-indigo-700">
            <Sparkles size={14} />
            <span>提示：按 <kbd className="rounded bg-white px-1.5 py-0.5 shadow">Enter</kbd> 发送，<kbd className="rounded bg-white px-1.5 py-0.5 shadow">Shift</kbd>+<kbd className="rounded bg-white px-1.5 py-0.5 shadow">Enter</kbd> 换行</span>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-2">
        {sessions.map((session) => {
          const active = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              onClick={() => onSessionChange(session.id)}
              aria-pressed={active}
              className={[
                "group relative w-full text-left px-3 py-2 rounded-xl flex items-center gap-3",
                "bg-white/80 backdrop-blur-sm border border-white/60",
                "shadow-[0_8px_18px_rgba(0,0,0,0.06)]",
                "transition-all duration-200 hover:shadow-[0_14px_30px_rgba(45,91,255,0.14)]",
                "hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                active
                  ? "ring-2 ring-indigo-400 bg-gradient-to-r from-indigo-50 to-white"
                  : "hover:[box-shadow:0_0_0_1px_rgba(99,102,241,0.20),0_14px_28px_rgba(99,102,241,0.08)] hover:border-white/80",
                "hover:scale-[1.01]",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-0 top-0 h-full w-1 rounded-l-xl",
                  active
                    ? "bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-cyan-400"
                    : "bg-gradient-to-b from-transparent via-indigo-200/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                ].join(" ")}
                aria-hidden
              />

              <span
                className={[
                  "inline-flex items-center justify-center shrink-0",
                  "w-7 h-7 rounded-lg",
                  active
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 group-hover:bg-gray-200",
                  "transition-colors",
                ].join(" ")}
                aria-hidden
              >
                <MessageCircle size={16} />
              </span>

              <span
                className={[
                  "truncate flex-1",
                  active ? "font-semibold text-gray-900" : "text-gray-700",
                ].join(" ")}
                title={session.name}
              >
                {session.name}
              </span>

              <span className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/60 to-transparent rounded-r-xl" aria-hidden />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};