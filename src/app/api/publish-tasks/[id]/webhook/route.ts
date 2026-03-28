import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { executeWebhookTask, type WebhookTask } from '@/lib/webhook-task-service';

/**
 * 从目标平台中筛选出官网（Webhook）目标
 * 兼容现有数据库结构
 */
function extractWebhookTargets(targetPlatforms: any[]): any[] {
  if (!targetPlatforms || !Array.isArray(targetPlatforms)) {
    return [];
  }
  
  return targetPlatforms
    .filter(target => target.platformCategory === 'official_site' || target.platform === 'official_site')
    .filter(target => target.webhookConfig?.enabled);
}

/**
 * POST /api/publish-tasks/[id]/webhook
 * 执行指定任务的 Webhook 推送
 * 
 * 兼容说明：从 target_platforms 中提取官网目标
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // 获取任务详情
    const { data: task, error } = await client
      .from('publish_tasks')
      .select('id, business_id, plan_id, task_name, title, content, images, tags, target_platforms, status')
      .eq('id', id)
      .single();

    if (error || !task) {
      return NextResponse.json({ 
        success: false, 
        error: '任务不存在' 
      }, { status: 404 });
    }

    // 从 target_platforms 中提取 Webhook 目标
    const webhookTargets = extractWebhookTargets(task.target_platforms);

    if (webhookTargets.length === 0) {
      return NextResponse.json({
        success: true,
        message: '该任务没有Webhook推送目标',
        results: [],
      });
    }

    // 构建Webhook任务
    const webhookTask: WebhookTask = {
      id: task.id,
      businessId: task.business_id,
      planId: task.plan_id,
      taskName: task.task_name,
      title: task.title,
      content: task.content,
      images: task.images || [],
      tags: task.tags || [],
      webhookTargets: webhookTargets.map(target => ({
        accountId: target.accountId,
        accountName: target.accountName || '',
        webhookConfig: target.webhookConfig,
      })),
      webhookStatus: task.status,
      webhookRetryCount: 0,
      webhookMaxRetries: 3,
    };

    // 执行推送
    const result = await executeWebhookTask(webhookTask);

    return NextResponse.json({
      success: result.success,
      taskId: result.taskId,
      results: result.results,
      duration: result.duration,
    });
  } catch (error) {
    console.error('执行Webhook推送失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '执行Webhook推送失败' 
    }, { status: 500 });
  }
}
