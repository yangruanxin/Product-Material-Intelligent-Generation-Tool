import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { v4 as uuidv4 } from 'uuid';
import { useUser } from "@/components/user/UserProvider";
import { toast } from 'sonner';
// 引入图片压缩库
import imageCompression from 'browser-image-compression'; 

const SUPABASE_BUCKET_NAME = "images"; 
// 确保客户端 Supabase 实例正确初始化
const supabase = createClient(); 

/**
 * 自定义 Hook 用于处理文件上传逻辑，包含图片压缩优化。
 */
export const useFileUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // 从 UserProvider 获取 userId 和加载状态
    const { userId, loading } = useUser();

    /**
     * 对文件进行压缩和优化，然后上传到 Supabase Storage。
     * @param file 原始文件对象。
     * @returns 上传成功后的公共 URL，失败返回 null。
     */
    const uploadFileToSupabase = useCallback(async (file: File): Promise<string | null> => {
        console.log("进入上传图片函数");
        
        // 前置检查
        if (loading) {
            toast.warning("页面初始化中...", { 
                description: "请等待页面加载完成后再尝试上传。",
                duration: 5000
            });
            console.warn("UserProvider 仍在加载中，无法执行上传。");
            return null;
        }

        if (!userId) {
            toast.error("操作失败", { 
                description: "服务器连接异常，请尝试刷新页面后重试。",
                duration: 5000 
            });
            console.error("用户 ID 不存在，无法执行上传。");
            return null;
        }

        console.log("上传图片:", userId);

        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);
        
        // 压缩图片逻辑 
        let fileToUpload = file;
        
        try {
            console.log(`原始文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            
            const options = {
                maxSizeMB: 1,           // 最大文件体积限制为 1MB
                maxWidthOrHeight: 2000, // 最大边长限制为 2000px
                useWebWorker: true,     // 使用 Web Worker 提升压缩性能
                fileType: 'image/jpeg', // 强制输出 JPEG 格式
                initialQuality: 0.85,   // 初始质量
            };

            // 只有当文件超过 1MB 时才执行压缩
            if (file.size > options.maxSizeMB * 1024 * 1024) {
                 const compressedBlob = await imageCompression(file, options);
                 console.log(`压缩后文件大小: ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);
                 
                 // 将压缩后的 Blob 重新包装为 File 对象，并保持原文件名（后缀改为 .jpeg）
                 const originalFileName = file.name.split(".").slice(0, -1).join(".");
                 const newFileName = `${originalFileName}.jpeg`;
                 
                 fileToUpload = new File([compressedBlob], newFileName, { type: 'image/jpeg' });
            } else {
                console.log("文件较小，跳过压缩。");
            }

        } catch (error) {
            console.error("图片压缩失败，将上传原图:", error);
            // 失败时保持原图上传，以确保功能可用
            fileToUpload = file; 
        }

        // Supabase 上传逻辑 
        try {
            // 使用优化后的 fileToUpload 进行上传
            const fileExt = fileToUpload.name.split(".").pop();
            const fileName = `${uuidv4()}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;
            
            const { data, error } = await supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .upload(filePath, fileToUpload, { // 上传的是压缩后的文件
                    cacheControl: '3600',
                    upsert: false,
                });
            
            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .getPublicUrl(data!.path);
            
            return publicUrlData.publicUrl;

        } catch (error) {
            console.error("Supabase 上传失败:", error);
            setUploadError("图片上传失败。");
            return null;
        } finally {
            setIsUploading(false);
            setUploadProgress(100);
        }
    }, [userId, loading]);

    return {
        isUploading,
        uploadProgress,
        uploadError,
        uploadFileToSupabase,
        setUploadError
    };
};