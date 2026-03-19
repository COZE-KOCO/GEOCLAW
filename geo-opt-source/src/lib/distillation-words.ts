/**
 * 蒸馏词管理系统
 * 基于LLM自动判断行业并提取高价值"蒸馏词"作为AI内容锚点
 */

import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export interface DistillationWord {
  id: string;
  word: string;
  category: 'core' | 'longtail' | 'question' | 'brand';
  industry?: string;
  searchVolume: number;
  aiMentionRate: number;
  competitionLevel: 'low' | 'medium' | 'high';
  relevanceScore: number;
  relatedQuestions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IndustryAnalysis {
  primaryIndustry: string;
  subIndustry?: string;
  confidence: number;
  relatedIndustries: string[];
  reasoning: string;
}

export interface DistillationAnalysis {
  industry: IndustryAnalysis;
  words: DistillationWord[];
  recommendations: {
    highPriority: string[];
    mediumPriority: string[];
    longTail: string[];
  };
  contentSuggestions: string[];
}

/**
 * 使用LLM分析内容并识别行业
 */
export async function analyzeIndustry(
  content: string,
  title?: string,
  customHeaders?: Record<string, string>
): Promise<IndustryAnalysis> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个专业的行业分析专家。你的任务是分析给定内容的标题和正文，判断其所属行业。

请按照以下JSON格式返回结果（不要包含任何其他文字）：
{
  "primaryIndustry": "主行业名称",
  "subIndustry": "子行业/细分领域（如果有）",
  "confidence": 0.95,
  "relatedIndustries": ["相关行业1", "相关行业2"],
  "reasoning": "判断理由"
}

行业判断规则：
1. 根据内容中的关键词、产品、服务、技术术语等判断
2. 如果内容涉及多个行业，选择最核心的
3. confidence范围是0-1，表示判断置信度
4. relatedIndustries列出相关或交叉行业`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请分析以下内容的行业归属：\n\n标题：${title || '无标题'}\n\n内容：\n${content.slice(0, 3000)}${content.length > 3000 ? '...' : ''}` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.3 });
    const result = JSON.parse(response.content);
    
    return {
      primaryIndustry: result.primaryIndustry || '通用',
      subIndustry: result.subIndustry,
      confidence: result.confidence || 0.8,
      relatedIndustries: result.relatedIndustries || [],
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('行业分析失败:', error);
    return {
      primaryIndustry: '通用',
      confidence: 0.5,
      relatedIndustries: [],
      reasoning: '无法准确识别行业',
    };
  }
}

/**
 * 使用LLM提取蒸馏词
 */
export async function extractDistillationWords(
  content: string,
  title?: string,
  industry?: string,
  customHeaders?: Record<string, string>
): Promise<DistillationAnalysis> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  // 先分析行业
  const industryResult = industry 
    ? { 
        primaryIndustry: industry, 
        confidence: 1, 
        relatedIndustries: [], 
        reasoning: '用户指定行业' 
      }
    : await analyzeIndustry(content, title, customHeaders);

  const systemPrompt = `你是一个GEO（生成引擎优化）专家。你的任务是从内容中提取"蒸馏词"——这些词是AI搜索引擎在回答用户问题时最可能引用的关键词。

蒸馏词分类：
1. core（核心词）：产品/服务名称、核心技术术语、行业关键词
2. longtail（长尾词）：具体场景、细分需求、地域+服务等组合词
3. question（问题词）：用户常见提问方式
4. brand（品牌词）：品牌名称、产品型号等

提取规则：
- 优先提取AI回答问题时必然会用到的词
- 考虑用户可能的搜索意图
- 关注竞争度低但价值高的词
- 标注每个词的相关指标

请按照以下JSON格式返回结果（不要包含任何其他文字）：
{
  "words": [
    {
      "word": "关键词",
      "category": "core",
      "searchVolume": 5000,
      "aiMentionRate": 85,
      "competitionLevel": "medium",
      "relevanceScore": 90,
      "relatedQuestions": ["问题1", "问题2"]
    }
  ],
  "recommendations": {
    "highPriority": ["必须覆盖的核心词"],
    "mediumPriority": ["建议覆盖的词"],
    "longTail": ["长尾机会词"]
  },
  "contentSuggestions": ["内容优化建议1", "内容优化建议2"]
}

指标说明：
- searchVolume: 月搜索量估算(100-50000)
- aiMentionRate: AI引用概率(0-100)
- competitionLevel: 竞争程度(low/medium/high)
- relevanceScore: 与内容相关性(0-100)`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请分析以下${industryResult.primaryIndustry}行业内容，提取蒸馏词：

标题：${title || '无标题'}

内容：
${content.slice(0, 4000)}${content.length > 4000 ? '...' : ''}` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.5 });
    const result = JSON.parse(response.content);
    
    const words: DistillationWord[] = (result.words || []).map((w: any, index: number) => ({
      id: `word-${index}`,
      word: w.word,
      category: w.category || 'core',
      industry: industryResult.primaryIndustry,
      searchVolume: w.searchVolume || 1000,
      aiMentionRate: w.aiMentionRate || 50,
      competitionLevel: w.competitionLevel || 'medium',
      relevanceScore: w.relevanceScore || 70,
      relatedQuestions: w.relatedQuestions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    return {
      industry: industryResult,
      words,
      recommendations: result.recommendations || {
        highPriority: [],
        mediumPriority: [],
        longTail: [],
      },
      contentSuggestions: result.contentSuggestions || [],
    };
  } catch (error) {
    console.error('蒸馏词提取失败:', error);
    return {
      industry: industryResult,
      words: [],
      recommendations: {
        highPriority: [],
        mediumPriority: [],
        longTail: [],
      },
      contentSuggestions: [],
    };
  }
}

/**
 * 使用LLM生成相关问题
 */
export async function generateRelatedQuestionsLLM(
  keyword: string,
  industry: string,
  customHeaders?: Record<string, string>
): Promise<string[]> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是用户搜索行为分析专家。根据关键词和行业，生成用户最可能提出的问题。

要求：
1. 生成5-8个真实用户问题
2. 问题要符合自然语言表达习惯
3. 覆盖不同搜索意图（信息、导航、交易）
4. 按搜索频率排序

只返回JSON数组格式：["问题1", "问题2", ...]`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `关键词：${keyword}\n行业：${industry}\n\n请生成相关问题：` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.7 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('生成相关问题失败:', error);
    return [];
  }
}

/**
 * 蒸馏词评分算法
 */
export function calculateDistillationScore(word: DistillationWord): number {
  const weights = {
    searchVolume: 0.25,
    aiMentionRate: 0.35,
    competitionLevel: 0.15,
    relevanceScore: 0.25,
  };

  const volumeScore = Math.min((word.searchVolume / 10000) * 100, 100);

  const competitionScore = 
    word.competitionLevel === 'low' ? 100 :
    word.competitionLevel === 'medium' ? 60 : 30;

  const totalScore = 
    volumeScore * weights.searchVolume +
    word.aiMentionRate * weights.aiMentionRate +
    competitionScore * weights.competitionLevel +
    word.relevanceScore * weights.relevanceScore;

  return Math.round(totalScore * 10) / 10;
}

/**
 * 批量分析多段内容
 */
export async function batchAnalyzeContent(
  contents: Array<{ title?: string; content: string }>,
  customHeaders?: Record<string, string>
): Promise<Map<string, DistillationAnalysis>> {
  const results = new Map<string, DistillationAnalysis>();
  
  for (const item of contents) {
    const key = item.title || item.content.slice(0, 50);
    const analysis = await extractDistillationWords(
      item.content,
      item.title,
      undefined,
      customHeaders
    );
    results.set(key, analysis);
  }

  return results;
}
