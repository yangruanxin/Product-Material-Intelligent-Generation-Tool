// app/api/generate-image/route.ts
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("【来源】Cookie 解析结果:", user ? `✅ 成功 (ID: ${user.id})` : "❌ 失败 (无用户)");

    // 如果没拿到 user，直接拦截
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }
    
    // 使用这个真实的 ID 替换之前的 userId 参数
    const userId = user.id;

    // 接收前端传来的参数
    const { saveImageUrl,contextImageUrl,isRegenerate,deleteMessageId, styleImageUrl,userPrompt, sessionId} = await req.json();

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          name: "图片合成任务", // 给新会话起个默认名字
        })
        .select()
        .single();
      
      if (sessionError) throw new Error("创建会话失败: " + sessionError.message);
      currentSessionId = session.id;
    }

    if (!isRegenerate) {
      await supabase.from('messages').insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'user',
        content: userPrompt,
        image_url: saveImageUrl
      });
    }

    if (isRegenerate && deleteMessageId) {
      await supabase.from('messages').delete().eq('id', deleteMessageId);
    }


    const imageGenerationPrompt = `
    #role
    你是一位资深电商视觉设计师，精通产品合成与商业海报设计。

    #task
    利用【图1】的商品主体和【图2】的视觉风格，结合用户描述，合成一张高品质的电商海报。
    
    #图片生成要求
    1. 主体层 (绝对保留)：
      - 提取【图1】中的商品主体，保持其原始轮廓、材质、透视和细节完全不变。
      - 商品必须位于画面的视觉中心或黄金分割点。

    2. 背景层 (风格迁移)：
      - 风格来源：严格提取【图2】的色调板、光影方向和构图几何感。
      - 内容重构：严禁出现【图2】中的任何具体物体（如原本的瓶子、道具等）。
      - 融合度：确保背景的光影能够合理地投射在【图1】的商品上，使其看起来自然融合，非简单贴图。

    3. 装饰层 (Decoration - 氛围贴纸)：
      - 在商品周围添加“标签式”或“浮层式”的氛围文案。
      - 文字内容：简体中文（约10字），字体风格需匹配背景氛围（如：清新、科技、国潮等）。
      - 样式：贴纸化设计，边缘清晰，不遮挡商品主体。

    #限制
    - 禁止改变图1商品的任何物理属性（变形、变色）。
    - 禁止直接复制图2的任何实体道具。
    - 背景图仅供参考，实际图片背景需要根据用户指令进行调整

    # User Description
    ${userPrompt}
    `;

    const imageResponse = await client.images.generate({
      model: process.env.VOLC_IMAGE_ENDPOINT_ID!, 
      prompt: imageGenerationPrompt,
      size: "2048x2048",
      response_format: "url",
      image: [contextImageUrl, styleImageUrl],
      watermark: false,
      sequential_image_generation: "disabled",
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    }as any);

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
        throw new Error("模型未返回图片 URL");
    }

    await supabase.from('messages').insert({
      session_id: currentSessionId,
      user_id: userId,
      role: 'assistant',
      content: JSON.stringify({ note: "图片已生成" }),
      image_url: generatedImageUrl
    });

    return NextResponse.json({ 
        success: true, 
        imageUrl: generatedImageUrl,
        sessionId: currentSessionId
    });

  } catch (error: unknown) {
    console.error("画图 API 出错:", error);
    
    let errorMessage = "生成失败";
    if (error instanceof Error) errorMessage = error.message;

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}