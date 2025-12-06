import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export const maxDuration = 300; 

const VOLC_API_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";

export async function POST(req: Request) {
  try {

      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
      }
      const userId = user.id;

    // 2. 接收参数
    const {userPrompt, sessionId,saveImageUrl,contextImageUrl,isRegenerate,deleteMessageId,endpoint_id} = await req.json();

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          name: "视频生成任务",
        })
        .select()
        .single();
       
       if (sessionError) throw new Error("创建会话失败");
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

    //  第一阶段：调用火山引擎，创建生成任务
    
    // 构造 Prompt：加上官方推荐的优化参数
    const finalPrompt = `你是一个专业的商品讲解视频生成专家，请你根据上传的的图片生成一段对图片中产品的讲解视频,要有专业的配音解说 --resolution 480p  --duration 10 --camerafixed false --watermark false`;

    const requestBody = {
      model: endpoint_id,
      content: [
        {
          type: "text",
          text: finalPrompt
        },
        {
          type: "image_url",
          image_url: {
            url: contextImageUrl // 必须是公网可访问的 URL
          }
        }
      ]
    };

    console.log("正在创建视频任务...");
    
    // 注意：这里没用 OpenAI SDK，因为视频生成的结构比较特殊，直接用 fetch 更稳
    const createRes = await fetch(VOLC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.VOLC_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
       console.error("任务创建失败:", createData);
       throw new Error(createData.error?.message || "视频任务创建失败");
    }

    const taskId = createData.id;
    console.log(`视频任务已创建，Task ID: ${taskId}，开始轮询状态...`);

    // 第二阶段：轮询查询任务状态

    let videoUrl = "";
    let status = "queued";
    const startTime = Date.now();
    const TIMEOUT = 250 * 1000; // 设置 55秒超时 (留一点余量给 response)

    while (true) {
      // 检查是否超时
      if (Date.now() - startTime > TIMEOUT) {
        throw new Error("视频生成超时，请稍后在历史记录查看");
      }

      // 等待 3 秒再查
      await new Promise(resolve => setTimeout(resolve, 10000));

      // 查询状态
      const getRes = await fetch(`${VOLC_API_URL}/${taskId}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${process.env.VOLC_API_KEY}`
        }
      });
      
      const getData = await getRes.json();
      status = getData.status; // "queued" | "running" | "succeeded" | "failed"

      console.log(`任务状态: ${status}`);

      if (status === "succeeded") {
        console.log("【调试】任务成功，返回的完整数据:", JSON.stringify(getData, null, 2));
        const content = getData.content; 
        videoUrl = content.video_url;
        break;
    }
  }

    if (!videoUrl) {
        throw new Error("任务成功但未获取到视频链接");
    }

    console.log("视频生成成功:", videoUrl);

     const { data: assistantMessage} = await supabase
      .from('messages')
      .insert({
      session_id: currentSessionId,
      user_id: userId,
      role: 'assistant',
      content: JSON.stringify({ note: "视频生成完毕" }),
      video_url: videoUrl 
    })
    .select('id')
    .single();

    return NextResponse.json({
      success: true,
      videoUrl: videoUrl,
      sessionId: currentSessionId,
      messageId: assistantMessage?.id 
    });

  } catch (error: unknown) {
    console.error("视频生成 API 出错:", error);
    let errorMessage = "生成失败";
    if (error instanceof Error) errorMessage = error.message;

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}