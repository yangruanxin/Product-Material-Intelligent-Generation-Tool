import React, { useRef, useState } from 'react';
import { PRESET_STYLES, StyleOption, CUSTOM_STYLE_ID } from '@/src/constants/styles';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { useFileUploader } from '@/hooks/useFileUploader';
import { useGenStore } from '@/src/store/useGenStore';
import { useEffect } from 'react';

interface StyleSelectorProps {
  selectedStyleId: string;
  onSelect: (style: StyleOption) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyleId, onSelect}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    isUploading, 
    uploadFileToSupabase  } = useFileUploader();
  
  // 本地预览图状态
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  
  //保存上传成功的永久 URL
  const { customStyleUrl, setCustomStyleUrl } = useGenStore();

  // 监听外部传入的 selectedStyleId，如果外部重置了，这里不需要特殊处理，状态保持即可

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const localUrl = URL.createObjectURL(file);
      setCustomPreviewUrl(localUrl); // 设置预览图

      const uploadedUrl = await uploadFileToSupabase(file);

      if (uploadedUrl) {
        setCustomStyleUrl(uploadedUrl);
        // 上传成功，选中自定义风格
        const customStyle: StyleOption = {
          id: CUSTOM_STYLE_ID,
          name: '自定义',
          imageUrl: uploadedUrl,
          description: '用户上传的参考图'
        };
        onSelect(customStyle);
        console.log("选中自定义风格：",customStyle)
      }
    } catch (error) {
      console.error("Style upload failed", error);
      setCustomPreviewUrl(null); 
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  // 关键变量：判断当前是否选中了自定义
  const isCustomSelected = selectedStyleId === CUSTOM_STYLE_ID;
  // 关键变量：判断是否已经上传过自定义图片
  const hasCustomImage = !!customPreviewUrl;

  // 处理自定义卡片的点击
  const handleCustomCardClick = () => {
    // 如果正在上传，禁止点击
    if (isUploading) return;

    // 如果已经有图了，点击仅仅是“选中它”，而不是“重新上传”
    if (hasCustomImage) {
        const customStyle: StyleOption = {
            id: CUSTOM_STYLE_ID,
            name: '自定义',
            imageUrl: customStyleUrl!, // 使用当前的预览图作为 URL
            description: '用户上传的参考图'
        };
        onSelect(customStyle);
        console.log("选中自定义风格：",customStyle)
    } else {
        // 如果没图，点击触发上传
        fileInputRef.current?.click();
    }
  };

  // 处理“替换图片”按钮点击
  const handleReplaceClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，防止触发外层的选中逻辑
    fileInputRef.current?.click();
  };
  
    useEffect(() => {
        // 返回的函数会在组件卸载时执行
        return () => {
            // 将自定义风格 URL 重置为空，实现“重置为空”的需求
            setCustomStyleUrl(null); 
        };
    }, []);

  return (
    <div className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          选择生成风格
        </label>
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {isCustomSelected ? '自定义风格' : (PRESET_STYLES.find(s => s.id === selectedStyleId)?.name || '未选择')}
        </span>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-2 pt-4">
        {/* 渲染预设风格列表 */}
        {PRESET_STYLES.map((style) => {
          const isSelected = selectedStyleId === style.id;
          return (
            <div
              key={style.id}
              onClick={() => onSelect(style)}
              className={`
                relative flex-shrink-0 w-24 cursor-pointer group
                rounded-lg overflow-hidden border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-indigo-500 ring-2 ring-indigo-100 scale-105 shadow-md' 
                  : 'border-transparent hover:border-gray-200 hover:scale-105'
                }
              `}
            >
              <div className="aspect-square relative bg-gray-100">
                <img 
                  src={style.imageUrl} 
                  alt={style.name} 
                  className={`object-cover w-full h-full transition-opacity ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-indigo-500 text-white rounded-full p-1 shadow-sm">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                )}
              </div>
              <div className={`py-1.5 text-[10px] text-center font-medium truncate px-1 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-50 text-gray-600 group-hover:bg-gray-100'}`}>
                {style.name}
              </div>
            </div>
          );
        })}

        {/* 渲染【自定义上传】卡片 */}
        <div
            onClick={handleCustomCardClick}
            className={`
                relative flex-shrink-0 w-24 cursor-pointer group flex flex-col
                rounded-lg overflow-hidden border-2 border-dashed transition-all duration-200
                ${isCustomSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                }
            `}
        >
            <div className="aspect-square relative flex items-center justify-center">
                {isUploading ? (
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                ) : (
                    hasCustomImage ? (
                        <>
                            <img src={customStyleUrl!} className="w-full h-full aspect-square object-cover" />
                            
                            {/* 选中状态下的遮罩 */}
                            {isCustomSelected && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[1px] ">
                                    <div className="bg-indigo-500 text-white rounded-full p-1 shadow-sm">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                </div>
                            )}

                            <div 
                                onClick={handleReplaceClick}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="更换图片"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </div>
                        </>
                    ) : (
                        // 没有图才显示加号
                        <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                            <Plus className="w-8 h-8 mb-1" />
                            <span className="text-[10px]">上传</span>
                        </div>
                    )
                )}
            </div>
            
            <div className={`py-1.5 text-[10px] text-center font-medium truncate px-1 ${isCustomSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                自定义
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>

      </div>
    </div>
  );
}