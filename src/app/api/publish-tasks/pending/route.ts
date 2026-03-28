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
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    // 查询待执行的定时任务
    // 条件：scheduled_at <= now（已到时间）OR created_at >= 1分钟前（刚创建）
    // 这样可以解决 Electron 端和服务器时间不同步的问题
    // 同时确保立即发布和定时发布任务都能被查询到
    let query = client
      .from('publish_tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('task_type', 'scheduled')
      .or(`scheduled_at.lte.${now},created_at.gte.${oneMinuteAgo}`)
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
