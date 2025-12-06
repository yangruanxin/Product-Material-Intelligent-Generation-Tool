'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Image, Send } from 'lucide-react'; 

import { ModeTabs, ModeType } from '@/components/ModeTabs';

import { FloatingFileUploadBox } from '@/components/FloatingFileUploadBox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

import { ModelId, ALL_MODELS,getModelsByMode, getDefaultModelIdByMode } from '@/src/types/model';

// 模拟素材数据，添加标题和高度变化
const demoInspiration = [
    { src: "/demo/demo1.jpg", title: "日落街头赛博朋克", height: "h-96" },
    { src: "/demo/demo2.jpg", title: "可爱的兔子3D动画", height: "h-72" },
    { src: "/demo/demo3.jpg", title: "未来主义城市景观", height: "h-80" },
    { src: "/demo/demo4.jpg", title: "复古游戏角色设计", height: "h-64" },
    { src: "/demo/demo5.jpg", title: "水彩风格的肖像画", height: "h-96" },
    { src: "/demo/demo6.jpg", title: "静谧的森林小屋", height: "h-72" },
    { src: "/demo/demo7.jpg", title: "抽象几何艺术", height: "h-80" },
    { src: "/demo/demo8.jpg", title: "科幻机甲战士", height: "h-64" },
];


// 瀑布流卡片组件
interface InspirationCardProps {
    src: string;
    title: string;
    height: string;
}

const InspirationCard: React.FC<InspirationCardProps> = ({ src, title, height }) => (
    <div className="break-inside-avoid mb-6 p-1 bg-white rounded-xl shadow-lg hover:shadow-2xl transition duration-300 cursor-pointer overflow-hidden">
        {/* 模拟图片，实际项目中应使用 Next/image 优化 */}
        <div className={`w-full ${height} bg-gray-200 rounded-lg overflow-hidden`}>
             {/* 实际项目中这里是 <Image src={src} ... /> */}
            <img 
                src={src} 
                alt={title}
                className="w-full h-full object-cover transition duration-500 ease-in-out hover:scale-[1.03]"
            />
        </div>
        <div className="p-3">
            <h3 className="text-md font-semibold text-gray-800 truncate">{title}</h3>
            <p className="text-xs text-gray-500 mt-1">@即梦用户</p>
        </div>
    </div>
);


export default function HomePage() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');

    // 状态
    const [currentMode, setCurrentMode] = useState<ModeType>("agent");//当前模式
    const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);//接收图片url

    // 用于接收上传成功的图片url
    const handleImageUpdate = useCallback((url: string | null) => {
        setFinalImageUrl(url);
    }, []);

    // 用于切换AI模型,初始值通过函数获取默认agent的模型
    const [selectedModelId, setSelectedModelId] = useState<ModelId>(getDefaultModelIdByMode("agent"));


    // 处理模式切换
    const handleModeChange = useCallback((mode: ModeType) => {
        setCurrentMode(mode);
        console.log("切换到模式:", mode);
    }, []);

    // 渲染不同模式下的输出提示
    const getPlaceholder = () => {
        switch (currentMode) {
            case 'agent':
                return "请先上传商品参考图,描述你想要的商品标题和文案内容";
            case 'image':
                return "图片";
            case 'video':
                return "视频";
            default:
                return "输入你的创意描述，让AI Agent帮你完成任务...";
        }
    }

    const submit = () => {
        const trimmedPrompt = prompt.trim();
        const models = getModelsByMode(currentMode);//获取当前模式下所有可选模型
        const selectedModel = models.find(m => m.id === selectedModelId);//找到当前选择的模型
        // 如果模型不存在或 endpoint 不存在，则警告
        if (!selectedModel || !selectedModel.endpoint) {
             toast.error("模型配置错误", { description: "请选择一个有效的模型或检查环境变量配置。" });
             return;
        }

        // 若无提示词或参考图,不能点击发送
        if (!trimmedPrompt && !finalImageUrl) {
            // 两个都缺少
            toast.warning("内容不完整", { description: "请输入文案并上传一张参考图片。" });
            return;
        }

        if (!trimmedPrompt) {
            // 缺少提示词
            toast.warning("缺少文案", { description: "请输入您想让 AI 生成的提示词或描述。" });
            return;
        }

        if (!finalImageUrl) {
            // 缺少参考图
            toast.warning("缺少素材", { description: "请先上传一张商品参考图片。" });
            return;
        }

        // 要传递的路由参数
        const params = new URLSearchParams();
        params.append('prompt', trimmedPrompt);//提示词
        params.append('mode', currentMode);//当前模式
        // 当前会话参考图
        if (finalImageUrl) {
            params.append('imageUrl', finalImageUrl);
        }
        console.log("发送的路由:",'prompt', trimmedPrompt,'mode', currentMode,'imageUrl', finalImageUrl)
        // 使用 Next.js 的路由跳转，传递 prompt
        router.push(`/generate?${params.toString()}`);
    };

    return (
        // 整个页面的背景：更柔和的渐变
        <div className="min-h-screen w-full bg-[#fcfdff] relative">
            
            {/* 顶部的模糊背景效果，增加层次感 */}
            <div className="absolute top-0 w-full h-96 bg-blue-50/50 blur-3xl opacity-50 z-0"></div>
            

                {/* Hero 输入框区 - 整体背景和定位优化 */}
                <div className="w-full flex flex-col items-center 
                                pt-24 pb-16 lg:pt-32 lg:pb-20 
                                bg-gradient-to-b from-gray-50/50 to-white 
                                relative z-10"
                >
                    {/* 标题*/}
                    <h1 className="text-5xl font-extrabold mb-4 tracking-tight 
                                bg-clip-text text-transparent 
                                bg-gradient-to-r from-blue-600 to-purple-600 
                                drop-shadow-lg lg:text-6xl"
                    >
                        AI 创作，释放无限可能
                    </h1>
                    <p className="text-gray-500 mb-10 text-lg">
                        灵感来了？一句话开始你的创作。
                    </p>
                    
                    {/* 模式选择器 */}
                    <div className="mb-4">
                        <ModeTabs currentMode={currentMode} setMode={handleModeChange} />
                    </div>

                    {/* 输入区域容器：增加立体感，略微内陷 */}
                    <div className="w-full max-w-4xl p-2 bg-white rounded-3xl 
                                    shadow-[0_10px_30px_rgba(45,91,255,0.1)] border border-gray-100 
                                    transition duration-300 hover:shadow-[0_15px_40px_rgba(45,91,255,0.2)]"
                    >
                        
                    {/* 主要输入行 */}
                    <div className="flex gap-4 items-stretch">
                        {/* 图片上传区 */}
                        <div className="aspect-square w-32 h-40 min-w-[128px] rounded-2xl ">
                            <FloatingFileUploadBox
                                onImageUploaded={handleImageUpdate}
                                initialImageUrl={null}
                                size={140}
                            />
                        </div>
                        <div className="relative flex-grow h-36">
                            {/* 输入区 */}
                            <Textarea
                                placeholder={getPlaceholder()}
                                className="w-full h-full text-lg rounded-2xl bg-white
                                        border-none focus:outline-none focus:ring-0 
                                        pl-4 pr-16 pt-4 pb-14 resize-none placeholder:text-gray-400
                                         overflow-y-scroll scrollbar-hide"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    // Shift + Enter 换行
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        submit();
                                    }
                                }}
                            />
                            
                            {/* 生成按钮：更强的渐变和悬停效果 */}
                            <Button
                                className="absolute bottom-3 right-3 bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-white h-12 w-12 p-0 rounded-full transition-opacity
                                        transform hover:scale-[1.01]" // 增加微小放大动效
                                onClick={submit}
                            >
                                <Send size={18} />
                            </Button>
                        </div>
                    </div>
                    
                    {/* 底部功能和参数 Tag - 增加视觉区隔 */}
                    <div className="flex justify-between items-center px-4 pt-3 mt-2 
                                    border-t border-gray-100/70"
                    >
                        <div className="flex space-x-3 text-gray-500 text-sm">
                            {/* 突出“即时创作” Tag */}
                            <span className="p-1 px-3 rounded-full bg-blue-50 text-blue-600 font-medium 
                                            shadow-sm hover:bg-blue-100 transition">
                                即时创作
                            </span>
                            {/* 其他参数 Tag 样式统一 */}
                            <span className="p-1 px-3 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition">3D 动画</span>
                            <span className="p-1 px-3 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition">16:9</span>
                            <span className="p-1 px-3 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer transition">更多参数...</span>
                        </div>
                        
                        {/* 图片参考按钮 (用于提醒用户，但功能已由 FloatingBox 承担) */}
                        <Button variant="ghost" className="text-sm text-gray-500 hover:text-blue-600">
                            <Image className="w-4 h-4 mr-1" />
                            图片参考
                        </Button>
                    </div>
                </div>
                    

                {/* 瀑布流区 */}
                <div className="py-10">
                    <h2 className="text-3xl font-bold mb-8 text-gray-800">
                        发现即时灵感
                    </h2>
                    
                    {/* 瀑布流容器：使用 columns 布局 */}
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-6">
                        {demoInspiration.map((item, i) => (
                            <InspirationCard
                                key={i}
                                src={item.src}
                                title={item.title}
                                height={item.height}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}