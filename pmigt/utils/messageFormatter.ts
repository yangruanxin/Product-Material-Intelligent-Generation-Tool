// AI结构化回复的格式
interface AIMarketingResponse {
    title: string;
    selling_points: string[];
    atmosphere: string;
}

/**
 * 将 AI 返回的结构化 JSON 数据对象格式化为易读的多行文本。
 * * @param data 经过 JSON.parse 解析后的 AI 响应对象。
 * @returns 包含 \n 换行符的格式化字符串。
 */
export const formatAIMarketingText = (data: AIMarketingResponse): string => {
    // 增加类型守卫以防止 data 不包含预期字段
    if (!data || !data.title || !Array.isArray(data.selling_points) || !data.atmosphere) {
        console.error("格式化失败：AI返回数据结构不完整", data);
        // 如果数据结构不完整，返回一个错误提示或空字符串
        return "格式化错误：AI返回的数据结构不完整。";
    }

    const responseText = `
        素材生成成功！

        标题：${data.title || 'N/A'}
        卖点：${data.selling_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}
        氛围：${data.atmosphere || 'N/A'}

        (您可以继续输入指令进行修正。)
    `;

    // 使用 trim() 移除模板字符串开头和结尾的空行
    return responseText.trim();
};