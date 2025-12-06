"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

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
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
        const { data } = await supabase.auth.getUser();

        if (data?.user?.id) {
            setUserId(data.user.id);
        }

        setLoading(false);
        };

        loadUser();
    }, []);
    
    // // 用于监听是否获取到userId
    // useEffect(() => {
    //     console.log("UserId 更新了：", userId);
    // }, [userId]);


    return (
        <UserContext.Provider value={{ userId, loading }}>
            {children}
        </UserContext.Provider>
    );
};
