"use client";

import { useState, useCallback, useRef, useMemo,useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Upload, X, Loader2 } from "lucide-react";
import { createClient } from '@/utils/supabase/client'; 

// 导入 Hook 和常量
import { useFileUploader } from "@/hooks/useFileUploader"; 

// 定义消息类型，区分发送者
interface Message {
  text: string;
  sender: "user" | "ai";
}

export default function HomePage() {
  const supabase = createClient();
  const [authStatus, setAuthStatus] = useState('Initializing...');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 上传和会话状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  // 当前会话中使用的图片 URL 
  const [currentSessionImageUrl, setCurrentSessionImageUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      // 检查当前会话
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthStatus("Session not found, attempting anonymous sign-in...");
        // 自动创建新用户 (匿名登录)
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          setAuthStatus(`Anonymous sign-in failed: ${error.message}`);
          console.error("Anonymous Sign-in Error:", error);
        } else if (data.user) {
          setAuthStatus(`Anonymous sign-in successful. UID: ${data.user.id.substring(0, 8)}...`);
        }
      } else {
        setAuthStatus(`Session exists. UID: ${user.id.substring(0, 8)}...`);
      }
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


  // 发送请求
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (isLoading || isUploading) return;

    // 确保认证已完成
    if (authStatus.startsWith('Initializing') || authStatus.startsWith('❌')) {
      setMessages((prev) => [...prev, { text: "❌ 认证会话正在初始化或已失败，请稍候再试。", sender: "ai" }]);
      return;
    }
    
    let finalImageUrl: string | null = null;

    // 确定最终发送的图片 URL (优先级：新上传文件 -> 会话图 )
    if (uploadedFile) {
      // 如果有新文件，则先上传，并获取 URL
      finalImageUrl = await uploadFileToSupabase(uploadedFile);
      if (!finalImageUrl) return; // 上传失败，终止发送
    } else if (currentSessionImageUrl) {
      // 没有新文件，使用会话中已有的图
      finalImageUrl = currentSessionImageUrl;
    }

    // 检查发送有效性（首次发送或后续发送必须有指令或图片）
    if (!trimmedInput && !finalImageUrl) {
      const errorMsg: Message = { text: "请先上传一张图片或输入指令。", sender: "ai" };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // 立即显示用户消息
    const userMessage: Message = { 
      text: `【图 URL: ${finalImageUrl ? '有' : '无'}】Prompt: ${trimmedInput || '无指令'}`, 
      sender: "user" 
    };
    setMessages((prev) => [...prev, userMessage]);


    // 启动加载状态并更新图片会话状态
    setIsLoading(true);
    setInput("");
    
    if (uploadedFile && finalImageUrl) {
      setCurrentSessionImageUrl(finalImageUrl); // 替换/设置会话图片
    }
    clearFile(); // 清除本地文件预览状态


    try {
      // 调用后端 API，发送历史和图片 URL
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: finalImageUrl, 
          userPrompt: trimmedInput,
          // 发送历史消息 (用于多轮上下文)
          history: messages.map(msg => ({ sender: msg.sender, text: msg.text })) 
        }),
      });
      
      const result = await response.json();
      let aiResponse: Message;

      if (result.success) {
        const data = result.data;
        const responseText = `
          **素材生成成功！**
          标题：${data.title}
          卖点：${data.selling_points.join(' | ')}
          氛围：${data.atmosphere}
          (您可以继续输入指令进行修正。)
        `;
        aiResponse = { text: responseText, sender: "ai"};
      } else {
        aiResponse = {
          text: `服务错误：${result.error || '无法获取生成结果'}`,
          sender: "ai"
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("API调用失败：", error);
      const errorMsg: Message = {
        text: "网络连接失败，请检查服务状态。",
        sender:"ai"
      }
      setMessages((prev) => [...prev, errorMsg]);
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

  // 拖拽区域提示文本
  const dropZoneText = useMemo(() => {
    if (isUploading) return `上传中... (${uploadProgress}%)`;
    if (isDragging) return "松开即可上传文件...";
    if (currentSessionImageUrl) return "当前会话图片已锁定，拖拽或点击可替换图片。";
    return "拖拽图片至此，或点击上传按钮。";
  }, [isUploading, uploadProgress, isDragging, currentSessionImageUrl]);


  return (
    <div className="flex h-screen">
      {/* 左侧侧边栏*/}
      <aside className="w-72 bg-[#111] text-white flex flex-col border-r border-gray-700">
        {/* 侧边栏内容*/}
        <div className="p-4 font-bold text-xl bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-transparent bg-clip-text">
          Chat 面板
        </div>
        <Separator className="bg-gray-700" />
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-2">
            {["会话 1", "会话 2", "会话 3"].map((item, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
              >
                <MessageCircle size={18} />
                {item}
              </button>
            ))}
          </div>
        </ScrollArea>
        <Separator className="bg-gray-700" />
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff004f] to-[#2d5bff]" />
          <div>
            <p className="text-sm font-semibold">User</p>
            <p className="text-xs text-gray-400">在线中</p>
          </div>
        </div>
      </aside>

      {/* 右侧聊天区 */}
      <main className="flex-1 flex flex-col px-12">

        {/* 聊天内容区域 */}
        <ScrollArea className="flex-1 p-6 bg-white">
          <div className="space-y-6 max-w-4xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-md whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-[#ff004f] to-[#2d5bff] text-white rounded-br-none" 
                      : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* 输入框区域和上传区域 */}
        <div className="p-4 bg-white flex flex-col items-center gap-2">
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

              {/* 文件上传/预览区域 */}
              {(uploadedFile || currentSessionImageUrl) ? (
                  <div className="flex items-center justify-between w-full p-2">
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
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="icon"
              disabled={isUploading || isLoading}
              className="h-12 w-12 rounded-full border-gray-300 text-gray-600 hover:text-gray-800"
              title="上传或更换图片"
            >
              <Upload size={20} />
            </Button>
            
            <Input
              placeholder={isLoading || isUploading ? "正在处理中，请稍候..." : "请输入您对素材的需求或指令..."}
              disabled={isLoading || isUploading}
              className="
                flex-1 rounded-full h-12 text-base px-6
                "
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            
            <Button
              onClick={handleSend}
              // 按钮禁用条件：正在加载中 OR 正在上传中 OR 既没输入内容又没有会话图
              disabled={isLoading || isUploading || (!input.trim() && !currentSessionImageUrl && !uploadedFile)} 
              className="
                bg-gradient-to-r 
                from-[#ff004f] to-[#2d5bff] 
                text-white
                h-12
                w-12
                p-0
                rounded-full
                transition-opacity
                disabled:opacity-50
                "
            >
              {(isLoading || isUploading) ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}