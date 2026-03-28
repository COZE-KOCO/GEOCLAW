import { NextRequest, NextResponse } from 'next/server';
import { 
  getPendingWebhookTasks, 
  executeWebhookTask, 
  executeAllPendingWebhookTasks 
} from '@/lib/webhook-task-service';

/**
 * GET /api/webhook/tasks
 * 获取待执行的 Webhook 推送任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const tasks = await getPendingWebhookTasks();
    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        taskName: t.taskName,
        title: t.title,
        targetCount: t.webhookTargets.length,
        status: t.webhookStatus,
      })),
    });
  } catch (error) {
    console.error('获取Webhook任务失败:', error);
    return NextResponse.json({ error: '获取Webhook任务失败' }, { status: 500 });
  }
}

/**
 * POST /api/webhook/tasks
 * 执行 Webhook 推送任务
 * Body: {
 *   taskId?: string;      // 指定任务ID，不传则执行所有待处理任务
 *   executeAll?: boolean; // 是否执行所有待处理任务
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, executeAll } = body;

    if (executeAll) {
      // 执行所有待处理任务
      const results = await executeAllPendingWebhookTasks();
      return NextResponse.json({
        success: true,
        executed: results.length,
        results,
      });
    }

    if (taskId) {
      // 执行指定任务
      const tasks = await getPendingWebhookTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        return NextResponse.json({ 
          error: '任务不存在或不在待处理状态' 
        }, { status: 404 });
      }

      const result = await executeWebhookTask(task);
      return NextResponse.json({
        success: result.success,
        result,
      });
    }

    // 默认执行所有待处理任务
    const results = await executeAllPendingWebhookTasks();
    return NextResponse.json({
      success: true,
      executed: results.length,
      results,
    });
  } catch (error) {
    console.error('执行Webhook任务失败:', error);
    return NextResponse.json({ error: '执行Webhook任务失败' }, { status: 500 });
  }
}
