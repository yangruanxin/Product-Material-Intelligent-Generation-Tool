'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

import { ModeTabs, ModeType } from '@/components/ModeTabs';
import { FloatingFileUploadBox } from '@/components/FloatingFileUploadBox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { getModelsByMode } from '@/src/types/model';
import { ModelSelector } from '@/components/ModelSelector';
import { useInitialSessionLoader } from '@/hooks/useInitialSessionLoader';
import { useGenStore } from '@/src/store/useGenStore';
import InspirationMasonry from '@/components/InspirationMasonry';

export default function HomePage() {
  useInitialSessionLoader();
  const router = useRouter();

  // ===== 原有逻辑（未改） =====
  const prompt = useGenStore(state => state.homePrompt);
  const currentMode = useGenStore(state => state.homeMode);
  const selectedModelId = useGenStore(state => state.homeModelId);
  const finalImageUrl = useGenStore(state => state.homeImageUrl);
  const isHydrated = useGenStore(state => state.isHydrated);

  const setPrompt = useGenStore(state => state.setHomePrompt);
  const setCurrentMode = useGenStore(state => state.setHomeMode);
  const setSelectedModelId = useGenStore(state => state.setHomeModelId);
  const setFinalImageUrl = useGenStore(state => state.setHomeImageUrl);

  const setActiveSessionId = useGenStore(state => state.setActiveSessionId);
  const setMessages = useGenStore(state => state.setMessages);
  const setShouldLaunchNewSession = useGenStore(state => state.setShouldLaunchNewSession);

  const handleImageUpdate = useCallback((url: string | null) => {
    setFinalImageUrl(url);
  }, [setFinalImageUrl]);

  const handleModeChange = useCallback((mode: ModeType) => {
    setCurrentMode(mode);
    console.log("切换到模式:", currentMode,"当前模型为：",selectedModelId);
  }, []);

  const getPlaceholder = () => {
    switch (currentMode) {
      case 'agent':
        return "请先上传商品参考图,描述你想要的商品标题和文案内容";
      case 'image':
        return "请先上传商品参考图,描述你想要的商品主图氛围";
      case 'video':
        return "请先上传商品参考图,描述你想要的商品讲解视频";
      default:
        return "输入你的创意描述，让AI Agent帮你完成任务...";
    }
  }

  const models = getModelsByMode(currentMode);

  const submit = () => {
    const trimmedPrompt = prompt.trim();
    const selectedModel = models.find(m => m.id === selectedModelId);
    if (!selectedModel || !selectedModel.endpoint) {
      toast.error("模型配置错误", { description: "请选择一个有效的模型或检查环境变量配置。" });
      return;
    }
    if (!trimmedPrompt && !finalImageUrl) {
      toast.warning("内容不完整", { description: "请输入文案并上传一张参考图片。" });
      return;
    }
    if (!trimmedPrompt) {
      toast.warning("缺少文案", { description: "请输入您想让 AI 生成的提示词或描述。" });
      return;
    }
    if (!finalImageUrl) {
      toast.warning("缺少素材", { description: "请先上传一张商品参考图片。" });
      return;
    }
    setActiveSessionId(null);
    setMessages([]);
    setShouldLaunchNewSession(true);
    router.push('/generate');
  };

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    // 1. 整体背景：改为极淡的冷灰/白背景，增加文字质感
    <div className="min-h-screen w-full relative overflow-hidden bg-[#F8FAFC] text-slate-800">
      
      {/* ===== 背景装饰层 (只改颜色和质感，不改位置) ===== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* 新增：噪点纹理 (提升高级感的关键) */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%20opacity%3D%221%22%2F%3E%3C%2Fsvg%3E')]"></div>
        
        {/* 动态光球：颜色调整为更高级的 Indigo/Violet/Blue */}
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-indigo-300/30 blur-[100px] animate-float-slow -z-10" />
        <div className="absolute top-32 -right-32 w-[600px] h-[600px] rounded-full bg-purple-200/30 blur-[120px] animate-float-slower -z-10" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-200/40 blur-[90px] animate-float-slow -z-10" />
      </div>

      {/* Hero / 输入区 (布局完全保持原样) */}
      <motion.div
        className="w-full flex flex-col items-center pt-24 pb-16 lg:pt-32 lg:pb-20 relative z-10"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* 标题：字体更紧凑，渐变更深沉 */}
        <motion.h1
          className="text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight
                 bg-clip-text text-transparent 
                 bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 drop-shadow"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
        >
          AI 创作，释放无限可能
        </motion.h1>
        <motion.p
          className="text-slate-500 mb-10 text-lg font-light tracking-wide"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.1 }}
        >
          灵感来了？一句话开始你的创作。
        </motion.p>

        {/* 模式选择器 */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
        >
          <ModeTabs currentMode={currentMode} setMode={handleModeChange} />
        </motion.div>

        {/* 输入卡片：更通透的玻璃拟态 */}
        <motion.div
          className="w-full max-w-4xl p-3 rounded-[2rem]
                     bg-white/60 backdrop-blur-2xl border border-white/60
                     shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                     hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)]
                     ring-1 ring-white/50
                     transition-all duration-500"
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          {/* 主要输入行 (结构不变) */}
          <div className="flex gap-4 items-stretch">
            {/* 图片上传区：增加一点圆角和背景 */}
            <div className="h-40 w-40 min-w-[160px] shrink-0 rounded-2xl flex items-center justify-center bg-slate-50/50 border border-slate-100/50 p-2">
              <FloatingFileUploadBox
                onImageUploaded={handleImageUpdate}
                initialImageUrl={finalImageUrl}
                size={140} // 保持这个尺寸，但外层容器现在比它大了 (160px > 140px)
              />
            </div>
            {/* 文本输入 + 发送按钮 */}
            <div className="relative flex-grow h-36">
              <Textarea
                placeholder={getPlaceholder()}
                // 优化：去掉了输入框自带的边框，让它融入卡片，增加了 focus 时的背景色变化
                className="w-full h-full text-lg rounded-2xl bg-white/40 hover:bg-white/60 focus:bg-white/80
                           border-none focus:outline-none focus:ring-0
                           pl-4 pr-16 pt-4 pb-14 resize-none placeholder:text-slate-400 text-slate-700
                           transition-colors duration-300
                           overflow-y-scroll scrollbar-hide"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />

              <Button
                // 按钮优化：使用了更高级的渐变色和弥散阴影
                className="absolute bottom-3 right-3 h-12 w-12 p-0 rounded-full text-white
                           bg-gradient-to-br from-indigo-500 to-purple-600
                           shadow-lg shadow-indigo-500/30
                           hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 active:scale-95
                           transition-all duration-300"
                onClick={submit}
                aria-label="生成"
                title="生成"
              >
                <Send size={20} />
              </Button>
            </div>
          </div>

          {/* 底部参数栏 (结构不变，增加了顶部分割线) */}
          <div className="flex justify-between items-center px-4 pt-3 mt-2 border-t border-slate-100/50">
            <ModelSelector
              value={selectedModelId}
              onChange={setSelectedModelId}
              models={models}
            />
            <div className="text-xs font-medium text-slate-400">按 Enter 快速提交 · Shift+Enter 换行</div>
          </div>
        </motion.div>

        {/* 灵感区 */}
        <motion.div
          className="py-16 w-full"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
        >
          <InspirationMasonry className="max-w-7xl" />
        </motion.div>
      </motion.div>

      {/* 动画 Keyframes 保持不变 */}
      <style>{`
        @keyframes float-slow   { 0%{transform:translateY(0)} 50%{transform:translateY(-20px)} 100%{transform:translateY(0)} }
        @keyframes float-slower { 0%{transform:translateY(0)} 50%{transform:translateY(-15px)} 100%{transform:translateY(0)} }
        .animate-float-slow{ animation: float-slow 8s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 12s ease-in-out infinite; }
        
        /* 隐藏滚动条 */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}