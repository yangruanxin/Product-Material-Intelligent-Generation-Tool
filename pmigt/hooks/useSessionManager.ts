"use client";

import { useState, useEffect, useCallback } from 'react';
import { UISession } from '@/src/types/index'; 

// 导入 API 调用函数
const API_URL = '/api/sessions'; 

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
    const [sessions, setSessions] = useState<UISession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSessionLoading, setIsSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // 会话列表获取逻辑 
    const fetchSessions = useCallback(async () => {
        if (!userId) return; // 没有用户 ID 不进行加载

        setIsSessionLoading(true);
        setSessionError(null);

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                const errorMsg = result.error || `HTTP 错误: ${response.status}`;
                throw new Error(errorMsg);
            }

            const loadedSessions: UISession[] = result.data;
            setSessions(loadedSessions);

            // 首次加载成功后，如果列表不为空且没有激活会话，则自动激活第一个
            if (loadedSessions.length > 0 && activeSessionId === null) {
                // 通常只设置列表，让组件决定何时加载消息。
                // 暂时不自动设置 activeSessionId 以保持灵活。
            }

        } catch (error) {
            console.error("加载会话列表失败:", error);
            setSessionError(error instanceof Error ? error.message : "未知服务器错误");
        } finally {
            setIsSessionLoading(false);
        }
    }, [userId, activeSessionId]);

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


    // 在用户 ID 确定后，加载会话列表
    useEffect(() => {
        if (userId) {
            fetchSessions();
        }
    }, [userId, fetchSessions]);

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
        setActiveSessionId(id);
        setSessionError(null);
        // 通知组件：执行内容状态重置（在加载历史消息前先清空旧内容）
        onSessionContentReset();
        console.log(`Hook: 切换到会话: ${id}`);
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
        return messages;
    }, []);

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