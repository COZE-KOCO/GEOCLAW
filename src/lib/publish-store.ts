/**
 * 发布记录存储服务
 * 管理内容发布到矩阵账号的记录
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface PublishRecord {
  id: string;
  draftId: string;
  accountId: string;
  platform: string;
  status: 'pending' | 'published' | 'failed';
  publishedUrl?: string;
  publishedAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface CreatePublishInput {
  draftId: string;
  accountId: string;
  platform: string;
}

export interface UpdatePublishInput {
  status?: 'pending' | 'published' | 'failed';
  publishedUrl?: string;
  publishedAt?: Date;
  error?: string;
}

/**
 * 获取草稿的发布记录
 */
export async function getPublishRecordsByDraft(draftId: string): Promise<PublishRecord[]> {
  const client = getSupabaseClient();
  
  const { data: records, error } = await client
    .from('publish_records')
    .select('*')
    .eq('draft_id', draftId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取发布记录失败:', error);
    return [];
  }

  return (records || []).map(transformPublishRecord);
}

/**
 * 获取账号的发布记录
 */
export async function getPublishRecordsByAccount(
  accountId: string,
  options?: { limit?: number }
): Promise<PublishRecord[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_records')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('获取账号发布记录失败:', error);
    return [];
  }

  return (records || []).map(transformPublishRecord);
}

/**
 * 获取所有发布记录
 */
export async function getAllPublishRecords(options?: {
  status?: string;
  platform?: string;
  limit?: number;
}): Promise<PublishRecord[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.platform) {
    query = query.eq('platform', options.platform);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('获取发布记录失败:', error);
    return [];
  }

  return (records || []).map(transformPublishRecord);
}

/**
 * 根据ID获取发布记录
 */
export async function getPublishRecordById(id: string): Promise<PublishRecord | null> {
  const client = getSupabaseClient();
  
  const { data: record, error } = await client
    .from('publish_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !record) {
    console.error('获取发布记录详情失败:', error);
    return null;
  }

  return transformPublishRecord(record);
}

/**
 * 创建发布记录
 */
export async function createPublishRecord(input: CreatePublishInput): Promise<PublishRecord> {
  const client = getSupabaseClient();
  
  const { data: record, error } = await client
    .from('publish_records')
    .insert({
      draft_id: input.draftId,
      account_id: input.accountId,
      platform: input.platform,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('创建发布记录失败:', error);
    throw error;
  }

  return transformPublishRecord(record);
}

/**
 * 批量创建发布记录（用于一键发布到多个账号）
 */
export async function batchCreatePublishRecords(
  inputs: CreatePublishInput[]
): Promise<PublishRecord[]> {
  const client = getSupabaseClient();
  
  const records = inputs.map(input => ({
    draft_id: input.draftId,
    account_id: input.accountId,
    platform: input.platform,
    status: 'pending' as const,
  }));

  const { data, error } = await client
    .from('publish_records')
    .insert(records)
    .select();

  if (error) {
    console.error('批量创建发布记录失败:', error);
    throw error;
  }

  return (data || []).map(transformPublishRecord);
}

/**
 * 更新发布记录
 */
export async function updatePublishRecord(id: string, input: UpdatePublishInput): Promise<PublishRecord | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {};

  if (input.status !== undefined) updateData.status = input.status;
  if (input.publishedUrl !== undefined) updateData.published_url = input.publishedUrl;
  if (input.publishedAt !== undefined) updateData.published_at = input.publishedAt.toISOString();
  if (input.error !== undefined) updateData.error = input.error;

  const { data: record, error } = await client
    .from('publish_records')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新发布记录失败:', error);
    return null;
  }

  return transformPublishRecord(record);
}

/**
 * 标记发布成功
 */
export async function markPublishSuccess(
  id: string, 
  publishedUrl: string
): Promise<PublishRecord | null> {
  return updatePublishRecord(id, {
    status: 'published',
    publishedUrl,
    publishedAt: new Date(),
  });
}

/**
 * 标记发布失败
 */
export async function markPublishFailed(id: string, error: string): Promise<PublishRecord | null> {
  return updatePublishRecord(id, {
    status: 'failed',
    error,
  });
}

/**
 * 获取发布统计
 */
export async function getPublishStats(options?: {
  accountId?: string;
  draftId?: string;
}): Promise<{
  total: number;
  pending: number;
  published: number;
  failed: number;
}> {
  const client = getSupabaseClient();
  
  let query = client
    .from('publish_records')
    .select('status', { count: 'exact', head: false });

  if (options?.accountId) {
    query = query.eq('account_id', options.accountId);
  }
  if (options?.draftId) {
    query = query.eq('draft_id', options.draftId);
  }

  const { data: records, error } = await query;

  if (error) {
    console.error('获取发布统计失败:', error);
    return { total: 0, pending: 0, published: 0, failed: 0 };
  }

  const stats = {
    total: records?.length || 0,
    pending: records?.filter(r => r.status === 'pending').length || 0,
    published: records?.filter(r => r.status === 'published').length || 0,
    failed: records?.filter(r => r.status === 'failed').length || 0,
  };

  return stats;
}

// 转换函数
function transformPublishRecord(dbRecord: any): PublishRecord {
  return {
    id: dbRecord.id,
    draftId: dbRecord.draft_id,
    accountId: dbRecord.account_id,
    platform: dbRecord.platform,
    status: dbRecord.status,
    publishedUrl: dbRecord.published_url,
    publishedAt: dbRecord.published_at ? new Date(dbRecord.published_at) : undefined,
    error: dbRecord.error,
    createdAt: new Date(dbRecord.created_at),
  };
}
