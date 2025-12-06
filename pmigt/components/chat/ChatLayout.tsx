"use client";

import React from "react";

interface ChatLayoutProps {
  children: React.ReactNode;//左侧聊天消息展示区 输入框
  rightPanel: React.ReactNode; // 媒体栏（图片/视频）
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  rightPanel,
}) => {
    return (
        <div className="w-full h-screen flex bg-white overflow-hidden">
        
        {/* 左侧聊天区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
            {children}
        </main>

        {/* 右侧媒体栏 */}
        {rightPanel && (
            <aside
            className="
                hidden lg:flex flex-col 
                w-1/2 min-w-[480px]
                border-l border-gray-200
                bg-gray-50
                overflow-y-auto scrollbar-none
                shadow-inner
                animate-in fade-in slide-in-from-right
            "
            >
            {rightPanel}
            </aside>
        )}
        </div>
    );
};
