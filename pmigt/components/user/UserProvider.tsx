"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
// 导入状态管理库
import { useGenStore } from "@/src/store/useGenStore";

interface UserContextType {
  userId: string | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  loading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const { userId, setUserId } = useGenStore();

    useEffect(() => {
        const loadUser = async () => {
        const { data } = await supabase.auth.getUser();

        if (data?.user?.id) {
            setUserId(data.user.id);
        }

        setLoading(false);
        };

        loadUser();

        // 监听认证状态变化 (登出/登入/Token刷新)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                const id = session?.user?.id || null;
                setUserId(id); // 使用 Zustand 的 setUserId
            }
        );
        
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [setUserId]);
    

    // 用于监听是否获取到userId
    useEffect(() => {
        console.log("UserId 更新了：", userId);
    }, [userId]);


    return (
        <UserContext.Provider value={{ userId, loading }}>
            {children}
        </UserContext.Provider>
    );
};
