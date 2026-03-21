/**
 * 创作任务队列存储服务
 * 管理自动化创作任务的执行与状态追踪
 * 
 * 客户端使用 localStorage，服务端使用 Supabase
 */

// ==================== 类型定义 ====================

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 创作参数
export interface CreationParams {
  generateMethod: 'keyword' | 'keyword-library' | 'topic';
  keyword?: string;
  keywords?: string[];
  keywordLibraryId?: string;
  articleType: 'what' | 'how' | 'top' | 'normal';
  typeDistribution?: {
    what: number;
    how: number;
    top: number;
    normal: number;
  };
  ruleConfig?: Record<string, any>;
}

// 创作结果
export interface CreationResult {
  draftId: string;
  title: string;
  content: string;
  seoScore: number;
  keywords?: string[];
}

// 创作任务
export interface CreationTask {
  id: string;
  planId: string;
  businessId: string;
  
  // 任务状态
  status: TaskStatus;
  priority: number;
  
  // 创作参数
  params: CreationParams;
  
  // 生成结果
  result?: CreationResult;
  
  // 发布任务关联
  publishTaskId?: string;
  
  // 执行信息
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  
  // 重试
  retryCount: number;
  maxRetries: number;
  
  // 元数据
  metadata: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

// 创建任务输入
export interface CreateCreationTaskInput {
  planId: string;
  businessId: string;
  params: CreationParams;
  scheduledAt?: string;
  priority?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

// 任务执行日志
export interface TaskExecutionLog {
  id: string;
  taskId: string;
  stepName: string;
  status: 'started' | 'completed' | 'failed';
  message?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ==================== 本地存储（客户端）====================

const LOCAL_STORAGE_KEY = 'creation_tasks';

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getLocalTasks(): CreationTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: CreationTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('[CreationTaskQueue] 保存失败:', e);
  }
}

// 本地存储操作
export function getCreationTasksLocal(businessId: string): CreationTask[] {
  return getLocalTasks().filter(t => t.businessId === businessId);
}

export function getCreationTaskByIdLocal(id: string): CreationTask | null {
  return getLocalTasks().find(t => t.id === id) || null;
}

export function createCreationTaskLocal(input: CreateCreationTaskInput): CreationTask {
  const now = new Date().toISOString();
  const task: CreationTask = {
    id: generateId(),
    planId: input.planId,
    businessId: input.businessId,
    status: 'pending',
    priority: input.priority || 5,
    params: input.params,
    scheduledAt: input.scheduledAt || now,
    retryCount: 0,
    maxRetries: input.maxRetries || 3,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  
  const tasks = getLocalTasks();
  tasks.push(task);
  saveLocalTasks(tasks);
  
  return task;
}

export function updateCreationTaskLocal(
  id: string,
  updates: Partial<Omit<CreationTask, 'id' | 'businessId' | 'createdAt'>>
): CreationTask | null {
  const tasks = getLocalTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveLocalTasks(tasks);
  
  return tasks[index];
}

export function deleteCreationTaskLocal(id: string): boolean {
  const tasks = getLocalTasks();
  const filtered = tasks.filter(t => t.id !== id);
  if (filtered.length === tasks.length) return false;
  
  saveLocalTasks(filtered);
  return true;
}

// 任务统计
export function getTaskStats(businessId: string): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
} {
  const tasks = getLocalTasks().filter(t => t.businessId === businessId);
  
  return {
    pending: tasks.filter(t => t.status === 'pending').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };
}

// ==================== 统一接口（自动检测环境）====================

/**
 * 获取创作任务列表
 */
export async function getCreationTasks(
  businessId: string, 
  filters?: {
    status?: TaskStatus;
    planId?: string;
    limit?: number;
  }
): Promise<CreationTask[]> {
  if (typeof window !== 'undefined') {
    let tasks = getCreationTasksLocal(businessId);
    
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters?.planId) {
      tasks = tasks.filter(t => t.planId === filters.planId);
    }
    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }
  
  // 服务端使用 Supabase（延迟加载）
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('creation_tasks')
    .select('*')
    .eq('businessId', businessId)
    .order('createdAt', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.planId) {
    query = query.eq('planId', filters.planId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[CreationTaskQueue] 获取任务列表失败:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 获取单个创作任务
 */
export async function getCreationTaskById(id: string): Promise<CreationTask | null> {
  if (typeof window !== 'undefined') {
    return getCreationTaskByIdLocal(id);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('creation_tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[CreationTaskQueue] 获取任务失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 创建创作任务
 */
export async function createCreationTask(input: CreateCreationTaskInput): Promise<CreationTask | null> {
  if (typeof window !== 'undefined') {
    return createCreationTaskLocal(input);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const now = new Date().toISOString();
  const task: Omit<CreationTask, 'id'> = {
    planId: input.planId,
    businessId: input.businessId,
    status: 'pending',
    priority: input.priority || 5,
    params: input.params,
    scheduledAt: input.scheduledAt || now,
    retryCount: 0,
    maxRetries: input.maxRetries || 3,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
  
  const { data, error } = await supabase
    .from('creation_tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) {
    console.error('[CreationTaskQueue] 创建任务失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 更新创作任务
 */
export async function updateCreationTask(
  id: string,
  updates: Partial<Omit<CreationTask, 'id' | 'businessId' | 'createdAt'>>
): Promise<CreationTask | null> {
  if (typeof window !== 'undefined') {
    return updateCreationTaskLocal(id, updates);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('creation_tasks')
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[CreationTaskQueue] 更新任务失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 开始执行任务
 */
export async function startCreationTask(id: string): Promise<void> {
  await updateCreationTask(id, {
    status: 'processing',
    startedAt: new Date().toISOString(),
  });
}

/**
 * 完成任务
 */
export async function completeCreationTask(id: string, result: CreationResult): Promise<void> {
  await updateCreationTask(id, {
    status: 'completed',
    result,
    completedAt: new Date().toISOString(),
  });
}

/**
 * 任务失败
 */
export async function failCreationTask(id: string, error: string): Promise<void> {
  const task = await getCreationTaskById(id);
  if (!task) return;
  
  const retryCount = task.retryCount + 1;
  const shouldRetry = retryCount < task.maxRetries;
  
  await updateCreationTask(id, {
    status: shouldRetry ? 'pending' : 'failed',
    error,
    retryCount,
    completedAt: shouldRetry ? undefined : new Date().toISOString(),
  });
}

/**
 * 取消任务
 */
export async function cancelCreationTask(id: string): Promise<void> {
  await updateCreationTask(id, {
    status: 'cancelled',
    completedAt: new Date().toISOString(),
  });
}

/**
 * 获取待处理任务
 */
export async function getPendingTasks(businessId: string, limit: number = 10): Promise<CreationTask[]> {
  return getCreationTasks(businessId, { status: 'pending', limit });
}

/**
 * 获取处理中任务
 */
export async function getProcessingTasks(businessId: string): Promise<CreationTask[]> {
  return getCreationTasks(businessId, { status: 'processing' });
}
