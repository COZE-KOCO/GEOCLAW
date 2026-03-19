import { NextRequest, NextResponse } from 'next/server';
import { mineKeywords, analyzeKeyword, getKeywordSuggestions, analyzeKeywordCompetition } from '@/lib/keyword-mining';

/**
 * POST /api/keywords - 关键词挖掘
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, topic, seedKeywords, targetPlatforms, keyword, keywords, partialKeyword } = body;

    // 关键词挖掘
    if (action === 'mine' || (!action && topic)) {
      if (!topic) {
        return NextResponse.json(
          { success: false, error: '请提供主题' },
          { status: 400 }
        );
      }

      const result = await mineKeywords({
        topic,
        seedKeywords,
        targetPlatforms,
        depth: body.depth || 'basic',
      });

      return NextResponse.json({ 
        success: true, 
        data: result 
      });
    }

    // 单个关键词分析
    if (action === 'analyze') {
      if (!keyword || !topic) {
        return NextResponse.json(
          { success: false, error: '请提供关键词和主题' },
          { status: 400 }
        );
      }

      const result = await analyzeKeyword(keyword, topic);
      
      if (!result) {
        return NextResponse.json(
          { success: false, error: '关键词分析失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        data: result 
      });
    }

    // 关键词建议
    if (action === 'suggest') {
      if (!partialKeyword || !topic) {
        return NextResponse.json(
          { success: false, error: '请提供部分关键词和主题' },
          { status: 400 }
        );
      }

      const suggestions = await getKeywordSuggestions(partialKeyword, topic);
      
      return NextResponse.json({ 
        success: true, 
        data: suggestions 
      });
    }

    // 竞争分析
    if (action === 'competition') {
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json(
          { success: false, error: '请提供关键词列表' },
          { status: 400 }
        );
      }

      const result = await analyzeKeywordCompetition(keywords);
      
      return NextResponse.json({ 
        success: true, 
        data: result 
      });
    }

    return NextResponse.json(
      { success: false, error: '未知操作类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('关键词挖掘API错误:', error);
    return NextResponse.json(
      { success: false, error: '关键词挖掘失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/keywords - 获取关键词挖掘说明
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      actions: [
        {
          name: 'mine',
          description: '关键词挖掘',
          params: ['topic', 'seedKeywords?', 'targetPlatforms?', 'depth?']
        },
        {
          name: 'analyze',
          description: '单个关键词分析',
          params: ['keyword', 'topic']
        },
        {
          name: 'suggest',
          description: '关键词建议',
          params: ['partialKeyword', 'topic']
        },
        {
          name: 'competition',
          description: '竞争分析',
          params: ['keywords']
        }
      ]
    }
  });
}
