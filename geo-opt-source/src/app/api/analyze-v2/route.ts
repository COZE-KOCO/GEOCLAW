import { NextRequest, NextResponse } from 'next/server';
import { calculateGEOScoreV2, getGradeV2, type ContentAnalysisV2 } from '@/lib/geo-scoring-v2';
import { recommendTemplate } from '@/lib/content-templates';

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
    const analysis: ContentAnalysisV2 = {
      title,
      content,
      author: author || undefined,
      keywords: keywords || [],
      references: references || [],
      hasSchema: hasSchema || false,
      hasFAQ: hasFAQ || false,
      wordCount: content.length,
      targetQuestion: targetQuestion || undefined,
      industry: industry || undefined,
    };

    // 计算GEO评分 V2
    const geoScore = calculateGEOScoreV2(analysis);
    const gradeInfo = getGradeV2(geoScore.total);

    // 推荐内容模板
    const templateRecommendation = recommendTemplate(title, content);

    return NextResponse.json({
      success: true,
      score: geoScore,
      grade: gradeInfo,
      templateRecommendation: {
        templateType: templateRecommendation.template.type,
        templateName: templateRecommendation.template.name,
        confidence: templateRecommendation.confidence,
        reason: templateRecommendation.reason,
        aiReferenceRate: templateRecommendation.template.aiReferenceRate,
        tips: templateRecommendation.template.tips.slice(0, 3),
      },
      problemAnalysis: geoScore.problemAnalysis,
      quickWins: geoScore.quickWins,
      platformSuggestions: geoScore.platformSuggestions,
    });

  } catch (error) {
    console.error('分析内容失败:', error);
    return NextResponse.json(
      { success: false, error: '分析内容失败' },
      { status: 500 }
    );
  }
}
