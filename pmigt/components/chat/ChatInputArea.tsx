// 输入框
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2,MessageSquare } from "lucide-react";
import { UISession } from '@/src/types';
import { SessionDrawer } from './SessionDrawer';
import { GenerateModeTabs, ModeType } from './GenerateModeTabs';

interface ChatInputAreaProps {
    // 状态
    input: string;
    isLoading: boolean;
    currentSessionImageUrl: string | null;
    currentMode: ModeType;
    
    // Handlers
    setInput: (value: string) => void;
    handleSend: () => Promise<void>;
    handleModeChange: (mode: ModeType) => void;//处理模式切换

    // 会话列表
    sessions: UISession[];
    activeSessionId: string | null;
    onSessionChange: (id: string) => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = (props) => {
    const { 
        input, isLoading, currentSessionImageUrl, 
        setInput, handleSend, 
        currentMode,handleModeChange,
        sessions, activeSessionId, onSessionChange//用于会话列表
    } = props;
    

    // 控制drawer开闭状态
    const [drawerOpen, setDrawerOpen] = useState(false);

    // 确定发送按钮是否禁用
    const isSendDisabled = isLoading || (!input.trim() && !currentSessionImageUrl );


    return (
        <div>
            <div className="p-4 bg-white flex flex-col items-center gap-2">
                {/* 输入框和按钮组 */}
                <div className="flex w-full max-w-4xl gap-2">

                    {/* 历史会话按钮 */}
                    <Button
                        onClick={() => setDrawerOpen(true)}
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-gray-300 text-gray-600 hover:text-gray-800"
                        title="查看历史会话"
                    >
                        <MessageSquare size={20} />
                    </Button>

                    <GenerateModeTabs 
                        currentMode={currentMode} 
                        setMode={handleModeChange} 
                    />
                    
                    {/* 文本输入框 */}
                    <Input
                        placeholder={isLoading  ? "正在处理中，请稍候..." : "请输入您对素材的需求或指令..."}
                        disabled={isLoading}
                        className="flex-1 rounded-full h-12 text-base px-6"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    
                    {/* 发送按钮 */}
                    <Button
                        onClick={handleSend}
                        disabled={isSendDisabled}
                        className="bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-white h-12 w-12 p-0 rounded-full transition-opacity disabled:opacity-50"
                    >
                        {(isLoading) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </Button>
                </div>
            </div>

            <SessionDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionChange={(id) => {
                    onSessionChange(id);
                }}
            />
        </div>
    );
};