import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { pipeline } from 'stream';

const streamPipeline = promisify(pipeline);

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// 下载工具函数
async function downloadToTemp(url: string, prefix: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
  
  const tmpDir = os.tmpdir();
  // 使用 path.resolve 确保路径标准化
  const filePath = path.resolve(tmpDir, `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${prefix === 'vid' ? 'mp4' : 'mp3'}`);
  
  const fileStream = fs.createWriteStream(filePath);
  // @ts-expect-error" instead of
  await streamPipeline(response.body, fileStream);
  
  return filePath;
}

export async function mergeVideoAndAudio(videoUrl: string, audioUrl: string): Promise<Buffer> {
  let localVideoPath = "";
  let localAudioPath = "";
  let outputPath = "";

  try {
    console.log(`[Merger] 正在下载素材到本地...`);
    
    const [vidPath, audPath] = await Promise.all([
      downloadToTemp(videoUrl, 'vid'),
      downloadToTemp(audioUrl, 'aud')
    ]);
    
    localVideoPath = vidPath;
    localAudioPath = audPath;
    outputPath = path.resolve(os.tmpdir(), `merge_output_${Date.now()}.mp4`);

    console.log(`[FFmpeg] 视频路径: ${localVideoPath}`);
    console.log(`[FFmpeg] 音频路径: ${localAudioPath}`);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      ffmpeg(localVideoPath)
        .inputOptions([
            '-stream_loop -1', // 视频无限循环
        ])
        .input(localAudioPath)
        .outputOptions([
          // ⚠️ 核心修改：放弃 copy，使用 libx264 重编码以修复时间戳问题
          '-c:v libx264',      
          '-preset ultrafast', // 使用极速模式，性能损失极小
          '-tune zerolatency', // 优化延迟
          
          '-c:a aac',          // 音频编码
          '-strict experimental',
          '-shortest',         // 以音频时长截断
          
          '-map 0:v:0',        // 映射视频流
          '-map 1:a:0',        // 映射音频流
          
          '-pix_fmt yuv420p',  // 强制像素格式，防止播放器兼容性问题
          '-movflags +faststart' // 优化 Web 播放体验
        ])
        .output(outputPath)
        .on('start', (cmd) => {
            console.log(`[FFmpeg] 命令启动: ${cmd}`);
        })
        .on('error', (err, stdout, stderr) => {
          // ⚠️ 关键修改：打印 stderr，这才是真正的错误原因
          console.error('[FFmpeg] ❌ 合成失败:', err.message);
          console.error('[FFmpeg] 📜 详细错误日志 (stderr):', stderr);
          reject(new Error(`FFmpeg failed: ${stderr || err.message}`));
        })
        .on('end', () => {
          console.log('[FFmpeg] ✅ 合成完成，读取文件...');
          try {
            if (fs.existsSync(outputPath)) {
                const data = fs.readFileSync(outputPath);
                resolve(data);
            } else {
                reject(new Error("生成文件丢失"));
            }
          } catch (e) {
            reject(e);
          }
        })
        .run();
    });

    return buffer;

  } catch (error) {
    console.error("[Merger] 流程异常:", error);
    throw error;
  } finally {
    console.log("[Merger] 清理临时文件...");
    const filesToDelete = [localVideoPath, localAudioPath, outputPath];
    
    filesToDelete.forEach(p => {
      if (p && fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch (error: unknown) {
            console.error("❌ 测试失败:", error);
          }
      }
    });
  }
}