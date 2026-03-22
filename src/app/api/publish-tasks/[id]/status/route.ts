/**
 * 发布任务状态更新 API
 * 
 * PUT - 更新任务状态和结果
 * 供桌面端调度器调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * PUT /api/publish-tasks/[id]/status
 * 更新发布任务状态
 * 
 * Body:
 * - status: 任务状态 (running | completed | failed | cancelled)
 * - results: 发布结果数组
 * - error: 错误信息（可选）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { status, results, error } = body;
    
    const client = getSupabaseClient();
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (status) {
      updateData.status = status;
      
      // 根据状态设置时间戳
      if (status === 'running') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    
    if (results) {
      updateData.results = results;
      
      // 统计成功/失败数量
      const successCount = results.filter((r: any) => r.status === 'success').length;
      const failCount = results.filter((r: any) => r.status === 'failed').length;
      
      if (successCount > 0) {
        updateData.published_platforms = successCount;
      }
      if (failCount > 0) {
        updateData.failed_platforms = failCount;
      }
    }
    
    if (error) {
      updateData.error = error;
    }
    
    const { data: task, error: updateError } = await client
      .from('publish_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('更新任务状态失败:', updateError);
      return NextResponse.json(
        { success: false, error: '更新任务状态失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        results: task.results,
        updatedAt: task.updated_at,
      },
    });
  } catch (error) {
    console.error('更新任务状态异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
