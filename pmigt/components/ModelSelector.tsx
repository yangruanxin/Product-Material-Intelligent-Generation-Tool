'use client';

import React from "react";
// 导入模型定义
import { ModelId, AppModel } from '@/src/types/model'; 

export interface ModelSelectorProps {
    value: ModelId; // 使用新的 ModelId 类型
    onChange: (modelId: ModelId) => void;
    models: AppModel[]; // 接收 AppModel 列表
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, models }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">AI 模型:</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as ModelId)}
                className="bg-gray-100 text-sm outline-none border border-gray-300 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-200 transition"
            >
                {models.map((m) =>
                    // 只有 Endpoint 存在时才渲染
                    m.endpoint ? (
                        <option value={m.id} key={m.id}>
                            {m.name}
                        </option>
                    ) : null
                )}
            </select>
        </div>
    );
};