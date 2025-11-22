// components/AuthProvider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  useEffect(() => {
    const signInAnonymously = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // 如果没有 Session，自动进行匿名登录
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) console.error('Auth Error:', error)
      }
    }

    signInAnonymously()
  }, [])

  return <>{children}</>
}