<<<<<<< Updated upstream
import { Button } from "@/components/ui/button"
import { ArrowUpIcon } from "lucide-react"
=======
"use client";

import { useState, useCallback, useRef,useEffect } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
import { createClient } from '@/utils/supabase/client'; 

import { AIContent, Message, UIMessage, UISession} from '@/src/types/index'

import { toast } from "sonner"

import { formatAIMarketingText } from '@/utils/messageFormatter';

// 导入 Hook 和常量
import { useFileUploader } from "@/hooks/useFileUploader"; 
import { useSessionManager } from "@/hooks/useSessionManager";

export default function HomePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);//保存userId

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);//判断是新会话还是历史会话正在加载
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 上传和会话状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  // 当前会话中使用的图片 URL 
  const [currentSessionImageUrl, setCurrentSessionImageUrl] = useState<string | null>(null);

  // 是否需要生成主图氛围
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);

  // 是否需要生成讲解视频
  const [isVideoGenerationMode, setIsVideoGenerationMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI占位消息，用于加载动画，后续删除
  const placeholderIndexRef = useRef<number | null>(null);

  // 用于重新生成
  // 用于保存最后一条用户消息
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  // 保存最后一条AI消息的ID，用于重新生成时删除
  const [lastAIMessageId, setLastAIMessageId] = useState<string | null>(null);
      
  //整合 Hook
  const { 
    isUploading, 
    uploadProgress, 
    uploadError, 
    uploadFileToSupabase,
    setUploadError
  } = useFileUploader(); 

  const resetSessionContent = useCallback(() => {
        setMessages([]);
        setCurrentSessionImageUrl(null);
        setIsImageGenerationMode(false);
    }, []);

  const { 
      sessions, 
      activeSessionId, 
      addSession,
      handleNewSession,
      handleSessionChange,
      // isSessionLoading,
      // sessionError,
      loadSessionMessages,
  } = useSessionManager(userId, resetSessionContent);

  useEffect(() => {
    const ensureUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("匿名登录失败:", error);
        toast.error("用户身份创建失败，请刷新再试");
        return;
      }
      if (!data.user) {
        console.error("匿名登录返回空用户");
        toast.error("无法创建用户，请稍后重试");
        return;
      }
      setUserId(data.user.id);
    };

    
    // 确保这只在客户端运行
    if (typeof window !== 'undefined') {
      ensureUserSession();
    }
  }, [supabase]);

  //监听 activeSessionId 变化并加载历史消息
  useEffect(() => {
      // 跳过新会话的重新加载
      if (activeSessionId&&messages.length===0) {
          // 确保 content 已经清空，避免闪烁
          const loadHistory = async () => {
              //设置一个临时的 messageLoading 状态来显示加载动画
              setIsHistoryLoading(true);

              const history = await loadSessionMessages(activeSessionId);
              
              if (history) {
                const dbMessages = history as Message[];
                
                let sessionImage: string | null = null;
                let userMsg: Message | null = null;
                let aiMsgId: string | null = null;

                // 从后往前遍历消息，找到最后一个AI消息ID和用户消息
                for (let i = dbMessages.length - 1; i >= 0; i--){
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
                  console.log("最后一条用户消息：",userMsg.content,"当前会话参考图：",sessionImage,"需要删除的AI消息ID：",aiMsgId)
                } else {
                  setLastUserMessage(null);
                }
                setLastAIMessageId(aiMsgId);
                
                //格式转换 
                const uiMessages: UIMessage[] = dbMessages.map(dbMessage => {
                  let messageText = dbMessage.content;
                  // 判断是否为AI消息且为纯文本模式
                    if (dbMessage.role === 'assistant'&& !dbMessage.image_url && !dbMessage.video_url) {
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
  }, [activeSessionId, loadSessionMessages, setMessages,messages.length,setLastAIMessageId,setLastUserMessage,setCurrentSessionImageUrl]);

  // 用于实时更新 UI 中占位消息的函数
  const updatePlaceholderMessageContent = useCallback((newContent: string, isFinal: boolean = false, finalImageUrl?: string) => {
    setMessages(prev => {
      const newList = [...prev];
      const index = placeholderIndexRef.current;
      if (index !== null && index < newList.length) {
         // 实时追加内容
         newList[index] = { 
            ...newList[index], 
            text: newContent, 
            loading: isFinal ? false : false,
            imageUrl: finalImageUrl !== undefined ? finalImageUrl : newList[index].imageUrl, // 只有在最终更新时才可能设置图片
        };
      }
      return newList;
    });
  }, []);

  // 清除已选择的文件
  const clearFile = useCallback(() => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl); 
    }
    setUploadedFile(null);
    setFilePreviewUrl(null);
    setUploadError(null); // 清空 Hook 内部错误
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  }, [filePreviewUrl, setUploadError]);


  // 统一处理文件选择和拖放
  const handleFileDropOrSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("只支持图片文件。");
      return;
    }
    clearFile();
    setUploadedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  }, [clearFile]);

  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileDropOrSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFileDropOrSelect]);

  // 文件选择按钮处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileDropOrSelect(file);
    }
  };

  // 处理图片生成模式切换
  const toggleImageGenerationMode = useCallback(() => {
    setIsImageGenerationMode(prev => {
        const newState = !prev;
        if (newState) {
            // 开启图片模式时，必须关闭视频模式
            setIsVideoGenerationMode(false); 
        }
        return newState;
    });
  }, []);

  // 处理视频生成模式切换
  const toggleVideoGenerationMode = useCallback(() => {
    setIsVideoGenerationMode(prev => {
        const newState = !prev;
        if (newState) {
            // 开启视频模式时，必须关闭图片模式
            setIsImageGenerationMode(false); 
        }
        return newState;
    });
  }, []);


  // 通用发送请求
  const handleSend = useCallback(async (isRegenerate:boolean=false,deleteMessageId?:string) => {
    const trimmedInput = input.trim();
    if (isLoading || isUploading || isHistoryLoading) return;
    
    let effectiveImageUrl = currentSessionImageUrl;
    let isNewFileUploaded = false; // 用于判断是否需要将图片 URL 存入用户消息

    // 文件上传和状态更新
    if (uploadedFile) {
      const newUrl = await uploadFileToSupabase(uploadedFile);
      if (!newUrl) {
        toast.error("上传失败", { description: "图片上传失败，请重试。" });
        return;
      }
      effectiveImageUrl = newUrl;
      setCurrentSessionImageUrl(newUrl); // 更新全局会话状态
      isNewFileUploaded = true;
    }

    // 拦截请求
    if (!effectiveImageUrl) {
      toast.warning("缺少素材", { description: "当前会话需要一张商品参考图，请先上传一张商品图片。" });
      return;
    }

    // 立即显示用户消息和 AI 占位消息
    const userMessage: UIMessage = { 
      text: trimmedInput, 
      sender: "user",
      // 只有本次上传了新文件，才把图片 URL 存入用户消息 (解决冗余问题)
      imageUrl: isNewFileUploaded ? effectiveImageUrl : undefined,
    };

    // AI占位消息，用于加载特效，流式输出时会实时替换文本
    const aiPlaceholder: UIMessage = {
        sender: 'ai',
        loading: true,
        text: '...', 
        isImageTask: isImageGenerationMode,
        isVideoTask: isVideoGenerationMode,
    };
    
    // 及时展示用户消息和AI占位消息
    setMessages(prev => {
      const newList = [...prev, userMessage, aiPlaceholder];
      placeholderIndexRef.current = newList.length - 1; 
      return newList;
    });

    // 存储重新生成需要的数据
    //setLastAIMessageId
    setLastUserMessage(trimmedInput);
    setIsLoading(true);
    setInput("");
    clearFile(); // 清除本地文件预览状态

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
        contextImageUrl: effectiveImageUrl,
        userPrompt: trimmedInput,
        userId: userId,
        sessionId: activeSessionId,
        saveImageUrl: isNewFileUploaded ? effectiveImageUrl : undefined, 
        isRegenerate: isRegenerate,
        deleteMessageId: deleteMessageId, 
    };

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
      const result = await response.json();
      console.log("AI返回内容:", result);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // 解析结果
      if (isImageGenerationMode) {
          // 图片模式：返回生成的图片 URL
          generatedMediaUrl = result.imageUrl; 
          finalResponseText = "图片已成功生成";
      } else if (isVideoGenerationMode) {
          // 视频模式：返回生成的视频 URL
          generatedMediaUrl = result.videoUrl; 
          finalResponseText = "视频已成功生成";
      } else {
          // 聊天模式：解析文案
          const finalParsedData = result as AIContent; 
          finalResponseText = formatAIMarketingText(finalParsedData);
      }

      // 新会话 ID 维护
      const newSessionId = result.sessionId; 
      if (newSessionId && !activeSessionId) {
          const newSession: UISession = { 
              id: newSessionId, 
              name: trimmedInput.slice(0, 10) || "新会话" 
          };
          addSession(newSession);
      }

      updatePlaceholderMessageContent(finalResponseText, true, generatedMediaUrl);
    } catch (error) {
      console.error("API调用失败:", error);
      toast.error("操作失败", { description: "请稍后再试" });
    } finally {
      setIsLoading(false);
      placeholderIndexRef.current = null;
    }

  }, [input, isUploading, uploadedFile, currentSessionImageUrl, clearFile, uploadFileToSupabase, 
    // 添加新增的依赖项
    updatePlaceholderMessageContent, activeSessionId, isImageGenerationMode, userId, addSession
  ]);
  
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
>>>>>>> Stashed changes

export default function Home() {
  return (
<<<<<<< Updated upstream
    <div>
      <h1>Hello,World!</h1>
      <Button variant="outline">Button</Button>
      <Button variant="outline" size="icon" aria-label="Submit">
        <ArrowUpIcon />
      </Button>
    </div>
  )
=======
    <ChatLayout 
      sessions={sessions}
      currentUserName="User" 
      onSessionChange={handleSessionChange}
      onNewSession={handleNewSession}
      activeSessionId={activeSessionId}
        >
        {/* 聊天消息列表 */}
      <ChatMessageList messages={messages} isHistoryLoading={isHistoryLoading} />

        {/* 输入和上传区域 */}
        <ChatInputArea
            // 状态
            input={input}
            isLoading={isLoading}
            uploadedFile={uploadedFile}
            filePreviewUrl={filePreviewUrl}
            currentSessionImageUrl={currentSessionImageUrl}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            isDragging={isDragging}
            isImageGenerationMode={isImageGenerationMode}
            toggleImageGenerationMode={toggleImageGenerationMode}
            isVideoGenerationMode={isVideoGenerationMode}
            toggleVideoGenerationMode={toggleVideoGenerationMode}
            
            // Handlers
            setInput={setInput}
            handleSend={handleSend}
            handleFileChange={handleFileChange}
            handleKeyDown={handleKeyDown}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            clearFile={clearFile}
            
            // Refs
            fileInputRef={fileInputRef}
        />
    </ChatLayout>
  );
>>>>>>> Stashed changes
}