import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/geo-tasks/[id] - 获取任务详情和结果
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseClient();

    const { data: task, error } = await supabase
      .from('geo_analysis_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('获取任务详情失败:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '任务不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: `获取任务详情失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });

  } catch (error) {
    console.error('获取任务详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务详情失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/geo-tasks/[id] - 删除任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('geo_analysis_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除任务失败:', error);
      return NextResponse.json(
        { success: false, error: `删除任务失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '任务已删除',
    });

  } catch (error) {
    console.error('删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    );
  }
}
