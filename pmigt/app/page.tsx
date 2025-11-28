"use client";

import { useState, useCallback, useRef,useEffect } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInputArea } from "@/components/chat/ChatInputArea";
import { createClient } from '@/utils/supabase/client'; 

import { UIMessage, UISession } from '@/src/types/index'

import { toast } from "sonner"


// 导入 Hook 和常量
import { useFileUploader } from "@/hooks/useFileUploader"; 

export default function HomePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);//保存userId

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 上传和会话状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  // 当前会话中使用的图片 URL 
  const [currentSessionImageUrl, setCurrentSessionImageUrl] = useState<string | null>(null);

  // 是否需要生成主图氛围
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 会话列表
  const [sessions, setSessions] = useState<UISession[]>([]);
  // 当前用户正在查看的会话ID
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  // 新建会话处理
  const handleNewSession = useCallback(() => {
    // 清空消息
    setMessages([]);
    // 切换到一个“尚未创建的会话”
    setActiveSessionId(null);
    setCurrentSessionImageUrl(null);
    setIsImageGenerationMode(false);
    console.log("前端新建对话，但未向后端创建 session。等待第一次发消息后创建");
  }, []);


  // 会话切换处理
  const handleSessionChange = useCallback((id: string) => {
    // 更新当前激活的会话 ID
    setActiveSessionId(id);
    console.log(`切换到会话: ${id}`);
  }, []);

  // 处理图片生成模式切换
  const toggleImageGenerationMode = useCallback(() => {
    setIsImageGenerationMode(prev => !prev);
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

  // 发送对话请求
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (isLoading || isUploading) return;
    
    //用局部变量effectiveImageUrl保存当前会话最新商品图
    let effectiveImageUrl = currentSessionImageUrl;

    // 确定最终发送的图片 URL (优先级：新上传文件 -> 会话图 )
    // 如果有新文件，则先上传，并获取 URL
    if (uploadedFile) {
      const newUrl = await uploadFileToSupabase(uploadedFile);
      if (!newUrl) {
        toast.error("上传失败", {
            description: "图片上传失败，请重试。",
        });
        return;
      } // 上传失败，终止发送
      effectiveImageUrl = newUrl;//更新图片
      setCurrentSessionImageUrl(newUrl);//更新全局会话状态
    }

    // 若当前会话未上传过图片，拦截请求
    if (!effectiveImageUrl) {
      toast.warning("缺少素材", {
          description: "当前会话需要一张商品参考图，请先上传一张商品图片。",
      });
      return;
    }

    // 立即显示用户消息
    const userMessage: UIMessage = { 
      text: trimmedInput, 
      sender: "user",
      imageUrl: uploadedFile ? effectiveImageUrl : undefined
    };
    //AI占位消息，用于加载特效，生成完后删除 
    const aiPlaceholder: UIMessage = {
        sender: 'ai',
        loading:true,//启动加载动画
    };
    
    // 将用户消息和 AI 占位消息一起推入列表，记录占位的下标
    setMessages(prev => {
      const newList = [...prev, userMessage, aiPlaceholder];
      placeholderIndexRef.current = newList.length - 1; 
      return newList;
    });

    // 启动加载状态并更新图片会话状态
    setIsLoading(true);
    setInput("");
    clearFile(); // 清除本地文件预览状态


    try {
      // 调用后端 API，发送历史和图片 URL
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: effectiveImageUrl, 
          userPrompt: trimmedInput,
          userId: userId,
          sessionId: activeSessionId,
          credentials: 'include', 
          // // 发送历史消息 (用于多轮上下文)
          // history: messagesRef.current.map(msg => ({ sender: msg.sender, text: msg.text }))
        }),
      });
      
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        const responseText = `
          素材生成成功！
          标题：${data.title}
          卖点：${data.selling_points.join(' | ')}
          氛围：${data.atmosphere}
          (您可以继续输入指令进行修正。)
        `;

        const aiFinalMessage: UIMessage = {
          sender: "ai",
          text: responseText,
          imageUrl: undefined
        };
        
        // 若图片生成模式被激活
        if (isImageGenerationMode) {
          const styleImageUrl = effectiveImageUrl;
          const generatedImageUrl = await handleGenerateImage(
            effectiveImageUrl,
            styleImageUrl,
            trimmedInput
          )
          console.log("effectiveImageUrl:",effectiveImageUrl,)
          if (generatedImageUrl) {
            aiFinalMessage.imageUrl = generatedImageUrl;
          }
        } 

        // 删除 AI 占位消息并追加真正消息
        setMessages(prev => {
          const newList = [...prev];
          if (placeholderIndexRef.current !== null) {
            newList.splice(placeholderIndexRef.current, 1);
          }
          newList.push(aiFinalMessage);
          return newList;
        });

        // 若为新会话，则把后端返回的sessionId更新
        if (result.sessionId && !activeSessionId) {
          setActiveSessionId(result.sessionId);

          // 插入会话列表（前端 UI）
          setSessions(prev => [
            {
              id: result.sessionId,
              name: trimmedInput.slice(0, 10) || "新会话"
            },
            ...prev
          ]);
        }
      } else {
          toast.error("服务错误", {
            description: result.error || "无法获取生成结果。",
          });
      }
    } catch (error) {
      console.error("API调用失败：", error);
      toast.error("文案生成失败", {
          description:"请稍后再试"
        })
        return;
    } finally {
      setIsLoading(false);
    }
  }, [input, isUploading, uploadedFile, currentSessionImageUrl, clearFile, uploadFileToSupabase, messages]); 
  
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ChatLayout 
      sessions={sessions}
      currentUserName="您的用户ID/昵称" // 实际应从认证状态获取
      onSessionChange={handleSessionChange}
      onNewSession={handleNewSession}
      activeSessionId={activeSessionId}
        >
        {/* 聊天消息列表 */}
      <ChatMessageList messages={messages}/>

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