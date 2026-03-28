/**
 * 矩阵账号存储服务
 * 管理多平台账号，账号属于某个企业/商家
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { PlatformCategory, AIModel } from '@/config/platforms';

export interface MatrixAccount {
  id: string;
  businessId: string;
  platform: string; // zhihu, xiaohongshu, wechat, toutiao, bilibili
  platformCategory?: PlatformCategory; // 平台分类：platform/geo_platform/official_site
  aiModel?: AIModel; // GEO平台所属AI模型
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers: number;
  status: 'active' | 'inactive' | 'pending';
  authStatus: 'pending' | 'authorized' | 'expired';
  metadata?: Record<string, any>;
  // 官网Webhook配置
  webhookConfig?: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    authToken?: string;
    enabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  businessId: string;
  platform: string;
  platformCategory?: PlatformCategory;
  aiModel?: AIModel;
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers?: number;
  status?: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
  webhookConfig?: MatrixAccount['webhookConfig'];
}

export interface UpdateAccountInput {
  displayName?: string;
  homepageUrl?: string;
  avatar?: string;
  followers?: number;
  status?: 'active' | 'inactive' | 'pending';
  platformCategory?: PlatformCategory;
  aiModel?: AIModel;
  metadata?: Record<string, any>;
  webhookConfig?: MatrixAccount['webhookConfig'];
}

// 平台配置
export const PLATFORMS = {
  zhihu: { name: '知乎', icon: '📘', color: 'bg-blue-500' },
  xiaohongshu: { name: '小红书', icon: '📕', color: 'bg-red-500' },
  wechat: { name: '微信公众号', icon: '💚', color: 'bg-green-500' },
  toutiao: { name: '今日头条', icon: '📰', color: 'bg-orange-500' },
  bilibili: { name: 'B站', icon: '📺', color: 'bg-pink-500' },
  douyin: { name: '抖音', icon: '🎵', color: 'bg-black' },
  weibo: { name: '微博', icon: '🔴', color: 'bg-red-600' },
} as const;

export type PlatformId = keyof typeof PLATFORMS;

/**
 * 获取企业的所有账号
 */
export async function getAccountsByBusiness(businessId: string): Promise<MatrixAccount[]> {
  const client = getSupabaseClient();
  
  const { data: accounts, error } = await client
    .from('matrix_accounts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取企业账号失败:', error);
    return [];
  }

  return (accounts || []).map(transformAccount);
}

/**
 * 获取所有账号（管理员视角）
 */
export async function getAllAccounts(options?: {
  platform?: string;
  status?: string;
  businessId?: string;
}): Promise<MatrixAccount[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('matrix_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }
  if (options?.platform) {
    query = query.eq('platform', options.platform);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data: accounts, error } = await query;

  if (error) {
    console.error('获取账号列表失败:', error);
    return [];
  }

  return (accounts || []).map(transformAccount);
}

/**
 * 根据平台获取账号
 */
export async function getAccountsByPlatform(platform: string, businessId?: string): Promise<MatrixAccount[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('matrix_accounts')
    .select('*')
    .eq('platform', platform)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (businessId) {
    query = query.eq('business_id', businessId);
  }

  const { data: accounts, error } = await query;

  if (error) {
    console.error('获取平台账号失败:', error);
    return [];
  }

  return (accounts || []).map(transformAccount);
}

/**
 * 根据ID获取账号
 */
export async function getAccountById(id: string): Promise<MatrixAccount | null> {
  const client = getSupabaseClient();
  
  const { data: account, error } = await client
    .from('matrix_accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !account) {
    console.error('获取账号详情失败:', error);
    return null;
  }

  return transformAccount(account);
}

/**
 * 创建账号
 */
export async function createAccount(input: CreateAccountInput): Promise<MatrixAccount> {
  const client = getSupabaseClient();
  
  // 将 aiModel 和 platformCategory 存储到 metadata 中（因为数据库没有这些列）
  const metadata = {
    homepageUrl: input.homepageUrl,
    authStatus: input.metadata?.authStatus || 'pending',
    webhookConfig: input.webhookConfig,
    aiModel: input.aiModel || null,
    platformCategory: input.platformCategory || null,
    ...input.metadata,
  };

  const { data: account, error } = await client
    .from('matrix_accounts')
    .insert({
      business_id: input.businessId,
      platform: input.platform,
      account_name: input.accountName,
      display_name: input.displayName,
      avatar: input.avatar,
      followers: input.followers || 0,
      status: input.status || 'active',
      metadata: metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('创建账号失败:', error);
    throw error;
  }

  return transformAccount(account);
}

/**
 * 更新账号
 */
export async function updateAccount(id: string, input: UpdateAccountInput): Promise<MatrixAccount | null> {
  const client = getSupabaseClient();
  
  // 先获取现有 metadata，因为 platformCategory 和 aiModel 存储在 metadata 中
  const { data: existingAccount } = await client
    .from('matrix_accounts')
    .select('metadata')
    .eq('id', id)
    .single();
  
  const existingMetadata = existingAccount?.metadata || {};
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.avatar !== undefined) updateData.avatar = input.avatar;
  if (input.followers !== undefined) updateData.followers = input.followers;
  if (input.status !== undefined) updateData.status = input.status;
  
  // 将 platformCategory 和 aiModel 存储到 metadata 中（因为数据库没有这些列）
  const newMetadata = { ...existingMetadata };
  if (input.platformCategory !== undefined) {
    newMetadata.platformCategory = input.platformCategory;
  }
  if (input.aiModel !== undefined) {
    newMetadata.aiModel = input.aiModel;
  }
  if (input.metadata !== undefined) {
    Object.assign(newMetadata, input.metadata);
  }
  if (input.webhookConfig !== undefined) {
    newMetadata.webhookConfig = input.webhookConfig;
  }
  updateData.metadata = newMetadata;

  const { data: account, error } = await client
    .from('matrix_accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新账号失败:', error);
    return null;
  }

  return transformAccount(account);
}

/**
 * 删除账号
 */
export async function deleteAccount(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('matrix_accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除账号失败:', error);
    return false;
  }

  return true;
}

/**
 * 批量更新账号粉丝数
 */
export async function batchUpdateFollowers(updates: Array<{ id: string; followers: number }>): Promise<boolean> {
  const client = getSupabaseClient();
  
  for (const update of updates) {
    const { error } = await client
      .from('matrix_accounts')
      .update({ 
        followers: update.followers,
        updated_at: new Date().toISOString() 
      })
      .eq('id', update.id);

    if (error) {
      console.error('更新粉丝数失败:', error);
    }
  }

  return true;
}

/**
 * 获取企业各平台的账号统计
 */
export async function getAccountStatsByBusiness(businessId: string): Promise<{
  total: number;
  active: number;
  platforms: Record<string, number>;
  totalFollowers: number;
  byCategory: Record<string, number>;
  byAiModel: Record<string, number>;
}> {
  const accounts = await getAccountsByBusiness(businessId);
  
  return {
    total: accounts.length,
    active: accounts.filter(a => a.status === 'active').length,
    platforms: accounts.reduce((acc, a) => {
      acc[a.platform] = (acc[a.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalFollowers: accounts.reduce((sum, a) => sum + a.followers, 0),
    byCategory: accounts.reduce((acc, a) => {
      const category = a.platformCategory || 'platform';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byAiModel: accounts.reduce((acc, a) => {
      if (a.aiModel) {
        acc[a.aiModel] = (acc[a.aiModel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * 根据平台分类获取账号
 */
export async function getAccountsByCategory(
  businessId: string, 
  category: PlatformCategory
): Promise<MatrixAccount[]> {
  // 由于数据库没有 platform_category 列，从所有账号中过滤
  const allAccounts = await getAccountsByBusiness(businessId);
  return allAccounts.filter(account => account.platformCategory === category);
}

/**
 * 根据AI模型获取GEO平台账号
 */
export async function getGeoAccountsByModel(
  businessId: string,
  aiModel: AIModel
): Promise<MatrixAccount[]> {
  // 由于数据库没有 ai_model 和 platform_category 列，从所有账号中过滤
  const allAccounts = await getAccountsByBusiness(businessId);
  return allAccounts.filter(
    account => account.platformCategory === PlatformCategory.GEO_PLATFORM && account.aiModel === aiModel
  );
}

/**
 * 获取所有官网账号（支持Webhook推送）
 */
export async function getOfficialSiteAccounts(businessId: string): Promise<MatrixAccount[]> {
  // 由于数据库没有 platform_category 列，从所有账号中过滤
  const allAccounts = await getAccountsByBusiness(businessId);
  return allAccounts.filter(account => account.platformCategory === PlatformCategory.OFFICIAL_SITE);
}

/**
 * 获取启用Webhook的官网账号
 */
export async function getWebhookEnabledAccounts(businessId: string): Promise<MatrixAccount[]> {
  const accounts = await getOfficialSiteAccounts(businessId);
  return accounts.filter(a => a.webhookConfig?.enabled);
}

// 转换函数
function transformAccount(dbAccount: any): MatrixAccount {
  return {
    id: dbAccount.id,
    businessId: dbAccount.business_id,
    platform: dbAccount.platform,
    // 从 metadata 读取 platformCategory 和 aiModel（因为数据库没有这些列）
    platformCategory: dbAccount.metadata?.platformCategory as PlatformCategory || dbAccount.platform_category as PlatformCategory || undefined,
    aiModel: dbAccount.metadata?.aiModel as AIModel || dbAccount.ai_model as AIModel || undefined,
    accountName: dbAccount.account_name,
    displayName: dbAccount.display_name,
    homepageUrl: dbAccount.metadata?.homepageUrl,
    avatar: dbAccount.avatar,
    followers: dbAccount.followers || 0,
    status: dbAccount.status || 'active',
    authStatus: dbAccount.metadata?.authStatus || 'pending',
    metadata: dbAccount.metadata,
    webhookConfig: dbAccount.metadata?.webhookConfig,
    createdAt: new Date(dbAccount.created_at),
    updatedAt: new Date(dbAccount.updated_at),
  };
}
