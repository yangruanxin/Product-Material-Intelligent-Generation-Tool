"use client";

import { useState, useCallback, useRef,useEffect } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
import { createClient } from '@/utils/supabase/client'; 

import { AIContent, Message, UIMessage, UISession} from '@/src/types/index'

import { toast } from "sonner"

import { formatAIMarketingText, formatPartialAIMarketingText } from '@/utils/messageFormatter';

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
      if (activeSessionId) {
          // 确保 content 已经清空，避免闪烁
          const loadHistory = async () => {
              //待设置一个临时的 messageLoading 状态来显示加载动画
              setIsHistoryLoading(true);

              const history = await loadSessionMessages(activeSessionId);
              
            if (history) {
                const dbMessages = history as Message[];
                //格式转换 
                const uiMessages: UIMessage[] = dbMessages.map(dbMessage => {
                    let messageText = dbMessage.content;
                    if (dbMessage.role === 'assistant') {
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
                            loading: false,
                        };
                    })
                setMessages(uiMessages);
              }
              setIsHistoryLoading(false);
          };
          loadHistory();
      }
      // 只有在 activeSessionId 改变时运行
  }, [activeSessionId, loadSessionMessages, setMessages]);

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
    setIsImageGenerationMode(prev => !prev);
  }, []);

  // 处理视频生成模式切换
  const toggleVideoGenerationMode = useCallback(() => {
    setIsVideoGenerationMode(prev => !prev);
  }, []);

  // 调用图片生成API
  const handleGenerateImage = useCallback(async(
    productImageUrl: string,
    styleImageUrl: string,
    userPrompt:string
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/generate_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImageUrl,
          styleImageUrl,
          userPrompt,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP错误：${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.imageUrl;
      } else {
        const errorMessage: string = result.error || "未知生成错误";
        toast.error("图片生成失败", {
          description:errorMessage
        })
        return null;
      }
    } catch (error) {
      console.error("调用图片生成接口时发生网络或解析错误：", error);
      toast.error("网络连接失败", {
        description:"无法连接到图片生成服务"
      })
      return null;
    }
  },[])

  // // 发送对话请求
  // const handleSend = useCallback(async () => {
  //   const trimmedInput = input.trim();
  //   if (isLoading || isUploading) return;
    
  //   //用局部变量effectiveImageUrl保存当前会话最新商品图
  //   let effectiveImageUrl = currentSessionImageUrl;

  //   // 确定最终发送的图片 URL (优先级：新上传文件 -> 会话图 )
  //   // 如果有新文件，则先上传，并获取 URL
  //   if (uploadedFile) {
  //     const newUrl = await uploadFileToSupabase(uploadedFile);
  //     if (!newUrl) {
  //       toast.error("上传失败", {
  //           description: "图片上传失败，请重试。",
  //       });
  //       return;
  //     } // 上传失败，终止发送
  //     effectiveImageUrl = newUrl;//更新图片
  //     setCurrentSessionImageUrl(newUrl);//更新全局会话状态
  //   }

  //   // 若当前会话未上传过图片，拦截请求
  //   if (!effectiveImageUrl) {
  //     toast.warning("缺少素材", {
  //         description: "当前会话需要一张商品参考图，请先上传一张商品图片。",
  //     });
  //     return;
  //   }

  //   // 立即显示用户消息
  //   const userMessage: UIMessage = { 
  //     text: trimmedInput, 
  //     sender: "user",
  //     imageUrl: uploadedFile ? effectiveImageUrl : undefined,
  //   };
  //   //AI占位消息，用于加载特效，生成完后删除 
  //   const aiPlaceholder: UIMessage = {
  //       sender: 'ai',
  //       loading:true,//启动加载动画
  //   };
    
  //   // 将用户消息和 AI 占位消息一起推入列表，记录占位的下标
  //   setMessages(prev => {
  //     const newList = [...prev, userMessage, aiPlaceholder];
  //     placeholderIndexRef.current = newList.length - 1; 
  //     return newList;
  //   });

  //   // 启动加载状态并更新图片会话状态
  //   setIsLoading(true);
  //   setInput("");
  //   clearFile(); // 清除本地文件预览状态


  //   try {
  //     // 调用后端 API，发送历史和图片 URL
  //     const response = await fetch('/api/chat', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         imageUrl: effectiveImageUrl, 
  //         userPrompt: trimmedInput,
  //         userId: userId,
  //         sessionId: activeSessionId,
  //         credentials: 'include', 
  //         // // 发送历史消息 (用于多轮上下文)
  //         // history: messagesRef.current.map(msg => ({ sender: msg.sender, text: msg.text }))
  //       }),
  //     });
      
  //     const result = await response.json();

  //     if (result.success) {
  //       const data = result.data;
  //       const responseText = formatAIMarketingText(data);

  //       const aiFinalMessage: UIMessage = {
  //         sender: "ai",
  //         text: responseText,
  //         imageUrl: undefined
  //       };
        
  //       // 若图片生成模式被激活
  //       if (isImageGenerationMode) {
  //         const styleImageUrl = effectiveImageUrl;
  //         const generatedImageUrl = await handleGenerateImage(
  //           effectiveImageUrl,
  //           styleImageUrl,
  //           trimmedInput
  //         )
  //         console.log("effectiveImageUrl:",effectiveImageUrl,)
  //         if (generatedImageUrl) {
  //           aiFinalMessage.imageUrl = generatedImageUrl;
  //         }
  //       } 

  //       // 删除 AI 占位消息并追加真正消息
  //       setMessages(prev => {
  //         const newList = [...prev];
  //         if (placeholderIndexRef.current !== null) {
  //           newList.splice(placeholderIndexRef.current, 1);
  //         }
  //         newList.push(aiFinalMessage);
  //         return newList;
  //       });

  //       // 若为新会话，则把后端返回的sessionId更新
  //       if (result.sessionId && !activeSessionId) {
  //         // 构造新的会话对象
  //         const newSession: UISession = {
  //             id: result.sessionId,
  //             name: trimmedInput.slice(0, 10) || "新会话",
  //         };

  //         // 使用 Hook 的 addSession 函数来更新会话列表和激活状态
  //         // addSession 会同时更新 sessions 列表，并设置 activeSessionId
  //         addSession(newSession);
  //       }
  //     } else {
  //         toast.error("服务错误", {
  //           description: result.error || "无法获取生成结果。",
  //         });
  //     }
  //   } catch (error) {
  //     console.error("API调用失败：", error);
  //     toast.error("文案生成失败", {
  //         description:"请稍后再试"
  //       })
  //       return;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, [input, isUploading, uploadedFile, currentSessionImageUrl, clearFile, uploadFileToSupabase, messages]); 
  
  const generateTempId = (): string => {
    // 确保浏览器支持，如果不支持，则使用 Date.now() 作为 fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 简易 fallback ID
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (isLoading || isUploading) return;
    
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

    const tempMessageId = generateTempId();
    // AI占位消息，用于加载特效，流式输出时会实时替换文本
    const aiPlaceholder: UIMessage = {
        id:tempMessageId,
        sender: 'ai',
        loading: true,
        text: '...', 
    };
    
    setMessages(prev => {
      const newList = [...prev, userMessage, aiPlaceholder];
      placeholderIndexRef.current = newList.length - 1; 
      return newList;
    });

    setIsLoading(true);
    setInput("");
    clearFile(); // 清除本地文件预览状态

    try {
      // 调用 API 并处理流
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: effectiveImageUrl, 
          userPrompt: trimmedInput,
          userId: userId,
          sessionId: activeSessionId,
        }),
      });
      
      if (!response.ok || !response.body) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // 读取 Header，获取新的 Session ID
      const newSessionId = response.headers.get('X-Session-Id');
      
      // 流式处理逻辑
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = ''; // 累积完整输出

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          console.log('🔹 前端收到 chunk', JSON.stringify(chunk));
          accumulatedContent += chunk;
          
          // 尝试对当前累积的内容进行解析和格式化
          let displayContent = accumulatedContent;
          
          try {
              // 移除 JSON 标记并尝试解析
              const cleanJson = accumulatedContent.replace(/```json|```/g, '').trim();
              const partialData: AIContent = JSON.parse(cleanJson);
              
              // 如果解析成功（即使只是部分数据），则用格式化框架展示
              // 我们需要一个新的 formatPartialAIMarketingText 函数
              displayContent = formatPartialAIMarketingText(partialData);
              
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
              // 解析失败时，保留原始 JSON 文本作为 fallback (如果需要调试)
              displayContent = accumulatedContent;
          }

          // 实时更新 UI 文本内容
          updatePlaceholderMessageContent(displayContent, false); 
          
          await new Promise(resolve => setTimeout(resolve, 40));
      }
      
      // 6. 流结束后的处理：JSON 解析和最终状态更新
      const cleanJson = accumulatedContent.replace(/```json|```/g, '').trim();
      let finalParsedData: AIContent | null;
      
      try {
          finalParsedData = JSON.parse(cleanJson);
      } catch {
          console.error("流式输出 JSON 解析失败，保留原始文本。");
          finalParsedData = null;
      }

      let finalResponseText = accumulatedContent;
      let aiFinalImage: string | undefined = undefined;
      
      // 格式化文本和图片生成处理 (如果解析成功)
      if (finalParsedData && typeof finalParsedData === 'object') {
          finalResponseText = formatAIMarketingText(finalParsedData);

          // 若图片生成模式被激活
          if (isImageGenerationMode) {
              const generatedImageUrl = await handleGenerateImage(
                effectiveImageUrl!, // 风格图
                effectiveImageUrl!, // 参考图
                trimmedInput
              );
              if (generatedImageUrl) {
                aiFinalImage = generatedImageUrl;
              }
          }
      }
      
      // 最终更新 UI：使用最终文本和图片 URL，并关闭 loading
      updatePlaceholderMessageContent(finalResponseText, true, aiFinalImage);

      // 新会话 ID 维护
      if (newSessionId && !activeSessionId) {
          const newSession: UISession = { id: newSessionId, name: trimmedInput.slice(0, 10) || "新会话" };
          addSession(newSession);
      }

    } catch (error) {
        // 错误发生时，处理 UI 状态
        console.error("API调用失败：", error);
        toast.error("文案生成失败", { description: "请稍后再试" });
        
        // 错误时，将占位符文本改为错误提示，并关闭 loading
        updatePlaceholderMessageContent("文案生成失败，请刷新重试。", true);
    } finally {
        setIsLoading(false);
        // 清除引用
        placeholderIndexRef.current = null;
    }
  }, [input, isUploading, uploadedFile, currentSessionImageUrl, clearFile, uploadFileToSupabase, 
    // 添加新增的依赖项
    updatePlaceholderMessageContent, activeSessionId, isImageGenerationMode, handleGenerateImage, userId, addSession
  ]);
  
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
      <ChatLayout 
        sessions={sessions}
        currentUserName="User" 
        onSessionChange={handleSessionChange}
        onNewSession={handleNewSession}
        activeSessionId={activeSessionId}
        >
        {/* 聊天消息列表 */}
      <ChatMessageList messages={messages} isHistoryLoading={isHistoryLoading}/>

        {/* 输入和上传区域 */}
        <ChatInputArea
            // 状态
            input={input}
            isLoading={isLoading}
            isUploading={isUploading}
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
}