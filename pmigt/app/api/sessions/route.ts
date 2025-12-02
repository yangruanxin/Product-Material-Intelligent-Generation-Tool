import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("当前API识别到的用户ID:", user?.id); 

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: 请先登录' },
        { status: 401 }
      );
    }

    // 2. 查询 sessions 表
    const { data: sessions, error: dbError } = await supabase
      .from('sessions')
      .select('id, name, created_at, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new Error(`DB Error: ${dbError.message}`);
    }

    // 3. 返回数据
    return NextResponse.json({
      success: true,
      data: sessions
    });

  } catch (error: unknown) { 
    console.error('获取会话列表失败:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown Server Error';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}