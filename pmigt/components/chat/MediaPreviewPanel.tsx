"use client";

import React, { ReactNode } from "react";
import { Image as ImageIcon, Video as VideoIcon, Loader2, Sparkles, ArrowDownCircle } from "lucide-react";
import { proxySupabaseUrl } from "@/utils/supabase/proxySupabase";

interface MediaPreviewPanelProps {
  /** 生成中的 loading 状态 */
  isLoading?: boolean;
  /** 图片结果地址 */
  imageUrl?: string | null;
  /** 视频结果地址 */
  videoUrl?: string | null;
  /** 标题（右上角栏的标题） */
  title?: string;
  /** 副标题 / 小提示 */
  subtitle?: string;
  // 用于生成中判断结果展示区是否显示loading
  currentMode: "agent" | "image" | "video";

  
  /** * 从父组件传入的上传组件
   */
  ImageUploadComponent: ReactNode;
  ModelSelectorComponent: ReactNode;
}

export const MediaPreviewPanel: React.FC<MediaPreviewPanelProps> = ({
  isLoading = false,
  imageUrl,
  videoUrl,
  title = "创作工作台",
  subtitle = "配置参考图并查看生成结果",
  ImageUploadComponent,
  ModelSelectorComponent,
}) => {
  // 当前展示的是视频还是图片
  const hasVideo = !!videoUrl;
  const hasImage = !!imageUrl;

  return (
    <div
      className="
        h-full w-full rounded-2xl border border-gray-200 
        bg-white/80 backdrop-blur-sm shadow-sm 
        flex flex-col overflow-hidden
      "
    >
      {/* 顶部栏 */}
      <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white z-20 relative">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">{title}</span>
            <span className="text-xs text-gray-400">{subtitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ">
            {/* 模型选择器*/}
            <div className="flex items-center h-full px-3 pt-1 mt-2">
              {ModelSelectorComponent}
            </div>
            {/* 右侧状态标签 */}
            <div className="flex items-center min-w-[60px] gap-1 text-[11px] px-3 py-1 rounded-2xl bg-gray-100 text-gray-500 flex-shrink-0">
              {isLoading ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>生成中...</span>
                </>
              ) : hasVideo || hasImage ? (
                <>
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="text-purple-600 font-medium">生成完毕</span>
                </>
              ) : (
                <span>待机中</span>
              )}
            </div>
          </div>
        </div>

      {/* 主要内容区域*/}
      <div className="flex-1 relative bg-gray-50/60 flex flex-col">
        
        {/* 全局背景渐变 */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(139,92,246,0.10),_transparent_55%)]" />

        {/* 上半部分：参考图输入 */}
        <div className="flex-1 z-10 flex flex-col border-b border-gray-200/60 min-h-0">
            {/* 小标题 */}
            <div className="flex-none px-4 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <ImageIcon className="w-3 h-3" />
                参考图 (Reference)
            </div>
            
            {/* 上传组件容器 */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className="h-full max-h-[220px] aspect-square w-auto flex items-center justify-center">
                    {ImageUploadComponent}
                </div>
            </div>
        </div>

        {/* 中间连接处的装饰小箭头  */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white rounded-full p-1 shadow-sm border border-gray-100">
             <ArrowDownCircle className="w-4 h-4 text-gray-300" />
        </div>

        {/* 生成结果 */}
        <div className="flex-1 z-10 flex flex-col min-h-0">
             {/* 小标题 */}
             <div className="flex-none px-4 py-2 flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                {hasVideo ? <VideoIcon className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                生成结果 (Output)
            </div>

            {/* 结果展示容器 */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                    
                    {/* Scene A: Loading */}
                    {isLoading && (
                        <div className="flex flex-col items-center gap-3 animate-pulse">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-indigo-600/80 font-medium">AI 正在生成中...</p>
                        </div>
                    )}

                    {/* Scene B: Video Result */}
                    {!isLoading && hasVideo && (
                        <div className="w-[480px] h-[280px] rounded-xl overflow-hidden shadow-sm border border-gray-200/50 bg-black flex items-center justify-center">
                            <video
                                src={videoUrl!}
                                controls
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    )}

                    {/* Scene C: Image Result */}
                    {!isLoading && !hasVideo && hasImage && (
                        <div className="h-full w-auto aspect-square max-w-[280px] max-h-[280px] rounded-xl overflow-hidden shadow-sm border border-gray-200/50">
                            <img
                                src={proxySupabaseUrl(imageUrl)!}
                                alt="Result"
                                className="w-full h-full object-cover"
                                onClick={() => window.open(proxySupabaseUrl(imageUrl!), "_blank")}
                            />
                        </div>
                    )}

                    {/* Scene D: Empty State */}
                    {!isLoading && !hasVideo && !hasImage && (
                        <div className="text-center space-y-2 opacity-50">
                            <div className="mx-auto w-10 h-10 rounded-full bg-white/50 flex items-center justify-center border border-gray-200">
                                <Sparkles className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500">
                                等待生成结果...
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
      
    </div>
    
  );
};