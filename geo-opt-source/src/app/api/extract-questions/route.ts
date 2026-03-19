import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

/**
 * POST /api/extract-questions - 提取相关问题
 * 
 * 根据用户输入的品牌/关键词/问题，提取用户可能想问的问题
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input, count = 8 } = body;

    if (!input || !input.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入内容' },
        { status: 400 }
      );
    }

    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'brand':
        systemPrompt = `你是一个GEO（生成引擎优化）专家。根据用户输入的品牌名称，生成用户在AI搜索引擎中可能会问的相关问题。

要求：
1. 问题要覆盖不同维度：产品、服务、对比、评价、购买等
2. 问题要符合用户真实搜索习惯
3. 问题要具体、可分析
4. 返回JSON数组格式

示例输入："华为"
示例输出：
[
  {"id": 1, "question": "华为手机怎么样？值得买吗？", "category": "产品评价"},
  {"id": 2, "question": "华为和苹果手机哪个好？", "category": "品牌对比"},
  {"id": 3, "question": "华为有哪些热销产品？", "category": "产品查询"},
  {"id": 4, "question": "华为手机的优缺点是什么？", "category": "产品评价"},
  {"id": 5, "question": "华为售后服务怎么样？", "category": "服务评价"},
  {"id": 6, "question": "华为手机性价比如何？", "category": "购买决策"},
  {"id": 7, "question": "华为最新发布了什么产品？", "category": "资讯动态"},
  {"id": 8, "question": "华为和小米哪个好？", "category": "品牌对比"}
]`;
        userPrompt = `品牌名称：${input}\n\n请生成${count}个用户可能会问的问题。`;
        break;

      case 'keyword':
        systemPrompt = `你是一个GEO（生成引擎优化）专家和SEO专家。根据用户输入的关键词，生成用户在AI搜索引擎中可能会问的相关问题。

要求：
1. 问题要围绕关键词展开，覆盖不同搜索意图
2. 包含信息型、导航型、交易型等不同类型问题
3. 问题要符合用户真实搜索习惯
4. 返回JSON数组格式

示例输入："激光切割机"
示例输出：
[
  {"id": 1, "question": "激光切割机哪家好？", "category": "购买推荐"},
  {"id": 2, "question": "激光切割机价格一般是多少？", "category": "价格咨询"},
  {"id": 3, "question": "激光切割机和等离子切割哪个好？", "category": "产品对比"},
  {"id": 4, "question": "激光切割机怎么选购？", "category": "购买指南"},
  {"id": 5, "question": "激光切割机有哪些知名品牌？", "category": "品牌查询"},
  {"id": 6, "question": "激光切割机的工作原理是什么？", "category": "知识科普"},
  {"id": 7, "question": "激光切割机维护保养要注意什么？", "category": "使用指南"},
  {"id": 8, "question": "国产激光切割机哪个牌子好？", "category": "购买推荐"}
]`;
        userPrompt = `关键词：${input}\n\n请生成${count}个用户可能会问的问题。`;
        break;

      case 'question':
        systemPrompt = `你是一个GEO（生成引擎优化）专家。根据用户输入的问题，扩展生成相关的衍生问题。

要求：
1. 问题要与原问题相关但角度不同
2. 可以是更具体或更宽泛的问题
3. 问题要符合用户真实搜索习惯
4. 返回JSON数组格式，第一个必须是原问题

示例输入："激光切割机哪家好？"
示例输出：
[
  {"id": 1, "question": "激光切割机哪家好？", "category": "原始问题"},
  {"id": 2, "question": "激光切割机十大品牌有哪些？", "category": "品牌排名"},
  {"id": 3, "question": "国内激光切割机厂家哪家性价比高？", "category": "性价比"},
  {"id": 4, "question": "大功率激光切割机哪个牌子好？", "category": "细分需求"},
  {"id": 5, "question": "激光切割机品牌排行榜", "category": "排名查询"},
  {"id": 6, "question": "激光切割机哪家售后服务好？", "category": "服务评价"},
  {"id": 7, "question": "进口激光切割机和国产的哪个好？", "category": "进口对比"},
  {"id": 8, "question": "购买激光切割机要注意什么？", "category": "购买建议"}
]`;
        userPrompt = `原始问题：${input}\n\n请生成${count}个相关问题（第一个必须是原问题）。`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: '未知的类型，支持: brand, keyword, question' },
          { status: 400 }
        );
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, { temperature: 0.7 });
    
    // 解析JSON
    let questions;
    try {
      // 尝试提取JSON数组
      const content = response.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch {
      // 如果解析失败，返回默认问题
      questions = generateDefaultQuestions(type, input, count);
    }

    // 确保每个问题都有id和category
    questions = questions.map((q: any, index: number) => ({
      id: q.id || index + 1,
      question: q.question || q,
      category: q.category || '相关问题',
    }));

    return NextResponse.json({
      success: true,
      data: {
        input,
        type,
        questions,
        generatedAt: new Date().toLocaleString('zh-CN'),
      },
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
 * 生成默认问题（当LLM调用失败时使用）
 */
function generateDefaultQuestions(type: string, input: string, count: number) {
  const templates = {
    brand: [
      { question: `${input}怎么样？`, category: '产品评价' },
      { question: `${input}值得买吗？`, category: '购买决策' },
      { question: `${input}有哪些优缺点？`, category: '产品分析' },
      { question: `${input}和竞品对比哪个好？`, category: '品牌对比' },
      { question: `${input}价格怎么样？`, category: '价格咨询' },
      { question: `${input}口碑如何？`, category: '口碑评价' },
      { question: `${input}最新产品有哪些？`, category: '产品动态' },
      { question: `${input}售后服务怎么样？`, category: '服务评价' },
    ],
    keyword: [
      { question: `${input}是什么？`, category: '基础知识' },
      { question: `${input}哪家好？`, category: '购买推荐' },
      { question: `${input}价格多少？`, category: '价格咨询' },
      { question: `${input}怎么选？`, category: '购买指南' },
      { question: `${input}有哪些品牌？`, category: '品牌查询' },
      { question: `${input}排名前十的是哪些？`, category: '排名查询' },
      { question: `${input}对比其他产品怎么样？`, category: '产品对比' },
      { question: `${input}使用要注意什么？`, category: '使用指南' },
    ],
    question: [
      { question: input, category: '原始问题' },
      { question: `关于${input}的最新信息`, category: '资讯动态' },
      { question: `${input}专业建议`, category: '专业建议' },
      { question: `${input}注意事项`, category: '注意事项' },
    ],
  };

  return (templates[type as keyof typeof templates] || templates.brand).slice(0, count);
}

/**
 * GET /api/extract-questions - API说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      description: '根据输入提取相关问题API',
      types: [
        { type: 'brand', description: '品牌相关问题', example: { type: 'brand', input: '华为', count: 8 } },
        { type: 'keyword', description: '关键词相关问题', example: { type: 'keyword', input: '激光切割机', count: 8 } },
        { type: 'question', description: '问题衍生问题', example: { type: 'question', input: '激光切割机哪家好', count: 8 } },
      ],
    },
  });
}
