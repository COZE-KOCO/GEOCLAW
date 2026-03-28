/**
 * 查询最近的待执行发布任务 API
 * 供桌面端调度器智能调度使用
 * 
 * GET - 返回最近一个需要执行的发布任务及其预计执行时间
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/publish-tasks/earliest
 * 获取最近一个待执行发布任务
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    
    // 查询最近的待执行任务（排除手动任务 scheduled_at = null）
    // 注意：browser_targets 和 webhook_targets 列可能不存在，使用 target_platforms 代替
    const { data: tasks, error } = await supabase
      .from('publish_tasks')
      .select(`
        id,
        business_id,
        draft_id,
        task_name,
        task_type,
        priority,
        title,
        content,
        images,
        tags,
        target_platforms,
        scheduled_at,
        status,
        progress
      `)
      .eq('status', 'pending')
      .not('scheduled_at', 'is', null)  // 排除手动任务（无计划执行时间）
      .order('scheduled_at', { ascending: true })
      .limit(10);
    
    if (error) {
      console.error('[EarliestTask] 查询失败:', error);
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 }
      );
    }
    
    // 如果没有定时任务，返回 null
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        success: true, 
        task: null,
        nextCheckTime: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        message: '没有待执行的定时发布任务' 
      });
    }
    
    // 找到最近一个到期的任务
    const earliest = tasks[0];
    
    return NextResponse.json({
      success: true,
      task: {
        id: earliest.id,
        businessId: earliest.business_id,
        draftId: earliest.draft_id,
        taskName: earliest.task_name,
        taskType: earliest.task_type,
        priority: earliest.priority,
        title: earliest.title,
        content: earliest.content,
        images: earliest.images || [],
        tags: earliest.tags || [],
        // 兼容处理：从 target_platforms 中分离出浏览器目标和 webhook 目标
        targetPlatforms: earliest.target_platforms || [],
        browserTargets: (earliest.target_platforms || []).filter(
          (t: any) => t.platformCategory !== 'official_site' && t.platform !== 'official_site'
        ),
        webhookTargets: (earliest.target_platforms || []).filter(
          (t: any) => t.platformCategory === 'official_site' || t.platform === 'official_site'
        ),
        scheduledAt: earliest.scheduled_at,
        status: earliest.status,
        progress: earliest.progress,
      },
      totalPending: tasks.length,
    });
  } catch (error) {
    console.error('[EarliestTask] 查询异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
