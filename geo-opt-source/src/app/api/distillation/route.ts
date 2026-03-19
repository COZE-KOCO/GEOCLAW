import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import {
  extractDistillationWords,
  analyzeIndustry,
  generateRelatedQuestionsLLM,
  type DistillationAnalysis,
} from '@/lib/distillation-words';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title, industry } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 提取请求头用于LLM调用
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 使用LLM提取蒸馏词（自动判断行业）
    const analysis: DistillationAnalysis = await extractDistillationWords(
      content,
      title,
      industry,
      customHeaders
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('蒸馏词分析失败:', error);
    return NextResponse.json(
      { success: false, error: '分析失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const content = searchParams.get('content');
  const title = searchParams.get('title');
  const keyword = searchParams.get('keyword');
  const industry = searchParams.get('industry');
  const analyze = searchParams.get('analyze');

  // 提取请求头用于LLM调用
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

  // 生成相关问题
  if (keyword && industry) {
    const questions = await generateRelatedQuestionsLLM(keyword, industry, customHeaders);
    return NextResponse.json({
      success: true,
      data: { keyword, industry, questions },
    });
  }

  // 分析内容行业
  if (content && analyze === 'industry') {
    const industryResult = await analyzeIndustry(content, title || undefined, customHeaders);
    return NextResponse.json({
      success: true,
      data: industryResult,
    });
  }

  // 默认返回提示信息
  return NextResponse.json({
    success: true,
    data: {
      message: '蒸馏词分析系统 - 使用LLM自动判断行业并提取关键词',
      usage: {
        analyzeContent: 'POST /api/distillation { content, title?, industry? }',
        analyzeIndustry: 'GET /api/distillation?content=xxx&analyze=industry',
        generateQuestions: 'GET /api/distillation?keyword=xxx&industry=xxx',
      },
    },
  });
}
