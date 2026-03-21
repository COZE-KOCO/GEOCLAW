/**
 * 创作计划存储服务
 * 管理自动化创作计划的配置与执行状态
 * 
 * 客户端使用 localStorage，服务端使用 Supabase
 */

import {
  type GenerationConfig,
  type ArticleTypeDistribution,
  defaultGenerationConfig,
} from './types/generation-config';

// ==================== 类型定义 ====================

export type PlanStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type PlanFrequency = 'daily' | 'weekly' | 'monthly' | 'hourly';

// 创作内容配置 - 使用统一的 GenerationConfig
// ContentConfig 现在是 GenerationConfig 的别名，保持向后兼容
export type ContentConfig = GenerationConfig;

// 导出 ArticleTypeDistribution 和 GenerationConfig 供其他模块使用
export type { ArticleTypeDistribution, GenerationConfig };
export { defaultGenerationConfig };

// 发布配置
export interface AutoPublishConfig {
  autoPublish: boolean;
  publishDelay: number;  // 发布延迟（分钟）
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
  publishStrategy: 'immediate' | 'scheduled' | 'distributed';
  publishTimeSlots: string[];  // 发布时间段 ['09:00', '12:00', '18:00']
}

// 创作计划
export interface CreationPlan {
  id: string;
  businessId: string;
  
  // 计划基本信息
  planName: string;
  status: PlanStatus;
  
  // 创作频率配置
  frequency: PlanFrequency;
  articlesPerRun: number;       // 每次执行创作数量
  scheduledTime: string;        // 执行时间 HH:mm
  scheduledDays: number[];      // 周几执行 [0-6]，0表示周日
  scheduledDates: number[];     // 每月哪天执行 [1-31]
  
  // 创作内容配置
  contentConfig: ContentConfig;
  
  // 发布配置
  publishConfig: AutoPublishConfig;
  
  // 运行统计
  stats: {
    totalCreated: number;
    totalPublished: number;
    successRate: number;
    lastRunAt?: string;
    nextRunAt?: string;
  };
  
  // 时间范围
  startDate: string;
  endDate?: string;
  
  // 关键词进度追踪
  lastKeywordIndex: number;  // 上次执行到第几个关键词（从0开始）
  
  createdAt: string;
  updatedAt: string;
}

// 创建计划输入
export interface CreateCreationPlanInput {
  businessId: string;
  planName: string;
  frequency?: PlanFrequency;
  articlesPerRun?: number;
  scheduledTime?: string;
  scheduledDays?: number[];
  scheduledDates?: number[];
  contentConfig: ContentConfig;
  publishConfig: AutoPublishConfig;
  startDate?: string;
  endDate?: string;
  lastKeywordIndex?: number;
}

// ==================== 本地存储（客户端）====================

const LOCAL_STORAGE_KEY = 'creation_plans';

// 生成唯一ID
function generateId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getLocalPlans(): CreationPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: CreationPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('[CreationPlanStore] 保存失败:', e);
  }
}

// 本地存储操作
export function getCreationPlansLocal(businessId: string): CreationPlan[] {
  return getLocalPlans().filter(p => p.businessId === businessId);
}

export function getCreationPlanByIdLocal(id: string): CreationPlan | null {
  return getLocalPlans().find(p => p.id === id) || null;
}

export function createCreationPlanLocal(input: CreateCreationPlanInput): CreationPlan {
  const now = new Date().toISOString();
  const plan: CreationPlan = {
    id: generateId(),
    businessId: input.businessId,
    planName: input.planName,
    status: 'active',
    frequency: input.frequency || 'daily',
    articlesPerRun: input.articlesPerRun || 1,
    scheduledTime: input.scheduledTime || '09:00',
    scheduledDays: input.scheduledDays || [1, 2, 3, 4, 5],
    scheduledDates: input.scheduledDates || [],
    contentConfig: input.contentConfig,
    publishConfig: input.publishConfig,
    stats: {
      totalCreated: 0,
      totalPublished: 0,
      successRate: 0,
    },
    startDate: input.startDate || now,
    endDate: input.endDate,
    lastKeywordIndex: input.lastKeywordIndex || 0,
    createdAt: now,
    updatedAt: now,
  };
  
  const plans = getLocalPlans();
  plans.push(plan);
  saveLocalPlans(plans);
  
  return plan;
}

export function updateCreationPlanLocal(
  id: string, 
  updates: Partial<Omit<CreationPlan, 'id' | 'businessId' | 'createdAt'>>
): CreationPlan | null {
  const plans = getLocalPlans();
  const index = plans.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  plans[index] = {
    ...plans[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveLocalPlans(plans);
  
  return plans[index];
}

export function deleteCreationPlanLocal(id: string): boolean {
  const plans = getLocalPlans();
  const filtered = plans.filter(p => p.id !== id);
  if (filtered.length === plans.length) return false;
  
  saveLocalPlans(filtered);
  return true;
}

// ==================== 统一接口（自动检测环境）====================

/**
 * 获取所有创作计划
 */
export async function getCreationPlans(businessId: string): Promise<CreationPlan[]> {
  // 客户端使用 localStorage
  if (typeof window !== 'undefined') {
    return getCreationPlansLocal(businessId);
  }
  
  // 服务端使用 Supabase（延迟加载）
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('creation_plans')
    .select('*')
    .eq('businessId', businessId)
    .order('createdAt', { ascending: false });
  
  if (error) {
    console.error('[CreationPlanStore] 获取计划列表失败:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 获取单个创作计划
 */
export async function getCreationPlanById(id: string): Promise<CreationPlan | null> {
  if (typeof window !== 'undefined') {
    return getCreationPlanByIdLocal(id);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('creation_plans')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('[CreationPlanStore] 获取计划失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 创建创作计划
 */
export async function createCreationPlan(input: CreateCreationPlanInput): Promise<CreationPlan | null> {
  if (typeof window !== 'undefined') {
    return createCreationPlanLocal(input);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const now = new Date().toISOString();
  const plan: Omit<CreationPlan, 'id'> = {
    businessId: input.businessId,
    planName: input.planName,
    status: 'active',
    frequency: input.frequency || 'daily',
    articlesPerRun: input.articlesPerRun || 1,
    scheduledTime: input.scheduledTime || '09:00',
    scheduledDays: input.scheduledDays || [1, 2, 3, 4, 5],
    scheduledDates: input.scheduledDates || [],
    contentConfig: input.contentConfig,
    publishConfig: input.publishConfig,
    stats: {
      totalCreated: 0,
      totalPublished: 0,
      successRate: 0,
    },
    startDate: input.startDate || now,
    endDate: input.endDate,
    lastKeywordIndex: input.lastKeywordIndex || 0,
    createdAt: now,
    updatedAt: now,
  };
  
  const { data, error } = await supabase
    .from('creation_plans')
    .insert(plan)
    .select()
    .single();
  
  if (error) {
    console.error('[CreationPlanStore] 创建计划失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 更新创作计划
 */
export async function updateCreationPlan(
  id: string, 
  updates: Partial<Omit<CreationPlan, 'id' | 'businessId' | 'createdAt'>>
): Promise<CreationPlan | null> {
  if (typeof window !== 'undefined') {
    return updateCreationPlanLocal(id, updates);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('creation_plans')
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[CreationPlanStore] 更新计划失败:', error);
    return null;
  }
  
  return data;
}

/**
 * 删除创作计划
 */
export async function deleteCreationPlan(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    return deleteCreationPlanLocal(id);
  }
  
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('creation_plans')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[CreationPlanStore] 删除计划失败:', error);
    return false;
  }
  
  return true;
}

/**
 * 暂停/恢复计划
 */
export async function togglePlanStatus(id: string): Promise<CreationPlan | null> {
  const plan = await getCreationPlanById(id);
  if (!plan) return null;
  
  const newStatus = plan.status === 'active' ? 'paused' : 'active';
  return updateCreationPlan(id, { status: newStatus });
}

/**
 * 更新计划统计
 */
export async function updatePlanStats(
  id: string, 
  stats: Partial<CreationPlan['stats']>
): Promise<void> {
  const plan = await getCreationPlanById(id);
  if (!plan) return;
  
  await updateCreationPlan(id, {
    stats: {
      ...plan.stats,
      ...stats,
    },
  });
}

/**
 * 获取待执行的计划
 */
export async function getPendingPlans(businessId: string): Promise<CreationPlan[]> {
  const plans = await getCreationPlans(businessId);
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentDay = now.getDay();
  const currentDate = now.getDate();
  
  return plans.filter(plan => {
    if (plan.status !== 'active') return false;
    
    // 检查时间范围
    if (plan.startDate && new Date(plan.startDate) > now) return false;
    if (plan.endDate && new Date(plan.endDate) < now) return false;
    
    // 检查执行时间
    if (plan.scheduledTime !== currentTime) return false;
    
    // 检查执行日期
    switch (plan.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return plan.scheduledDays.includes(currentDay);
      case 'monthly':
        return plan.scheduledDates.includes(currentDate);
      case 'hourly':
        return true;
      default:
        return false;
    }
  });
}
