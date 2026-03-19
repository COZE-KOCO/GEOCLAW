/**
 * 发布计划存储服务
 * 管理文章自动化发布计划
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// ==================== 类型定义 ====================

export type PlanStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type PlanType = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type Frequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface TargetPlatform {
  platform: string;
  accountId: string;
  accountName?: string;
}

export interface PublishPlan {
  id: string;
  businessId: string;
  draftId?: string;
  
  // 计划基本信息
  planName: string;
  planType: PlanType;
  status: PlanStatus;
  
  // 发布频率配置
  frequency: Frequency;
  scheduledTime: string; // HH:mm 格式
  scheduledDays: number[]; // 周几发布 [0-6]，0表示周日
  scheduledDates: number[]; // 每月哪几天发布 [1-31]
  customCron?: string; // 自定义cron表达式
  
  // 运行次数限制
  maxRuns: number; // 最大运行次数，0表示无限
  currentRuns: number; // 当前已运行次数
  
  // 时间范围
  startDate?: Date;
  endDate?: Date;
  
  // 发布内容
  title: string;
  content: string;
  images: string[];
  tags: string[];
  
  // 发布目标
  targetPlatforms: TargetPlatform[];
  
  // 任务配置
  priority: number;
  maxRetries: number;
  retryDelay: number;
  
  // 通知配置
  notifyOnComplete: boolean;
  notifyOnFail: boolean;
  
  // 执行时间
  lastRunAt?: Date;
  nextRunAt?: Date;
  
  // 元数据
  metadata: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePublishPlanInput {
  businessId: string;
  draftId?: string;
  planName: string;
  planType?: PlanType;
  
  // 发布频率
  frequency: Frequency;
  scheduledTime?: string;
  scheduledDays?: number[];
  scheduledDates?: number[];
  customCron?: string;
  
  // 运行次数
  maxRuns?: number;
  
  // 时间范围
  startDate?: Date;
  endDate?: Date;
  
  // 发布内容
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  
  // 发布目标
  targetPlatforms: TargetPlatform[];
  
  // 其他配置
  priority?: number;
  maxRetries?: number;
  retryDelay?: number;
  notifyOnComplete?: boolean;
  notifyOnFail?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePublishPlanInput {
  planName?: string;
  planType?: PlanType;
  status?: PlanStatus;
  frequency?: Frequency;
  scheduledTime?: string;
  scheduledDays?: number[];
  scheduledDates?: number[];
  customCron?: string;
  maxRuns?: number;
  currentRuns?: number;
  startDate?: Date;
  endDate?: Date;
  title?: string;
  content?: string;
  images?: string[];
  tags?: string[];
  targetPlatforms?: TargetPlatform[];
  priority?: number;
  maxRetries?: number;
  retryDelay?: number;
  notifyOnComplete?: boolean;
  notifyOnFail?: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

// ==================== 查询函数 ====================

/**
 * 获取所有发布计划
 */
export async function getAllPublishPlans(options?: {
  businessId?: string;
  status?: PlanStatus | PlanStatus[];
  planType?: PlanType;
  limit?: number;
  offset?: number;
}): Promise<PublishPlan[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }
  
  if (options?.status) {
    if (Array.isArray(options.status)) {
      query = query.in('status', options.status);
    } else {
      query = query.eq('status', options.status);
    }
  }
  
  if (options?.planType) {
    query = query.eq('plan_type', options.planType);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: plans, error } = await query;

  if (error) {
    console.error('获取发布计划失败:', error);
    return [];
  }

  return (plans || []).map(transformPublishPlan);
}

/**
 * 根据ID获取发布计划
 */
export async function getPublishPlanById(id: string): Promise<PublishPlan | null> {
  const client = getSupabaseClient();
  
  const { data: plan, error } = await client
    .from('publish_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) {
    console.error('获取发布计划详情失败:', error);
    return null;
  }

  return transformPublishPlan(plan);
}

/**
 * 获取活跃的发布计划（需要执行的计划）
 */
export async function getActivePublishPlans(): Promise<PublishPlan[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  
  const { data: plans, error } = await client
    .from('publish_plans')
    .select('*')
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gt.${now}`)
    .order('next_run_at', { ascending: true });

  if (error) {
    console.error('获取活跃发布计划失败:', error);
    return [];
  }

  return (plans || []).map(transformPublishPlan);
}

/**
 * 获取需要执行的发布计划
 */
export async function getPlansToExecute(): Promise<PublishPlan[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  
  const { data: plans, error } = await client
    .from('publish_plans')
    .select('*')
    .eq('status', 'active')
    .lte('next_run_at', now)
    .or(`end_date.is.null,end_date.gt.${now}`);

  if (error) {
    console.error('获取待执行发布计划失败:', error);
    return [];
  }

  return (plans || []).map(transformPublishPlan);
}

/**
 * 获取发布计划统计
 */
export async function getPublishPlanStats(options?: {
  businessId?: string;
}): Promise<{
  total: number;
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
}> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_plans')
    .select('status', { count: 'exact', head: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }

  const { data: plans, error } = await query;

  if (error) {
    console.error('获取发布计划统计失败:', error);
    return { total: 0, active: 0, paused: 0, completed: 0, cancelled: 0 };
  }

  return {
    total: plans?.length || 0,
    active: plans?.filter(p => p.status === 'active').length || 0,
    paused: plans?.filter(p => p.status === 'paused').length || 0,
    completed: plans?.filter(p => p.status === 'completed').length || 0,
    cancelled: plans?.filter(p => p.status === 'cancelled').length || 0,
  };
}

// ==================== 创建和更新函数 ====================

/**
 * 创建发布计划
 */
export async function createPublishPlan(input: CreatePublishPlanInput): Promise<PublishPlan> {
  const client = getSupabaseClient();
  
  // 计算下次执行时间
  const nextRunAt = calculateNextRunAt({
    frequency: input.frequency,
    scheduledTime: input.scheduledTime,
    scheduledDays: input.scheduledDays,
    scheduledDates: input.scheduledDates,
    customCron: input.customCron,
    startDate: input.startDate,
  });
  
  const planData = {
    business_id: input.businessId,
    draft_id: input.draftId,
    plan_name: input.planName,
    plan_type: input.planType || getPlanTypeFromFrequency(input.frequency),
    status: 'active' as const,
    frequency: input.frequency,
    scheduled_time: input.scheduledTime || '09:00',
    scheduled_days: input.scheduledDays || [],
    scheduled_dates: input.scheduledDates || [],
    custom_cron: input.customCron,
    max_runs: input.maxRuns || 0,
    current_runs: 0,
    start_date: input.startDate?.toISOString(),
    end_date: input.endDate?.toISOString(),
    title: input.title,
    content: input.content,
    images: input.images || [],
    tags: input.tags || [],
    target_platforms: input.targetPlatforms,
    priority: input.priority || 5,
    max_retries: input.maxRetries || 3,
    retry_delay: input.retryDelay || 60,
    notify_on_complete: input.notifyOnComplete ?? true,
    notify_on_fail: input.notifyOnFail ?? true,
    next_run_at: nextRunAt?.toISOString(),
    metadata: input.metadata || {},
  };

  const { data: plan, error } = await client
    .from('publish_plans')
    .insert(planData)
    .select()
    .single();

  if (error) {
    console.error('创建发布计划失败:', error);
    throw error;
  }

  return transformPublishPlan(plan);
}

/**
 * 更新发布计划
 */
export async function updatePublishPlan(
  id: string, 
  input: UpdatePublishPlanInput
): Promise<PublishPlan | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {};

  if (input.planName !== undefined) updateData.plan_name = input.planName;
  if (input.planType !== undefined) updateData.plan_type = input.planType;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.scheduledTime !== undefined) updateData.scheduled_time = input.scheduledTime;
  if (input.scheduledDays !== undefined) updateData.scheduled_days = input.scheduledDays;
  if (input.scheduledDates !== undefined) updateData.scheduled_dates = input.scheduledDates;
  if (input.customCron !== undefined) updateData.custom_cron = input.customCron;
  if (input.maxRuns !== undefined) updateData.max_runs = input.maxRuns;
  if (input.currentRuns !== undefined) updateData.current_runs = input.currentRuns;
  if (input.startDate !== undefined) updateData.start_date = input.startDate?.toISOString();
  if (input.endDate !== undefined) updateData.end_date = input.endDate?.toISOString();
  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.images !== undefined) updateData.images = input.images;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.targetPlatforms !== undefined) updateData.target_platforms = input.targetPlatforms;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.maxRetries !== undefined) updateData.max_retries = input.maxRetries;
  if (input.retryDelay !== undefined) updateData.retry_delay = input.retryDelay;
  if (input.notifyOnComplete !== undefined) updateData.notify_on_complete = input.notifyOnComplete;
  if (input.notifyOnFail !== undefined) updateData.notify_on_fail = input.notifyOnFail;
  if (input.lastRunAt !== undefined) updateData.last_run_at = input.lastRunAt?.toISOString();
  if (input.nextRunAt !== undefined) updateData.next_run_at = input.nextRunAt?.toISOString();

  const { data: plan, error } = await client
    .from('publish_plans')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新发布计划失败:', error);
    return null;
  }

  return transformPublishPlan(plan);
}

/**
 * 删除发布计划
 */
export async function deletePublishPlan(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('publish_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除发布计划失败:', error);
    return false;
  }

  return true;
}

// ==================== 状态更新函数 ====================

/**
 * 暂停发布计划
 */
export async function pausePublishPlan(id: string): Promise<PublishPlan | null> {
  return updatePublishPlan(id, { status: 'paused' });
}

/**
 * 恢复发布计划
 */
export async function resumePublishPlan(id: string): Promise<PublishPlan | null> {
  return updatePublishPlan(id, { status: 'active' });
}

/**
 * 取消发布计划
 */
export async function cancelPublishPlan(id: string): Promise<PublishPlan | null> {
  return updatePublishPlan(id, { status: 'cancelled' });
}

/**
 * 完成发布计划
 */
export async function completePublishPlan(id: string): Promise<PublishPlan | null> {
  return updatePublishPlan(id, { status: 'completed' });
}

/**
 * 记录计划执行
 */
export async function recordPlanExecution(id: string): Promise<PublishPlan | null> {
  const plan = await getPublishPlanById(id);
  if (!plan) return null;
  
  const newCurrentRuns = plan.currentRuns + 1;
  
  // 计算下次执行时间
  const nextRunAt = calculateNextRunAt({
    frequency: plan.frequency,
    scheduledTime: plan.scheduledTime,
    scheduledDays: plan.scheduledDays,
    scheduledDates: plan.scheduledDates,
    customCron: plan.customCron,
    startDate: plan.startDate,
  });
  
  const updates: UpdatePublishPlanInput = {
    currentRuns: newCurrentRuns,
    lastRunAt: new Date(),
    nextRunAt: nextRunAt,
  };
  
  // 检查是否达到最大运行次数
  if (plan.maxRuns > 0 && newCurrentRuns >= plan.maxRuns) {
    updates.status = 'completed';
  }
  
  // 检查是否超过结束时间
  if (plan.endDate && nextRunAt && nextRunAt > new Date(plan.endDate)) {
    updates.status = 'completed';
  }
  
  return updatePublishPlan(id, updates);
}

// ==================== 辅助函数 ====================

/**
 * 计算下次执行时间
 */
function calculateNextRunAt(config: {
  frequency: Frequency;
  scheduledTime?: string;
  scheduledDays?: number[];
  scheduledDates?: number[];
  customCron?: string;
  startDate?: Date;
}): Date | undefined {
  const now = new Date();
  const start = config.startDate ? new Date(config.startDate) : now;
  const [hours = 9, minutes = 0] = (config.scheduledTime || '09:00').split(':').map(Number);
  
  let nextRun: Date;
  
  switch (config.frequency) {
    case 'once':
      // 一次性任务
      nextRun = new Date(start);
      nextRun.setHours(hours, minutes, 0, 0);
      break;
      
    case 'hourly':
      // 每小时执行
      nextRun = new Date(now);
      nextRun.setHours(nextRun.getHours() + 1, minutes, 0, 0);
      break;
      
    case 'daily':
      // 每天执行
      nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // 每周指定日期执行
      const targetDays = config.scheduledDays || [1]; // 默认周一
      nextRun = findNextWeekday(now, targetDays, hours, minutes);
      break;
      
    case 'monthly':
      // 每月指定日期执行
      const targetDates = config.scheduledDates || [1]; // 默认每月1号
      nextRun = findNextMonthDate(now, targetDates, hours, minutes);
      break;
      
    default:
      nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
  }
  
  return nextRun;
}

/**
 * 找到下一个符合条件的周几
 */
function findNextWeekday(from: Date, days: number[], hours: number, minutes: number): Date {
  const result = new Date(from);
  result.setHours(hours, minutes, 0, 0);
  
  const fromDay = result.getDay();
  
  // 找到今天之后最近的指定日期
  for (let i = 0; i <= 7; i++) {
    const checkDay = (fromDay + i) % 7;
    if (days.includes(checkDay)) {
      if (i === 0 && result > from) {
        return result; // 今天且时间未到
      } else if (i > 0) {
        result.setDate(result.getDate() + i);
        return result;
      }
    }
  }
  
  // 默认下周第一个指定日期
  const nextDay = days.sort((a, b) => a - b)[0];
  const daysUntilNext = (nextDay - fromDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilNext);
  return result;
}

/**
 * 找到下一个符合条件的月份日期
 */
function findNextMonthDate(from: Date, dates: number[], hours: number, minutes: number): Date {
  const result = new Date(from);
  result.setHours(hours, minutes, 0, 0);
  
  const sortedDates = dates.sort((a, b) => a - b);
  const fromDate = result.getDate();
  
  // 检查本月是否有符合条件的日期
  for (const targetDate of sortedDates) {
    if (targetDate >= fromDate && result > from) {
      result.setDate(targetDate);
      return result;
    }
  }
  
  // 下个月的第一个指定日期
  result.setMonth(result.getMonth() + 1, sortedDates[0]);
  return result;
}

/**
 * 根据频率推断计划类型
 */
function getPlanTypeFromFrequency(frequency: Frequency): PlanType {
  switch (frequency) {
    case 'once': return 'once';
    case 'hourly':
    case 'daily': return 'daily';
    case 'weekly': return 'weekly';
    case 'monthly': return 'monthly';
    default: return 'daily';
  }
}

/**
 * 转换数据库记录为接口类型
 */
function transformPublishPlan(dbRecord: any): PublishPlan {
  return {
    id: dbRecord.id,
    businessId: dbRecord.business_id,
    draftId: dbRecord.draft_id,
    planName: dbRecord.plan_name,
    planType: dbRecord.plan_type,
    status: dbRecord.status,
    frequency: dbRecord.frequency,
    scheduledTime: dbRecord.scheduled_time,
    scheduledDays: dbRecord.scheduled_days || [],
    scheduledDates: dbRecord.scheduled_dates || [],
    customCron: dbRecord.custom_cron,
    maxRuns: dbRecord.max_runs,
    currentRuns: dbRecord.current_runs,
    startDate: dbRecord.start_date ? new Date(dbRecord.start_date) : undefined,
    endDate: dbRecord.end_date ? new Date(dbRecord.end_date) : undefined,
    title: dbRecord.title,
    content: dbRecord.content,
    images: dbRecord.images || [],
    tags: dbRecord.tags || [],
    targetPlatforms: dbRecord.target_platforms || [],
    priority: dbRecord.priority,
    maxRetries: dbRecord.max_retries,
    retryDelay: dbRecord.retry_delay,
    notifyOnComplete: dbRecord.notify_on_complete,
    notifyOnFail: dbRecord.notify_on_fail,
    lastRunAt: dbRecord.last_run_at ? new Date(dbRecord.last_run_at) : undefined,
    nextRunAt: dbRecord.next_run_at ? new Date(dbRecord.next_run_at) : undefined,
    metadata: dbRecord.metadata || {},
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}
