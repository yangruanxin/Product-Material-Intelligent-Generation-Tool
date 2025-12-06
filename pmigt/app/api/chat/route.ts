import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { AIContent } from '@/src/types';

const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
<<<<<<< Updated upstream
    const { imageUrl, userPrompt } = await req.json();

    const targetModel = process.env.VOLC_ENDPOINT_ID!; 
=======
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
    const { userPrompt, sessionId,saveImageUrl,contextImageUrl,isRegenerate,deleteMessageId,endpoint_id} = await req.json();

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
>>>>>>> Stashed changes

    const systemPrompt = `
    你是一位资深电商运营专家。请根据用户提供的商品信息（图片或文字描述），生成结构化素材。
    
    严格遵守 JSON 格式返回：
    {
      "title": "商品标题(15-30字)",
      "selling_points": ["卖点1", "卖点2", "卖点3"], 
      "atmosphere": "氛围文案",
    }

    重要规则：
    1. selling_points 必须是纯字符串数组，严禁包含 "1."、"2." 等序号！
    2. 卖点之间必须分开，不要合并成一句话。
    3. 不要输出 markdown，只输出纯 JSON。
    `;

    const response = await client.chat.completions.create({
      model: endpoint_id,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: userPrompt || "生成电商素材" },
          ],
        },
      ],
      temperature: 0.5,
    });

    const aiRawText = response.choices[0].message.content;
    
    let parsedData: Partial<AIContent> & Record<string,unknown> = {};
    
    try {
      const cleanJson = aiRawText?.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleanJson || '{}');
    } catch { 
      console.log("JSON 解析失败，尝试直接处理文本");
    }

    // 3. 数据清洗与标准化
    let cleanSellingPoints: string[] = [];
    const rawPoints = parsedData.selling_points;

    // 无论 AI 返回的是字符串还是数组，统一转成 string[]
    if (Array.isArray(rawPoints)) {
      cleanSellingPoints = rawPoints
        .map(p => String(p))
        .flatMap(p => p.split(/[\n\r]+|(\d+\.\s+)/))
        .map(p => p.replace(/^\d+\.|^[-*]\s+/, '').trim())
        .filter(p => p && p.length > 2);
    } else if (typeof rawPoints === 'string') {
      cleanSellingPoints = [rawPoints];
    } else {
      // 如果完全没提取到，给个默认值
      cleanSellingPoints = ["卖点提取中..."];
    }

<<<<<<< Updated upstream
    // 4. 组装最终返回数据，严格符合 AIContent 结构
    const finalData: AIContent = {
      title: parsedData.title || "生成标题失败",
      selling_points: cleanSellingPoints,
      atmosphere: parsedData.atmosphere || "氛围感生成中...",
    };

    return NextResponse.json({
      success: true,
      data: finalData 
    });

=======
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


>>>>>>> Stashed changes
  } catch (error: unknown) { 
    console.error("API 调用出错:", error);
    
    let errorMessage = "未知错误";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}