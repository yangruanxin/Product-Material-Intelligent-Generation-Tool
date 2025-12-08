"use client";

import { useCallback } from 'react';
import { UIMessage, UISession } from '@/src/types/index'; 
import { useGenStore } from '@/src/store/useGenStore';


interface SessionManagerHook {
    /** 当前用户的会话列表 */
    sessions: UISession[];
    /** 当前激活的会话 ID */
    activeSessionId: string | null;
    /** 会话列表是否正在加载 */
    isSessionLoading: boolean;
    /** 加载或操作会话时发生的错误 */
    sessionError: string | null;

    /** 切换当前激活的会话 */
    handleSessionChange: (id: string) => void;
    /** 新建会话（重置状态，等待第一次发消息时创建后端记录）*/
    handleNewSession: () => void;
    /** 外部调用：向会话列表添加一个新创建的会话 */
    addSession: (session: UISession) => void;
    // 加载当前会话的历史消息
    loadSessionMessages: (sessionId: string) => Promise<unknown[] | null>;
}

/**
 * 封装了会话列表的加载、切换、和状态管理逻辑。
 * @param userId 当前认证用户的 ID。
 */
export const useSessionManager = (
    userId: string | null,
    onSessionContentReset: () => void
): SessionManagerHook => {
    const sessions = useGenStore(state => state.sessions);
    const setSessions = useGenStore(state => state.setSessions);
    const activeSessionId = useGenStore(state => state.activeSessionId);
    const setActiveSessionId = useGenStore(state => state.setActiveSessionId);
    const isSessionLoading = useGenStore(state => state.isSessionLoading);
    const setIsSessionLoading = useGenStore(state => state.setIsSessionLoading);
    const sessionError = useGenStore(state => state.sessionError);
    const setSessionError = useGenStore(state => state.setSessionError);

    const setMessages = useGenStore(state => state.setMessages);
    const clearMessages = useGenStore(state => state.clearMessages);


    /**
     * 获取特定会话的历史消息记录
     * @param id 要查询的会话 ID
     * @returns {Promise<UIMessage[] | null>} 消息数组
     */
    const fetchHistoryMessages = async (id: string): Promise<unknown[] | null> => {
        try {
            const response = await fetch(`/api/messages?sessionId=${id}`, {
                method: 'GET',
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP 错误: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // 需要转换成 UIMessage 格式
                return result.data; 
            } else {
                throw new Error(result.error || "未知服务器错误");
            }
        } catch (error) {
            console.error(`加载会话 ${id} 的消息失败:`, error);
            return null;
        }
    };

    // 新建会话处理 
    const handleNewSession = useCallback(() => {
        // 重置当前激活状态，表示这是一个待创建的会话
        setActiveSessionId(null); 
        // 通知组件：执行内容状态重置（清空消息、图片等）
        onSessionContentReset();
    }, []);

    // 会话切换处理
    const handleSessionChange = useCallback((id: string) => {
        if (id === activeSessionId) {
            // 如果点击的是当前会话，不执行重置操作
            console.log("点击的仍是当前会话，返回")
            return; // 立即返回，不进行任何状态修改。
        }
        console.log(`Hook: 切换到会话: ${id}`);
        setSessionError(null);
        // 通知组件：执行内容状态重置（在加载历史消息前先清空旧内容）
        onSessionContentReset();
        setActiveSessionId(id);
    }, [onSessionContentReset,activeSessionId]);

    // 用于 handleSend 成功创建后端 session 后，更新前端列表
    const addSession = useCallback((newSession: UISession) => {
        setSessions(prev => {
            // 确保不重复添加，并放在列表最前面
            const exists = prev.some(s => s.id === newSession.id);
            if (!exists) {
                return [newSession, ...prev];
            }
            return prev;
        });
        setActiveSessionId(newSession.id); // 新创建的会话自动激活
    }, []);

    // 加载会话消息
    const loadSessionMessages = useCallback(async (sessionId: string) => {
        const messages = await fetchHistoryMessages(sessionId);
        if (messages) {
            setMessages(messages as UIMessage[]);
        }else {
            // 如果加载失败，清空消息并设置错误
            setSessionError(`无法加载会话 ${sessionId} 的历史消息。`);
            clearMessages();
        }
        return messages;
    }, [fetchHistoryMessages, setMessages, setSessionError, clearMessages]);

    return {
        sessions,
        activeSessionId,
        isSessionLoading,
        sessionError,
        handleSessionChange,
        handleNewSession,
        addSession,
        loadSessionMessages,
    };
};