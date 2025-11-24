import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { v4 as uuidv4 } from 'uuid';

const SUPABASE_BUCKET_NAME = "images"; 
const supabase = createClient();

//获取userId
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;


export const useFileUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

     // 确保用户已登录 (或已匿名登录)
    if (!userId) {
        console.error("用户 ID 不存在，无法执行上传。");
        return null;
    }

    const uploadFileToSupabase = useCallback(async (file: File): Promise<string | null> => {
        setIsUploading(true);
        setUploadError(null);
        setUploadProgress(0);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `${uuidv4()}-${Date.now()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;
            const { data, error } = await supabase.storage
                .from(SUPABASE_BUCKET_NAME)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                });
            
            console.log(data, error);

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
    }, []);

    return {
        isUploading,
        uploadProgress,
        uploadError,
        uploadFileToSupabase,
        setUploadError
    };
};