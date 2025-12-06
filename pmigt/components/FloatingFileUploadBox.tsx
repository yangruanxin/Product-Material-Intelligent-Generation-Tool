// components/FloatingFileUploadBox.tsx
'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, X, Loader2, AlertCircle, ImagePlus } from 'lucide-react';

// 导入您提供的 Hook
import { useFileUploader } from '@/hooks/useFileUploader'; 

interface FloatingFileUploadBoxProps {
    /** 初始图片 URL */
    initialImageUrl?: string | null;
    /** 回调函数 */
    onImageUploaded: (url: string | null) => void;
    /** * 组件尺寸 (px)。如果不传，默认宽度为 100% (由父容器决定)，
     * 但依然保持 1:1 比例。
     */
    size?: number;
    /** 额外的样式类名 */
    className?: string;
    loading?: boolean;
}

// 动画配置
const containerVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
};

export const FloatingFileUploadBox: React.FC<FloatingFileUploadBoxProps> = ({ 
    initialImageUrl, 
    onImageUploaded,
    size,
    className = "",
    loading = false,
}) => {
    const {
        isUploading,
        uploadError,
        uploadFileToSupabase,
        setUploadError,
    } = useFileUploader(); 

    // 内部状态
    const [_, setUploadedFile] = useState<File | null>(null); // 仅用于逻辑，不渲染
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const [finalImageUrl, setFinalImageUrl] = useState<string | null>(initialImageUrl || null);
    const [isDragOver, setIsDragOver] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    
    useEffect(() => {
        setFilePreviewUrl(initialImageUrl || null);
        setFinalImageUrl(initialImageUrl || null);
    }, [initialImageUrl]);


    // 若有图则不允许删除只允许替换
    const clearFile = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation(); // 防止触发文件选择
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        
        setUploadedFile(null);
        setFilePreviewUrl(null);
        setFinalImageUrl(null);
        
        // 重置 input value，否则删除后不能再次上传同一文件
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [filePreviewUrl, setUploadError, onImageUploaded]);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] | null, value: string } }) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError("仅支持图片格式 (JPG, PNG, WebP)");
            return;
        }

        // 本地预览 (立即反馈)
        setUploadedFile(file);
        setFilePreviewUrl(URL.createObjectURL(file));
        setFinalImageUrl(null); 
        setUploadError(null);

        // 上传 Supabase
        const url = await uploadFileToSupabase(file);
        
        if (url) {
            setFinalImageUrl(url);
            onImageUploaded(url);
        } else {
            // 失败回滚
            setUploadedFile(null);
            setFilePreviewUrl(null);
            onImageUploaded(null);
        }
    }, [uploadFileToSupabase, setUploadError, onImageUploaded]);

    // 拖拽处理
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileChange({ target: { files: files, value: '' } } as any);
        }
    }, [handleFileChange]);

    // --- 样式计算 ---

    // 决定当前显示的图片 (优先显示最终URL，其次是本地预览)
    const displayImage = finalImageUrl || filePreviewUrl;

    // 容器的基础样式
    const containerStyle = size ? { width: size, height: size } : {};

    // 动态边框和背景色逻辑
    const getBorderState = () => {
        if (uploadError) return "border-red-400 bg-red-50 text-red-500";
        if (isDragOver) return "border-blue-500 bg-blue-50 text-blue-500 scale-[1.02]";
        if (displayImage) return "border-transparent"; // 有图时隐藏边框
        return "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-gray-100 text-gray-400 hover:text-blue-500";
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            whileHover={!isUploading ? "hover" : undefined}
            whileTap={!isUploading ? "tap" : undefined}
            
            // 强制 aspect-square (1:1), 相对定位, 溢出隐藏
            className={`
                relative aspect-square rounded-2xl cursor-pointer 
                flex flex-col items-center justify-center 
                transition-all duration-300 border-2 border-dashed
                ${isUploading || loading ? "pointer-events-none" : "cursor-pointer"}
                group overflow-hidden
                ${getBorderState()} 
                ${className}
            `}
            style={containerStyle}

            // 事件绑定
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            <AnimatePresence mode='wait'>
                {/* 正在上传 或正在加载历史会话参考图*/}
                {(isUploading||loading) && (
                    <motion.div 
                        key="uploading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm pointer-events-auto "
                    >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <span className="text-xs font-medium text-blue-600">加载中...</span>
                    </motion.div>
                )}

                {/* 显示图片 (成功或预览) */}
                {displayImage && !isUploading && (
                    <motion.div 
                        key="image"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 w-full h-full"
                    >
                        {/* 图片本体 - Full Cover */}
                        <img 
                            src={displayImage} 
                            alt="Uploaded content" 
                            className="w-full h-full object-cover rounded-xl"
                        />

                        {/* 悬停遮罩层 + 删除按钮 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            {/* 无图能删除 */}
                            {!finalImageUrl && (
                                <button
                                    onClick={clearFile}
                                    className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 hover:text-red-600 transition-colors transform hover:scale-110"
                                    title="移除图片"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            {/* 有图只能替换 */}
                            {finalImageUrl && (
                                <span className="text-white text-sm font-medium">点击区域替换图片</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 错误提示 */}
                {!displayImage && !isUploading && uploadError && (
                    <motion.div 
                        key="error"
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center text-center p-4"
                    >
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <span className="text-xs font-medium">{uploadError}</span>
                        <span className="text-[10px] opacity-70 mt-1">点击重试</span>
                    </motion.div>
                )}

                {/* 默认空状态 */}
                {!displayImage && !isUploading && !uploadError && (
                    <motion.div 
                        key="empty"
                        className="flex flex-col items-center justify-center pointer-events-none"
                    >
                        {isDragOver ? (
                            <ImagePlus className="w-10 h-10 mb-2 animate-bounce" />
                        ) : (
                            <Upload className="w-8 h-8 mb-2 opacity-80" />
                        )}
                        <span className="text-xs font-medium">
                            {isDragOver ? "松开以上传" : "点击或拖拽上传"}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};