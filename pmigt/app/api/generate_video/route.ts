import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 
import { v4 as uuidv4 } from 'uuid'; 
import { OpenAI } from 'openai';
import { mergeVideoAndAudio } from '@/utils/video_merger';

export const maxDuration = 300; 

// 配置常量
const VOLC_Video_API_URL = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
const VOLC_TTS_API_URL = "https://openspeech.bytedance.com/api/v1/tts";
const TTS_APPID = process.env.VOLC_TTS_APPID; 
const TTS_TOKEN = process.env.VOLC_TTS_ACCESS_TOKEN; 
const CLUSTER = "volcano_tts"; // 默认集群

const llmClient = new OpenAI({
  apiKey: process.env.VOLC_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("图片下载失败");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.warn("转Base64失败，将使用原链接重试:", error);
    return url; 
  }
}

//  LLM 生成口播文案
async function generateScriptWithLLM(imageUrl: string, userPrompt: string, endpointId: string): Promise<string> {
  console.log("【LLM】正在分析图片并生成口播文案...");
  const finalImage = await imageUrlToBase64(imageUrl);

  const systemPrompt = `
  你是一个专业的短视频脚本策划师。
  请根据用户上传的商品图片和需求，创作一段 **6秒钟左右** 的口播解说词。
  
  要求：
  1. 语气自然、亲切，像真人在推荐好物。
  2. 重点描述图片中产品的核心卖点（如外观、功能、适用场景）。
  3. 字数控制在 24-30 字之间（对应约6秒语速）。
  4. **直接返回文案内容**，不要包含“好的”、“脚本如下”等废话，不要包含 Markdown 格式或 JSON 格式，直接输出纯文本。
  `;

  try {
    const response = await llmClient.chat.completions.create({
      model: endpointId, 
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: finalImage } },
            { type: 'text', text: `用户需求：${userPrompt || "介绍这款商品"}` },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
      stream: false,   
    });

    const script = response.choices[0]?.message?.content || "";
    console.log("【LLM】生成的文案:", script);
    return script;
  } catch (error) {
    console.error("LLM 生成失败，使用兜底文案:", error);
    return "这款产品非常棒，外观时尚，功能强大，非常适合您的日常使用，强烈推荐给大家。";
  }
}

// 辅助函数：调用火山引擎 TTS 生成音频文件 Buffer
async function generateTTS(text: string): Promise<Buffer> {
  if (!TTS_APPID || !TTS_TOKEN) {
    throw new Error("请配置 VOLC_TTS_APPID 和 VOLC_TTS_TOKEN");
  }

  const reqId = uuidv4();
  
  // 构造 HTTP 请求体
  const body = {
    app: {
      appid: TTS_APPID,
      token: TTS_TOKEN,
      cluster: CLUSTER
    },
    user: {
      uid: "user_1" 
    },
    audio: {
      voice_type: "zh_male_shaonianzixin_moon_bigtts", 
      encoding: "mp3",
      speed_ratio: 1.1,
      volume_ratio: 1.0,
      pitch_ratio: 1.0,
    },
    request: {
      reqid: reqId,
      text: text,
      operation: "query", 
      with_timestamp: 0
    }
  };

  const response = await fetch(VOLC_TTS_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer;${TTS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const resJson = await response.json();

  if (resJson.code !== 3000) {
    console.error("TTS Error:", resJson);
    throw new Error(resJson.message || "语音合成失败");
  }

  if (!resJson.data) {
    throw new Error("TTS未返回音频数据");
  }

  // Base64 转 Buffer
  return Buffer.from(resJson.data, 'base64');
}

export async function POST(req: Request) {
  try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
      }
      const userId = user.id;

    // 接收参数
    const { userPrompt, sessionId, saveImageUrl, contextImageUrl, isRegenerate, deleteMessageId, endpoint_id } = await req.json();

    let currentSessionId = sessionId;
    if (!currentSessionId) {
       const { data: session } = await supabase.from('sessions').insert({ user_id: userId, name: "视频生成任务" }).select().single();
       if (session) currentSessionId = session.id;
    }
    if (!isRegenerate) {
       await supabase.from('messages').insert({ session_id: currentSessionId, user_id: userId, role: 'user', content: userPrompt, image_url: saveImageUrl });
    }
    if (isRegenerate && deleteMessageId) {
      await supabase.from('messages').delete().eq('id', deleteMessageId);
    }


    console.log("正在并行执行：视频生成 & 语音合成...");

    const videoTaskPromise = (async () => {
        const finalPrompt = `你是一个专业的商品讲解视频生成专家，请你根据上传的的图片生成一段对图片中产品的讲解视频 --resolution 480p --duration 7 --camerafixed false --watermark false`;
        
        const requestBody = {
            model: endpoint_id,
            content: [
                { type: "text", text: finalPrompt },
                { type: "image_url", image_url: { url: contextImageUrl } }
            ]
        };

        const createRes = await fetch(VOLC_Video_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.VOLC_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });
        
        const createData = await createRes.json();
        if (!createRes.ok || !createData.id) throw new Error(createData.error?.message || "视频任务创建失败");
        return createData.id; 
    })();

     // 任务 B: 脚本生成 + 语音合成 
    const audioChainPromise = (async () => {
        const llmEndpoint = "ep-20251205182316-d5xsk"; 
        
        const generatedScript = await generateScriptWithLLM(contextImageUrl, userPrompt, llmEndpoint);

        // B2. 调用 TTS 生成音频
        console.log("【TTS】开始合成语音...");
        const audioBuffer = await generateTTS(generatedScript);
        
        // B3. 上传音频到 Supabase
        const fileName = `audio/${userId}/${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
            .from('generated_files')
            .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false });
            
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('generated_files').getPublicUrl(fileName);
        
        return { audioUrl: publicUrl, script: generatedScript };
    })();

    // 等待视频任务 ID 和 音频结果
    // 注意：这里我们先拿到 videoTaskId，但视频还没生成完
    const [videoTaskId, audioResult] = await Promise.all([videoTaskPromise, audioChainPromise]);
    
    console.log(`视频任务ID: ${videoTaskId}`);
    console.log(`文案: ${audioResult.script}`);
    console.log(`音频URL: ${audioResult.audioUrl}`);

    // 轮询视频状态 
    let rawVideoUrl = "";
    let status = "queued";
    const startTime = Date.now();
    const TIMEOUT = 300 * 1000; 

    while (true) {
      if (Date.now() - startTime > TIMEOUT) throw new Error("视频生成超时");
      await new Promise(resolve => setTimeout(resolve, 5000)); 

      const getRes = await fetch(`${VOLC_Video_API_URL}/${videoTaskId}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${process.env.VOLC_API_KEY}` }
      });
      const getData = await getRes.json();
      status = getData.status;

      if (status === "succeeded") {
        if (getData.content && getData.content.video_url) {
            rawVideoUrl = getData.content.video_url;
            console.log("✅ 成功获取原始视频 URL:", rawVideoUrl);
            try {
                console.log("正在转存无声视频到 Supabase...");
                const videoRes = await fetch(rawVideoUrl);
                if (videoRes.ok) {
                    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
                    const rawFileName = `videos/${userId}/${Date.now()}_raw.mp4`;
                    
                    const { error: rawUploadError } = await supabase.storage
                        .from('generated_files')
                        .upload(rawFileName, videoBuffer, {
                            contentType: 'video/mp4',
                            upsert: false
                        });

                    if (!rawUploadError) {
                        const { data: publicUrlData } = supabase.storage
                            .from('generated_files')
                            .getPublicUrl(rawFileName);
                        
                        rawVideoUrl = publicUrlData.publicUrl;
                        console.log("✅ 无声视频转存成功:", rawVideoUrl);
                    } else {
                        console.error("无声视频上传 Supabase 失败:", rawUploadError.message);
                    }
                }
            } catch (err) {
                console.error("转存无声视频过程出错 (将使用原链接):", err);
            }
        } else {
            console.error("❌ 任务状态成功，但未返回 URL。完整响应:", JSON.stringify(getData));
            throw new Error("视频生成成功但未返回链接");
        }
        break;
      }
      if (status === "failed") throw new Error("视频生成任务失败");
    }

    let finalVideoUrl = rawVideoUrl;
    
    if (rawVideoUrl && audioResult.audioUrl) {
    try {
        console.log("开始 FFmpeg 合成...");
        // 1. 合成 (Buffer)
        const mergedBuffer = await mergeVideoAndAudio(rawVideoUrl, audioResult.audioUrl);

        // 2. 上传合成视频
        const mergedFileName = `videos/${userId}/${Date.now()}_merged.mp4`;
        
        console.log("正在上传有声视频到 Supabase...");
        const { error: mergeUploadError } = await supabase.storage
            .from('generated_files')
            .upload(mergedFileName, mergedBuffer, {
                contentType: 'video/mp4',
                upsert: false
            });

        if (mergeUploadError) {
            // 如果上传失败，打印错误但不中断流程，前端还是可以拿原始视频 + 音频播放
            console.error("有声视频上传失败:", mergeUploadError.message);
        } else {
            // 3. 获取有声视频的 Public URL
            const { data: publicUrlData } = supabase.storage
                .from('generated_files')
                .getPublicUrl(mergedFileName);
            
            finalVideoUrl = publicUrlData.publicUrl;
            console.log("有声视频生成成功:", finalVideoUrl);
        }

    } catch (ffmpegError: unknown) {
        // 捕获 FFmpeg 或上传过程中的未知错误
        const msg = ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError);
        console.error("合成阶段出错 (降级为无声视频):", msg);
    }
    }

    const contentPayload = {
        note: "生成完毕",
        script: audioResult.script,
        video: finalVideoUrl,
        audio: audioResult.audioUrl,
        raw_video: rawVideoUrl 
    };

    const { data: assistantMessage} = await supabase
      .from('messages')
      .insert({
        session_id: currentSessionId,
        user_id: userId,
        role: 'assistant',
        content: JSON.stringify(contentPayload),
        video_url: finalVideoUrl,
        audio_url: audioResult.audioUrl
      })
      .select('id')
      .single();

     return NextResponse.json({
      success: true,
      videoUrl: finalVideoUrl,
      audioUrl: audioResult.audioUrl,
      script: audioResult.script,
      sessionId: currentSessionId,
      messageId: assistantMessage?.id 
    });

  } catch (error: unknown) {
    console.error("生成 API 出错:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown Server Error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}