// 输入框
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Upload, X, Loader2,Image } from "lucide-react";

interface ChatInputAreaProps {
    // 状态
    input: string;
    isLoading: boolean;
    isUploading: boolean;
    uploadedFile: File | null;
    filePreviewUrl: string | null;
    currentSessionImageUrl: string | null;
    uploadProgress: number;
    uploadError: string | null;
    isDragging: boolean;
    isImageGenerationMode: boolean;//是否需要生成主图氛围
    
    // Handlers
    setInput: (value: string) => void;
    handleSend: () => Promise<void>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    clearFile: () => void;
    toggleImageGenerationMode: () => void;
    
    // Refs
    fileInputRef: React.RefObject<HTMLInputElement|null>;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = (props) => {
    const { 
        input, isLoading, isUploading, uploadedFile, filePreviewUrl, currentSessionImageUrl, 
        uploadProgress, uploadError, isDragging, setInput, handleSend, 
        handleFileChange, handleKeyDown, handleDragOver, handleDragLeave, handleDrop, clearFile, 
        isImageGenerationMode,toggleImageGenerationMode,
        fileInputRef 
    } = props;
    
    // 拖拽区域提示文本
    const dropZoneText = React.useMemo(() => {
        if (isUploading) return `上传中... (${uploadProgress}%)`;
        if (isDragging) return "松开即可上传文件...";
        if (currentSessionImageUrl) return "当前会话图片已锁定，拖拽或点击可替换图片。";
        return "拖拽图片至此，或点击上传按钮。";
    }, [isUploading, uploadProgress, isDragging, currentSessionImageUrl]);

    // 确定发送按钮是否禁用
    const isSendDisabled = isLoading || isUploading || (!input.trim() && !currentSessionImageUrl && !uploadedFile);


    return (
        <div className="p-4 bg-white flex flex-col items-center gap-2">
            {/* 文件上传/预览区域 */}
            <div 
                className={`w-full max-w-4xl p-2 flex flex-col justify-center items-center rounded-xl transition-all duration-300 
                    ${uploadedFile || currentSessionImageUrl ? 'h-auto border border-gray-200' : 'h-24 border-dashed border-2 cursor-pointer'}
                    ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                `}
                onClick={() => {
                    if (!uploadedFile && !isUploading) fileInputRef.current?.click()
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {(uploadedFile || currentSessionImageUrl) ? (
                    <div className="flex items-center justify-between w-full p-2">
                        {/* 预览图 */}
                        <div className="flex items-center gap-3">
                            <img 
                                src={filePreviewUrl || currentSessionImageUrl || ''} 
                                alt="Current Image" 
                                className="h-16 w-16 object-cover rounded-md border"
                            />
                            <div>
                                <p className="font-semibold text-sm">
                                    {uploadedFile ? uploadedFile.name : '当前会话图片'}
                                </p>
                                <p className={`text-xs ${currentSessionImageUrl ? 'text-green-600' : 'text-gray-500'}`}>
                                    {currentSessionImageUrl ? '已设置' : '待发送/替换'}
                                </p>
                            </div>
                        </div>
                        {/* 清除按钮 */}
                        <Button 
                            onClick={clearFile}
                            variant="ghost"
                            size="icon" 
                            disabled={isUploading}
                            className="rounded-full"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">{dropZoneText}</p>
                )}
                
                {/* 错误和进度显示 */}
                {(uploadError || isUploading) && (
                    <div className="mt-1 text-sm">
                        {uploadError && <p className="text-red-500">{uploadError}</p>}
                        {isUploading && <p className="text-blue-500">上传进度: {uploadProgress}%</p>}
                    </div>
                )}
            </div>
            
            {/* 输入框和按钮组 */}
            <div className="flex w-full max-w-4xl gap-2">
                {/* 隐藏的文件输入框 */}
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />

                <Button
                    onClick={toggleImageGenerationMode}
                    variant="outline"
                    size="icon"
                    disabled={isUploading || isLoading}
                    title={isImageGenerationMode ? "关闭主图氛围生成" : "开启主图氛围生成"}
                    className={`h-12 w-12 rounded-full transition-all duration-300 ${
                        isImageGenerationMode 
                            ? "bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600" 
                            : "border-gray-300 text-gray-600 hover:text-gray-800"
                    }`}
                >
                    <Image size={20} />
                </Button>
                
                {/* 上传按钮 */}
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="icon"
                    disabled={isUploading || isLoading}
                    className="h-12 w-12 rounded-full border-gray-300 text-gray-600 hover:text-gray-800"
                    title="上传或更换图片"
                >
                    <Upload size={20} />
                </Button>
                
                {/* 文本输入框 */}
                <Input
                    placeholder={isLoading || isUploading ? "正在处理中，请稍候..." : "请输入您对素材的需求或指令..."}
                    disabled={isLoading || isUploading}
                    className="flex-1 rounded-full h-12 text-base px-6"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                
                {/* 发送按钮 */}
                <Button
                    onClick={handleSend}
                    disabled={isSendDisabled}
                    className="bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-white h-12 w-12 p-0 rounded-full transition-opacity disabled:opacity-50"
                >
                    {(isLoading || isUploading) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </Button>
            </div>
        </div>
    );
};