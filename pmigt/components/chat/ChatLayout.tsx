// 结合侧边栏和右侧主区域
import React from 'react';
import { Sidebar } from "@/components/chat/Sidebar";
import { UISession } from '@/src/types/index';

interface ChatLayoutProps {
    // Sidebar Props
    sessions: UISession[];
    activeSessionId: string | null;
    onSessionChange: (id: string) => void;
    onNewSession: () => void;
    currentUserName: string;
    
    // ChatMain Props (Children)
    children: React.ReactNode; 
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
    sessions,
    activeSessionId,
    onSessionChange,
    onNewSession,
    currentUserName,
    children,
}) => {
    return (
        <div className="flex h-screen">
            {/* 左侧侧边栏 (Sidebar) */}
            <Sidebar 
                sessions={sessions}
                currentUserName={currentUserName} 
                onSessionClick={onSessionChange}
                currentActiveId={activeSessionId}
                onNewSession={onNewSession}
            />

            {/* 右侧主聊天区 (ChatMain/Children) */}
            <main className="flex-1 flex flex-col px-12">
                {children}
            </main>
        </div>
    );
};