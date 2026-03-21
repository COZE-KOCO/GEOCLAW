/**
 * 生成计划存储服务
 * 管理用户触发的批量生成任务
 * 
 * 与 CreationPlan 的区别：
 * - GenerationPlan: 用户手动触发，立即执行，一次性任务
 * - CreationPlan: 定时自动执行，周期性任务
 */

import {
  type GenerationConfig,
  defaultGenerationConfig,
} from './types/generation-config';

// ==================== 类型定义 ====================

/** 生成计划状态 */
export type GenerationPlanStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** 单个生成任务状态 */
export type GenerationTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** 生成任务 */
export interface GenerationTask {
  id: string;
  planId: string;
  keyword: string;
  articleType: 'what' | 'how' | 'top' | 'normal';
  status: GenerationTaskStatus;
  draftId?: string;
  title?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/** 生成计划 */
export interface GenerationPlan {
  id: string;
  businessId: string;
  
  // 计划信息
  name: string;
  status: GenerationPlanStatus;
  
  // 生成配置
  config: GenerationConfig;
  totalCount: number;           // 总生成数量
  
  // 进度
  completedCount: number;        // 已完成数量
  failedCount: number;           // 失败数量
  
  // 生成的关键词列表
  keywords: string[];
  
  // 生成的草稿ID列表
  draftIds: string[];
  
  // 时间
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // 类型
  mode: 'article' | 'image-text';
}

/** 创建生成计划输入 */
export interface CreateGenerationPlanInput {
  businessId: string;
  name?: string;
  config: GenerationConfig;
  mode?: 'article' | 'image-text';
}

// ==================== 本地存储（客户端）====================

const PLANS_KEY = 'generation_plans';
const TASKS_KEY = 'generation_tasks';

function generateId(): string {
  return `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getLocalPlans(): GenerationPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PLANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: GenerationPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('[GenerationPlanStore] 保存失败:', e);
  }
}

function getLocalTasks(): GenerationTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: GenerationTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('[GenerationPlanStore] 保存任务失败:', e);
  }
}

// ==================== 本地操作 ====================

export function getGenerationPlansLocal(businessId: string): GenerationPlan[] {
  return getLocalPlans()
    .filter(p => p.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getGenerationPlanByIdLocal(id: string): GenerationPlan | null {
  return getLocalPlans().find(p => p.id === id) || null;
}

export function createGenerationPlanLocal(input: CreateGenerationPlanInput): GenerationPlan {
  const now = new Date().toISOString();
  const plan: GenerationPlan = {
    id: generateId(),
    businessId: input.businessId,
    name: input.name || `生成计划 ${new Date().toLocaleString('zh-CN')}`,
    status: 'pending',
    config: input.config,
    totalCount: input.config.articleCount,
    completedCount: 0,
    failedCount: 0,
    keywords: [],
    draftIds: [],
    createdAt: now,
    mode: input.mode || 'article',
  };
  
  const plans = getLocalPlans();
  plans.push(plan);
  saveLocalPlans(plans);
  
  return plan;
}

export function updateGenerationPlanLocal(
  id: string,
  updates: Partial<Omit<GenerationPlan, 'id' | 'businessId' | 'createdAt'>>
): GenerationPlan | null {
  const plans = getLocalPlans();
  const index = plans.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  plans[index] = {
    ...plans[index],
    ...updates,
  };
  saveLocalPlans(plans);
  
  return plans[index];
}

export function deleteGenerationPlanLocal(id: string): boolean {
  const plans = getLocalPlans();
  const filtered = plans.filter(p => p.id !== id);
  if (filtered.length === plans.length) return false;
  
  saveLocalPlans(filtered);
  
  // 同时删除相关任务
  const tasks = getLocalTasks().filter(t => t.planId !== id);
  saveLocalTasks(tasks);
  
  return true;
}

export function getTasksByPlanIdLocal(planId: string): GenerationTask[] {
  return getLocalTasks().filter(t => t.planId === planId);
}

export function createTaskLocal(task: Omit<GenerationTask, 'id' | 'createdAt'>): GenerationTask {
  const newTask: GenerationTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  
  const tasks = getLocalTasks();
  tasks.push(newTask);
  saveLocalTasks(tasks);
  
  return newTask;
}

export function updateTaskLocal(
  id: string,
  updates: Partial<GenerationTask>
): GenerationTask | null {
  const tasks = getLocalTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  
  tasks[index] = {
    ...tasks[index],
    ...updates,
  };
  saveLocalTasks(tasks);
  
  return tasks[index];
}

// ==================== 统一接口 ====================

export async function getGenerationPlans(businessId: string): Promise<GenerationPlan[]> {
  if (typeof window !== 'undefined') {
    return getGenerationPlansLocal(businessId);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('generation_plans')
    .select('*')
    .eq('businessId', businessId)
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('[GenerationPlanStore] 获取计划列表失败:', error);
    return [];
  }
  
  return data || [];
}

export async function getGenerationPlanById(id: string): Promise<GenerationPlan | null> {
  if (typeof window !== 'undefined') {
    return getGenerationPlanByIdLocal(id);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('generation_plans')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[GenerationPlanStore] 获取计划失败:', error);
    return null;
  }
  
  return data;
}

export async function createGenerationPlan(input: CreateGenerationPlanInput): Promise<GenerationPlan | null> {
  if (typeof window !== 'undefined') {
    return createGenerationPlanLocal(input);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const now = new Date().toISOString();
  const plan: Omit<GenerationPlan, 'id'> = {
    businessId: input.businessId,
    name: input.name || `生成计划 ${new Date().toLocaleString('zh-CN')}`,
    status: 'pending',
    config: input.config,
    totalCount: input.config.articleCount,
    completedCount: 0,
    failedCount: 0,
    keywords: [],
    draftIds: [],
    createdAt: now,
    mode: input.mode || 'article',
  };
  
  const { data, error } = await supabase
    .from('generation_plans')
    .insert(plan)
    .select()
    .single();
  
  if (error) {
    console.error('[GenerationPlanStore] 创建计划失败:', error);
    return null;
  }
  
  return data;
}

export async function updateGenerationPlan(
  id: string,
  updates: Partial<Omit<GenerationPlan, 'id' | 'businessId' | 'createdAt'>>
): Promise<GenerationPlan | null> {
  if (typeof window !== 'undefined') {
    return updateGenerationPlanLocal(id, updates);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('generation_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[GenerationPlanStore] 更新计划失败:', error);
    return null;
  }
  
  return data;
}

export async function deleteGenerationPlan(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    return deleteGenerationPlanLocal(id);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('generation_plans')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[GenerationPlanStore] 删除计划失败:', error);
    return false;
  }
  
  return true;
}
