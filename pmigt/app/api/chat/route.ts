import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 


const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});


export const maxDuration = 30; 

export async function POST(req: Request) {
  try {
    // 2. 初始化 Supabase 客户端 (带 Cookie 的)
    const supabase = await createClient();

    // 3. 从 Cookie 获取真实用户信息 
    // 这比 req.json().userId 可靠
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("【来源】Cookie 解析结果:", user ? `✅ 成功 (ID: ${user.id})` : "❌ 失败 (无用户)");

    // 如果没拿到 user，直接拦截
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }
    
    // 使用这个真实的 ID 替换之前的 userId 参数
    const userId = user.id;


    // 4. 解析 Body：去掉了 userId 的解构，因为上面已经拿到了
    const { userPrompt, sessionId,saveImageUrl,contextImageUrl,isRegenerate,deleteMessageId} = await req.json();

    let currentSessionId = sessionId;
    let finalImageUrl = contextImageUrl;
    if (contextImageUrl&& contextImageUrl.startsWith('http')) {
      try {
        console.log("正在下载图片并转换为 Base64...", contextImageUrl);
        const imgRes = await fetch(contextImageUrl);
        if (!imgRes.ok) throw new Error("图片下载失败");
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        finalImageUrl = `data:${contentType};base64,${base64}`;
      } catch {
        console.error("图片转 Base64 失败，降级使用原链接");
      }
    }


    // 如果前端没传 sessionId，说明是“新建会话”
    if (!currentSessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: userId, // 存入数据库的是这个“真身”ID
          name: userPrompt.slice(0, 10) || "新商品素材",
        })
        .select()
        .single();
      
      if (sessionError) throw new Error("创建会话失败: " + sessionError.message);
      currentSessionId = session.id;
    }

    // 存入用户消息
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

    const { data: placeholderMsg, error: placeholderError } = await supabase
      .from('messages')
      .insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'assistant',
        content: '', // 先存空字符串，或者是 "正在生成中..."
      })
      .select('id') // 只要 ID
      .single();

    if (placeholderError) throw new Error("创建消息占位失败");
    const newMessageId = placeholderMsg.id; // ✅ 拿到了 Message ID

    const targetModel = process.env.VOLC_ENDPOINT_ID!; 
    const systemPrompt = `
    你是一位拥有10年经验的资深电商运营专家，擅长爆款文案策划、SEO关键词优化及用户消费心理学。

    请根据用户提供的【商品信息】，深度分析产品属性、目标人群痛点及使用场景，生成一份高转化率的结构化营销素材。
    
    限制：
    1. 输出格式：必须且仅返回一个合法的 JSON 字符串。
    2. 禁止在 JSON 前后添加任何解释性文字或换行符。
    3. 确保 JSON 格式校验通过，不要有未闭合的引号或非法字符。
    4. 禁止使用markdown。
    5. 语言要求：简体中文，语气专业且具有感染力。

    
    字段定义：
    请严格按照以下字段逻辑生成内容：
    1. title (商品标题):
      - 长度：10-20个中文字符（含标点）。
      - 要求：必须包含核心关键词，采用“人群/场景 + 核心卖点 + 产品名 + 促销/修饰词”的结构，具有高点击率诱惑力。

    2. selling_points (核心卖点):
      - 数量：固定生成 3 个精选卖点。
      - 结构：采用“FAB法则”（Feature属性 + Advantage优势 + Benefit利益）。
      - 要求：每个卖点不超过 10个字，直击用户痛点。

    3. atmosphere (氛围文案):
      - 长度：10-20个字。
      - 要求：构建一个具体的使用场景或感官体验，具有画面感，激发用户的情感共鸣，而非单纯堆砌形容词。

    # Response Example
    {"title":"夏季薄款冰丝阔腿裤女高腰显瘦垂感拖地裤","selling_points":["进口冰丝面料，自带降温体感","高腰立体剪裁，视觉拉长腿部线条","垂顺不易起皱，久坐也不尴尬"],"atmosphere":"午后的阳光洒在街道，微风拂过，裤脚轻盈摆动。无论是职场通勤还是周末逛街，它都能给你带来如若无物的清凉体验，每一步都走出自信与优雅。"}

    `;
    const response = await client.chat.completions.create({
      model: targetModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: finalImageUrl } },
            { type: 'text', text: userPrompt || "生成电商素材" },
          ],
        },
      ],
      temperature: 0.5,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let accumulatedContent = ""; 

        try {
          for await (const chunk of response) {

            const content = chunk.choices[0]?.delta?.content || "";
            
            if (content) {
              controller.enqueue(encoder.encode(content));
              accumulatedContent += content;
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        } finally {
          controller.close(); 
          console.log("流式输出完毕，开始入库...");
          try {
            // 简单的 JSON 清洗逻辑
            const cleanJson = accumulatedContent.replace(/```json|```/g, '').trim();
            let parsedData = {}; 
            try {
               parsedData = JSON.parse(cleanJson);
            } catch {
               console.log("入库时 JSON 解析失败，将存储原始文本");
            }
            
            const finalContentToSave = JSON.stringify(parsedData).length > 2 
                ? JSON.stringify(parsedData) 
                : accumulatedContent;

            await supabase
              .from('messages')
              .update({
                content: finalContentToSave
              })
              .eq('id', newMessageId); // 使用之前拿到的 ID
            
            console.log(`数据库更新完成 ✅ (ID: ${newMessageId})`);
          } catch (dbError) {
             console.error("数据库存入失败:", dbError);
          }
        }
      },
    });

    // 9. 返回 Response 流对象
    // 把 SessionID 放在 Header 里，前端可以从 headers.get('x-session-id') 拿到
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Id': currentSessionId, 
        'X-Message-Id': newMessageId,
      },
    });


  } catch (error: unknown) { 
    console.error("API 调用出错:", error);
     let errorMessage = "未知错误";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}