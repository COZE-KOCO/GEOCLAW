/**
 * 文章库存储服务
 * 管理内容草稿和已保存的文章
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface ContentDraft {
  id: string;
  businessId: string;
  title: string;
  content: string;
  distillationWords: string[];
  outline?: any;
  seoScore: number;
  targetModel?: string;
  articleType?: string;
  status: 'draft' | 'ready' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContentDraftInput {
  businessId: string;
  title: string;
  content: string;
  distillationWords?: string[];
  outline?: any;
  seoScore?: number;
  targetModel?: string;
  articleType?: string;
  status?: 'draft' | 'ready' | 'published';
}

export interface UpdateContentDraftInput {
  title?: string;
  content?: string;
  distillationWords?: string[];
  outline?: any;
  seoScore?: number;
  targetModel?: string;
  articleType?: string;
  status?: 'draft' | 'ready' | 'published';
}

/**
 * 获取企业的所有文章
 */
export async function getContentDraftsByBusiness(businessId: string, options?: {
  status?: string;
  limit?: number;
}): Promise<ContentDraft[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('content_drafts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: drafts, error } = await query;

  if (error) {
    console.error('获取文章列表失败:', error);
    return [];
  }

  return (drafts || []).map(transformDraft);
}

/**
 * 获取所有文章（管理员视角）
 */
export async function getAllContentDrafts(options?: {
  status?: string;
  businessId?: string;
  limit?: number;
}): Promise<ContentDraft[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('content_drafts')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data: drafts, error } = await query;

  if (error) {
    console.error('获取文章列表失败:', error);
    return [];
  }

  return (drafts || []).map(transformDraft);
}

/**
 * 根据ID获取文章
 */
export async function getContentDraftById(id: string): Promise<ContentDraft | null> {
  const client = getSupabaseClient();
  
  const { data: draft, error } = await client
    .from('content_drafts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !draft) {
    console.error('获取文章详情失败:', error);
    return null;
  }

  return transformDraft(draft);
}

/**
 * 创建文章
 */
export async function createContentDraft(input: CreateContentDraftInput): Promise<ContentDraft> {
  const client = getSupabaseClient();
  
  const { data: draft, error } = await client
    .from('content_drafts')
    .insert({
      business_id: input.businessId,
      title: input.title,
      content: input.content,
      distillation_words: input.distillationWords || [],
      outline: input.outline,
      seo_score: input.seoScore || 0,
      target_model: input.targetModel,
      article_type: input.articleType,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('创建文章失败:', error);
    throw error;
  }

  return transformDraft(draft);
}

/**
 * 更新文章
 */
export async function updateContentDraft(id: string, input: UpdateContentDraftInput): Promise<ContentDraft | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.distillationWords !== undefined) updateData.distillation_words = input.distillationWords;
  if (input.outline !== undefined) updateData.outline = input.outline;
  if (input.seoScore !== undefined) updateData.seo_score = input.seoScore;
  if (input.targetModel !== undefined) updateData.target_model = input.targetModel;
  if (input.articleType !== undefined) updateData.article_type = input.articleType;
  if (input.status !== undefined) updateData.status = input.status;

  const { data: draft, error } = await client
    .from('content_drafts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新文章失败:', error);
    return null;
  }

  return transformDraft(draft);
}

/**
 * 删除文章
 */
export async function deleteContentDraft(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('content_drafts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除文章失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取文章统计
 */
export async function getContentDraftStats(businessId: string): Promise<{
  total: number;
  draft: number;
  ready: number;
  published: number;
  avgSeoScore: number;
}> {
  const client = getSupabaseClient();
  
  const { data: drafts, error } = await client
    .from('content_drafts')
    .select('status, seo_score')
    .eq('business_id', businessId);

  if (error) {
    console.error('获取文章统计失败:', error);
    return { total: 0, draft: 0, ready: 0, published: 0, avgSeoScore: 0 };
  }

  const stats = {
    total: drafts?.length || 0,
    draft: drafts?.filter(d => d.status === 'draft').length || 0,
    ready: drafts?.filter(d => d.status === 'ready').length || 0,
    published: drafts?.filter(d => d.status === 'published').length || 0,
    avgSeoScore: 0,
  };

  if (stats.total > 0) {
    const totalScore = drafts?.reduce((sum, d) => sum + (d.seo_score || 0), 0) || 0;
    stats.avgSeoScore = Math.round(totalScore / stats.total);
  }

  return stats;
}

// 转换函数
function transformDraft(dbDraft: any): ContentDraft {
  return {
    id: dbDraft.id,
    businessId: dbDraft.business_id,
    title: dbDraft.title,
    content: dbDraft.content,
    distillationWords: dbDraft.distillation_words || [],
    outline: dbDraft.outline,
    seoScore: dbDraft.seo_score || 0,
    targetModel: dbDraft.target_model,
    articleType: dbDraft.article_type,
    status: dbDraft.status || 'draft',
    createdAt: new Date(dbDraft.created_at),
    updatedAt: new Date(dbDraft.updated_at),
  };
}
