import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UISession } from '../types';

// 定义 GenState 接口 
interface GenState {
    // 状态 
    input: string; // 输入框草稿
    isLoading: boolean; // 全局加载状态
    userId: string | null;//全局userId
    // 会话相关
    sessions: UISession[]; // 会话列表
    activeSessionId: string | null;//当前选中的会话 ID
    isSessionLoading: boolean;//是否在加载会话列表
    sessionError: string | null;

    // 动作 
    setInput: (text: string) => void;
    setIsLoading: (loading: boolean) => void;
    setUserId: (id: string | null) => void;//设置用户Id
    // 会话相关
    setSessions: (sessions: UISession[] | ((prev: UISession[]) => UISession[])) => void;
    addSession: (session: UISession) => void;
    setActiveSessionId: (id: string | null) => void;
    setIsSessionLoading: (loading: boolean) => void;
    setSessionError: (error: string | null) => void;
}

// 创建 Store
export const useGenStore = create<GenState>()(
  persist(
    (set) => ({
        // 初始状态 
        input: '',
        isLoading: false,
        userId: null,
        sessions: [],
        activeSessionId: null,
        isSessionLoading:false,
        sessionError: null,

        // Actions
        setInput: (input) => set({ input }),
        setIsLoading: (loading) => set({ isLoading: loading }),
        setUserId: (id) => set({ userId: id }),
        // 设置会话列表 (支持函数式更新)
        setSessions: (updater) => set((state) => ({ 
            sessions: typeof updater === 'function' ? updater(state.sessions) : updater 
        })),

        // 添加新会话
        addSession: (session) => set((state) => ({ 
            sessions: [session, ...state.sessions], // 通常新会话放在最上面
            activeSessionId: session.id // 自动选中新会话
        })),

        // 设置当前选中 ID
        setActiveSessionId: (id) => set({ activeSessionId: id }),
        // 会话加载
        setIsSessionLoading: (loading) => set({ isSessionLoading: loading }),
        setSessionError: (error) => set({ sessionError: error }),
    }),
    {
        name: 'pmigt-storage',
        storage: createJSONStorage(() => localStorage),
        // 排除 isLoading，确保刷新后恢复到 false
        partialize: (state) => {
            const { isLoading,isSessionLoading, sessionError, ...persistentState } = state;
            return persistentState;
      },
    }
  )
);

