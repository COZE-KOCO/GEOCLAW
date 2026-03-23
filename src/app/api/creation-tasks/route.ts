/**
 * 创作任务 API
 * 
 * GET  - 获取创作任务列表
 * POST - 创建创作任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 任务状态类型
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 数据库记录转前端类型
function dbToTask(record: any) {
  return {
    id: record.id,
    planId: record.plan_id,
    businessId: record.business_id,
    status: record.status as TaskStatus,
    priority: record.priority,
    params: record.params || {},
    result: record.result,
    publishTaskId: record.publish_task_id,
    scheduledAt: record.scheduled_at,
    startedAt: record.started_at,
    completedAt: record.completed_at,
    error: record.error,
    retryCount: record.retry_count || 0,
    maxRetries: record.max_retries || 3,
    metadata: record.metadata || {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * GET /api/creation-tasks
 * 获取创作任务列表
 * 
 * Query params:
 * - businessId: 商家ID（必填）
 * - status: 状态过滤
 * - planId: 计划ID过滤
 * - limit: 返回数量限制
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const planId = searchParams.get('planId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log('[CreationTasks] 查询任务:', { businessId, status, planId, limit });
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: '缺少商家ID' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('creation_tasks')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (planId) {
      query = query.eq('plan_id', planId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[CreationTasks] 查询失败:', error);
      return NextResponse.json(
        { success: false, error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    // 计算统计
    const tasks = data || [];
    const stats = {
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
    
    console.log('[CreationTasks] 查询成功:', { count: tasks.length, stats });
    
    return NextResponse.json({ 
      success: true, 
      data: tasks.map(dbToTask),
      stats,
    });
  } catch (error) {
    console.error('[CreationTasks] 查询异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creation-tasks
 * 创建创作任务
 * 
 * Body:
 * - planId: 计划ID
 * - businessId: 商家ID
 * - params: 创作参数
 * - scheduledAt: 计划执行时间
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, businessId, params, scheduledAt, priority, maxRetries, metadata } = body;
    
    console.log('[CreationTasks] 创建任务:', { planId, businessId });
    
    if (!planId || !businessId) {
      return NextResponse.json(
        { success: false, error: '缺少计划ID或商家ID' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('creation_tasks')
      .insert({
        plan_id: planId,
        business_id: businessId,
        status: 'pending',
        priority: priority || 5,
        params: params || {},
        scheduled_at: scheduledAt || now,
        retry_count: 0,
        max_retries: maxRetries || 3,
        metadata: metadata || {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('[CreationTasks] 创建失败:', error);
      return NextResponse.json(
        { success: false, error: `创建失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('[CreationTasks] 创建成功:', data.id);
    
    return NextResponse.json({ 
      success: true, 
      data: dbToTask(data) 
    });
  } catch (error) {
    console.error('[CreationTasks] 创建异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creation-tasks
 * 更新创作任务状态
 * 
 * Body:
 * - id: 任务ID
 * - status: 新状态
 * - result: 执行结果
 * - error: 错误信息
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, result, error: taskError, startedAt, completedAt } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (status) updates.status = status;
    if (result) updates.result = result;
    if (taskError) updates.error = taskError;
    if (startedAt) updates.started_at = startedAt;
    if (completedAt) updates.completed_at = completedAt;
    
    const { error } = await supabase
      .from('creation_tasks')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('[CreationTasks] 更新失败:', error);
      return NextResponse.json(
        { success: false, error: `更新失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CreationTasks] 更新异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
