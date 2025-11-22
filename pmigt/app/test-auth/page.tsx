// app/test-auth/page.tsx
'use client'

import { createClient } from '@/utils/supabase/client' // 确保路径对应你实际的文件位置
import { useState } from 'react'

export default function TestAuthPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])

  // 验证 3：前端插入简化验证（测试自动填充 user_id）
  const handleInsert = async () => {
    addLog('正在尝试插入数据...')
    
    // 注意：这里我们要验证的是“不传 user_id”，看看数据库会不会自动补全
    const { data, error } = await supabase
      .from('sessions')
      .insert({ 
        name: '自动化测试会话 ' + Math.floor(Math.random() * 1000) 
      })
      .select()

    if (error) {
      addLog(`❌ 插入失败: ${error.message}`)
    } else {
      addLog(`✅ 插入成功! ID: ${data[0].id}`)
      addLog(`   -> 请去数据库检查该记录的 user_id 是否已自动填充`)
    }
  }

  // 验证 2：RLS 安全验证（测试能否看到别人的数据）
  const handleFetch = async () => {
    addLog('正在尝试获取所有数据...')
    
    const { data, error } = await supabase
      .from('sessions')
      .select('*')

    if (error) {
      addLog(`❌ 查询失败: ${error.message}`)
    } else {
      addLog(`🔍 查询完成，共获取到 ${data?.length} 条数据`)
      console.table(data) // 在控制台打印详情
      addLog('   -> 请检查这里是否包含你不该看到的数据')
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Supabase 验证面板</h1>
      <div className="space-x-4">
        <button 
          onClick={handleInsert}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          1. 测试插入 (验证自动填充)
        </button>
        <button 
          onClick={handleFetch}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          2. 测试查询 (验证 RLS)
        </button>
      </div>
      <div className="mt-4 p-4 border rounded bg-gray-50 font-mono text-sm min-h-[200px]">
        {logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  )
}