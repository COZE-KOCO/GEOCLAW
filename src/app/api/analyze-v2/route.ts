import { NextRequest, NextResponse } from 'next/server';
import { calculateGEOScore, getGrade, type ContentAnalysisUnified, type GEOScoreUnified } from '@/lib/geo-scoring-unified';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { title, content, author, keywords, references, hasSchema, hasFAQ, targetQuestion, industry } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 确保数组类型
    if (typeof keywords === 'string') {
      keywords = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    }
    if (typeof references === 'string') {
      references = references.split('\n').map((r: string) => r.trim()).filter((r: string) => r);
    }

    // 分析内容
    const analysis: ContentAnalysisUnified = {
      title,
      content,
      author: author || undefined,
      keywords: keywords || [],
      references: references || [],
      hasSchema: hasSchema || false,
      hasFAQ: hasFAQ || false,
      hasImages: content.includes('![图片') || content.includes('<img'),
      wordCount: content.length,
      targetQuestion: targetQuestion || undefined,
      industry: industry || undefined,
    };

    // 计算GEO评分（统一版）
    const geoScore = calculateGEOScore(analysis);
    const gradeInfo = getGrade(geoScore.total);

    return NextResponse.json({
      success: true,
      score: geoScore,
      grade: {
        grade: gradeInfo.grade,
        color: gradeInfo.color,
        description: gradeInfo.description,
        aiReferenceRate: gradeInfo.aiReferenceRate,
      },
      templateRecommendation: {
        templateType: geoScore.analysis.contentTemplate.type,
        templateName: getTemplateName(geoScore.analysis.contentTemplate.type),
        confidence: geoScore.analysis.contentTemplate.confidence,
        reason: geoScore.analysis.contentTemplate.improvements[0] || '内容结构清晰',
        aiReferenceRate: gradeInfo.aiReferenceRate,
        tips: geoScore.quickWins,
      },
      problemAnalysis: {
        questionPatterns: geoScore.analysis.questionPatterns,
        suggestions: geoScore.suggestions.slice(0, 3),
      },
      quickWins: geoScore.quickWins,
      platformSuggestions: {
        primary: ['知乎专栏', '百度百家号'],
        secondary: ['今日头条', '微信公众号'],
        reasons: ['多平台分发可提升内容曝光率'],
      },
    });

  } catch (error) {
    console.error('分析内容失败:', error);
    return NextResponse.json(
      { success: false, error: '分析内容失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取模板名称
 */
function getTemplateName(type: string): string {
  const names: Record<string, string> = {
    'qna': '问答型',
    'comparison': '对比型',
    'guide': '指南型',
    'case': '案例型',
    'report': '报告型',
    'unknown': '通用型',
  };
  return names[type] || '通用型';
}
