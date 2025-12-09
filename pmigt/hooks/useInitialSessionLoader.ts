// 用于获取到userId后马上加载会话列表

import { useEffect, useCallback } from 'react';
import { useUser } from '@/components/user/UserProvider'; // 获取 userId 和 loading
import { useGenStore } from '@/src/store/useGenStore'; 
import { UISession } from '@/src/types';

const API_URL = '/api/sessions'; 

/**
 * 负责在用户登录成功后，首次加载并持久化用户的会话列表。
 */
export const useInitialSessionLoader = () => {
    // 从 Context 获取用户状态
    const { userId, loading: isUserLoading } = useUser();
    
    // 从 Store 获取状态和 Action
    const isSessionLoading = useGenStore(state => state.isSessionLoading);//判断当前加载是否完成
    const setSessions = useGenStore(state => state.setSessions);
    const setIsSessionLoading = useGenStore(state => state.setIsSessionLoading);
    const setHasLoadedSessions = useGenStore(state => state.setHasLoadedSessions);//判断是否已加载过
    const hasLoadedSessions = useGenStore(state => state.hasLoadedSessions);
    
    // 数据获取逻辑 (使用 useCallback 避免重复创建)
    const fetchAndSetSessions = useCallback(async (id: string) => {
        // 如果正在加载，或者 Store 中已经有数据了 (防止重复加载)
        if (isSessionLoading || hasLoadedSessions) return; 

        setIsSessionLoading(true);
        console.log("开始加载用户会话列表...");

        try {
            const response = await fetch(`${API_URL}?userId=${id}`, {
                method: 'GET',
            });
            
            if (!response.ok) throw new Error('Failed to fetch sessions');

            const result = await response.json();
            const loadedSessions: UISession[] = result.data || [];
            
            // 将数据存入持久化的 Zustand Store
            setSessions(loadedSessions);
            setHasLoadedSessions(true);
            console.log("加载会话列表成功:", loadedSessions);

        } catch (error) {
            console.error("加载会话列表失败:", error);
        } finally {
            setIsSessionLoading(false);
        }
        
    }, [isSessionLoading,hasLoadedSessions, setSessions, setIsSessionLoading]);
    
    // useEffect 触发机制：用户 ID 确定后立即加载
    useEffect(() => {
        // 只有当用户加载完毕 (isUserLoading: false) 且成功获得 ID (userId) 时才触发
        if (!isUserLoading && userId) {
            fetchAndSetSessions(userId);
        }

    }, [isUserLoading, userId, fetchAndSetSessions]);
};