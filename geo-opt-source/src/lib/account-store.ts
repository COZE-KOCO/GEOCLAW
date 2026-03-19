/**
 * 矩阵账号存储服务
 * 管理多平台账号，账号属于某个企业/商家
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface MatrixAccount {
  id: string;
  businessId: string;
  personaId?: string;
  platform: string; // zhihu, xiaohongshu, wechat, toutiao, bilibili
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers: number;
  status: 'active' | 'inactive' | 'pending';
  authStatus: 'pending' | 'authorized' | 'expired';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  businessId: string;
  personaId?: string;
  platform: string;
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers?: number;
  status?: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
}

export interface UpdateAccountInput {
  personaId?: string;
  displayName?: string;
  homepageUrl?: string;
  avatar?: string;
  followers?: number;
  status?: 'active' | 'inactive' | 'pending';
  metadata?: Record<string, any>;
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
  
  const { data: account, error } = await client
    .from('matrix_accounts')
    .insert({
      business_id: input.businessId,
      persona_id: input.personaId,
      platform: input.platform,
      account_name: input.accountName,
      display_name: input.displayName,
      avatar: input.avatar,
      followers: input.followers || 0,
      status: input.status || 'active',
      metadata: {
        homepageUrl: input.homepageUrl,
        authStatus: input.metadata?.authStatus || 'pending',
        ...input.metadata,
      },
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
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (input.personaId !== undefined) updateData.persona_id = input.personaId;
  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.avatar !== undefined) updateData.avatar = input.avatar;
  if (input.followers !== undefined) updateData.followers = input.followers;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;

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
  };
}

// 转换函数
function transformAccount(dbAccount: any): MatrixAccount {
  return {
    id: dbAccount.id,
    businessId: dbAccount.business_id,
    personaId: dbAccount.persona_id,
    platform: dbAccount.platform,
    accountName: dbAccount.account_name,
    displayName: dbAccount.display_name,
    homepageUrl: dbAccount.metadata?.homepageUrl,
    avatar: dbAccount.avatar,
    followers: dbAccount.followers || 0,
    status: dbAccount.status || 'active',
    authStatus: dbAccount.metadata?.authStatus || 'pending',
    metadata: dbAccount.metadata,
    createdAt: new Date(dbAccount.created_at),
    updatedAt: new Date(dbAccount.updated_at),
  };
}
