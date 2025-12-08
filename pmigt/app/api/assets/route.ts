import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. 鉴权
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }

    // 2. 查询数据库
    // 逻辑：查找 messages 表，条件是：
    // - 用户是当前用户
    // - 角色是 assistant (AI 生成的)
    // - image_url 不为空 或者 video_url 不为空 (假设你数据库有这个字段，或者视情况调整)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, image_url, video_url, created_at')
      .eq('user_id', user.id)
      .eq('role', 'assistant')
      .or('image_url.neq.null,video_url.neq.null') // 关键：只要有图或有视频就算
      .order('created_at', { ascending: false }); // 最新的在前面

    if (error) {
      throw error;
    }

    // 3. 数据清洗
    // 把数据库复杂的结构，转换成前端容易用的结构
    const assets = messages.map(msg => {
      // 判断类型
      let type: 'image' | 'video' = 'image';
      let url = msg.image_url;

      // 如果有专门的 video_url 字段，或者 image_url 结尾是 .mp4
      if (msg.video_url) {
        type = 'video';
        url = msg.video_url;
      } else if (msg.image_url && msg.image_url.endsWith('.mp4')) {
        type = 'video';
      }

      // 尝试从 content JSON 中提取 prompt 或 title 作为标题
      let title = "未命名素材";
      try {
        const parsed = JSON.parse(msg.content);
        // 如果是 JSON，尝试取 title，或者 note
        title = parsed.title || parsed.note || "AI 生成素材";
      } catch {
        // 如果不是 JSON，直接截取一段文字
        title = msg.content.slice(0, 15) || "AI 生成素材";
      }

      return {
        id: msg.id,
        type,
        url,
        title,
        createdAt: msg.created_at
      };
    });

    return NextResponse.json({ success: true, data: assets });

  } catch (error: unknown) {
    console.error("获取资产库失败:", error);
    return NextResponse.json({ success: false, error}, { status: 500 });
  }
}