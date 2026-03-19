import { NextRequest, NextResponse } from 'next/server';
import { 
  performKeywordAnalysis, 
  performQuestionAnalysis,
  SUPPORTED_PLATFORMS 
} from '@/lib/geo-analysis-service';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

/**
 * POST /api/geo-analysis - 执行GEO分析
 * 
 * 支持两种分析类型：
 * - keyword: 关键词分析
 * - question: 问题分析
 * 
 * 所有分析均真实调用豆包、DeepSeek、Kimi、通义千问四个AI平台
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type, analysisType } = body;

    // 提取相关问题
    if (action === 'extract-questions') {
      return await extractQuestions(analysisType, body);
    }

    // 根据分析类型执行不同的分析
    const analysisTypeFinal = type || 'keyword';

    switch (analysisTypeFinal) {
      case 'keyword': {
        const { keyword, industry, platforms } = body;
        if (!keyword) {
          return NextResponse.json(
            { success: false, error: '请提供关键词' },
            { status: 400 }
          );
        }
        const result = await performKeywordAnalysis(keyword, industry, platforms);
        return NextResponse.json({ success: true, data: result });
      }

      case 'question': {
        const { question, targetBrand, platforms } = body;
        if (!question) {
          return NextResponse.json(
            { success: false, error: '请提供问题' },
            { status: 400 }
          );
        }
        const result = await performQuestionAnalysis(question, targetBrand, platforms);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知的分析类型，支持: keyword, question' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('GEO分析API错误:', error);
    return NextResponse.json(
      { success: false, error: '分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 提取相关问题
 */
async function extractQuestions(analysisType: string, body: any) {
  const { input, industry } = body;
  
  if (!input) {
    return NextResponse.json(
      { success: false, error: '请提供输入内容' },
      { status: 400 }
    );
  }

  const config = new Config();
  const client = new LLMClient(config, {});

  try {
    let prompt = '';
    
    if (analysisType === 'keyword') {
      prompt = `基于关键词"${input}"${industry ? `（所属行业：${industry}）` : ''}，生成8-12个相关的用户搜索问题。
请按以下JSON格式返回问题列表：
[{"id":1,"question":"问题内容","category":"问题分类"}]

问题分类包括：产品推荐、价格对比、使用指南、技术参数、品牌对比、购买决策、售后服务等。

要求：
1. 问题要真实反映用户的搜索意图
2. 问题要有多样性，覆盖不同角度
3. 问题要具体，避免过于宽泛`;
    } else {
      prompt = `基于问题"${input}"，生成8-12个相关的延伸问题。
请按以下JSON格式返回问题列表：
[{"id":1,"question":"问题内容","category":"问题分类"}]

问题分类包括：产品推荐、价格对比、使用指南、技术参数、品牌对比、购买决策、售后服务等。

要求：
1. 问题要围绕原始问题进行延伸
2. 问题要有多样性，覆盖不同角度
3. 问题要具体，避免过于宽泛`;
    }

    const messages = [
      { role: 'system' as const, content: '你是一个专业的SEO分析师，擅长分析用户搜索意图和生成相关问题。请只返回JSON数组，不要添加任何其他内容。' },
      { role: 'user' as const, content: prompt },
    ];

    const response = await client.invoke(messages, { temperature: 0.7 });
    const content = response.content.trim();
    
    // 尝试解析JSON
    let questions = [];
    try {
      // 提取JSON数组部分
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('解析问题失败:', parseError, content);
      // 返回默认问题
      questions = [
        { id: 1, question: input, category: '核心问题' },
        { id: 2, question: `${input}怎么样？`, category: '评价类' },
        { id: 3, question: `${input}哪个好？`, category: '对比类' },
      ];
    }

    return NextResponse.json({ 
      success: true, 
      questions: questions.slice(0, 12) // 最多返回12个问题
    });

  } catch (error) {
    console.error('提取问题失败:', error);
    return NextResponse.json(
      { success: false, error: '提取问题失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geo-analysis - 获取API说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: 'GEO分析API - 真实调用AI平台进行关键词/问题分析',
      note: '所有分析均真实调用豆包、DeepSeek、Kimi、通义千问四个AI平台API',
      analysisTypes: [
        {
          type: 'keyword',
          description: '关键词分析 - 分析关键词在各平台的排名和机会',
          params: ['keyword', 'industry?', 'platforms?'],
          example: { type: 'keyword', keyword: '激光切割机', industry: '工业设备' }
        },
        {
          type: 'question',
          description: '问题分析 - 分析AI如何回答用户问题',
          params: ['question', 'targetBrand?', 'platforms?'],
          example: { type: 'question', question: '激光切割机哪家好', targetBrand: '华工激光' }
        }
      ],
      actions: [
        {
          name: 'extract-questions',
          method: 'POST',
          description: '提取相关问题',
          params: ['analysisType', 'input', 'industry?']
        }
      ],
      supportedPlatforms: SUPPORTED_PLATFORMS.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        description: p.description,
        model: p.model,
      })),
    }
  });
}
