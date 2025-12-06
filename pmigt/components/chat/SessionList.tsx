"use client";

import React from "react";
import { UISession } from "@/src/types";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { MessageCircle } from "lucide-react";

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
    console.log("SessionList sessions:", sessions);
    return (
        <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
            {sessions.map((session) => (
            <button
                key={session.id}
                onClick={() => onSessionChange(session.id)}//切换会话
                className={`
                w-full text-left px-3 py-2 rounded-lg flex items-center gap-2
                transition-colors duration-200
                ${
                    session.id === activeSessionId
                    ? "bg-gray-200 font-semibold" // 选中状态
                    : "hover:bg-gray-100" // 非选中状态 hover
                }
                `}
            >
                <MessageCircle size={18} />
                <span className="truncate">{session.name}</span>
            </button>
            ))}
        </div>
        </ScrollArea>
    );
};