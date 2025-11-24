import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { imageUrl, userPrompt } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: "缺少 imageUrl" }, { status: 400 });
    }

    const targetModel = process.env.VOLC_ENDPOINT_ID!; 

    // 🔥 修改点 1：Prompt 更加严厉，禁止使用序号，强制要求数组
    const systemPrompt = `
    你是一位资深电商运营专家。请根据商品主图和描述，生成结构化素材。
    
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
      model: targetModel,
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
    
   
    let parsedData: any = {};
    try {
      const cleanJson = aiRawText?.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleanJson || '{}');
    } catch (e) {
      return NextResponse.json({ success: false, raw: aiRawText });
    }

    // 🔥 修改点 2：数据清洗逻辑 (Data Cleaning)
    // 无论 AI 返回的是什么怪样子，我们都把它修整成标准的数组
    let cleanSellingPoints: string[] = [];
    const rawPoints = parsedData.selling_points;

    if (Array.isArray(rawPoints)) {
      // 情况 A: AI 返回了数组，但可能像你的截图那样，是一个长字符串 ["1. A 2. B"]
      // 或者带有序号 ["1. A", "2. B"]
      cleanSellingPoints = rawPoints
        .map(p => p.toString()) // 确保是字符串
        .flatMap(p => p.split(/[\n\r]+|(\d+\.\s+)/)) // 尝试按照换行或序号切分
        .map(p => p.replace(/^\d+\.|^[-*]\s+/, '').trim()) // 去掉开头的 1. 2. 或 - 
        .filter(p => p && p.length > 2); // 过滤掉空字符串或太短的词
        
      // 如果切分失败导致为空，就保留原始的（至少有内容）
      if (cleanSellingPoints.length === 0 && rawPoints.length > 0) {
          cleanSellingPoints = rawPoints;
      }
    } else if (typeof rawPoints === 'string') {
      // 情况 B: AI 返回了纯字符串 "1. A 2. B"
      cleanSellingPoints = [rawPoints];
    }

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || "生成标题失败",
        // 使用清洗后的数据
        selling_points: cleanSellingPoints.length > 0 ? cleanSellingPoints : ["卖点提取失败"],
        atmosphere: parsedData.atmosphere || "",
        video_script: parsedData.video_script 
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}