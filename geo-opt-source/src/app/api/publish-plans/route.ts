import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPublishPlans,
  getPublishPlanById,
  getActivePublishPlans,
  getPlansToExecute,
  getPublishPlanStats,
  createPublishPlan,
  updatePublishPlan,
  deletePublishPlan,
  pausePublishPlan,
  resumePublishPlan,
  cancelPublishPlan,
  completePublishPlan,
  recordPlanExecution,
  type CreatePublishPlanInput,
  type UpdatePublishPlanInput,
  type PlanStatus,
} from '@/lib/publish-plan-store';
import { createPublishTask } from '@/lib/publish-task-store';

/**
 * GET /api/publish-plans
 * 获取发布计划列表或单个计划详情
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const businessId = searchParams.get('businessId');
  const status = searchParams.get('status');
  const planType = searchParams.get('planType');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');
  const stats = searchParams.get('stats');
  const active = searchParams.get('active');
  const toExecute = searchParams.get('toExecute');

  try {
    // 获取计划统计
    if (stats === 'true') {
      const statsData = await getPublishPlanStats({
        businessId: businessId || undefined,
      });
      return NextResponse.json({ success: true, data: statsData });
    }

    // 获取活跃的发布计划
    if (active === 'true') {
      const plans = await getActivePublishPlans();
      return NextResponse.json({ success: true, data: plans });
    }

    // 获取需要执行的计划
    if (toExecute === 'true') {
      const plans = await getPlansToExecute();
      return NextResponse.json({ success: true, data: plans });
    }

    // 获取单个计划详情
    if (id) {
      const plan = await getPublishPlanById(id);
      return NextResponse.json({ success: !!plan, data: plan });
    }

    // 获取计划列表
    const plans = await getAllPublishPlans({
      businessId: businessId || undefined,
      status: status ? (status.split(',') as PlanStatus[]) : undefined,
      planType: planType as 'once' | 'daily' | 'weekly' | 'monthly' | 'custom' | undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('获取发布计划失败:', error);
    return NextResponse.json(
      { success: false, error: '获取发布计划失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/publish-plans
 * 创建发布计划或执行计划操作
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        // 支持 targetAccounts（新格式）和 targetPlatforms（旧格式）
        const targetPlatforms = data.targetAccounts 
          ? data.targetAccounts.map((a: any) => ({
              platform: a.platform,
              accountId: a.accountId,
              accountName: a.displayName || a.accountName,
            }))
          : data.targetPlatforms || [];
        
        const input: CreatePublishPlanInput = {
          businessId: data.businessId,
          draftId: data.draftId,
          planName: data.planName,
          planType: data.planType,
          frequency: data.frequency,
          scheduledTime: data.scheduledTime,
          scheduledDays: data.scheduledDays,
          scheduledDates: data.scheduledDates,
          customCron: data.customCron,
          maxRuns: data.maxRuns,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          title: data.title,
          content: data.content,
          images: data.images,
          tags: data.tags,
          targetPlatforms,
          priority: data.priority,
          maxRetries: data.maxRetries,
          retryDelay: data.retryDelay,
          notifyOnComplete: data.notifyOnComplete,
          notifyOnFail: data.notifyOnFail,
          metadata: data.metadata,
        };
        
        const plan = await createPublishPlan(input);
        return NextResponse.json({ success: true, data: plan });
      }

      case 'update': {
        const input: UpdatePublishPlanInput = {
          planName: data.planName,
          planType: data.planType,
          status: data.status,
          frequency: data.frequency,
          scheduledTime: data.scheduledTime,
          scheduledDays: data.scheduledDays,
          scheduledDates: data.scheduledDates,
          customCron: data.customCron,
          maxRuns: data.maxRuns,
          currentRuns: data.currentRuns,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          title: data.title,
          content: data.content,
          images: data.images,
          tags: data.tags,
          targetPlatforms: data.targetPlatforms,
          priority: data.priority,
          maxRetries: data.maxRetries,
          retryDelay: data.retryDelay,
          notifyOnComplete: data.notifyOnComplete,
          notifyOnFail: data.notifyOnFail,
          lastRunAt: data.lastRunAt ? new Date(data.lastRunAt) : undefined,
          nextRunAt: data.nextRunAt ? new Date(data.nextRunAt) : undefined,
        };
        
        const plan = await updatePublishPlan(data.id, input);
        return NextResponse.json({ success: !!plan, data: plan });
      }

      case 'delete': {
        const success = await deletePublishPlan(data.id);
        return NextResponse.json({ success });
      }

      case 'pause': {
        const plan = await pausePublishPlan(data.id);
        return NextResponse.json({ success: !!plan, data: plan });
      }

      case 'resume': {
        const plan = await resumePublishPlan(data.id);
        return NextResponse.json({ success: !!plan, data: plan });
      }

      case 'cancel': {
        const plan = await cancelPublishPlan(data.id);
        return NextResponse.json({ success: !!plan, data: plan });
      }

      case 'executeNow': {
        // 立即执行计划，创建一个即时任务
        const plan = await getPublishPlanById(data.id);
        if (!plan) {
          return NextResponse.json(
            { success: false, error: '计划不存在' },
            { status: 404 }
          );
        }
        
        const task = await createPublishTask({
          businessId: plan.businessId,
          planId: plan.id,
          draftId: plan.draftId,
          taskName: `${plan.planName} - 手动执行`,
          taskType: 'immediate',
          priority: plan.priority,
          title: plan.title,
          content: plan.content,
          images: plan.images,
          tags: plan.tags,
          targetPlatforms: plan.targetPlatforms,
          maxRetries: plan.maxRetries,
          retryDelay: plan.retryDelay,
          notifyOnComplete: plan.notifyOnComplete,
          notifyOnFail: plan.notifyOnFail,
        });
        
        return NextResponse.json({ 
          success: true, 
          message: '已创建即时执行任务',
          data: task 
        });
      }

      case 'recordExecution': {
        const plan = await recordPlanExecution(data.id);
        return NextResponse.json({ success: !!plan, data: plan });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('发布计划操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
