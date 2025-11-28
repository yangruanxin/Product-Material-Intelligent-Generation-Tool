import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    // 获取 sessionId 参数 (这里用到了 req)
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' }, 
        { status: 400 }
      );
    }

    // 2. 鉴权：确认用户已登录
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // 3. 查询该会话下的所有消息
    const { data: messages, error: dbError } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id) 
      .order('created_at', { ascending: true }); // 按时间顺序排列，方便前端从上往下渲染

    if (dbError) {
      throw new Error(`DB Error: ${dbError.message}`);
    }

    // 4. 返回数据
    return NextResponse.json({
      success: true,
      data: messages 
    });

  } catch (error: unknown) {
    console.error('获取聊天记录失败:', error);
    
    // 安全地获取错误信息
    const errorMessage = error instanceof Error ? error.message : "Unknown Server Error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}