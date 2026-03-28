import { NextRequest, NextResponse } from 'next/server';
import { createProject } from '@/lib/project-store';
import { calculateGEOScore, getGrade, type ContentAnalysisUnified } from '@/lib/geo-scoring-unified';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { title, content, author, keywords, references, hasSchema, hasFAQ } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '标题和内容不能为空' },
        { status: 400 }
      );
    }

    // 确保keywords和references是数组
    if (typeof keywords === 'string') {
      keywords = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    }
    if (typeof references === 'string') {
      references = references.split('\n').map((r: string) => r.trim()).filter((r: string) => r);
    }

    // 计算GEO评分（统一版）
    const analysis: ContentAnalysisUnified = {
      title,
      content,
      author: author || undefined,
      references: references || [],
      keywords: keywords || [],
      hasSchema: hasSchema || false,
      hasFAQ: hasFAQ || false,
      hasImages: content.includes('![图片') || content.includes('<img'),
      wordCount: content.length,
    };

    const geoScore = calculateGEOScore(analysis);
    const gradeInfo = getGrade(geoScore.total);

    // 创建项目
    const project = await createProject({
      title,
      content,
      author: author || undefined,
      keywords: keywords || [],
      references: references || [],
      score: Math.round(geoScore.total * 10), // 转换为整数（乘以10保留一位小数精度）
      grade: gradeInfo.grade,
      breakdown: geoScore.breakdown,
      status: 'active',
      isPublic: false, // 默认不公开
    });

    return NextResponse.json({ 
      success: true, 
      data: project,
      score: geoScore,
      grade: gradeInfo
    });
  } catch (error) {
    console.error('保存项目失败:', error);
    return NextResponse.json(
      { success: false, error: '保存项目失败' },
      { status: 500 }
    );
  }
}
