import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  // 1. 等待 cookies() (Next.js 15 或异步要求)
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在 Server Component (服务端组件) 中无法写入 Cookie，
            // 这个 try/catch 是为了防止在 Server Component 中调用时报错。
            // 实际写入会在 Server Action 或 Middleware 中生效。
          }
        },
      },
    }
  )
}