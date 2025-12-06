// components/AuthProvider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  useEffect(() => {
    const signInAnonymously = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // 如果没有 Session，自动进行匿名登录
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Auth Error:', error)
          toast.error("认证失败", {
            description: `无法完成匿名登录：${error.message}。请检查您的网络或联系管理员。`,
            duration: 5000,
          });
        }
      }
    }

    signInAnonymously()
  }, [])

  return <>{children}</>
}