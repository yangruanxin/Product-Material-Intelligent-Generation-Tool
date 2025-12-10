// src/components/chat/AIMessageCard.tsx
import React, { useCallback } from 'react';
import { UIMessage } from '@/src/types/index';
import { Download, Film, Loader2, RotateCw, CheckCircle2, Quote, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { proxySupabaseUrl } from '@/utils/supabase/proxySupabase';

/*  文本解析与美化渲染 */
type ParsedText = {
  title?: string;
  bullets: string[];
  vibe?: string;
};

function parseBullets(raw: string): string[] {
  if (!raw) return [];
  const list: string[] = [];

  // 先按换行切，再处理序号和分隔符
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    // 1. 兼容 "1. xxx" / "1、xxx" / "1) xxx"
    const m = line.match(/^\s*\d+[.)、]\s*(.+)$/);
    if (m?.[1]) {
      list.push(m[1].trim());
      continue;
    }
    // 含有多项时，按中文/英文分隔符再拆
    const parts = line
      .split(/[；;、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      list.push(...parts);
    } else {
      list.push(line);
    }
  }

  // 去重  去掉过短项
  const uniq = Array.from(new Set(list)).filter((s) => s.length > 0);
  return uniq;
}

function parseSimple(text: string): ParsedText {
  const out: ParsedText = { bullets: [] };
  if (!text) return out;

  // 去掉“素材生成成功！”行和括号内整行提示
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !/^素材生成成功!?$/i.test(l) &&
        !/^\(.*\)$/.test(l)
    );

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    if (l.startsWith('标题：')) {
      out.title = l.replace(/^标题：/, '').trim();
      continue;
    }

    if (l.startsWith('氛围：')) {
      out.vibe = l.replace(/^氛围：/, '').trim();
      continue;
    }

    if (l.startsWith('卖点：')) {
      // 同行后的内容
      const sameLine = l.replace(/^卖点：/, '').trim();
      const buf: string[] = [];
      if (sameLine) buf.push(sameLine);

      // 收集后续行，直到遇到新段落键或结束
      let j = i + 1;
      while (j < lines.length && !/^标题：|^氛围：/.test(lines[j])) {
        buf.push(lines[j]);
        j++;
      }
      i = j - 1;

      out.bullets = parseBullets(buf.join('\n')).slice(0, 3); // 只取前三条
      continue;
    }
  }

  return out;
}

const TextPrettyCard: React.FC<{ text?: string }> = ({ text }) => {
  const parsed = parseSimple(text ?? '');

  return (
    <div
      className="
        p-5 md:p-6
        bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl
        rounded-2xl rounded-tl-none
        shadow-lg border border-gray-200/60 dark:border-gray-700/60
        text-gray-800 dark:text-gray-100
        space-y-4
      "
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {/* 标题：渐变高亮 */}
      {parsed.title && (
        <div className="flex items-start gap-2">
          <Sparkles className="w-5 h-5 mt-0.5" />
          <h3
            className="
              text-lg md:text-xl font-extrabold tracking-tight
              bg-clip-text text-transparent
              bg-gradient-to-r from-gray-900 via-purple-600 to-blue-600
              dark:from-white dark:via-purple-300 dark:to-blue-300
              leading-snug
            "
          >
            {parsed.title}
          </h3>
        </div>
      )}

      {/* 卖点：清晰的 3 条列表 */}
      {!!parsed.bullets.length && (
        <div>
          <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">卖点</div>
          <ul className="space-y-2">
            {parsed.bullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-[15px] leading-relaxed">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 氛围：信息条 */}
      {parsed.vibe && (
        <div
          className="
            mt-1 p-3 rounded-xl border
            bg-blue-50/70 dark:bg-blue-500/10
            border-blue-200/70 dark:border-blue-900/40
            text-blue-800 dark:text-blue-200
          "
        >
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[14.5px] leading-relaxed">{parsed.vibe}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* 下载（跨域安全）  */
function getFileNameFromHeaders(headers: Headers, fallback: string) {
  const cd = headers.get('content-disposition') || '';
  // eslint-disable-next-line no-useless-escape
  const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].replace(/"/g, ''));
    } catch {
      return match[1];
    }
  }
  return fallback;
}
async function downloadAsset(rawUrl: string) {
  const url = proxySupabaseUrl(rawUrl);
  const fallbackName = rawUrl.substring(rawUrl.lastIndexOf('/') + 1) || 'asset';
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const name = getFileNameFromHeaders(res.headers, fallbackName);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = name.includes('.') ? name : `${name}.${blob.type.split('/')[1] ?? 'bin'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

interface AIMessageCardProps {
  message: UIMessage;
  onMediaClick: (url: string, type: 'image' | 'video') => void;
  isLastAIMessage: boolean;
  onRegenerate: (message: UIMessage) => void;
}

export const AIMessageCard: React.FC<AIMessageCardProps> = ({
  message,
  onMediaClick,
  isLastAIMessage,
  onRegenerate,
}) => {
  const { text, imageUrl, videoUrl, loading, isImageTask, isVideoTask } = message;
  const ImageCard = !!imageUrl && !videoUrl;
  const VideoCard = !!videoUrl && !imageUrl;

  const handleDownload = useCallback((url: string) => {
    void downloadAsset(url);
  }, []);

  const ReGenerateButton: React.FC<{
    message: UIMessage;
    onRegenerate: (msg: UIMessage) => void;
  }> = ({ message, onRegenerate }) => (
    <div className="flex justify-start pt-2">
      <button
        onClick={() => onRegenerate(message)}
        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-full shadow-md transition-all duration-300 transform bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 hover:shadow-lg hover:scale-[1.02]"
        title="重新生成此回复"
      >
        <RotateCw className="h-4 w-4" />
        <span>重新生成</span>
      </button>
    </div>
  );

  const shouldShowRegenerate = isLastAIMessage && !loading;
  const renderRegenerateButton = () =>
    shouldShowRegenerate ? <ReGenerateButton message={message} onRegenerate={onRegenerate} /> : null;

  if (loading) {
    if (!isImageTask && !isVideoTask) {
      return (
        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-3 pt-3 max-w-lg">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      );
    }
    const loadingMessage = isImageTask ? '🎨 图片生成中，请耐心等待...' : isVideoTask ? '🎬 视频生成中，这需要较长时间...' : '';
    return (
      <div className="flex gap-3 items-start">
        <div className="flex items-center min-w-0 p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl rounded-tl-none shadow-lg border border-gray-200/60 dark:border-gray-700/60 text-gray-800 dark:text-gray-200 leading-relaxed text-[15px]">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
          <p className="font-medium">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  // —— 纯文本：使用美化卡片 —— 
  if (!ImageCard && !VideoCard) {
    return (
      <div className="flex items-start space-x-4">
        <div className="flex flex-col flex-1 min-w-0 max-w-xl">
          <TextPrettyCard text={text ?? ''} />
          {renderRegenerateButton()}
        </div>
      </div>
    );
  }

  // —— 图片卡片 —— 
  if (ImageCard) {
    return (
      <div className="flex items-start space-x-4">
        <div className="flex flex-col">
          <div
            className="
              relative 
              w-[160px] h-[160px]
              rounded-xl overflow-hidden shadow-xl
              border border-primary-500/40 
              hover:shadow-2xl transition-all duration-300
              mt-2
            "
          >
            <img
              src={proxySupabaseUrl(imageUrl!)}
              alt="AI生成图片"
              onClick={() => imageUrl && onMediaClick(imageUrl, 'image')}
              className="object-cover w-full h-full"
              crossOrigin="anonymous"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <Button
              onClick={() => imageUrl && handleDownload(imageUrl)}
              className="absolute top-3 right-3 p-3 bg-gradient-to-r from-[#00ccff] to-[#ff006a] rounded-full shadow-md transition-colors duration-200 group flex items-center justify-center"
              title="下载图片"
            >
              <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
          {renderRegenerateButton()}
        </div>
      </div>
    );
  }

  // —— 视频卡片 —— 
  if (VideoCard) {
    return (
      <div className="flex items-start space-x-4 ">
        <div className="flex flex-col">
          <div className="flex-1 min-w-0 p-3 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl rounded-tl-none shadow-xl border border-gray-200/60 dark:border-gray-700/60">
            <div className="w-full rounded-xl overflow-hidden border border-red-500/40 bg-black shadow-lg mx-auto aspect-video max-w-[300px]">
              <div className="relative w-full h-full">
                <video
                  src={proxySupabaseUrl(videoUrl!)}
                  controls
                  onClick={() => videoUrl && onMediaClick(videoUrl, 'video')}
                  className="object-contain w-full h-full"
                  autoPlay={false}
                  // @ts-expect-error fetchPriority typing
                  fetchPriority="high"
                  preload="metadata"
                >
                  您的浏览器不支持视频播放。
                </video>
                <div className="absolute top-3 right-3 px-3 py-1 text-xs font-medium text-white rounded-full shadow-md bg-white/40 backdrop-blur-sm">
                  <Film className="inline h-3 w-3 mr-1" /> 视频素材
                </div>
              </div>
            </div>
          </div>
          {renderRegenerateButton()}
        </div>
      </div>
    );
  }

  return null;
};
