// components/HomePage.tsx
import React from 'react';
import { Button } from './ui/button'; // 假设您有 Button 组件
import { Send, Plus, Search } from 'lucide-react'; // 假设您导入了图标

// 模拟图一中的 Agent 模式卡片数据
const AGENT_MODES = [
    { title: "Agent 模式", icon: "🤖" },
    { title: "图片生成", icon: "🖼️" },
    { title: "视频生成", icon: "🎬" },
    { title: "数字人", icon: "👤" },
    { title: "动作模仿", icon: "💃" },
];

// 模拟底部的发现内容流
const DISCOVERY_TABS = ["发现", "短片", "活动", "富丽风格"];

const HomePageContent: React.FC = () => {
    return (
        // 核心内容区：占据页面大部分空间
        <div className="flex-1 flex flex-col h-screen bg-gray-50 dark:bg-gray-800">

            {/* 1. 顶部模式选择区域 (Agent Card) */}
            <div className="p-8 w-full max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
                    
                    {/* 标题和简介 */}
                    <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Agent 模式</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                        灵感来了，一句话开始创作
                    </p>

                    {/* 模式选择横向滚动条 */}
                    <div className="flex space-x-4 overflow-x-auto pb-2">
                        {AGENT_MODES.map((mode, index) => (
                            <div
                                key={index}
                                className={`
                                    flex flex-col items-center justify-center p-4 
                                    rounded-lg cursor-pointer flex-shrink-0 w-24 h-24
                                    ${index === 0 ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500' : 'bg-gray-100 dark:bg-gray-700/50'}
                                    hover:shadow-md transition-shadow
                                `}
                            >
                                <span className="text-3xl">{mode.icon}</span>
                                <span className="text-xs mt-1 text-center font-medium">
                                    {mode.title.split(' ')[0]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* 输入区域 */}
                    <div className="flex items-end mt-6 space-x-2">
                        <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-800 flex items-center">
                            <Plus className="h-5 w-5 text-gray-400 mr-2" />
                            <textarea
                                placeholder="说说你想做点什么"
                                className="w-full bg-transparent resize-none focus:outline-none text-base h-10 pt-1"
                                rows={1}
                            />
                            {/* Agent 和自动标签 */}
                            <div className="flex space-x-2 ml-4">
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    Agent 模式
                                </span>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                                    自动
                                </span>
                            </div>
                        </div>
                        <Button className="h-10 w-10 p-0 rounded-full bg-blue-600 hover:bg-blue-700">
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. 底部发现内容流 */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 w-full max-w-4xl mx-auto">
                {/* 标签导航 */}
                <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-700 mb-4">
                    {DISCOVERY_TABS.map((tab, index) => (
                        <span
                            key={tab}
                            className={`
                                pb-2 cursor-pointer transition-colors text-sm font-medium
                                ${index === 0 
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }
                            `}
                        >
                            {tab}
                        </span>
                    ))}
                    <div className="flex-1 flex justify-end">
                        <Button variant="ghost" className="text-gray-500 dark:text-gray-400">
                            <Search className="h-4 w-4 mr-1" /> 搜索
                        </Button>
                    </div>
                </div>

                {/* 发现内容网格 (使用图二的占位符) */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden aspect-[3/4] relative">
                            {/* 图片占位符 */}
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                                素材占位图 {index + 1}
                            </div>
                            {/* 描述/标签占位符 */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 text-white">
                                <h3 className="text-sm font-semibold truncate">素材标题</h3>
                                <p className="text-xs text-gray-300">345人已创作</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomePageContent;