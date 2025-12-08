"use client";

import { useState, useEffect } from "react";
import { Asset } from "@/src/types/index";
import { Loader2, Image as ImageIcon, Video, PlayCircle, Download, Copy, Eye } from "lucide-react";
import { toast } from "sonner";

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  // 1. 加载数据
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

  // 2. 根据 Tab 筛选数据
  const filteredAssets = assets.filter(asset => {
    if (filter === 'all') return true;
    return asset.type === filter;
  });

  // 3. 强制下载文件逻辑 (通过 Blob)
  const handleDownload = async (url: string, title: string) => {
    const toastId = toast.loading("正在准备下载...");
    
    try {
      // Fetch 请求文件的二进制数据
      const response = await fetch(url);
      if (!response.ok) throw new Error("文件下载失败");
      
      const blob = await response.blob();
      
      // 创建临时 URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // 创建隐藏的 a 标签并触发点击
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // 智能提取后缀名
      const extension = url.split('.').pop()?.split('?')[0] || (blob.type.includes('video') ? 'mp4' : 'jpg');
      
      // 设置文件名 (去除空格，防止乱码)
      link.download = `${title.slice(0, 10).replace(/\s/g, '_')}_${Date.now()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.dismiss(toastId);
      toast.success("下载已开始");
    } catch (error) {
      console.error("下载出错:", error);
      toast.dismiss(toastId);
      // 降级方案：新窗口打开
      window.open(url, '_blank');
      toast.error("自动下载失败，已为您在新窗口打开");
    }
  };

  // 4. 复制逻辑 (图片内容 / 视频链接)
  const handleCopy = async (asset: Asset) => {
    try {
      // 视频：只复制链接
      if (asset.type === 'video') {
        await navigator.clipboard.writeText(asset.url);
        toast.success("视频链接已复制");
        return;
      }

      // 图片：尝试复制图片二进制内容到剪贴板
      toast.loading("正在复制图片...", { duration: 1000 });
      
      const response = await fetch(asset.url);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      toast.success("图片已复制，可直接粘贴");
      
    } catch (error) {
      console.warn("复制图片内容失败，降级为复制链接", error);
      // 降级方案：复制链接
      await navigator.clipboard.writeText(asset.url);
      toast.success("图片链接已复制");
    }
  };

  return (
    <div className="flex-1 h-full bg-gray-50 flex flex-col overflow-hidden">
      
      {/* 顶部标题栏 */}
      <header className="px-8 py-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">资产库</h1>
          <p className="text-sm text-gray-500 mt-1">管理您生成的所有创意素材</p>
        </div>
        
        {/* 分类 Tab */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${
              filter === 'image' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImageIcon size={14} /> 图片
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${
              filter === 'video' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Video size={14} /> 视频
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 overflow-y-auto p-8">
        
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredAssets.length === 0 ? (
          // 空状态
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 opacity-50" />
            </div>
            <p>暂无相关素材，快去生成一个吧！</p>
          </div>
        ) : (
          // 网格列表
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* 媒体展示区 (固定比例容器) */}
                <div className="aspect-square relative bg-gray-100 flex items-center justify-center overflow-hidden">
                  {asset.type === 'video' ? (
                    <>
                      <video 
                        src={asset.url} 
                        className="w-full h-full object-cover"
                        muted // 静音才能自动播放预览
                        loop  // 循环播放
                        onMouseOver={e => e.currentTarget.play()}
                        onMouseOut={e => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                        }}
                      />
                      {/* 右上角视频标识 */}
                      <div className="absolute top-2 right-2 bg-black/40 text-white p-1 rounded-full backdrop-blur-sm pointer-events-none">
                        <Video size={14} />
                      </div>
                      {/* 中间播放按钮 */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                        <PlayCircle className="w-10 h-10 text-white/80" />
                      </div>
                    </>
                  ) : (
                    <img 
                      src={asset.url} 
                      alt={asset.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  
                  {/* 悬浮遮罩：操作按钮组 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     
                     {/* 1. 预览按钮 */}
                     <button 
                        onClick={() => window.open(asset.url, '_blank')}
                        className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full backdrop-blur-sm transition-transform hover:scale-110 shadow-lg"
                        title="在新窗口预览"
                     >
                        <Eye size={16} />
                     </button>

                     {/* 2. 复制按钮 */}
                     <button 
                        onClick={() => handleCopy(asset)}
                        className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full backdrop-blur-sm transition-transform hover:scale-110 shadow-lg"
                        title={asset.type === 'image' ? "复制图片" : "复制链接"}
                     >
                        <Copy size={16} />
                     </button>

                     {/* 3. 下载按钮 */}
                     <button 
                        onClick={() => handleDownload(asset.url, asset.title)}
                        className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full backdrop-blur-sm transition-transform hover:scale-110 shadow-lg"
                        title="下载"
                     >
                        <Download size={16} />
                     </button>
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-800 truncate" title={asset.title}>
                    {asset.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}