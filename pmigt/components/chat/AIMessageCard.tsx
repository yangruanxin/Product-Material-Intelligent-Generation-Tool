//展示AI回复的消息
import React, { useCallback } from 'react';
import { UIMessage } from '@/src/types/index'; 
import { Download, Film, Loader2, RotateCw } from 'lucide-react';
import { Button } from '../ui/button';

// 格式化 JSON 风格的文本
const formatMessageText = (text: string) => {
    // AI 的成功回复包含“标题”、“卖点”等结构
    const lines = text.trim().split('\n');
    return (
        <div className="space-y-2">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;

                // 粗体强调关键词（标题、卖点）
                if (trimmedLine.startsWith('标题：') || trimmedLine.startsWith('卖点：') || trimmedLine.startsWith('氛围：')) {
                    // 按中文冒号分隔
                    const [key, value] = trimmedLine.split(/：(.+)/s);
                    return (
                        <p key={index} className="text-gray-700 dark:text-gray-300">
                            <strong className="font-semibold text-gray-900 dark:text-white">{key}：</strong>
                            {value}
                        </p>
                    );
                }
                
                // 普通文本
                return (
                    <p key={index} className="text-gray-700 dark:text-gray-300">
                        {trimmedLine}
                    </p>
                );
            })}
        </div>
    );
};



interface AIMessageCardProps {
    message: UIMessage;
    onMediaClick: (url: string, type: 'image' | 'video') => void;
    isLastAIMessage: boolean;//判断是否是最后一条生成的AI消息，用于重新生成按钮显示
    onRegenerate: (message: UIMessage) => void;//处理重新生成的按钮被点击 函数
}

/**
 * AI 回复消息卡片组件。
 * 根据消息是否包含图片 URL，渲染纯文本或图文混合布局。
 */
export const AIMessageCard: React.FC<AIMessageCardProps> = ({ message ,onMediaClick,isLastAIMessage,onRegenerate}) => {
    const { text, imageUrl, videoUrl, loading,isImageTask, isVideoTask} = message;
    
    const ImageCard = !!imageUrl && !videoUrl;
    const VideoCard = !!videoUrl && !imageUrl;

    // 处理下载函数
    const handleDownload = useCallback((url: string) => {
        // 创建一个临时的 a 标签
        const link = document.createElement('a');
        link.href = url;
        
        // 尝试从 URL 中提取文件名，如果失败则使用默认名
        const fileName = url.substring(url.lastIndexOf('/') + 1) || 'ai_generated_image.png';
        
        // 设置下载属性，强制浏览器下载文件而不是导航到它
        link.setAttribute('download', fileName);
        
        // 将链接添加到 DOM 并模拟点击
        document.body.appendChild(link);
        link.click();
        
        // 清理
        document.body.removeChild(link);
    }, []);

    // 重新生成组件
    const ReGenerateButton: React.FC<{
        message: UIMessage;
        onRegenerate: (msg: UIMessage) => void;
    }> = ({ message, onRegenerate }) => (
        <div className="flex justify-start pt-2"> 
            <button
                onClick={() => onRegenerate(message)}
                className="
                    flex items-center space-x-1.5 px-3 py-1.5
                    text-xs font-medium text-white rounded-full 
                    shadow-md transition-all duration-300 transform
                    bg-gradient-to-r from-blue-500 to-purple-500 
                    hover:from-blue-600 hover:to-purple-600 
                    hover:shadow-lg hover:scale-[1.02]
                "
                title="重新生成此回复"
            >
                <RotateCw className="h-4 w-4" />
                <span>重新生成</span>
            </button>
        </div>
    );


    // 判断重新生成按钮是否渲染
    const shouldShowRegenerate = isLastAIMessage && !loading;
    // 重新生成按钮
    const renderRegenerateButton = () => {
        if (shouldShowRegenerate) {
            // 调用 onRegenerate 并传入当前 message
            return <ReGenerateButton message={message} onRegenerate={onRegenerate}/>
        }
        return null;
    }

    //若在加载
    if (loading) {
        // 纯文本模式加载动效
        if (!isImageTask && !isVideoTask) {
            return (
                <div className="flex gap-3 items-start">
                    {/* 气泡骨架 */}
                    <div className="flex-1 space-y-3 pt-3 max-w-lg"> 
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                    </div>
                </div>
            );
        }

        // 图片/视频模式
        let loadingMessage = "";
        if (isImageTask) {
            loadingMessage = "🎨 图片生成中，请耐心等待...";
        } else if (isVideoTask) {
            loadingMessage = "🎬 视频生成中，这需要较长时间...";
        } 
        return (
            <div className="flex gap-3 items-start">
                {/* 任务提示气泡*/}
                <div className="
                    flex items-center min-w-0 p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl 
                    rounded-2xl rounded-tl-none shadow-lg border border-gray-200/60 dark:border-gray-700/60
                    text-gray-800 dark:text-gray-200 leading-relaxed text-[15px]
                ">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
                    <p className="font-medium">{loadingMessage}</p>
                </div>
            </div>
        );
    }

    // 纯文本卡片
    if (!ImageCard && !VideoCard) {
        return (
            <div className="flex items-start space-x-4">
                <div className="flex flex-col flex-1 min-w-0 max-w-2xl">
                    <div
                        className="
                            p-4
                            bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl
                            rounded-2xl rounded-tl-none 
                            shadow-lg border border-gray-200/60 dark:border-gray-700/60
                            text-gray-800 dark:text-gray-200 leading-relaxed text-[15px]
                            max-w-2xl
                        "
                        style={{ whiteSpace: 'pre-wrap' }}
                    >
                        {formatMessageText(text ?? "")}
                    </div>
                    {renderRegenerateButton()}
                </div>
            </div>    
        );
    }

    // 纯图片卡片
    if (ImageCard) {
        return (
            <div className="flex items-start space-x-4">
                <div className="flex flex-col">
                    <div className="
                        relative 
                        w-[160px] h-[160px]
                        rounded-xl overflow-hidden shadow-xl
                        border border-primary-500/40 
                        hover:shadow-2xl transition-all duration-300
                        mt-2 /* 保持与头像对齐 */
                    ">
                        <img
                            src={imageUrl} 
                            alt="AI生成图片"
                            onClick={() => imageUrl && onMediaClick(imageUrl, 'image')}
                            // 确保图片填满容器
                            className="object-cover w-full h-full" 
                        />

                        <Button
                            onClick={() => imageUrl && handleDownload(imageUrl)} // 只有当 imageUrl 存在时才执行下载
                            className="
                                absolute top-3 right-3 p-3
                                bg-gradient-to-r from-[#00ccff] to-[#ff006a]
                                rounded-full shadow-md transition-colors duration-200
                                group flex items-center justify-center
                            "
                            title="下载图片"
                        >
                            <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        </Button>
                    </div>
                    {renderRegenerateButton()}
                </div>
            </div>
        );
    }

    // 纯视频卡片
    if (VideoCard) {
        return (
            <div className="flex items-start space-x-4 ">
                <div className="flex flex-col">
                    <div className="
                        flex-1 min-w-0 p-3
                        bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl
                        rounded-2xl rounded-tl-none shadow-xl border border-gray-200/60 dark:border-gray-700/60
                    ">
                        {/* 视频内容 */}
                        <div className="
                            w-full rounded-xl overflow-hidden
                            border border-red-500/40 bg-black shadow-lg mx-auto
                            aspect-video max-w-[300px]
                        ">
                            <div className="relative w-full h-full">
                                <video
                                    src={videoUrl} 
                                    controls
                                    onClick={() => videoUrl && onMediaClick(videoUrl, 'video')}
                                    className="object-contain w-full h-full"
                                >
                                    您的浏览器不支持视频播放。
                                </video>
                                <div className="
                                    absolute top-3 right-3 px-3 py-1
                                    text-xs font-medium text-white rounded-full shadow-md
                                    bg-white/40 backdrop-blur-sm
                                ">
                                    <Film className="inline h-3 w-3 mr-1"/> 视频素材
                                </div>
                            </div>
                        </div>
                    </div>
                    {renderRegenerateButton()}
                </div>
            </div>
        );
    }
}