/**
 * Webhook 推送任务服务
 * 用于服务端独立执行官网Webhook推送
 * 
 * 兼容说明：由于扣子内置数据库不支持 ALTER TABLE，
 * 本服务使用 target_platforms 字段中的 platformCategory 来识别官网目标
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendWebhook, buildWebhookPayload, type WebhookResult } from './webhook-service';

export interface WebhookTaskTarget {
  accountId: string;
  accountName: string;
  webhookConfig: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    authToken?: string;
    enabled: boolean;
  };
}

export interface WebhookTask {
  id: string;
  businessId: string;
  planId?: string;
  taskName: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  webhookTargets: WebhookTaskTarget[];
  webhookStatus?: string;
  webhookRetryCount: number;
  webhookMaxRetries: number;
}

export interface WebhookTaskResult {
  taskId: string;
  success: boolean;
  results: WebhookResult[];
  duration: number;
}

/**
 * 从目标平台中筛选出官网（Webhook）目标
 * 兼容现有数据库结构，不依赖新字段
 */
function extractWebhookTargets(targetPlatforms: any[]): WebhookTaskTarget[] {
  if (!targetPlatforms || !Array.isArray(targetPlatforms)) {
    return [];
  }
  
  return targetPlatforms
    .filter(target => target.platformCategory === 'official_site' || target.platform === 'official_site')
    .filter(target => target.webhookConfig?.enabled)
    .map(target => ({
      accountId: target.accountId,
      accountName: target.accountName || '',
      webhookConfig: target.webhookConfig,
    }));
}

/**
 * 获取待执行的 Webhook 推送任务
 * 条件：status = 'pending' 或 'running'，且目标中包含官网类型
 */
export async function getPendingWebhookTasks(): Promise<WebhookTask[]> {
  const client = getSupabaseClient();
  
  // 使用基础字段查询，不依赖新字段
  const { data: tasks, error } = await client
    .from('publish_tasks')
    .select(`
      id,
      business_id,
      plan_id,
      task_name,
      title,
      content,
      images,
      tags,
      target_platforms,
      status
    `)
    .in('status', ['pending', 'running'])
    .limit(10);

  if (error) {
    console.error('获取Webhook任务失败:', error);
    return [];
  }

  // 在代码层面筛选包含官网目标的任务
  return (tasks || [])
    .map(task => {
      const webhookTargets = extractWebhookTargets(task.target_platforms);
      return {
        id: task.id,
        businessId: task.business_id,
        planId: task.plan_id,
        taskName: task.task_name,
        title: task.title,
        content: task.content,
        images: task.images || [],
        tags: task.tags || [],
        webhookTargets,
        webhookStatus: undefined,
        webhookRetryCount: 0,
        webhookMaxRetries: 3,
      };
    })
    .filter(task => task.webhookTargets.length > 0); // 只返回有官网目标的任务
}

/**
 * 执行单个 Webhook 推送任务
 */
export async function executeWebhookTask(task: WebhookTask): Promise<WebhookTaskResult> {
  const startTime = Date.now();
  
  console.log(`[WebhookTaskService] 开始执行任务: ${task.taskName} (${task.id})`);
  
  // 更新任务状态为运行中
  await updateWebhookTaskStatus(task.id, 'running');

  const results: WebhookResult[] = [];
  const payload = buildWebhookPayload({
    title: task.title,
    content: task.content,
    tags: task.tags,
  });

  // 逐个推送（也可以并行，但串行更稳定）
  for (const target of task.webhookTargets) {
    if (!target.webhookConfig?.enabled) {
      results.push({
        success: false,
        accountId: target.accountId,
        accountName: target.accountName,
        error: 'Webhook未启用',
        duration: 0,
      });
      continue;
    }

    try {
      const result = await sendWebhook(
        {
          id: target.accountId,
          displayName: target.accountName,
          webhookConfig: target.webhookConfig,
        } as any,
        payload
      );
      results.push(result);
    } catch (error: any) {
      results.push({
        success: false,
        accountId: target.accountId,
        accountName: target.accountName,
        error: error.message || '推送失败',
        duration: 0,
      });
    }

    // 推送间隔
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const successCount = results.filter(r => r.success).length;
  const allSuccess = successCount === results.length;
  const duration = Date.now() - startTime;

  // 更新任务状态
  const newStatus = allSuccess ? 'completed' : 'failed';
  await updateWebhookTaskStatus(task.id, newStatus, results);

  console.log(`[WebhookTaskService] 任务完成: ${task.taskName}, 成功: ${successCount}/${results.length}`);

  return {
    taskId: task.id,
    success: allSuccess,
    results,
    duration,
  };
}

/**
 * 更新 Webhook 任务状态
 * 兼容现有数据库结构，使用现有字段存储状态
 */
export async function updateWebhookTaskStatus(
  taskId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  results?: WebhookResult[]
): Promise<void> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    status, // 直接更新整体状态
    updated_at: new Date().toISOString(),
  };

  if (status === 'running') {
    updateData.started_at = new Date().toISOString();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
    updateData.progress = 100;
  }

  if (results) {
    // 将 webhook 结果合并到 results 字段
    updateData.results = results.map(r => ({
      platform: 'official_website',
      accountId: r.accountId,
      accountName: r.accountName,
      status: r.success ? 'success' : 'failed',
      error: r.error,
      publishedAt: new Date().toISOString(),
    }));
  }

  await client
    .from('publish_tasks')
    .update(updateData)
    .eq('id', taskId);
  
  // 如果成功完成，更新草稿状态为已发布
  if (status === 'completed') {
    // 获取任务的 draft_id
    const { data: task } = await client
      .from('publish_tasks')
      .select('draft_id')
      .eq('id', taskId)
      .single();
    
    if (task?.draft_id) {
      const { error: draftError } = await client
        .from('content_drafts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.draft_id);
      
      if (draftError) {
        console.error(`[WebhookTaskService] 更新草稿状态失败:`, draftError);
      } else {
        console.log(`[WebhookTaskService] ✅ 草稿状态已更新为已发布: draftId=${task.draft_id}`);
      }
    }
  }
}

/**
 * 执行所有待处理的 Webhook 任务
 */
export async function executeAllPendingWebhookTasks(): Promise<WebhookTaskResult[]> {
  const tasks = await getPendingWebhookTasks();
  
  if (tasks.length === 0) {
    console.log('[WebhookTaskService] 没有待执行的Webhook任务');
    return [];
  }

  console.log(`[WebhookTaskService] 发现 ${tasks.length} 个待执行的Webhook任务`);
  
  const results: WebhookTaskResult[] = [];
  
  for (const task of tasks) {
    try {
      const result = await executeWebhookTask(task);
      results.push(result);
    } catch (error) {
      console.error(`[WebhookTaskService] 执行任务失败: ${task.id}`, error);
    }
  }

  return results;
}

export default {
  getPendingWebhookTasks,
  executeWebhookTask,
  executeAllPendingWebhookTasks,
  updateWebhookTaskStatus,
};
