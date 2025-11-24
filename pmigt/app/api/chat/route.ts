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
    const { imageUrl, userPrompt } = await req.json();

    const targetModel = process.env.VOLC_ENDPOINT_ID!; 

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