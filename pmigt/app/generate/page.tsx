"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// 组件
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
// 导入模型选择组件和类型
import { ModelSelector } from "@/components/ModelSelector";
import { ModelId, getModelsByMode, getDefaultModelIdByMode } from '@/src/types/model';

// supabase
import { useUser } from "@/components/user/UserProvider";


// 类型定义
import { AIContent, Message, UIMessage, UISession} from '@/src/types/index'

// 反馈提示
import { toast } from "sonner"

// 工具
import { formatAIMarketingText } from '@/utils/messageFormatter';

// 导入 Hook 和常量
import { useSessionManager } from "@/hooks/useSessionManager";
import { useSearchParams } from "next/navigation";
import { ModeType } from "@/components/ModeTabs";
import { MediaPreviewPanel } from "@/components/chat/MediaPreviewPanel";
import { FloatingFileUploadBox } from "@/components/FloatingFileUploadBox";
import { useRouter } from 'next/navigation';

export default function GeneratePage() {
    const router = useRouter();
    // 获取路由参数
    const searchParams = useSearchParams();
    const urlMode = searchParams.get('mode') as ModeType | null;
    const urlPrompt = searchParams.get('prompt') || '';
    const urlImageUrl = searchParams.get('imageUrl') || null;
    const urlModelId = searchParams.get('modelId') as ModelId | null;

    // 初始化currentMode状态,优先使用url传入的模式
    const [currentMode, setCurrentMode] = useState<ModeType>(
        urlMode && ['agent', 'image', 'video'].includes(urlMode) ? urlMode : 'agent'
    )
    // 初始化 selectedModelId 状态
    const [selectedModelId, setSelectedModelId] = useState<ModelId>(
        // 优先使用 URL 中的 modelId，否则使用当前模式的默认模型
        urlModelId && getModelsByMode(currentMode).some(m => m.id === urlModelId) 
        ? urlModelId 
        : getDefaultModelIdByMode(currentMode)
    );
    const isImageGenerationMode = useMemo(() => currentMode === "image", [currentMode]);
    const isVideoGenerationMode = useMemo(() => currentMode === "video", [currentMode]);

    // 获取userId
    const { userId, loading } = useUser();

    // 存储当前会话的消息数组
    const [messages, setMessages] = useState<UIMessage[]>([]);
    // 存储输入框内容
    const [input, setInput] = useState(urlPrompt);

    // 判断是否正在加载历史记录
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // 用于重新生成
    // 用于保存最后一条用户消息
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    // 保存最后一条AI消息的ID，用于重新生成时删除
    const [lastAIMessageId, setLastAIMessageId] = useState<string | null>(null);
    // 当前会话中使用的商品参考图片 URL ,若路由中有图片url则初始化为该图
    const [currentSessionImageUrl, setCurrentSessionImageUrl] = useState<string | null>(urlImageUrl);

    // 用于右侧媒体预览栏
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // 用于显示用户点击消息中图片的 URL 和类型
    const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
    const [previewMediaType, setPreviewMediaType] = useState<'image' | 'video' | null>(null);

    // 判断该次发送消息是否上传了新图
    const [isImageFreshlyUploaded, setIsImageFreshlyUploaded] = useState(false);


    // 会话切换时内容重置
    const resetSessionContent = useCallback(() => {
        setMessages([]);
        setCurrentSessionImageUrl(null);
        setCurrentMode('agent'); 
        setSelectedModelId('doubao-seed-vision'); // 重置为默认模式下的默认模型 ID
        
        // 确保其他相关状态也被重置，例如：
        setPreviewMediaUrl(null);
        setPreviewMediaType(null);
        setIsImageFreshlyUploaded(false);
    }, []);

    // 处理模式切换
    const handleModeChange = useCallback((mode: ModeType) => {
        if (isLoading) {
            toast.warning("任务处理中", { description: "请等待当前AI任务完成后再切换模式。" });
            return; 
        }
        const defaultModelId = getDefaultModelIdByMode(mode);
        setCurrentMode(mode);
        setSelectedModelId(defaultModelId);
    }, [isLoading]);

    // hook
    const {
        sessions,
        activeSessionId,
        addSession,
        handleNewSession,
        handleSessionChange,
        loadSessionMessages,
    } = useSessionManager(userId, resetSessionContent);

    // 监听activeId的变化来更新消息数组
    useEffect(() => {
        if (activeSessionId && messages.length === 0) {
            const loadHistory = async () => {
                // 显示加载动画
                setIsHistoryLoading(true);

                const history = await loadSessionMessages(activeSessionId);

                if (history) {
                    const dbMessages = history as Message[];

                    // 从返回的消息列表中找到用于重新生成的会话参考图 用户最后一条prompt 待删除的AI消息id 
                    let sessionImage: string | null = null;
                    let userMsg: Message | null = null;
                    let aiMsgId: string | null = null;

                    // 从后往前遍历消息，找到最后一个AI消息ID和用户消息
                    for (let i = dbMessages.length - 1; i >= 0; i--) {
                        const message = dbMessages[i];
                        // 提取最后一条AI消息ID
                        if (message.role === 'assistant' && !aiMsgId) {
                            aiMsgId = message.id;
                        }
                        // 提取最后一条用户消息
                        if (message.role === 'user' && !userMsg) {
                            userMsg = message;
                        }
                        // 提取会话参考图
                        if (message.role === 'user' && message.image_url) {
                            sessionImage = message.image_url;
                        }

                        // 若找到所需的内容则中断循环
                        if (aiMsgId && userMsg && sessionImage) {
                            break;
                        }
                    }

                    // 存储需要的消息
                    setCurrentSessionImageUrl(sessionImage);
                    if (userMsg) {
                        setLastUserMessage(userMsg.content)
                        console.log("最后一条用户消息：", userMsg.content, "当前会话参考图：", sessionImage, "需要删除的AI消息ID：", aiMsgId)
                    } else {
                        setLastUserMessage(null);
                    }
                    setLastAIMessageId(aiMsgId);


                    //格式转换 
                    const uiMessages: UIMessage[] = dbMessages.map(dbMessage => {
                        let messageText = dbMessage.content;
                        // 判断是否为AI消息且为纯文本模式
                        if (dbMessage.role === 'assistant' && !dbMessage.image_url && !dbMessage.video_url) {
                            try {
                                // 尝试解析 JSON 字符串
                                const data = JSON.parse(dbMessage.content);
                                
                                // 调用工具函数进行格式化，消除重复代码
                                messageText = formatAIMarketingText(data);
                            } catch (e) {
                                // 如果解析失败，保留原始 content 字符串
                                console.warn(`会话 ${activeSessionId} 中的 AI 消息解析失败，可能不是 JSON 格式。`, e);
                            }
                        }

                        console.log("收到的消息为:",dbMessage)

                        // 返回 UIMessage 结构
                        return {
                            id: dbMessage.id, // 确保 ID 存在
                            text: messageText, // 使用格式化后的文本
                            sender: dbMessage.role === 'assistant' ? 'ai' : dbMessage.role as 'user' | 'ai',
                            imageUrl: dbMessage.image_url || undefined,
                            videoUrl: dbMessage.video_url || undefined,
                            loading: false,
                        };
                    })
                    setMessages(uiMessages);
                }
                const MIN_DELAY_MS = 500; // 设定一个最小延迟时间

                // 使用 Promise 封装 setTimeout 来等待
                await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));
                setIsHistoryLoading(false);
            };
            loadHistory();
        }
        // 只有在 activeSessionId 改变时运行
    },[activeSessionId, loadSessionMessages, setMessages,messages.length,setLastAIMessageId,setLastUserMessage,setCurrentSessionImageUrl])

    // AI占位消息，用于加载动画，后续删除
    const placeholderIndexRef = useRef<string | null>(null);

    // 生成随机ID
    function generatePlaceholderId(): string {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // 兼容旧浏览器/环境的备用方案：时间戳 + 随机数
        return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 通用发送请求
    const handleSend = useCallback(async (
        overrideInput?: string,
        overrideImageUrl?: string,
        isFreshUpload?: boolean,
        isRegenerate: boolean = false,
        deleteMessageId?: string
    ) => {
        const trimmedInput = overrideInput ?? input.trim();
        const finalImage = overrideImageUrl ?? currentSessionImageUrl;
        const finalIsFresh = isFreshUpload ?? isImageFreshlyUploaded;
        if (isLoading  || isHistoryLoading) return;

        // 拦截请求
        if (!finalImage) {
            toast.warning("缺少素材", { description: "当前会话需要一张商品参考图，请先上传一张商品图片。" });
            return;
        }

        // 立即显示用户消息和 AI 占位消息
        const userMessage: UIMessage = { 
            text: trimmedInput, 
            sender: "user",
            // 只有本次上传了新文件，才把图片 URL 存入用户消息 (解决冗余问题)
            imageUrl: finalIsFresh ? finalImage : undefined,
        };

        // AI占位消息，用于加载特效，流式输出时会实时替换文本
        const tempId = generatePlaceholderId();
        placeholderIndexRef.current = tempId;
        const aiPlaceholder: UIMessage = {
            id:tempId,
            sender: 'ai',
            loading: true,
            text: '...', 
            isImageTask: isImageGenerationMode,
            isVideoTask: isVideoGenerationMode,
        };
        
        // 及时展示用户消息和AI占位消息
        setMessages(prev => {
            const newList = [...prev, userMessage, aiPlaceholder];
            return newList;
        });

        // 存储重新生成需要的数据
        //setLastAIMessageId
        setLastUserMessage(trimmedInput);
        setIsLoading(true);
        setInput("");

        // 根据不同模式调用不同API
        let apiEndpoint: string;
        if (isImageGenerationMode) {
            apiEndpoint = '/api/generate_image';
        } else if (isVideoGenerationMode) {
            apiEndpoint = '/api/generate_video';
        } else {
            apiEndpoint = '/api/chat';
        }

        // 构造统一请求体
        const bodyData: Record<string, unknown> = {
            contextImageUrl:finalImage,
            userPrompt: trimmedInput,
            userId: userId,
            sessionId: activeSessionId,
            saveImageUrl: finalIsFresh ? finalImage : undefined, 
            isRegenerate: isRegenerate,
            deleteMessageId: deleteMessageId, 
            modelId: urlModelId?urlModelId:selectedModelId,
        };

        console.log("发送聊天请求，bodyData JSON:", JSON.stringify(bodyData, null, 2));


        if (isImageGenerationMode) {
            bodyData.styleImageUrl = "https://ifrctixzjfnynncamthq.supabase.co/storage/v1/object/public/images/68fde908-0686-4b14-a49a-82014dce13a4/cef0470bbe57eb8159bfc3bd6e780052.jpg";
        }

        let finalResponseText = '';
        let generatedMediaUrl: string | undefined = undefined;

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
            });
            console.log("请求聊天:", response);
            const newSessionId = response.headers.get("X-Session-Id");
            console.log("activeSessionId:", activeSessionId, "newSessionId:", newSessionId);
            const result = await response.json();
            console.log("AI返回内容:", result);
            if (!response.ok) {
                const errorMessage = result.error || "未知服务错误";

                // 检查错误消息是否包含 "429" 或 "reached the set inference limit"
                if (errorMessage.includes('429') || errorMessage.includes('inference limit')) {
                    toast.error("请求失败：额度已满", { 
                        description: "您的账户已达到AI模型调用上限，请联系服务提供商。",
                        duration: 4000
                    });

                    setTimeout(() => {
                        router.push('/home'); // 跳转到首页路径
                    }, 2500);

                    return;
                }
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
            const lastMessageId = result.messageId;

            // 解析结果
            if (isImageGenerationMode) {
                // 图片模式：返回生成的图片 URL
                generatedMediaUrl = result.imageUrl; 
                setImageUrl(result.imageUrl);
                setPreviewMediaUrl(result.imageUrl);
                setPreviewMediaType('image');
                setIsLoading(false);
                finalResponseText = "图片已成功生成";
            } else if (isVideoGenerationMode) {
                // 视频模式：返回生成的视频 URL
                generatedMediaUrl = result.videoUrl; 
                setVideoUrl(result.videoUrl);
                setPreviewMediaUrl(result.videoUrl);
                setPreviewMediaType('video');
                setIsLoading(false);
                finalResponseText = "视频已成功生成";
            } else {
                // 聊天模式：解析文案
                let finalParsedData=result.content;

                try {
                    finalParsedData = JSON.parse(result.content);
                } catch (e) {
                    console.error("JSON解析失败:", result.content);
                    finalResponseText = "AI 返回内容格式错误";
                    replacePlaceholderWithFinalMessage(finalResponseText,generatedMediaUrl );
                    return;
                }
                finalResponseText = formatAIMarketingText(finalParsedData);
            }

            // 新会话 ID 维护
            if (newSessionId && !activeSessionId) {
                const newSession: UISession = { 
                    id: newSessionId, 
                    name: trimmedInput.slice(0, 10) || "新会话" 
                };
                console.log("加载新会话:", newSessionId);
                addSession(newSession);
            }
            console.log("生成的媒体url:", generatedMediaUrl)
            console.log("查看占位消息", placeholderIndexRef.current)
            // 替换列表中的最后一条 AI 消息（找不到则追加）
            setMessages(prev => {
                let replaced = false; // 追踪是否发生替换

                //  尝试替换：遍历并精准匹配 ID
                const newList = prev.map(msg => {
                    if (msg.id === tempId) {
                        replaced = true; // 标记已替换
                        
                        // 返回更新后的消息对象 (替换逻辑)
                        return { 
                            ...msg, 
                            id: lastMessageId || tempId,
                            text: finalResponseText,
                            loading: false,
                            imageUrl: result.imageUrl, 
                            videoUrl: result.videoUrl,
                        };
                    }
                    return msg;
                });

                // 如果替换失败，则追加新消息
                if (!replaced) {
                    console.warn(`找不到 ID 为 ${tempId} 的占位消息，将作为新消息追加。`);
                    
                    // 构造要追加的新消息对象
                    const finalNewMessage :UIMessage = {
                        id: lastMessageId ,
                        sender: 'ai',
                        text: finalResponseText,
                        loading: false,
                        imageUrl: result.imageUrl,
                        videoUrl: result.videoUrl,
                    };
                    
                    // 追加新消息到列表末尾
                    return [...newList, finalNewMessage];
                }

                // 如果成功替换，返回替换后的列表
                return newList;
            });
            console.log("替换完后消息列表为：", messages);
        } catch (error) {
            console.error("API调用失败:", error);
            // 错误处理：使用 tempId 替换占位符为错误提示
            const errorText = error instanceof Error ? `请求失败: ${error.message}` : "操作失败，请稍后再试";
            setMessages(prev => {
                return prev.map(msg => {
                    if (msg.id === tempId) {
                        return { 
                            ...msg, 
                            loading: false, 
                            text: errorText 
                        };
                    }
                    return msg;
                });
            });
            toast.error("操作失败", { description: "请稍后再试" });
        } finally {
            setIsLoading(false);
            setIsImageFreshlyUploaded(false);
        }

    }, [input,  currentSessionImageUrl,  isImageFreshlyUploaded,selectedModelId,
     activeSessionId, isImageGenerationMode, userId, addSession
    ]);

    const autoSentRef = useRef(false);
    
    // 若有prompt和imageUrl,自动发送
    useEffect(() => {
        // 确保同时存在提示词和图片 URL
        if (urlPrompt && urlImageUrl&&urlModelId) {
            if (autoSentRef.current) return;     // 第二次渲染直接退出
            autoSentRef.current = true;
            
            console.log(`接收到 Home 页面的 Prompt: ${urlPrompt}, Mode: ${currentMode},ModelId: ${urlModelId}, imageUrl: ${urlImageUrl}`);
            
            // 自动设置状态 确保 handleSend 能拿到最新的值
            setInput(urlPrompt);
            setCurrentSessionImageUrl(urlImageUrl);
            setIsImageFreshlyUploaded(true);
            setSelectedModelId(urlModelId);

            
            // 清除 URL 中的参数，防止刷新重复发送
            window.history.replaceState(null, '', '/generate'); 

            handleSend(urlPrompt, urlImageUrl,true);
            
            return () => { };
        }
    }, []);

    // 处理用户点击后媒体区展示新图
    const handleMessageMediaClick = useCallback((url: string, type: 'image' | 'video') => {
        const isAgentMode = currentMode === "agent";
        if (isLoading&&!isAgentMode) {
            toast.warning("生成中", {
                description: "AI 正在生成中，请稍后再预览其他素材",
            });
            return; 
        }
        setPreviewMediaUrl(url);
        setPreviewMediaType(type);
    }, []);

    return (
        <ChatLayout
            rightPanel={
                <MediaPreviewPanel
                    key={activeSessionId}
                    isLoading={isLoading}
                    imageUrl={previewMediaType === 'image' ? previewMediaUrl : null}
                    videoUrl={previewMediaType === 'video' ? previewMediaUrl : null}
                    currentMode={currentMode}

                    ModelSelectorComponent={
                        <div className="p-4 pt-0 w-full flex justify-center">
                            <ModelSelector
                                value={selectedModelId}
                                onChange={setSelectedModelId}
                                models={getModelsByMode(currentMode)} // 根据当前模式获取模型列表
                                disabled={isLoading}//加载时禁用
                            />
                        </div>
                    }
                    
                    ImageUploadComponent={
                        <FloatingFileUploadBox
                            onImageUploaded={(url) => {
                                setCurrentSessionImageUrl(url);
                                setIsImageFreshlyUploaded(true);
                            }}
                            initialImageUrl={currentSessionImageUrl}
                            size={280}
                            key={activeSessionId}
                            loading={isHistoryLoading}
                        />
                    }
                />
            }
        >
            <ChatMessageList 
                messages={messages}
                isHistoryLoading={isHistoryLoading}
                onMediaClick={handleMessageMediaClick}
            />

            <ChatInputArea
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                currentSessionImageUrl={currentSessionImageUrl}
                currentMode={currentMode}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionChange={handleSessionChange}

                handleSend={handleSend}
                handleModeChange={handleModeChange}
            />
        </ChatLayout>
    );
}
