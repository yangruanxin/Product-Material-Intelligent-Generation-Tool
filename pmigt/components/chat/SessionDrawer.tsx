'use client';

import React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { SessionList } from '@/components/chat/SessionList';
import type { UISession } from '@/src/types/index';

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: UISession[];
  activeSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
}

// 仅保留 target 值，不在 variants 中写 transition/filter，避免 TS 报错
const drawerVariants: Variants = {
  hidden: { x: '-100%', opacity: 0.98 },
  visible: { x: '0%', opacity: 1 },
  exit: { x: '-100%', opacity: 0.96 },
};

export const SessionDrawer: React.FC<SessionDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSessionChange,
}) => {
  const drawerWidth = 320;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="drawer-backdrop"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}

      {isOpen && (
        <motion.aside
          key="session-drawer"
          className="fixed top-0 left-20 h-screen z-50"
          style={{ width: drawerWidth }}
          variants={drawerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          // ✅ 把过渡曲线放到这里，避免类型冲突
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-drawer-title"
        >
          {/* 外层容器：磨砂 + 细边框 + 圆角 */}
          <div
            className="
              relative h-full w-full overflow-hidden
              rounded-r-2xl bg-white/85 backdrop-blur-md
              border border-white/60
              shadow-[0_15px_45px_rgba(0,0,0,0.12)]
            "
          >
            {/* 左侧发光竖条 */}
            <div
              className="
                absolute -left-1 top-0 h-full w-[3px]
                bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-cyan-400
                blur-[0.5px]
              "
            />

            {/* Header */}
            <div
              className="
                sticky top-0 z-10
                px-4 py-3
                bg-white/70 backdrop-blur-md
                border-b border-white/60
              "
            >
              <div className="flex items-center justify-between">
                <h2
                  id="session-drawer-title"
                  className="
                    text-lg font-extrabold tracking-tight
                    bg-clip-text text-transparent
                    bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600
                    flex items-center
                  "
                >
                  <MessageSquare className="w-5 h-5 mr-2 opacity-90" />
                  历史会话
                </h2>

                <button
                  onClick={onClose}
                  className="
                    p-1.5 rounded-full
                    text-gray-600 hover:text-gray-800
                    hover:bg-gray-100 active:bg-gray-200
                    transition
                    focus:outline-none focus:ring-2 focus:ring-indigo-400/50
                  "
                  aria-label="关闭历史会话抽屉"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* header 底部分隔柔光 */}
              <div className="mt-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>

            {/* 列表区域：单独滚动，隐藏滚动条但保留滚动 */}
            <div
              className="
                h-[calc(100%-64px)]
                overflow-y-auto
                px-2 py-2
                [scrollbar-width:none]
              "
              style={{ msOverflowStyle: 'none' }}
            >
              <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
              `}</style>

              <div className="no-scrollbar">
                <SessionList
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSessionChange={(id) => {
                    onClose();
                    onSessionChange(id);
                  }}
                />
              </div>
            </div>

            {/* 右侧淡内嵌高光 */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/60 to-transparent" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};