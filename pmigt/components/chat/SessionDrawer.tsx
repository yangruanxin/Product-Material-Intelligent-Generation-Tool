'use client';
// 显示历史会话列表
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare} from 'lucide-react';

import { SessionList } from "@/components/chat/SessionList"; //会话列表
import { UISession } from '@/src/types/index'; 

interface SessionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    // ChatLayout Props
    sessions: UISession[];
    activeSessionId: string | null;
    onSessionChange: (sessionId: string) => void;
}

// 抽屉动画配置
const drawerVariants = {
    hidden: { x: '-100%' }, // 完全隐藏在左侧
    visible: { x: '0%' },   // 移动到屏幕内
};

export const SessionDrawer: React.FC<SessionDrawerProps> = ({ 
    isOpen, 
    onClose, 
    sessions, 
    activeSessionId, 
    onSessionChange
}) => {
    const drawerWidth = '280px'; 

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    // 遮罩层 (点击遮罩关闭抽屉)
                    key="drawer-backdrop"
                    className="fixed inset-0 bg-black/30 z-40" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />
            )}
            
            {isOpen && (
                <motion.div
                    key="session-drawer"
                    className="fixed top-0 left-20 h-screen bg-white shadow-2xl z-50 overflow-y-auto"
                    style={{ width: drawerWidth }} // 设置宽度
                    variants={drawerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {/* 抽屉内容区 Header */}
                    <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                            历史会话
                        </h2>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <SessionList
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        onSessionChange={(id) => {
                            onClose();
                            onSessionChange(id);
                        }}
                    />
                        

                </motion.div>
            )}
        </AnimatePresence>
    );
};