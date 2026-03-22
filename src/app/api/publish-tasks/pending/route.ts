/**
 * 获取待执行的发布任务 API
 * 供桌面端调度器调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    
    // 查询待执行的定时任务
    let query = client
      .from('publish_tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('task_type', 'scheduled')
      .lte('scheduled_at', now)
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('获取待执行任务失败:', error);
      return NextResponse.json(
        { success: false, error: '获取任务失败' },
        { status: 500 }
      );
    }

    // 转换数据格式
    const formattedTasks = (tasks || []).map(task => ({
      id: task.id,
      businessId: task.business_id,
      planId: task.plan_id,
      taskName: task.task_name,
      title: task.title,
      content: task.content,
      images: task.images || [],
      tags: task.tags || [],
      targetPlatforms: task.target_platforms || [],
      scheduledAt: task.scheduled_at,
      status: task.status,
      priority: task.priority,
    }));

    return NextResponse.json({
      success: true,
      tasks: formattedTasks,
      count: formattedTasks.length,
    });
  } catch (error: any) {
    console.error('获取待执行任务异常:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
