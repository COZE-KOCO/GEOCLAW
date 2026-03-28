import { NextRequest, NextResponse } from 'next/server';
import { batchDeleteContentDrafts } from '@/lib/content-draft-store';

/**
 * POST /api/content-drafts/batch-delete
 * 批量删除文章
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要删除的文章' }, { status: 400 });
    }

    const result = await batchDeleteContentDrafts(ids);
    
    if (!result.success) {
      return NextResponse.json({ error: '批量删除失败' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('批量删除文章失败:', error);
    return NextResponse.json({ error: '批量删除文章失败' }, { status: 500 });
  }
}
