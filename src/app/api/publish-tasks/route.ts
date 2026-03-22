import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPublishTasks,
  getPublishTaskById,
  getPendingScheduledTasks,
  getRunningTasks,
  getPublishTaskStats,
  createPublishTask,
  batchCreatePublishTasks,
  updatePublishTask,
  deletePublishTask,
  batchDeletePublishTasks,
  startPublishTask,
  completePublishTask,
  failPublishTask,
  cancelPublishTask,
  retryPublishTask,
  updateTaskProgress,
  type CreatePublishTaskInput,
  type UpdatePublishTaskInput,
  type TaskStatus,
} from '@/lib/publish-task-store';

/**
 * GET /api/publish-tasks
 * 获取发布任务列表或单个任务详情
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const businessId = searchParams.get('businessId');
  const status = searchParams.get('status');
  const taskType = searchParams.get('taskType');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const stats = searchParams.get('stats');
  const pending = searchParams.get('pending');
  const running = searchParams.get('running');

  try {
    // 获取任务统计
    if (stats === 'true') {
      const statsData = await getPublishTaskStats({
        businessId: businessId || undefined,
      });
      return NextResponse.json({ success: true, data: statsData });
    }

    // 获取待执行的定时任务
    if (pending === 'true') {
      const tasks = await getPendingScheduledTasks();
      return NextResponse.json({ success: true, data: tasks });
    }

    // 获取正在运行的任务
    if (running === 'true') {
      const tasks = await getRunningTasks();
      return NextResponse.json({ success: true, data: tasks });
    }

    // 获取单个任务详情
    if (id) {
      const task = await getPublishTaskById(id);
      return NextResponse.json({ success: !!task, data: task });
    }

    // 获取任务列表
    const tasks = await getAllPublishTasks({
      businessId: businessId || undefined,
      status: status ? (status.split(',') as TaskStatus[]) : undefined,
      taskType: taskType as 'scheduled' | 'immediate' | 'recurring' | undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取发布任务失败:', error);
    return NextResponse.json(
      { success: false, error: '获取发布任务失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/publish-tasks
 * 创建发布任务或执行任务操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const input: CreatePublishTaskInput = {
          businessId: data.businessId,
          draftId: data.draftId,
          taskName: data.taskName,
          taskType: data.taskType,
          priority: data.priority,
          title: data.title,
          content: data.content,
          images: data.images,
          tags: data.tags,
          targetPlatforms: data.targetPlatforms,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          recurringRule: data.recurringRule,
          maxRetries: data.maxRetries,
          retryDelay: data.retryDelay,
          notifyOnComplete: data.notifyOnComplete,
          notifyOnFail: data.notifyOnFail,
          metadata: data.metadata,
        };
        
        const task = await createPublishTask(input);
        
        // 注意：Web端无法执行发布任务，实际发布由桌面端调度器执行
        // 立即执行类型的任务会被桌面端调度器优先处理
        
        return NextResponse.json({ success: true, data: task });
      }

      case 'createBatch': {
        const inputs: CreatePublishTaskInput[] = data.tasks.map((t: any) => ({
          businessId: t.businessId,
          draftId: t.draftId,
          taskName: t.taskName,
          taskType: t.taskType,
          priority: t.priority,
          title: t.title,
          content: t.content,
          images: t.images,
          tags: t.tags,
          targetPlatforms: t.targetPlatforms,
          scheduledAt: t.scheduledAt ? new Date(t.scheduledAt) : undefined,
          recurringRule: t.recurringRule,
          maxRetries: t.maxRetries,
          retryDelay: t.retryDelay,
          notifyOnComplete: t.notifyOnComplete,
          notifyOnFail: t.notifyOnFail,
          metadata: t.metadata,
        }));
        
        const tasks = await batchCreatePublishTasks(inputs);
        return NextResponse.json({ success: true, data: tasks });
      }

      case 'update': {
        const input: UpdatePublishTaskInput = {
          taskName: data.taskName,
          priority: data.priority,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          recurringRule: data.recurringRule,
          status: data.status,
          progress: data.progress,
          publishedPlatforms: data.publishedPlatforms,
          failedPlatforms: data.failedPlatforms,
          results: data.results,
          startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
          completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
          error: data.error,
          retryCount: data.retryCount,
        };
        
        const task = await updatePublishTask(data.id, input);
        return NextResponse.json({ success: !!task, data: task });
      }

      case 'delete': {
        const success = await deletePublishTask(data.id);
        return NextResponse.json({ success });
      }

      case 'deleteBatch': {
        const success = await batchDeletePublishTasks(data.ids);
        return NextResponse.json({ success });
      }

      case 'start': {
        const task = await startPublishTask(data.id);
        
        // 注意：Web端无法执行发布任务，实际发布由桌面端调度器执行
        // 启动后的任务会被桌面端调度器识别并处理
        
        return NextResponse.json({ success: !!task, data: task });
      }

      case 'cancel': {
        const task = await cancelPublishTask(data.id);
        return NextResponse.json({ success: !!task, data: task });
      }

      case 'retry': {
        const task = await retryPublishTask(data.id);
        
        // 注意：Web端无法执行发布任务，实际发布由桌面端调度器执行
        // 重试的任务会被桌面端调度器识别并处理
        
        return NextResponse.json({ success: !!task, data: task });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('发布任务操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
