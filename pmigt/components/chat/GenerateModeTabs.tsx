// components/GenerateModeTabs.tsx (美化后的下拉选择器版本)
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Users, ChevronDown } from 'lucide-react';

// 模式类型定义 (保持与您项目一致)
export type ModeType = 'agent' | 'image' | 'video';

interface ModeTabsProps {
    currentMode: ModeType;
    setMode: (mode: ModeType) => void;
}

// 定义模式映射和图标
const MODE_MAP: { id: ModeType; label: string; icon: React.ElementType }[] = [
    { id: 'agent', label: 'Agent 模式', icon: Users },
    { id: 'image', label: '图片生成', icon: Image },
    { id: 'video', label: '视频生成', icon: Video },
];

// 动画变体
const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scaleY: 0.9, originY: 0 },
    visible: { opacity: 1, y: 0, scaleY: 1, originY: 0 },
};

export const GenerateModeTabs: React.FC<ModeTabsProps> = ({ currentMode, setMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 找到当前选中的模式数据
    const activeMode = MODE_MAP.find(m => m.id === currentMode) || MODE_MAP[0];
    
    // 渐变颜色
    const indicatorGradient = "bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/50";

    // --- 点击外部关闭下拉菜单的 Hook ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [containerRef]);

    const handleSelect = (modeId: ModeType) => {
        setMode(modeId);
        setIsOpen(false);
    };

    return (
        <div 
            className="relative w-48 z-30" // 相对定位，z-index 确保在 InputArea 上方
            ref={containerRef}
        >
            {/* 触发器 (Trigger) */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-12 flex items-center justify-between px-4 rounded-full transition-all duration-300
                    ${indicatorGradient} text-white font-semibold shadow-md border-2 border-blue-500/20`}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
                <div className="flex items-center space-x-2">
                    <activeMode.icon className="w-5 h-5" />
                    <span>{activeMode.label}</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </motion.button>

            {/* 下拉菜单 (Dropdown) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="absolute bottom-full left-0 mb-2 w-full p-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        {MODE_MAP.map((mode) => (
                            <motion.div
                                key={mode.id}
                                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors duration-200
                                    ${mode.id === currentMode 
                                        ? 'bg-blue-50 text-blue-700 font-semibold' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                onClick={() => handleSelect(mode.id)}
                                whileHover={{ x: 3 }}
                            >
                                <mode.icon className="w-5 h-5" />
                                <span>{mode.label}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};