// app/api/generate-image/route.ts
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const client = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // 接收前端传来的参数
    const { productImageUrl, styleImageUrl,userPrompt} = await req.json();

    const imageGenerationPrompt = `
   你是一个专业的电商图片生成师，请你参考图2的设计，给图一中的商品设计一张电商主图，要求如下：
   1.在图片的四周中添加一个文字贴纸内容为根据图一(商品)的内容生成的主图氛围(约10个字),使用简体中文
   2."${userPrompt}"
    `;

    const imageResponse = await client.images.generate({
      model: process.env.VOLC_IMAGE_ENDPOINT_ID!, 
      prompt: imageGenerationPrompt,
      size: "1024x1024",
      // @ts-expect-error: ignore type check
      extra_body: {
        image: [productImageUrl, styleImageUrl],
        return_url: true,
        sequential_image_generation: "disabled",
      }
    });

    const generatedImageUrl = imageResponse.data?.[0]?.url;

    if (!generatedImageUrl) {
        throw new Error("模型未返回图片 URL");
    }

    return NextResponse.json({ 
        success: true, 
        imageUrl: generatedImageUrl 
    });

  } catch (error: unknown) {
    console.error("画图 API 出错:", error);
    
    let errorMessage = "生成失败";
    if (error instanceof Error) errorMessage = error.message;

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}