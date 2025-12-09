import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UISession,UIMessage } from '../types';
import { ModeType } from '@/components/ModeTabs';
import { getDefaultModelIdByMode, ModelId } from '../types/model';
import { CUSTOM_STYLE_ID, DEFAULT_STYLE, StyleOption } from '@/src/constants/styles';

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
    hasLoadedSessions: boolean; 
    setHasLoadedSessions: (loaded: boolean) => void;
    // 消息相关
    messages: UIMessage[];//消息列表
    isAILoading: boolean;//判断AI是否正在生成
    // 重新生成相关
    currentSessionImageUrl: string | null;//当前会话中使用的商品/参考图 URL
    lastUserPrompt: string | null;//最后一次用户发送的 Prompt 文本
    lastAIMessageId: string | null;//最后一条 AI 消息的 ID

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
    
    //消息相关
    setMessages: (messages: UIMessage[]) => void;//设置或替换当前会话的所有历史消息
    addMessage: (message: UIMessage) => void;//向消息列表追加一条消息
    clearMessages: () => void;//清空当前历史消息
    setIsAILoading: (loading: boolean) => void;//设置AI生成状态
    //重新生成相关
    setCurrentSessionImageUrl: (url: string | null) => void;
    setLastUserPrompt: (prompt: string | null) => void;
    setLastAIMessageId: (id: string | null) => void;


    // 首页表单持久化，保证刷新后内容不消失
    homePrompt: string;
    homeMode: ModeType;
    homeModelId: ModelId;
    homeImageUrl: string | null;

    setHomePrompt: (prompt: string) => void;
    setHomeMode: (mode: ModeType) => void;
    setHomeModelId: (modelId: ModelId) => void;
    setHomeImageUrl: (url: string | null) => void;

    clearHomeState: () => void;//首页状态清理

    // 是否是首页点击发送之后的任务
    shouldLaunchNewSession: boolean; 
    setShouldLaunchNewSession: (shouldLaunch: boolean) => void;

    // generate页持久化
    genPrompt: string;
    genMode: ModeType;
    genModelId: ModelId;

    setGenPrompt: (prompt: string) => void;
    setGenMode: (mode: ModeType) => void;
    setGenModelId: (modelId: ModelId) => void;

    // 发送请求
    // 发送前的预处理 删除旧消息、追加新消息和占位符、更新状态
    processNewRequest: (
        userMessage: UIMessage,
        aiPlaceholder: UIMessage,
        isRegenerate: boolean,
        deleteMessageId?: string
    ) => void;

    // API 返回后的替换处理：替换占位符为真实消息
    replacePlaceholder: (
        placeholderId: string,
        finalMessage: UIMessage,
        lastMessageId: string
    ) => void;

    // 样式选择相关
    currentStyle: StyleOption;
    setCurrentStyle: (style: StyleOption) => void;
    customStyleUrl: string | null; 
    setCustomStyleUrl: (url: string | null) => void;

    // 水合状态
    //判断 Zustand Store 是否已从 localStorage 恢复数据 (客户端水合完成) 
    isHydrated: boolean;
    setHydrated: (isHydrated: boolean) => void;
}

// 创建 Store
export const useGenStore = create<GenState>()(
  persist(
    (set,get) => ({
        // 初始状态 
        input: '',
        isLoading: false,
        userId: null,
        //会话相关
        sessions: [],
        activeSessionId: null,
        isSessionLoading:false,
        sessionError: null,
        hasLoadedSessions: false, // 默认未加载
        //消息相关
        messages: [],
        isAILoading: false,
        //重新生成相关
        currentSessionImageUrl: null, 
        lastUserPrompt: null,
        lastAIMessageId: null,



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
        setHasLoadedSessions: (loaded) => set({ hasLoadedSessions: loaded }),
        // 消息相关
        setMessages: (messages) => set({ messages }),
        addMessage: (message) => set((state) => ({ 
            messages: [...state.messages, message] 
        })),
        clearMessages: () => set({ 
            messages: [],
            isAILoading: false // 清空时也重置 AI 状态
        }),
        setIsAILoading: (loading) => set({ isAILoading: loading }),
        
        // 重新生成相关
        setCurrentSessionImageUrl: (url) => set({ currentSessionImageUrl: url }),
        setLastUserPrompt: (prompt) => set({ lastUserPrompt: prompt }),
        setLastAIMessageId: (id) => set({ lastAIMessageId: id }),
        
        // 首页表单持久化
        homePrompt: '', // 初始值为空
        homeMode: 'agent', // 初始值为 'agent'
        homeModelId: getDefaultModelIdByMode("agent"), // 初始值为默认 Agent 模型
        homeImageUrl: null, // 初始值为空
        
        setHomePrompt: (prompt) => set({ homePrompt: prompt }),
        setHomeMode: (mode) => {
            // 模式切换时，自动更新对应的默认模型
            const defaultModel = getDefaultModelIdByMode(mode);
            set({ 
                homeMode: mode,
                homeModelId: defaultModel, // 确保模型ID也跟着模式切换
            });
        },
        setHomeModelId: (modelId) => set({ homeModelId: modelId }),
        setHomeImageUrl: (url) => set({ homeImageUrl: url }),
        
        clearHomeState: () => set({
            homePrompt: '',
            homeMode: 'agent',
            homeModelId: getDefaultModelIdByMode("agent"),
            homeImageUrl: null,
        }),
        
        // generate页状态持久化
        genPrompt: '', // 初始值为空
        genMode: 'agent', // 初始值为 'agent'
        genModelId: getDefaultModelIdByMode("agent"), // 初始值为默认 Agent 模型
        
        setGenPrompt: (prompt) => set({ genPrompt: prompt }),
        setGenMode: (mode) => {
            // 模式切换时，自动更新对应的默认模型
            const defaultModel = getDefaultModelIdByMode(mode);
            set({ 
                genMode: mode,
                genModelId: defaultModel, // 确保模型ID也跟着模式切换
            });
        },
        setGenModelId: (modelId) => set({ genModelId: modelId }),
        
        // 发送请求需要的action
        processNewRequest: (userMessage, aiPlaceholder, isRegenerate, deleteMessageId) => set((state) => {
            
            let newList = [...state.messages];

            // 处理重新生成时的消息删除
            if (isRegenerate && deleteMessageId) {
                newList = newList.filter(msg => msg.id !== deleteMessageId);
            }

            if (!isRegenerate) {
                // 只有在非重新生成的情况下，才追加用户消息
                newList.push(userMessage);
            }
            
            // 追加 AI 占位符
            newList.push(aiPlaceholder);
            
            // 更新 Store 状态
            return {
                messages: newList,
                lastUserPrompt: userMessage.text, // 记录最新的用户 Prompt
                isAILoading: true,                   // 开启 AI 加载状态
                input: "",                           // 清空输入框草稿
            };
        }),

        replacePlaceholder: (placeholderId, finalMessage, lastMessageId) => set((state) => {
            
            let replaced = false;

            // 遍历消息列表，替换占位符
            const newList = state.messages.map(msg => {
                if (msg.id === placeholderId) {
                    replaced = true;
                    // 返回最终的 AI 消息体
                    return finalMessage; 
                }
                return msg;
            });

            // 如果替换失败，则追加新消息 (作为保险措施)
            if (!replaced) {
                console.warn(`找不到 ID 为 ${placeholderId} 的占位消息，将作为新消息追加。`);
                newList.push(finalMessage);
            }

            // 记录真实的 AI 消息 ID 和停止加载
            return {
                messages: newList,
                lastAIMessageId: lastMessageId, // 记录最新的 AI 消息 ID
                isAILoading: false,             // 停止加载
            };
        }),

        // 样式选择相关
        currentStyle: DEFAULT_STYLE,
        setCurrentStyle: (style) => set({ currentStyle: style }),
        customStyleUrl: null, 
    
        // 更新自定义图片
        setCustomStyleUrl: (url) => {
            set({ customStyleUrl: url });
            
            // 如果清除 URL (url === null)，且当前选中自定义风格，则自动切换回 DEFAULT_STYLE
            if (!url && get().currentStyle.id === CUSTOM_STYLE_ID) {
                set({ currentStyle: DEFAULT_STYLE });
            }
          },
        
        shouldLaunchNewSession: false, 
        setShouldLaunchNewSession: (shouldLaunch) => set({ 
            shouldLaunchNewSession: shouldLaunch 
        }),
        
        // 水合状态
        isHydrated: false, 
        setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
        name: 'pmigt-storage',
        storage: createJSONStorage(() => localStorage),

        // 监听水合状态 水合恢复完成后调用 setHydrated(true)
        onRehydrateStorage: () => {
            return (state, error) => {
                if (error) {
                    console.error('An error happened during rehydration:', error);
                }
                if (state) {
                    // 在数据恢复完成后，调用 setHydrated 将状态设置为 true
                    state.setHydrated(true);
                }
            };
        },

        partialize: (state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isSessionLoading, sessionError,isHydrated,hasLoadedSessions, ...persistentState } = state;
            return persistentState;
      },
    }
  )
);

