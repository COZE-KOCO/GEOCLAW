/**
 * 关键词挖掘服务
 * 基于LLM进行关键词分析、挖掘和推荐
 */

import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 关键词类型
export type KeywordType = 
  | 'core'         // 核心关键词
  | 'longtail'     // 长尾关键词
  | 'question'     // 问题型关键词
  | 'brand'        // 品牌关键词
  | 'competitor'   // 竞争对手关键词
  | 'trending';    // 热门趋势关键词

// 关键词难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

// 单个关键词数据
export interface KeywordData {
  keyword: string;
  type: KeywordType;
  searchVolume: number;        // 预估搜索量（相对值）
  difficulty: DifficultyLevel; // 优化难度
  competition: number;         // 竞争度 0-100
  relevance: number;           // 相关度 0-100
  trend: 'up' | 'stable' | 'down'; // 趋势
  suggestions?: string[];      // 相关建议
  platforms?: {                // 平台适配度（只支持已集成的真实API平台）
    doubao: number;            // 豆包
    deepseek: number;          // DeepSeek
    kimi: number;              // Kimi
    qwen: number;              // 通义千问
  };
}

// 关键词挖掘请求
export interface KeywordMiningRequest {
  topic: string;               // 主题/行业/业务
  seedKeywords?: string[];     // 种子关键词
  targetPlatforms?: string[];  // 目标平台
  competitorUrls?: string[];   // 竞争对手URL
  depth?: 'basic' | 'deep';    // 挖掘深度
}

// 关键词挖掘结果
export interface KeywordMiningResult {
  keywords: KeywordData[];
  clusters: KeywordCluster[];  // 关键词聚类
  opportunities: KeywordOpportunity[]; // 机会词
  summary: {
    totalKeywords: number;
    avgDifficulty: number;
    highPotentialCount: number;
    topPlatforms: string[];
  };
  generatedAt: Date;
}

// 关键词聚类
export interface KeywordCluster {
  name: string;
  keywords: string[];
  theme: string;
  opportunity: 'high' | 'medium' | 'low';
}

// 关键词机会
export interface KeywordOpportunity {
  keyword: string;
  reason: string;
  potentialScore: number; // 潜力评分 0-100
  suggestedAction: string;
}

/**
 * 关键词挖掘主流程
 */
export async function mineKeywords(
  request: KeywordMiningRequest,
  customHeaders?: Record<string, string>
): Promise<KeywordMiningResult> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个GEO（生成引擎优化）关键词专家。你的任务是为用户的主题挖掘高价值关键词，帮助内容在AI搜索引擎中获得更高引用率。

分析维度：
1. 核心关键词：直接相关的核心词汇
2. 长尾关键词：搜索量较小但竞争度低的精准词
3. 问题型关键词：用户在AI搜索中提问的方式
4. 品牌关键词：涉及品牌名称的搜索词
5. 竞争对手关键词：竞品正在使用的关键词
6. 热门趋势：当前上升的热门话题

评估指标：
- searchVolume: 预估搜索量（相对值1-100）
- difficulty: 优化难度（easy/medium/hard）
- competition: 竞争度（0-100）
- relevance: 与主题的相关度（0-100）
- trend: 趋势方向（up/stable/down）

返回JSON格式：
{
  "keywords": [
    {
      "keyword": "关键词",
      "type": "core|longtail|question|brand|competitor|trending",
      "searchVolume": 85,
      "difficulty": "easy|medium|hard",
      "competition": 45,
      "relevance": 95,
      "trend": "up|stable|down",
      "suggestions": ["相关建议1", "相关建议2"],
      "platforms": {
        "doubao": 90,
        "deepseek": 80,
        "kimi": 75,
        "qwen": 85
      }
    }
  ],
  "clusters": [
    {
      "name": "聚类名称",
      "keywords": ["关键词1", "关键词2"],
      "theme": "主题描述",
      "opportunity": "high|medium|low"
    }
  ],
  "opportunities": [
    {
      "keyword": "机会关键词",
      "reason": "为什么是机会点",
      "potentialScore": 85,
      "suggestedAction": "建议行动"
    }
  ]
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请为以下主题进行关键词挖掘：

主题/行业：${request.topic}

${request.seedKeywords?.length ? `种子关键词：${request.seedKeywords.join('、')}` : ''}
${request.targetPlatforms?.length ? `目标平台：${request.targetPlatforms.join('、')}` : ''}
${request.competitorUrls?.length ? `竞争对手URL：${request.competitorUrls.join('\n')}` : ''}

挖掘深度：${request.depth === 'deep' ? '深度挖掘（更多关键词、更详细分析）' : '基础挖掘'}

请返回完整的关键词分析结果。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.5 });
    const result = JSON.parse(response.content);
    
    // 计算汇总数据
    const keywords = result.keywords || [];
    const avgDifficulty = keywords.length > 0
      ? keywords.reduce((sum: number, k: KeywordData) => {
          const score = k.difficulty === 'easy' ? 1 : k.difficulty === 'medium' ? 2 : 3;
          return sum + score;
        }, 0) / keywords.length
      : 0;
    
    const highPotentialCount = result.opportunities?.filter(
      (o: KeywordOpportunity) => o.potentialScore >= 70
    ).length || 0;

    // 计算平台热度（只包含已集成的真实API平台）
    const platformScores: Record<string, number> = { doubao: 0, deepseek: 0, kimi: 0, qwen: 0 };
    keywords.forEach((k: KeywordData) => {
      if (k.platforms) {
        Object.entries(k.platforms).forEach(([platform, score]) => {
          platformScores[platform] += score;
        });
      }
    });
    
    const topPlatforms = Object.entries(platformScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([platform]) => platform);

    return {
      keywords: keywords,
      clusters: result.clusters || [],
      opportunities: result.opportunities || [],
      summary: {
        totalKeywords: keywords.length,
        avgDifficulty: Math.round(avgDifficulty * 10) / 10,
        highPotentialCount,
        topPlatforms,
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error('关键词挖掘失败:', error);
    return {
      keywords: [],
      clusters: [],
      opportunities: [],
      summary: {
        totalKeywords: 0,
        avgDifficulty: 0,
        highPotentialCount: 0,
        topPlatforms: [],
      },
      generatedAt: new Date(),
    };
  }
}

/**
 * 分析单个关键词
 */
export async function analyzeKeyword(
  keyword: string,
  topic: string,
  customHeaders?: Record<string, string>
): Promise<KeywordData | null> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个GEO关键词分析师。请分析给定关键词在主题上下文中的价值。

返回JSON格式：
{
  "keyword": "关键词",
  "type": "core|longtail|question|brand|competitor|trending",
  "searchVolume": 0-100,
  "difficulty": "easy|medium|hard",
  "competition": 0-100,
  "relevance": 0-100,
  "trend": "up|stable|down",
  "suggestions": ["相关建议"],
  "platforms": {
    "doubao": 0-100,
    "deepseek": 0-100,
    "kimi": 0-100,
    "qwen": 0-100
  }
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `关键词："${keyword}"
主题上下文：${topic}

请分析这个关键词的价值。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.3 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('关键词分析失败:', error);
    return null;
  }
}

/**
 * 获取关键词建议
 */
export async function getKeywordSuggestions(
  partialKeyword: string,
  topic: string,
  customHeaders?: Record<string, string>
): Promise<string[]> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个关键词建议助手。基于用户输入的部分关键词和主题，提供相关的关键词建议。

返回JSON数组格式：["建议1", "建议2", ...]`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `部分关键词："${partialKeyword}"
主题：${topic}

请提供10个相关的关键词建议。` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.7 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('获取关键词建议失败:', error);
    return [];
  }
}

/**
 * 关键词竞争分析
 */
export async function analyzeKeywordCompetition(
  keywords: string[],
  customHeaders?: Record<string, string>
): Promise<{
  analysis: Array<{
    keyword: string;
    competitors: string[];
    gaps: string[];
    recommendations: string[];
  }>;
  summary: string;
}> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const systemPrompt = `你是一个SEO竞争分析师。分析关键词的竞争态势，找出机会点。

返回JSON格式：
{
  "analysis": [
    {
      "keyword": "关键词",
      "competitors": ["竞争对手1", "竞争对手2"],
      "gaps": ["竞争空白点1", "竞争空白点2"],
      "recommendations": ["建议1", "建议2"]
    }
  ],
  "summary": "整体竞争态势总结"
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { 
      role: 'user' as const, 
      content: `请分析以下关键词的竞争态势：

${keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}` 
    },
  ];

  try {
    const response = await client.invoke(messages, { temperature: 0.5 });
    return JSON.parse(response.content);
  } catch (error) {
    console.error('竞争分析失败:', error);
    return {
      analysis: keywords.map(k => ({
        keyword: k,
        competitors: [],
        gaps: [],
        recommendations: [],
      })),
      summary: '分析失败',
    };
  }
}
