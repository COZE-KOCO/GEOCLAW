/**
 * 关键词蒸馏词提取API
 * 输入主题/关键词，自动提取蒸馏词
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

export interface DistillationKeyword {
  word: string;
  category: 'core' | 'longtail' | 'question' | 'brand';
  importance: number;
  reasoning: string;
}

export interface DistillationExtractResult {
  keywords: DistillationKeyword[];
  coreMessage: string;
  userIntent: string;
  competitorGaps: string[];
}

/**
 * POST /api/keywords/distill
 * 提取蒸馏词
 * 
 * Body: { topic: string, seedKeywords?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, seedKeywords } = body;

    if (!topic) {
      return NextResponse.json(
        { success: false, error: '请输入主题或关键词' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一个专业的GEO（生成引擎优化）关键词分析师。
你需要分析用户输入的主题或关键词，提取出蒸馏词（Distillation Words）。

蒸馏词分类：
1. **核心词（core）**：直接表达主题的关键词，搜索量高，竞争激烈
   - 例：SEO优化、内容营销、人工智能

2. **长尾词（longtail）**：更具体、更精准的关键词组合，搜索量低但转化率高
   - 例：如何进行SEO优化、中小企业内容营销策略

3. **问题词（question）**：用户真实搜索的问题形式关键词
   - 例：SEO优化怎么做、人工智能哪个好

4. **品牌词（brand）**：涉及品牌、产品、公司的关键词
   - 例：ChatGPT、文心一言、讯飞星火

提取原则：
- 每个类别提取3-8个关键词
- 关键词要有商业价值和搜索价值
- 避免重复或过于相似的关键词
- 考虑用户搜索意图和内容创作价值

返回JSON格式：
{
  "keywords": [
    {
      "word": "关键词",
      "category": "core|longtail|question|brand",
      "importance": 1-10,
      "reasoning": "为什么这个词重要"
    }
  ],
  "coreMessage": "核心信息总结（一句话）",
  "userIntent": "用户搜索意图分析",
  "competitorGaps": ["竞争对手空白点1", "空白点2"]
}`;

    const userMessage = `请分析以下主题并提取蒸馏词：

主题：${topic}

${seedKeywords?.length ? `已有种子关键词：${seedKeywords.join('、')}` : ''}

请提取各类别的关键词，并分析用户意图和竞争机会。`;

    const response = await client.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], { temperature: 0.7 });

    // 解析响应
    let result: DistillationExtractResult;
    try {
      let content = response.content.trim();
      
      // 清理markdown代码块
      if (content.startsWith('```json')) {
        content = content.slice(7);
      } else if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      // 提取JSON对象
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        content = content.slice(jsonStart, jsonEnd + 1);
      }

      result = JSON.parse(content);
    } catch (parseError) {
      console.error('[Distillation] JSON解析失败:', parseError);
      return NextResponse.json(
        { success: false, error: '蒸馏词提取失败，请重试' },
        { status: 500 }
      );
    }

    // 验证结果格式
    if (!result.keywords || !Array.isArray(result.keywords)) {
      return NextResponse.json(
        { success: false, error: '蒸馏词格式错误，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Distillation API] Error:', error);
    return NextResponse.json(
      { success: false, error: '蒸馏词提取失败' },
      { status: 500 }
    );
  }
}
