import { NextRequest, NextResponse } from 'next/server';
import { auditContent, filterSensitiveWords, industryCompliance } from '@/lib/content-audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, industry, platform, strictMode } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 执行内容审核
    const result = auditContent(content, { industry, platform, strictMode });

    // 敏感词过滤
    const filterResult = filterSensitiveWords(content);

    return NextResponse.json({
      success: true,
      data: {
        audit: result,
        filter: filterResult,
        industries: Object.keys(industryCompliance),
      },
    });
  } catch (error) {
    console.error('内容审核失败:', error);
    return NextResponse.json(
      { success: false, error: '审核失败' },
      { status: 500 }
    );
  }
}

// 获取行业合规要求
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const industry = searchParams.get('industry');

  if (industry && industryCompliance[industry]) {
    return NextResponse.json({
      success: true,
      data: {
        industry,
        compliance: industryCompliance[industry],
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      industries: Object.keys(industryCompliance),
      compliance: null,
    },
  });
}
