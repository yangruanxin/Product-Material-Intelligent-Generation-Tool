/* eslint-disable react/no-unescaped-entities */
//会话消息列表为空时
import React from 'react';
import { Sparkles, MessageSquare, Image } from 'lucide-react';

export const WelcomeMessage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white dark:bg-gray-800 rounded-lg">
            <Sparkles className="w-12 h-12 text-primary-500 mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Hi！我是您的商品创意助理
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg">
                👋 要开始一次新的创意分析或生成任务，请先上传您的 商品素材图片
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition hover:shadow-lg">
                    <MessageSquare className="w-5 h-5 text-indigo-500 mb-1" />
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">文字生成</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        试试对我说 "帮我写一个推广新款耳机的卖点文案"
                    </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition hover:shadow-lg">
                    <Image className="w-5 h-5 text-pink-500 mb-1" />
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">图文创作</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        选择图片生成模式，试试对我说 "根据这张商品图生成主图氛围"
                    </p>
                </div>
            </div>
        </div>
    );
};