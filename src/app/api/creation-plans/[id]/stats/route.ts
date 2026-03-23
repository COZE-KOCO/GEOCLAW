/**
 * 创作计划统计更新 API
 * 
 * PATCH - 更新计划的执行统计信息
 * 
 * 供桌面端调度器在执行完计划后调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface StatsUpdate {
  totalCreated?: number;
  totalPublished?: number;
  successRate?: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastKeywordIndex?: number;
}

/**
 * PATCH /api/creation-plans/[id]/stats
 * 更新计划统计信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await request.json();
    
    console.log('[PlanStats] 更新计划统计:', {
      planId,
      updates: body,
    });
    
    const supabase = getSupabaseClient();
    
    // 先获取当前计划信息
    const { data: currentPlan, error: fetchError } = await supabase
      .from('creation_plans')
      .select('total_created, total_published')
      .eq('id', planId)
      .single();
    
    if (fetchError || !currentPlan) {
      console.error('[PlanStats] 计划不存在:', {
        planId,
        error: fetchError?.message,
      });
      return NextResponse.json(
        { success: false, error: '计划不存在' },
        { status: 404 }
      );
    }
    
    // 构建更新对象
    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    
    // 累加统计值
    if (body.totalCreated !== undefined) {
      updates.total_created = (currentPlan.total_created || 0) + body.totalCreated;
    }
    
    if (body.totalPublished !== undefined) {
      updates.total_published = (currentPlan.total_published || 0) + body.totalPublished;
    }
    
    // 直接替换的值
    if (body.successRate !== undefined) {
      updates.success_rate = body.successRate.toString();
    }
    
    if (body.lastRunAt !== undefined) {
      updates.last_run_at = body.lastRunAt;
    }
    
    if (body.nextRunAt !== undefined) {
      updates.next_run_at = body.nextRunAt;
    }
    
    // 关键词进度索引
    if (body.lastKeywordIndex !== undefined) {
      updates.last_keyword_index = body.lastKeywordIndex;
    }
    
    console.log('[PlanStats] 执行更新:', updates);
    
    // 执行更新
    let updateResult = await supabase
      .from('creation_plans')
      .update(updates)
      .eq('id', planId);
    
    let error = updateResult.error;
    
    // 如果更新失败且包含 last_keyword_index，尝试不带该字段重试
    // 这是为了兼容数据库中没有该字段的情况
    if (error && 'last_keyword_index' in updates) {
      console.warn('[PlanStats] 首次更新失败，尝试不带 last_keyword_index 重试...');
      const { last_keyword_index, ...updatesWithoutKeywordIndex } = updates;
      const retryResult = await supabase
        .from('creation_plans')
        .update(updatesWithoutKeywordIndex)
        .eq('id', planId);
      
      if (!retryResult.error) {
        // 重试成功，说明是字段不存在的问题，忽略这个错误
        error = null;
        console.log('[PlanStats] 重试成功');
      } else {
        console.error('[PlanStats] 重试也失败:', retryResult.error);
      }
    }
    
    if (error) {
      console.error('[PlanStats] 更新失败:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return NextResponse.json(
        { success: false, error: `更新失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('[PlanStats] 更新成功');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PlanStats] 更新异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/creation-plans/[id]/stats
 * 获取计划统计信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('creation_plans')
      .select(`
        id,
        total_created,
        total_published,
        success_rate,
        last_run_at,
        next_run_at
      `)
      .eq('id', planId)
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: '计划不存在' },
        { status: 404 }
      );
    }
    
    // 获取该计划的任务统计
    const { data: taskStats } = await supabase
      .from('creation_tasks')
      .select('status')
      .eq('plan_id', planId);
    
    const taskCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
    
    (taskStats || []).forEach(task => {
      if (task.status in taskCounts) {
        taskCounts[task.status as keyof typeof taskCounts]++;
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        totalCreated: data.total_created || 0,
        totalPublished: data.total_published || 0,
        successRate: parseFloat(data.success_rate) || 0,
        lastRunAt: data.last_run_at,
        nextRunAt: data.next_run_at,
        taskCounts,
      },
    });
  } catch (error) {
    console.error('获取计划统计异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
