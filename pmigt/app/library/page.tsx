"use client";

import { useState, useEffect } from "react";
import type { FC } from "react"; 
import { Asset } from "@/src/types/index";
import { 
  Image as ImageIcon, 
  Video, 
  Download, 
  Copy, 
  Eye, 
  MoreHorizontal,
  CheckCircle2,
  LucideProps
} from "lucide-react";
import { toast } from "sonner";



// --- 1. 为 Filter 定义明确的类型 ---
type FilterType = 'all' | 'image' | 'video';

// --- 2. 为 Tab 按钮定义接口，确保类型安全 ---
interface Tab {
  id: FilterType;
  label: string;
  // icon 的类型是接受特定 props 的函数式组件 (Function Component)
  icon: FC<LucideProps>; 
}

// --- 辅助组件：骨架屏 ---
const SkeletonCard = () => (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100/50 shadow-sm">
      <div className="aspect-[3/4] bg-gray-100/80 animate-pulse relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-300" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-50 rounded w-1/3 animate-pulse" />
          <div className="h-6 w-6 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
);

// --- 辅助组件：为 onClick 指定正确的事件类型 ---
interface ActionButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ReactNode;
  tooltip: string;
}

const ActionButton = ({ onClick, icon, tooltip }: ActionButtonProps) => (
  <button 
    onClick={onClick}
    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur text-gray-700 shadow-lg flex items-center justify-center hover:bg-blue-600 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
    title={tooltip}
  >
    {icon}
  </button>
);

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets');
        const json = await res.json();
        if (json.success) {
          setAssets(json.data);
        } else {
          toast.error("加载失败", { description: json.error });
        }
      } catch (error) {
        console.error(error);
        toast.error("网络错误");
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true;
    return asset.type === filter;
  });

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>, url: string, title: string) => {
    e.stopPropagation();
    
    // 1. 创建 Toast 并获取其 ID
    const toastId = toast.loading("准备下载...");
    
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const extension = url.split('.').pop()?.split('?')[0] || (blob.type.includes('video') ? 'mp4' : 'jpg');
        link.download = `${title.slice(0, 10).replace(/\s/g, '_')}_${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        // 2. 成功后，用 ID 更新 Toast
        toast.success("已开始下载", { id: toastId });

    } catch  {
        window.open(url, '_blank');
        
        // 3. 失败后，用 ID 更新 Toast 为错误状态
        toast.error("自动下载失败，已新窗口打开", { id: toastId });
    }
};

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>, asset: Asset) => {
    e.stopPropagation();
    
    if (asset.type === 'video') {
        await navigator.clipboard.writeText(asset.url);
        toast.success("视频链接已复制");
        return;
    }

    // 1. 创建 Toast 并获取其 ID，
    const toastId = toast.loading("复制中...");

    try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        
        toast.success("图片已复制", { id: toastId });
        
    } catch (error) {
        console.warn("复制图片内容失败，降级为复制链接", error);
        await navigator.clipboard.writeText(asset.url);
        
        toast.success("链接已复制", { id: toastId });
    }
};
  
  // --- 将 tabs 数据定义为一个符合 Tab 接口的数组 ---
  const tabs: Tab[] = [
    { id: 'all', label: '全部', icon: MoreHorizontal },
    { id: 'image', label: '图片', icon: ImageIcon },
    { id: 'video', label: '视频', icon: Video },
  ];

  return (
    <div className="flex-1 h-screen bg-[#F4F6F8] flex flex-col overflow-hidden font-sans">
      
      <header className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-20 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">创意资料库</h1>
          <div className="flex items-center gap-2 mt-1">
             <span className="w-2 h-2 rounded-full bg-green-500"></span>
             <p className="text-sm text-gray-500">已生成 {assets.length} 个创意素材</p>
          </div>
        </div>
        
        <div className="bg-gray-100/80 p-1 rounded-lg flex items-center shadow-inner">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`
                  relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2
                  ${filter === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                `}
              >
                <IconComponent size={16} strokeWidth={2.5} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full h-full min-h-[400px] animate-in fade-in duration-500">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 border border-gray-50">
              <ImageIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">暂无创意素材</h3>
            <p className="text-gray-500 mt-2 text-sm max-w-xs text-center">
              您生成的图片或视频将汇集于此，快去创建您的第一个作品吧。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200/60 shadow-sm hover:shadow-xl hover:border-blue-500/30 hover:-translate-y-1 hover:ring-1 hover:ring-blue-500/20 transition-all duration-300 ease-out cursor-pointer"
              >
                <div className="aspect-square relative bg-gray-50 overflow-hidden">
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 text-white ${asset.type === 'video' ? 'bg-purple-500/90' : 'bg-blue-500/90'}`}>
                      {asset.type === 'video' ? 'VIDEO' : 'IMAGE'}
                    </span>
                  </div>
                  {asset.type === 'video' ? (
                    <>
                    <video 
                      src={asset.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      muted 
                      loop 
                      playsInline
                      onMouseOver={e => {
                      const video = e.currentTarget;
                      // play() 返回一个 Promise
                      const playPromise = video.play();
                    
                      if (playPromise !== undefined) {
                          playPromise.catch(error => {
                          console.error("报错详情:", error); 
                          });
                      }
                    }}
                    // 🟢 修改这里：更安全的暂停逻辑
                    onMouseOut={e => {
                        const video = e.currentTarget;
                        video.pause();
                        video.currentTime = 0; // 重置进度
                    }}
                    />
                    </>
                  ) : (
                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                     <ActionButton onClick={(e) => { e.stopPropagation(); window.open(asset.url, '_blank'); }} icon={<Eye size={18} />} tooltip="预览" />
                     <ActionButton onClick={(e) => handleCopy(e, asset)} icon={<Copy size={18} />} tooltip="复制" />
                     <ActionButton onClick={(e) => handleDownload(e, asset.url, asset.title)} icon={<Download size={18} />} tooltip="下载" />
                  </div>
                </div>
                <div className="p-3 bg-white border-t border-gray-50 flex flex-col gap-1 relative">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors" title={asset.title}>
                      {"未命名素材"}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 border-dashed">
                    <p className="text-xs text-gray-400 font-mono">
                      {new Date(asset.createdAt).toISOString().split('T')[0]}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
                        <CheckCircle2 size={10} />
                        <span>已生成</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
