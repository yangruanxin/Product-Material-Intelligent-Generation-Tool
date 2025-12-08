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
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* ===== 背景层：柔光渐变 + 动态 Orbs（仅装饰） ===== */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f7faff] via-white to-[#f9fbff]" />
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-fuchsia-300/40 blur-3xl animate-float-slow -z-10" />
      <div className="absolute top-32 -right-32 w-[520px] h-[520px] rounded-full bg-blue-300/40 blur-3xl animate-float-slower -z-10" />
      <div className="absolute bottom-0 left-1/3 w-[360px] h-[360px] rounded-full bg-cyan-300/40 blur-3xl animate-float-slow -z-10" />

      {/* 原顶部柔光条增强 */}
      <div className="absolute top-0 w-full h-96 bg-blue-50/50 blur-3xl opacity-50 -z-10" />

      {/* Hero / 输入区 */}
      <motion.div
        className="w-full flex flex-col items-center pt-24 pb-16 lg:pt-32 lg:pb-20 relative z-10"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      >
        {/* 标题 */}
        <motion.h1
          className="text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight
                     bg-clip-text text-transparent 
                     bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 drop-shadow"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
        >
          AI 创作，释放无限可能
        </motion.h1>
        <motion.p
          className="text-gray-500 mb-10 text-lg"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.1 }}
        >
          灵感来了？一句话开始你的创作。
        </motion.p>

        {/* 模式选择器（轻悬浮） */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
        >
          <ModeTabs currentMode={currentMode} setMode={handleModeChange} />
        </motion.div>

        {/* 输入卡片：玻璃拟态 + 发光边 + 悬浮阴影 */}
        <motion.div
          className="w-full max-w-4xl p-2 rounded-3xl
                     bg-white/70 backdrop-blur-xl border border-white/60
                     shadow-[0_12px_40px_rgba(45,91,255,0.12)]
                     hover:shadow-[0_16px_48px_rgba(45,91,255,0.18)]
                     transition"
          initial={{ opacity: 0, y: 10, scale: 0.995 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          {/* 主要输入行 */}
          <div className="flex gap-4 items-stretch">
            {/* 图片上传区（保持逻辑不变，提升样式容器） */}
            <div className="aspect-square w-32 h-40 min-w-[128px] rounded-2xl">
              <FloatingFileUploadBox
                onImageUploaded={handleImageUpdate}
                initialImageUrl={finalImageUrl}
                size={140}
              />
            </div>

            {/* 文本输入 + 发光发送按钮 */}
            <div className="relative flex-grow h-36">
              <Textarea
                placeholder={getPlaceholder()}
                className="w-full h-full text-lg rounded-2xl bg-white/70
                           border border-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 
                           pl-4 pr-16 pt-4 pb-14 resize-none placeholder:text-gray-400
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
                className="absolute bottom-3 right-3 h-12 w-12 p-0 rounded-full text-white
                           bg-gradient-to-r from-[#ff004f] via-[#b14bff] to-[#2d5bff]
                           shadow-[0_10px_28px_rgba(45,91,255,0.35)]
                           hover:shadow-[0_12px_32px_rgba(45,91,255,0.5)]
                           transition-transform hover:scale-[1.05]"
                onClick={submit}
                aria-label="生成"
                title="生成"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>

          {/* 底部参数栏 */}
          <div className="flex justify-between items-center px-4 pt-3 mt-2 border-t border-white/70">
            <ModelSelector
              value={selectedModelId}
              onChange={setSelectedModelId}
              models={models}
            />
            <div className="text-xs text-gray-400">按 Enter 快速提交 · Shift+Enter 换行</div>
          </div>
        </motion.div>

        {/* 灵感区：标题淡入 + 更宽容器 */}
        <motion.div
          className="py-12 w-full"
          initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: 0.08 }}
        >
          <InspirationMasonry className="max-w-7xl" />
        </motion.div>
      </motion.div>

      {/* 局部动画 Keyframes（背景 Orbs 漂浮） */}
      <style>{`
        @keyframes float-slow   { 0%{transform:translateY(0)} 50%{transform:translateY(-16px)} 100%{transform:translateY(0)} }
        @keyframes float-slower { 0%{transform:translateY(0)} 50%{transform:translateY(-10px)} 100%{transform:translateY(0)} }
        .animate-float-slow{ animation: float-slow 10s ease-in-out infinite; }
        .animate-float-slower{ animation: float-slower 14s ease-in-out infinite; }
      `}</style>
    </div>
  );
}