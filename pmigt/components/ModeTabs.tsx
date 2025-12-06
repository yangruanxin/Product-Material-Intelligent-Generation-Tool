// components/ModeTabs.tsx
'use client';

import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Users, Image, Video } from 'lucide-react';

// 模式类型定义 (用于 TypeScript)
export type ModeType = 'agent' | 'image' | 'video';

interface ModeTabsProps {
    currentMode: ModeType;
    setMode: (mode: ModeType) => void;
}

// 模式数据
const modeData: { mode: ModeType; name: string; icon: React.ElementType }[] = [
    { mode: 'agent', name: 'Agent 模式', icon: Users },
    { mode: 'image', name: '图片生成', icon: Image },
    { mode: 'video', name: '视频生成', icon: Video },
];

export const ModeTabs: React.FC<ModeTabsProps> = ({ currentMode, setMode }) => {
    return (
        // LayoutGroup 确保所有子元素都在同一个布局动画组内
        <LayoutGroup>
            <div className="flex space-x-2 p-1 bg-gray-100 rounded-full mb-8 shadow-inner">
                {modeData.map((item) => {
                    const isActive = currentMode === item.mode;
                    
                    return (
                        <button
                            key={item.mode}
                            onClick={() => setMode(item.mode)}
                            className="relative flex items-center space-x-2 px-5 py-2 text-sm font-semibold rounded-full transition duration-300 z-10"
                        >
                            {/* 移动指示器 (motion.div) */}
                            {isActive && (
                                <motion.div
                                    layoutId="mode-indicator" // 关键：framer-motion 通过 layoutId 识别并动画化元素
                                    className="absolute inset-0 bg-white rounded-full shadow-md z-0 border border-gray-200"
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                    }}
                                />
                            )}
                            
                            {/* 内容 (z-index 确保内容在指示器上方) */}
                            <item.icon className={`w-4 h-4 z-20 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                            <span className={`z-20 ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
};