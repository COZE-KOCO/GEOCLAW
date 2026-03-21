/**
 * 创作规则管理服务
 * 支持商家隔离，使用 Supabase 存储
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { GenerationConfig } from '@/lib/types/generation-config';

export type CreationRuleType = 'article' | 'image-text';

export interface CreationRule {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  type: CreationRuleType;
  config: GenerationConfig;
  useCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCreationRuleInput {
  businessId: string;
  name: string;
  description?: string;
  type: CreationRuleType;
  config: GenerationConfig;
}

export interface UpdateCreationRuleInput {
  name?: string;
  description?: string;
  config?: GenerationConfig;
}

// ==================== 数据库操作 ====================

/**
 * 获取商家的所有创作规则
 */
export async function getCreationRulesByBusiness(
  businessId: string,
  options?: {
    type?: CreationRuleType;
  }
): Promise<CreationRule[]> {
  const client = getSupabaseClient();
  let query = client
    .from('creation_rules')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('获取创作规则失败:', error);
    return [];
  }

  return data.map(mapDbToCreationRule);
}

/**
 * 根据ID获取创作规则
 */
export async function getCreationRuleById(id: string): Promise<CreationRule | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('creation_rules')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToCreationRule(data);
}

/**
 * 创建创作规则
 */
export async function createCreationRule(input: CreateCreationRuleInput): Promise<CreationRule | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('creation_rules')
    .insert({
      business_id: input.businessId,
      name: input.name,
      description: input.description,
      type: input.type,
      config: input.config,
      use_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('创建创作规则失败:', error);
    return null;
  }

  return mapDbToCreationRule(data);
}

/**
 * 更新创作规则
 */
export async function updateCreationRule(id: string, input: UpdateCreationRuleInput): Promise<CreationRule | null> {
  const client = getSupabaseClient();
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.config !== undefined) updateData.config = input.config;

  const { data, error } = await client
    .from('creation_rules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新创作规则失败:', error);
    return null;
  }

  return mapDbToCreationRule(data);
}

/**
 * 删除创作规则
 */
export async function deleteCreationRule(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('creation_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除创作规则失败:', error);
    return false;
  }

  return true;
}

/**
 * 增加使用次数
 */
export async function incrementRuleUseCount(id: string): Promise<void> {
  const client = getSupabaseClient();
  const rule = await getCreationRuleById(id);
  if (!rule) return;

  await client
    .from('creation_rules')
    .update({
      use_count: rule.useCount + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', id);
}

/**
 * 获取创作规则统计
 */
export async function getCreationRuleStats(businessId: string): Promise<{
  totalRules: number;
  articleRules: number;
  imageTextRules: number;
  totalUses: number;
}> {
  const rules = await getCreationRulesByBusiness(businessId);
  return {
    totalRules: rules.length,
    articleRules: rules.filter(r => r.type === 'article').length,
    imageTextRules: rules.filter(r => r.type === 'image-text').length,
    totalUses: rules.reduce((sum, r) => sum + r.useCount, 0),
  };
}

// ==================== 映射函数 ====================

function mapDbToCreationRule(dbRecord: Record<string, unknown>): CreationRule {
  return {
    id: dbRecord.id as string,
    businessId: dbRecord.business_id as string,
    name: dbRecord.name as string,
    description: dbRecord.description as string | undefined,
    type: dbRecord.type as CreationRuleType,
    config: dbRecord.config as GenerationConfig,
    useCount: (dbRecord.use_count as number) || 0,
    lastUsedAt: dbRecord.last_used_at ? new Date(dbRecord.last_used_at as string) : undefined,
    createdAt: new Date(dbRecord.created_at as string),
    updatedAt: new Date(dbRecord.updated_at as string),
  };
}
