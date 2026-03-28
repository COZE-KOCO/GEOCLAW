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
import { getCurrentUser, validateBusinessOwnership } from '@/lib/user-auth';
import { getBusinessesByOwner } from '@/lib/business-store';

/**
 * 获取用户的商家ID（支持前端传递或使用默认）
 */
async function resolveBusinessId(
  userId: string, 
  requestBusinessId?: string | null
): Promise<{ businessId: string } | { needsCreateBusiness: true }> {
  if (requestBusinessId) {
    const hasAccess = await validateBusinessOwnership(userId, requestBusinessId);
    if (!hasAccess) {
      return { needsCreateBusiness: true };
    }
    return { businessId: requestBusinessId };
  }
  
  const businesses = await getBusinessesByOwner(userId);
  if (businesses.length === 0) {
    return { needsCreateBusiness: true };
  }
  return { businessId: businesses[0].id };
}

/**
 * GET /api/publish-tasks
 * 获取发布任务列表或单个任务详情
 * 注意：用户只能获取自己所属企业的任务，支持多商家数据隔离
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const requestBusinessId = searchParams.get('businessId'); // 前端传递的商家ID
  const status = searchParams.get('status');
  const taskType = searchParams.get('taskType');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const stats = searchParams.get('stats');
  const pending = searchParams.get('pending');
  const running = searchParams.get('running');
  
  // 解析 businessId：验证用户是否有权访问该企业
  const businessResult = await resolveBusinessId(user.id, requestBusinessId);
  
  // 如果用户没有企业
  if ('needsCreateBusiness' in businessResult) {
    // 如果是查询列表，返回空列表而不是错误
    if (!id && !stats && !pending && !running) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        needsCreateBusiness: true 
      });
    }
    // 其他情况返回错误提示
    return NextResponse.json({ 
      success: false, 
      error: '请先创建企业',
      needsCreateBusiness: true 
    });
  }
  const businessId = businessResult.businessId;

  try {
    // 获取任务统计 - 只统计当前商家的任务
    if (stats === 'true') {
      const statsData = await getPublishTaskStats({ businessId });
      return NextResponse.json({ success: true, data: statsData });
    }

    // 获取待执行的定时任务 - 只返回当前商家的任务
    if (pending === 'true') {
      const tasks = await getPendingScheduledTasks();
      const businessTasks = tasks.filter(t => t.businessId === businessId);
      return NextResponse.json({ success: true, data: businessTasks });
    }

    // 获取正在运行的任务 - 只返回当前商家的任务
    if (running === 'true') {
      const tasks = await getRunningTasks();
      const businessTasks = tasks.filter(t => t.businessId === businessId);
      return NextResponse.json({ success: true, data: businessTasks });
    }

    // 获取单个任务详情 - 验证任务是否属于当前商家
    if (id) {
      const task = await getPublishTaskById(id);
      if (!task) {
        return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
      }
      // 验证任务是否属于当前商家
      if (task.businessId !== businessId) {
        return NextResponse.json({ success: false, error: '您没有权限访问该任务' }, { status: 403 });
      }
      return NextResponse.json({ success: true, data: task });
    }

    // 获取任务列表 - 只返回当前商家的任务
    const tasks = await getAllPublishTasks({
      businessId: businessId,
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
 * 注意：用户只能操作自己企业的任务，支持多商家数据隔离
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        // 获取用户的商家ID（验证权限）
        const result = await resolveBusinessId(user.id, data?.businessId);
        
        // 如果用户没有企业，返回错误提示
        if ('needsCreateBusiness' in result) {
          return NextResponse.json({ 
            success: false,
            error: '请先创建企业',
            needsCreateBusiness: true 
          });
        }
        const businessId = result.businessId;
        
        const input: CreatePublishTaskInput = {
          businessId: businessId,
          planId: data.planId,
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
        
        return NextResponse.json({ success: true, data: task });
      }

      case 'createBatch': {
        // 获取用户的商家ID（验证权限）
        const result = await resolveBusinessId(user.id, data?.businessId);
        
        // 如果用户没有企业，返回错误提示
        if ('needsCreateBusiness' in result) {
          return NextResponse.json({ 
            success: false,
            error: '请先创建企业',
            needsCreateBusiness: true 
          });
        }
        const businessId = result.businessId;
        
        const inputs: CreatePublishTaskInput[] = data.tasks.map((t: any) => ({
          businessId: businessId,
          planId: t.planId,
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

      case 'update':
      case 'delete':
      case 'start':
      case 'cancel':
      case 'retry': {
        // 这些操作需要验证任务所属的商家
        const existingTask = await getPublishTaskById(data.id);
        if (!existingTask) {
          return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
        }
        
        // 验证用户是否有权访问该任务所属的商家
        const hasAccess = await validateBusinessOwnership(user.id, existingTask.businessId);
        if (!hasAccess) {
          return NextResponse.json({ success: false, error: '您没有权限操作该任务' }, { status: 403 });
        }

        if (action === 'update') {
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

        if (action === 'delete') {
          const success = await deletePublishTask(data.id);
          return NextResponse.json({ success });
        }

        if (action === 'start') {
          const task = await startPublishTask(data.id);
          return NextResponse.json({ success: !!task, data: task });
        }

        if (action === 'cancel') {
          const task = await cancelPublishTask(data.id);
          return NextResponse.json({ success: !!task, data: task });
        }

        if (action === 'retry') {
          const task = await retryPublishTask(data.id);
          return NextResponse.json({ success: !!task, data: task });
        }
        
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
      }

      case 'deleteBatch': {
        // 验证所有任务是否属于用户可访问的商家
        const validIds = await Promise.all(
          data.ids.map(async (id: string) => {
            const task = await getPublishTaskById(id);
            if (!task) return null;
            const hasAccess = await validateBusinessOwnership(user.id, task.businessId);
            return hasAccess ? id : null;
          })
        );
        const validIdList = validIds.filter(Boolean) as string[];
        
        if (validIdList.length === 0) {
          return NextResponse.json({ success: false, error: '没有可删除的任务' }, { status: 400 });
        }

        const success = await batchDeletePublishTasks(validIdList);
        return NextResponse.json({ success });
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

/**
 * DELETE /api/publish-tasks
 * 删除发布任务
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  try {
    // 优先从 URL 查询参数获取 ID（更可靠）
    const { searchParams } = new URL(request.url);
    const idFromQuery = searchParams.get('id');
    const idsFromQuery = searchParams.get('ids');
    
    let id: string | null = null;
    let ids: string[] | null = null;
    
    // 从 URL 参数解析
    if (idFromQuery) {
      id = idFromQuery;
    }
    if (idsFromQuery) {
      ids = idsFromQuery.split(',').filter(i => i.trim() !== '');
    }
    
    // 如果 URL 没有，尝试从请求体解析
    if (!id && !ids) {
      const text = await request.text();
      if (text && text.trim() !== '') {
        const body = JSON.parse(text);
        if (body.id) id = String(body.id);
        if (body.ids) ids = body.ids.map(String);
      }
    }

    if (ids && ids.length > 0) {
      // 批量删除 - 验证所有任务是否属于用户可访问的商家
      const validIdList = await Promise.all(
        ids.map(async (taskId) => {
          const task = await getPublishTaskById(taskId);
          if (!task) return null;
          const hasAccess = await validateBusinessOwnership(user.id, task.businessId);
          return hasAccess ? taskId : null;
        })
      );
      const validIds = validIdList.filter(Boolean) as string[];
      
      if (validIds.length === 0) {
        return NextResponse.json({ success: false, error: '没有可删除的任务' }, { status: 400 });
      }

      const success = await batchDeletePublishTasks(validIds);
      return NextResponse.json({ success });
    } else if (id) {
      // 单个删除 - 验证任务是否属于用户可访问的商家
      const existingTask = await getPublishTaskById(id);
      if (!existingTask) {
        return NextResponse.json({ success: false, error: '任务不存在' }, { status: 404 });
      }
      const hasAccess = await validateBusinessOwnership(user.id, existingTask.businessId);
      if (!hasAccess) {
        return NextResponse.json({ success: false, error: '您没有权限删除该任务' }, { status: 403 });
      }

      const success = await deletePublishTask(id);
      console.log('[DELETE /api/publish-tasks] 删除任务 id:', id, '结果:', success);
      return NextResponse.json({ success });
    } else {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('删除发布任务失败:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
