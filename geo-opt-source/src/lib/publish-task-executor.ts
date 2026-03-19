/**
 * 发布任务执行器
 * 负责执行实际的发布任务
 */

import {
  getPublishTaskById,
  startPublishTask,
  completePublishTask,
  failPublishTask,
  updateTaskProgress,
  type PublishResult,
} from '@/lib/publish-task-store';
import { MultiPlatformPublisher, type Platform } from '@/lib/multi-platform';
import { createPublishRecord } from './publish-store';

const publisher = new MultiPlatformPublisher();

/**
 * 执行发布任务
 */
export async function executePublishTask(taskId: string): Promise<void> {
  console.log(`[PublishExecutor] 开始执行任务: ${taskId}`);
  
  // 获取任务详情
  const task = await getPublishTaskById(taskId);
  if (!task) {
    console.error(`[PublishExecutor] 任务不存在: ${taskId}`);
    return;
  }

  // 检查任务状态
  if (task.status !== 'pending' && task.status !== 'queued') {
    console.log(`[PublishExecutor] 任务状态不允许执行: ${task.status}`);
    return;
  }

  // 开始执行任务
  await startPublishTask(taskId);
  
  const results: PublishResult[] = [];
  const totalPlatforms = task.targetPlatforms.length;
  
  try {
    // 逐个平台发布
    for (let i = 0; i < task.targetPlatforms.length; i++) {
      const target = task.targetPlatforms[i];
      const progress = Math.round(((i + 1) / totalPlatforms) * 100);
      
      console.log(`[PublishExecutor] 发布到平台: ${target.platform} (${target.accountId})`);
      
      try {
        // 执行发布
        const publishResult = await publishToPlatform(
          task.title,
          task.content,
          target.platform as Platform,
          {
            images: task.images,
            tags: task.tags,
          }
        );
        
        const result: PublishResult = {
          platform: target.platform,
          accountId: target.accountId,
          accountName: target.accountName,
          status: publishResult.success ? 'success' : 'failed',
          publishedUrl: publishResult.url,
          error: publishResult.error,
          publishedAt: publishResult.success ? new Date().toISOString() : undefined,
        };
        
        results.push(result);
        
        // 创建发布记录
        if (publishResult.success && task.draftId) {
          await createPublishRecord({
            draftId: task.draftId,
            accountId: target.accountId,
            platform: target.platform,
          });
        }
        
        // 更新进度
        await updateTaskProgress(taskId, progress, result);
        
      } catch (error) {
        console.error(`[PublishExecutor] 发布到 ${target.platform} 失败:`, error);
        
        const result: PublishResult = {
          platform: target.platform,
          accountId: target.accountId,
          accountName: target.accountName,
          status: 'failed',
          error: error instanceof Error ? error.message : '发布失败',
        };
        
        results.push(result);
        await updateTaskProgress(taskId, progress, result);
      }
      
      // 添加延迟，避免频繁请求
      if (i < task.targetPlatforms.length - 1) {
        await sleep(1000);
      }
    }
    
    // 完成任务
    await completePublishTask(taskId, results);
    console.log(`[PublishExecutor] 任务完成: ${taskId}`);
    
    // 发送通知（如果配置了）
    if (task.notifyOnComplete) {
      await sendNotification(task, results);
    }
    
  } catch (error) {
    console.error(`[PublishExecutor] 任务执行失败: ${taskId}`, error);
    await failPublishTask(taskId, error instanceof Error ? error.message : '执行失败');
    
    // 发送失败通知
    if (task.notifyOnFail) {
      await sendNotification(task, results, error);
    }
  }
}

/**
 * 发布到单个平台
 */
async function publishToPlatform(
  title: string,
  content: string,
  platform: Platform,
  options?: {
    images?: string[];
    tags?: string[];
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const results = await publisher.publishToMultiplePlatforms(
      {
        title,
        content,
        images: options?.images,
        tags: options?.tags,
      },
      [platform]
    );
    
    const result = results[0];
    
    if (result.status === 'success') {
      return {
        success: true,
        url: result.publishedUrl,
      };
    } else {
      return {
        success: false,
        error: result.message || '发布失败',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '发布异常',
    };
  }
}

/**
 * 发送通知
 */
async function sendNotification(
  task: any,
  results: PublishResult[],
  error?: any
): Promise<void> {
  // TODO: 实现通知发送逻辑
  // 可以集成邮件、钉钉、企业微信等通知渠道
  console.log(`[PublishExecutor] 发送通知: 任务 ${task.id}`);
  
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  
  const message = error
    ? `发布任务「${task.taskName}」执行失败: ${error}`
    : `发布任务「${task.taskName}」执行完成: 成功 ${successCount} 个，失败 ${failCount} 个`;
  
  console.log(`[PublishExecutor] 通知内容: ${message}`);
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 定时任务调度器
 * 用于检查并执行到期的定时任务
 */
export class PublishTaskScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * 启动调度器
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      console.log('[PublishScheduler] 调度器已在运行');
      return;
    }

    console.log(`[PublishScheduler] 启动调度器，间隔 ${intervalMs}ms`);
    this.isRunning = true;

    // 立即执行一次
    this.checkAndExecute();

    // 定时执行
    this.intervalId = setInterval(() => {
      this.checkAndExecute();
    }, intervalMs);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[PublishScheduler] 调度器已停止');
  }

  /**
   * 检查并执行待执行任务
   */
  private async checkAndExecute(): Promise<void> {
    try {
      const { getPendingScheduledTasks } = await import('@/lib/publish-task-store');
      const pendingTasks = await getPendingScheduledTasks();

      if (pendingTasks.length > 0) {
        console.log(`[PublishScheduler] 发现 ${pendingTasks.length} 个待执行任务`);
        
        for (const task of pendingTasks) {
          executePublishTask(task.id).catch(err => {
            console.error(`[PublishScheduler] 执行任务 ${task.id} 失败:`, err);
          });
        }
      }
    } catch (error) {
      console.error('[PublishScheduler] 检查任务失败:', error);
    }
  }
}

// 导出单例
export const publishScheduler = new PublishTaskScheduler();
