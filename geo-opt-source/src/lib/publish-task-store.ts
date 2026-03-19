/**
 * 发布任务存储服务
 * 管理文章自动化发布任务
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// ==================== 类型定义 ====================

export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'scheduled' | 'immediate' | 'recurring';

export interface TargetPlatform {
  platform: string;
  accountId: string;
  accountName?: string;
}

export interface PublishResult {
  platform: string;
  accountId: string;
  accountName?: string;
  status: 'success' | 'failed' | 'pending';
  publishedUrl?: string;
  error?: string;
  publishedAt?: string;
}

export interface PublishTask {
  id: string;
  businessId: string;
  planId?: string; // 关联发布计划ID
  draftId?: string;
  
  // 任务配置
  taskName: string;
  taskType: TaskType;
  priority: number;
  
  // 发布内容
  title: string;
  content: string;
  images: string[];
  tags: string[];
  
  // 发布目标
  targetPlatforms: TargetPlatform[];
  
  // 定时配置
  scheduledAt?: Date;
  recurringRule?: string;
  
  // 执行状态
  status: TaskStatus;
  progress: number;
  totalPlatforms: number;
  publishedPlatforms: number;
  failedPlatforms: number;
  
  // 执行结果
  results: PublishResult[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  
  // 重试配置
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  
  // 通知配置
  notifyOnComplete: boolean;
  notifyOnFail: boolean;
  
  // 元数据
  metadata: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePublishTaskInput {
  businessId: string;
  planId?: string; // 关联发布计划ID
  draftId?: string;
  taskName: string;
  taskType?: TaskType;
  priority?: number;
  
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  
  targetPlatforms: TargetPlatform[];
  scheduledAt?: Date;
  recurringRule?: string;
  
  maxRetries?: number;
  retryDelay?: number;
  notifyOnComplete?: boolean;
  notifyOnFail?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdatePublishTaskInput {
  taskName?: string;
  priority?: number;
  scheduledAt?: Date;
  recurringRule?: string;
  status?: TaskStatus;
  progress?: number;
  publishedPlatforms?: number;
  failedPlatforms?: number;
  results?: PublishResult[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount?: number;
}

// ==================== 查询函数 ====================

/**
 * 获取所有发布任务
 */
export async function getAllPublishTasks(options?: {
  businessId?: string;
  status?: TaskStatus | TaskStatus[];
  taskType?: TaskType;
  limit?: number;
  offset?: number;
}): Promise<PublishTask[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_tasks')
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
  
  if (options?.taskType) {
    query = query.eq('task_type', options.taskType);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('获取发布任务失败:', error);
    return [];
  }

  return (tasks || []).map(transformPublishTask);
}

/**
 * 根据ID获取发布任务
 */
export async function getPublishTaskById(id: string): Promise<PublishTask | null> {
  const client = getSupabaseClient();
  
  const { data: task, error } = await client
    .from('publish_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !task) {
    console.error('获取发布任务详情失败:', error);
    return null;
  }

  return transformPublishTask(task);
}

/**
 * 获取待执行的定时任务
 */
export async function getPendingScheduledTasks(): Promise<PublishTask[]> {
  const client = getSupabaseClient();
  const now = new Date().toISOString();
  
  const { data: tasks, error } = await client
    .from('publish_tasks')
    .select('*')
    .eq('status', 'pending')
    .eq('task_type', 'scheduled')
    .lte('scheduled_at', now)
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('获取待执行定时任务失败:', error);
    return [];
  }

  return (tasks || []).map(transformPublishTask);
}

/**
 * 获取正在运行的任务
 */
export async function getRunningTasks(): Promise<PublishTask[]> {
  const client = getSupabaseClient();
  
  const { data: tasks, error } = await client
    .from('publish_tasks')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: true });

  if (error) {
    console.error('获取运行中任务失败:', error);
    return [];
  }

  return (tasks || []).map(transformPublishTask);
}

/**
 * 获取任务统计
 */
export async function getPublishTaskStats(options?: {
  businessId?: string;
}): Promise<{
  total: number;
  pending: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_tasks')
    .select('status', { count: 'exact', head: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }

  const { data: tasks, error } = await query;

  if (error) {
    console.error('获取任务统计失败:', error);
    return { total: 0, pending: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
  }

  return {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    queued: tasks?.filter(t => t.status === 'queued').length || 0,
    running: tasks?.filter(t => t.status === 'running').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    failed: tasks?.filter(t => t.status === 'failed').length || 0,
    cancelled: tasks?.filter(t => t.status === 'cancelled').length || 0,
  };
}

// ==================== 创建和更新函数 ====================

/**
 * 创建发布任务
 */
export async function createPublishTask(input: CreatePublishTaskInput): Promise<PublishTask> {
  const client = getSupabaseClient();
  
  const taskData = {
    business_id: input.businessId,
    plan_id: input.planId,
    draft_id: input.draftId,
    task_name: input.taskName,
    task_type: input.taskType || 'scheduled',
    priority: input.priority || 5,
    title: input.title,
    content: input.content,
    images: input.images || [],
    tags: input.tags || [],
    target_platforms: input.targetPlatforms,
    scheduled_at: input.scheduledAt?.toISOString(),
    recurring_rule: input.recurringRule,
    status: 'pending' as const,
    progress: 0,
    total_platforms: input.targetPlatforms.length,
    published_platforms: 0,
    failed_platforms: 0,
    results: [],
    max_retries: input.maxRetries || 3,
    retry_delay: input.retryDelay || 60,
    notify_on_complete: input.notifyOnComplete ?? true,
    notify_on_fail: input.notifyOnFail ?? true,
    metadata: input.metadata || {},
  };

  const { data: task, error } = await client
    .from('publish_tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    console.error('创建发布任务失败:', error);
    throw error;
  }

  return transformPublishTask(task);
}

/**
 * 批量创建发布任务
 */
export async function batchCreatePublishTasks(
  inputs: CreatePublishTaskInput[]
): Promise<PublishTask[]> {
  const client = getSupabaseClient();
  
  const tasksData = inputs.map(input => ({
    business_id: input.businessId,
    draft_id: input.draftId,
    task_name: input.taskName,
    task_type: input.taskType || 'scheduled',
    priority: input.priority || 5,
    title: input.title,
    content: input.content,
    images: input.images || [],
    tags: input.tags || [],
    target_platforms: input.targetPlatforms,
    scheduled_at: input.scheduledAt?.toISOString(),
    recurring_rule: input.recurringRule,
    status: 'pending' as const,
    progress: 0,
    total_platforms: input.targetPlatforms.length,
    published_platforms: 0,
    failed_platforms: 0,
    results: [],
    max_retries: input.maxRetries || 3,
    retry_delay: input.retryDelay || 60,
    notify_on_complete: input.notifyOnComplete ?? true,
    notify_on_fail: input.notifyOnFail ?? true,
    metadata: input.metadata || {},
  }));

  const { data: tasks, error } = await client
    .from('publish_tasks')
    .insert(tasksData)
    .select();

  if (error) {
    console.error('批量创建发布任务失败:', error);
    throw error;
  }

  return (tasks || []).map(transformPublishTask);
}

/**
 * 更新发布任务
 */
export async function updatePublishTask(
  id: string, 
  input: UpdatePublishTaskInput
): Promise<PublishTask | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {};

  if (input.taskName !== undefined) updateData.task_name = input.taskName;
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.scheduledAt !== undefined) updateData.scheduled_at = input.scheduledAt?.toISOString();
  if (input.recurringRule !== undefined) updateData.recurring_rule = input.recurringRule;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.progress !== undefined) updateData.progress = input.progress;
  if (input.publishedPlatforms !== undefined) updateData.published_platforms = input.publishedPlatforms;
  if (input.failedPlatforms !== undefined) updateData.failed_platforms = input.failedPlatforms;
  if (input.results !== undefined) updateData.results = input.results;
  if (input.startedAt !== undefined) updateData.started_at = input.startedAt?.toISOString();
  if (input.completedAt !== undefined) updateData.completed_at = input.completedAt?.toISOString();
  if (input.error !== undefined) updateData.error = input.error;
  if (input.retryCount !== undefined) updateData.retry_count = input.retryCount;

  const { data: task, error } = await client
    .from('publish_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新发布任务失败:', error);
    return null;
  }

  return transformPublishTask(task);
}

/**
 * 删除发布任务
 */
export async function deletePublishTask(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('publish_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除发布任务失败:', error);
    return false;
  }

  return true;
}

/**
 * 批量删除发布任务
 */
export async function batchDeletePublishTasks(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('publish_tasks')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('批量删除发布任务失败:', error);
    return false;
  }

  return true;
}

// ==================== 状态更新函数 ====================

/**
 * 开始执行任务
 */
export async function startPublishTask(id: string): Promise<PublishTask | null> {
  return updatePublishTask(id, {
    status: 'running',
    startedAt: new Date(),
  });
}

/**
 * 完成任务
 */
export async function completePublishTask(
  id: string, 
  results: PublishResult[]
): Promise<PublishTask | null> {
  const publishedCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  
  return updatePublishTask(id, {
    status: publishedCount > 0 ? 'completed' : 'failed',
    progress: 100,
    publishedPlatforms: publishedCount,
    failedPlatforms: failedCount,
    results,
    completedAt: new Date(),
  });
}

/**
 * 任务失败
 */
export async function failPublishTask(id: string, error: string): Promise<PublishTask | null> {
  const task = await getPublishTaskById(id);
  if (!task) return null;
  
  const newRetryCount = task.retryCount + 1;
  
  // 如果还有重试次数，保持在运行状态
  if (newRetryCount < task.maxRetries) {
    return updatePublishTask(id, {
      status: 'pending',
      error: `失败(${newRetryCount}/${task.maxRetries}): ${error}`,
      retryCount: newRetryCount,
      scheduledAt: new Date(Date.now() + task.retryDelay * 1000),
    });
  }
  
  // 超过最大重试次数，标记为失败
  return updatePublishTask(id, {
    status: 'failed',
    error: `任务失败(已重试${task.maxRetries}次): ${error}`,
    completedAt: new Date(),
  });
}

/**
 * 取消任务
 */
export async function cancelPublishTask(id: string): Promise<PublishTask | null> {
  return updatePublishTask(id, {
    status: 'cancelled',
    completedAt: new Date(),
  });
}

/**
 * 重试任务
 */
export async function retryPublishTask(id: string): Promise<PublishTask | null> {
  return updatePublishTask(id, {
    status: 'pending',
    progress: 0,
    publishedPlatforms: 0,
    failedPlatforms: 0,
    results: [],
    error: undefined,
    retryCount: 0,
    startedAt: undefined,
    completedAt: undefined,
  });
}

/**
 * 更新任务进度
 */
export async function updateTaskProgress(
  id: string, 
  progress: number, 
  result?: PublishResult
): Promise<PublishTask | null> {
  const task = await getPublishTaskById(id);
  if (!task) return null;
  
  const updates: UpdatePublishTaskInput = { progress };
  
  if (result) {
    const existingResults = task.results || [];
    const existingIndex = existingResults.findIndex(
      r => r.platform === result.platform && r.accountId === result.accountId
    );
    
    if (existingIndex >= 0) {
      existingResults[existingIndex] = result;
    } else {
      existingResults.push(result);
    }
    
    updates.results = existingResults;
    updates.publishedPlatforms = existingResults.filter(r => r.status === 'success').length;
    updates.failedPlatforms = existingResults.filter(r => r.status === 'failed').length;
  }
  
  return updatePublishTask(id, updates);
}

// ==================== 辅助函数 ====================

function transformPublishTask(dbRecord: any): PublishTask {
  return {
    id: dbRecord.id,
    businessId: dbRecord.business_id,
    planId: dbRecord.plan_id,
    draftId: dbRecord.draft_id,
    taskName: dbRecord.task_name,
    taskType: dbRecord.task_type,
    priority: dbRecord.priority,
    title: dbRecord.title,
    content: dbRecord.content,
    images: dbRecord.images || [],
    tags: dbRecord.tags || [],
    targetPlatforms: dbRecord.target_platforms || [],
    scheduledAt: dbRecord.scheduled_at ? new Date(dbRecord.scheduled_at) : undefined,
    recurringRule: dbRecord.recurring_rule,
    status: dbRecord.status,
    progress: dbRecord.progress,
    totalPlatforms: dbRecord.total_platforms,
    publishedPlatforms: dbRecord.published_platforms,
    failedPlatforms: dbRecord.failed_platforms,
    results: dbRecord.results || [],
    startedAt: dbRecord.started_at ? new Date(dbRecord.started_at) : undefined,
    completedAt: dbRecord.completed_at ? new Date(dbRecord.completed_at) : undefined,
    error: dbRecord.error,
    retryCount: dbRecord.retry_count,
    maxRetries: dbRecord.max_retries,
    retryDelay: dbRecord.retry_delay,
    notifyOnComplete: dbRecord.notify_on_complete,
    notifyOnFail: dbRecord.notify_on_fail,
    metadata: dbRecord.metadata || {},
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}
