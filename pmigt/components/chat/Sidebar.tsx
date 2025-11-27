import React from 'react';
import { Separator } from '@/components/ui/separator'; 
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { Button } from '@/components/ui/button';
import { MessageCircle,PlusCircle } from 'lucide-react'; 
import { UISession } from '@/src/types/index';


interface SidebarProps {
    sessions: UISession[];
    currentUserName: string;
    onSessionClick: (sessionId: string) => void;
    currentActiveId: string | null;
    onNewSession: () => void;//新建对话
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentUserName,
  onSessionClick,
  currentActiveId,
  onNewSession,
}) => {
  return (
    // 侧边栏容器
    <aside className="w-60 bg-[#f7f7f7] text-gray-800 flex flex-col border-r border-gray-200 rounded-xl overflow-hidden shadow-lg m-3">
        {/* 标题区 */}
        <div className="p-4 font-bold text-xl bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-transparent bg-clip-text">
        Chat 面板
        </div>
        <Separator className="bg-gray-100" />
      
        {/* 新建会话区 */}
        <div className="p-4">
            <Button
            onClick={onNewSession}
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
            <PlusCircle size={20} />
            新建对话
            </Button>
        </div>
        <Separator className="bg-gray-200" />
      
        {/* 会话列表区 (Scrollable) */}
        <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
            {sessions.map((session) => (
            <button
                key={session.id}
                onClick={() => onSessionClick(session.id)}
                className={`
                w-full text-left px-3 py-2 rounded-lg flex items-center gap-2
                transition-colors duration-200
                ${session.id === currentActiveId 
                    ? 'bg-gray-200 font-semibold' // 选中时的样式
                    : 'hover:bg-gray-100'        // 未选中时的悬停样式
                }
                `}
            >
                <MessageCircle size={18} />
                <span className="truncate">{session.name}</span>
            </button>
            ))}
        </div>
        </ScrollArea>
        
        <Separator className="bg-gray-100" />
        
        {/* 用户信息区 */}
        <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff004f] to-[#2d5bff]" />
        <div>
            <p className="text-sm font-semibold">{currentUserName}</p>
        </div>
        </div>
    </aside>
  );
};