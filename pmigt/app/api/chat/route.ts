import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

interface AIResponseData {
  title?: string;
  selling_points?: string[] | string;
  atmosphere?: string;
}

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
    
    let parsedData: AIResponseData = {};
    
    try {
      const cleanJson = aiRawText?.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleanJson || '{}');
    } catch { 
      console.log("JSON 解析失败，尝试直接处理文本");
    }

    let cleanSellingPoints: string[] = [];

    const rawPoints = parsedData.selling_points;

    if (Array.isArray(rawPoints)) {
      cleanSellingPoints = rawPoints
        .map(p => String(p))
        .flatMap(p => p.split(/[\n\r]+|(\d+\.\s+)/))
        .map(p => p.replace(/^\d+\.|^[-*]\s+/, '').trim())
        .filter(p => p && p.length > 2);
        
      if (cleanSellingPoints.length === 0 && rawPoints.length > 0) {
          cleanSellingPoints = rawPoints.map(String);
      }
    } else if (typeof rawPoints === 'string') {
      cleanSellingPoints = [rawPoints];
    }

    return NextResponse.json({
      success: true,
      data: {
        title: parsedData.title || "生成标题失败",
        selling_points: cleanSellingPoints.length > 0 ? cleanSellingPoints : ["卖点提取失败"],
        atmosphere: parsedData.atmosphere || "",
      }
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