import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 
import { getModelEndpointId } from '@/src/types/model';

const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

export const maxDuration = 300; 

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1. 鉴权 (必须最先执行，串行)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("【来源】Cookie 解析结果:", user ? `✅ 成功 (ID: ${user.id})` : "❌ 失败 (无用户)");

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }
    
    const userId = user.id;

    // 2. 解析参数
    const { userPrompt, sessionId, saveImageUrl, contextImageUrl, isRegenerate, deleteMessageId, modelId } = await req.json();
    
    const backendEndpointId = getModelEndpointId(modelId);

    if (!backendEndpointId) {
        return NextResponse.json(
            { success: false, error: `Invalid model configuration for ID: ${modelId}` }, 
            { status: 400 }
        );
    }
    //并行启动任务

    // 发起 AI 请求
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
    1. title (商品标题): 10-20字，包含核心关键词，结构：人群/场景 + 卖点 + 产品名。
    2. selling_points (核心卖点): 3个，FAB法则，每个<10字。
    3. atmosphere (氛围文案): 10-20字，场景化，画面感。

    # Response Example
    {"title":"夏季薄款冰丝阔腿裤女高腰显瘦垂感拖地裤","selling_points":["进口冰丝面料，自带降温体感","高腰立体剪裁，视觉拉长腿部线条","垂顺不易起皱，久坐也不尴尬"],"atmosphere":"午后的阳光洒在街道，微风拂过，裤脚轻盈摆动。无论是职场通勤还是周末逛街，它都能给你带来如若无物的清凉体验，每一步都走出自信与优雅。"}
    `;

    // 准备发送给 AI 的 content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [
        { type: 'text', text: userPrompt || "生成电商素材" }
    ];
    if (contextImageUrl) {
        userContent.unshift({ type: 'image_url', image_url: { url: contextImageUrl } });
    }

    const aiRequestPromise = client.chat.completions.create({
      model: backendEndpointId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
      thinking: { "type": "disabled" }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);


    // 数据库准备工作 (Session & User Message) ---
    const dbPreparationPromise = (async () => {
        let currentSessionId = sessionId;

        if (!currentSessionId) {
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .insert({
                    user_id: userId,
                    name: userPrompt?.slice(0, 10) || "新商品素材",
                })
                .select('id')
                .single();
            
            if (sessionError) throw new Error("创建会话失败: " + sessionError.message);
            currentSessionId = session.id;
        }

        // 处理旧消息删除 (Regenerate 场景)
        if (isRegenerate && deleteMessageId) {
            await supabase.from('messages').delete().eq('id', deleteMessageId);
            console.log(`✅ 旧消息清理完成 ID ${deleteMessageId}`);
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

        return currentSessionId;
    })();

    // 等待并行任务完成

    const [response, currentSessionId] = await Promise.all([
        aiRequestPromise,
        dbPreparationPromise
    ]);


    // 处理结果 & 存入最终消息
    
    // 解析 AI 响应
    const accumulatedContent = response.choices[0]?.message?.content || "";
    console.log("AI 完整返回内容:", accumulatedContent.slice(0, 100) + '...');
    
    // JSON 清洗
    let cleanText = accumulatedContent.replace(/```json|```/g, '').trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
        cleanText = jsonMatch[0];
    } else {
        console.warn("未能在 AI 响应中提取到 JSON 结构");
    }

    let parsedData = {}; 
    try {
       // 尝试解析提取后的纯 JSON 字符串
       parsedData = JSON.parse(cleanText);
    } catch (e) {
       console.error("JSON 解析仍然失败:", e);
    }
    
    // 决定最终存储内容
    // 如果解析成功，存储 stringify 后的标准 JSON
    // 如果失败，只能存储原始文本（前端需要做容错处理）
    const finalContentToSave = Object.keys(parsedData).length > 0 
        ? JSON.stringify(parsedData) 
        : accumulatedContent; // 或者你可以返回一个特定的错误 JSON 结构
        
    const { data: finalMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'assistant',
        content: finalContentToSave,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error("❌ AI 消息存入数据库失败:", insertError);
      throw new Error("AI 消息存入数据库失败");
    }

    const newMessageId = finalMsg.id;

    return NextResponse.json({
        success: true,
        sessionId: currentSessionId,
        messageId: newMessageId,
        content: finalContentToSave, 
    }, {
        headers: { 'X-Session-Id': currentSessionId, 'X-Message-Id': newMessageId },
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