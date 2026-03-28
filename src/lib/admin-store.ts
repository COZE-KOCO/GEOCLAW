/**
 * Admin 用户管理服务
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface UserAccount {
  id: string;
  businessId?: string;
  email?: string;
  phone?: string;
  name?: string;
  clerkId?: string;
  status: 'active' | 'suspended' | 'pending';
  role: 'user' | 'premium' | 'enterprise';
  permissions: {
    // 与套餐权限保持一致
    geoAnalysis?: boolean; // 基础GEO分析
    advancedGeoAnalysis?: boolean; // 高级GEO分析
    autoPublish?: boolean; // 自动发布功能
    teamCollaboration?: boolean; // 团队协作
    dedicatedSupport?: boolean; // 专属客服
  };
  packageId?: string;
  packageExpiresAt?: string;
  monthlyArticleCount: number;
  totalArticleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPackage {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: string;
  originalPrice?: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  features: {
    // AI创作限制
    dailyAiCreations?: number; // 每日AI创作次数，-1表示无限制
    // GEO分析
    geoAnalysis?: boolean; // 基础GEO分析
    advancedGeoAnalysis?: boolean; // 高级GEO分析
    // 平台绑定
    maxPlatforms?: number; // 最大平台绑定数量，-1表示无限制
    // 发布功能
    autoPublish?: boolean;
    // 团队协作
    teamCollaboration?: boolean;
    // 专属客服
    dedicatedSupport?: boolean;
    // 优先级
    priority?: boolean;
  };
  sortOrder: number;
  isActive: boolean;
  isRecommended: boolean;
  createdAt: string;
}

export interface UserFeedback {
  id: string;
  userId?: string;
  businessId?: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  content: string;
  attachments?: string[];
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminReply?: string;
  repliedBy?: string;
  repliedAt?: string;
  userRating?: number;
  userComment?: string;
  createdAt: string;
}

export interface FeatureNotification {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: 'feature' | 'update' | 'fix' | 'announcement';
  icon?: string;
  link?: string;
  publishAt: string;
  expireAt?: string;
  targetRoles?: string[];
  status: 'draft' | 'published' | 'archived';
  isPinned: boolean;
  viewCount: number;
  publishedBy?: string;
  createdAt: string;
}

// ==================== 用户管理 ====================

export async function getUserAccounts(filters?: {
  status?: string;
  role?: string;
  search?: string;
}): Promise<UserAccount[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('user_accounts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    id: item.id,
    businessId: item.business_id,
    email: item.email,
    phone: item.phone,
    name: item.name,
    clerkId: item.clerk_id,
    status: item.status,
    role: item.role,
    permissions: item.permissions || {},
    packageId: item.package_id,
    packageExpiresAt: item.package_expires_at,
    monthlyArticleCount: item.monthly_article_count || 0,
    totalArticleCount: item.total_article_count || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

export async function createUserAccount(user: {
  email?: string;
  phone?: string;
  name: string;
  password: string;
  role?: 'user' | 'premium' | 'enterprise';
  status?: 'active' | 'suspended' | 'pending';
  permissions?: UserAccount['permissions'];
  packageId?: string;
  packageExpiresAt?: string;
}): Promise<UserAccount | null> {
  const supabase = getSupabaseClient();
  
  // 检查邮箱或手机是否已存在
  if (user.email) {
    const { data: existing } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (existing) {
      throw new Error('该邮箱已被注册');
    }
  }
  
  if (user.phone) {
    const { data: existing } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('phone', user.phone)
      .single();
    
    if (existing) {
      throw new Error('该手机号已被注册');
    }
  }
  
  const { data, error } = await supabase
    .from('user_accounts')
    .insert({
      email: user.email,
      phone: user.phone,
      name: user.name,
      password_hash: user.password, // 简单存储，生产环境应使用bcrypt
      role: user.role || 'user',
      status: user.status || 'active',
      permissions: user.permissions || {
        geoAnalysis: false,
        advancedGeoAnalysis: false,
        autoPublish: false,
        teamCollaboration: false,
        dedicatedSupport: false,
      },
      package_id: user.packageId,
      package_expires_at: user.packageExpiresAt,
    })
    .select()
    .single();
  
  if (error) {
    console.error('创建用户失败:', error);
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    email: data.email,
    phone: data.phone,
    name: data.name,
    clerkId: data.clerk_id,
    status: data.status,
    role: data.role,
    permissions: data.permissions || {},
    packageId: data.package_id,
    packageExpiresAt: data.package_expires_at,
    monthlyArticleCount: data.monthly_article_count || 0,
    totalArticleCount: data.total_article_count || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteUserAccount(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('user_accounts')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除用户失败:', error);
    return false;
  }
  
  return true;
}

export async function getUserAccountById(id: string): Promise<UserAccount | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    email: data.email,
    phone: data.phone,
    name: data.name,
    clerkId: data.clerk_id,
    status: data.status,
    role: data.role,
    permissions: data.permissions || {},
    packageId: data.package_id,
    packageExpiresAt: data.package_expires_at,
    monthlyArticleCount: data.monthly_article_count || 0,
    totalArticleCount: data.total_article_count || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateUserAccount(
  id: string,
  updates: Partial<Pick<UserAccount, 'status' | 'role' | 'permissions' | 'packageId' | 'packageExpiresAt' | 'name' | 'email' | 'phone'>>
): Promise<UserAccount | null> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.status) updateData.status = updates.status;
  if (updates.role) updateData.role = updates.role;
  if (updates.permissions) updateData.permissions = updates.permissions;
  // 支持清除套餐（设为 null）
  if ('packageId' in updates) updateData.package_id = updates.packageId || null;
  if ('packageExpiresAt' in updates) updateData.package_expires_at = updates.packageExpiresAt || null;
  if (updates.name) updateData.name = updates.name;
  if (updates.email) updateData.email = updates.email;
  if (updates.phone) updateData.phone = updates.phone;
  
  const { data, error } = await supabase
    .from('user_accounts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !data) {
    console.error('更新用户失败:', error);
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    email: data.email,
    phone: data.phone,
    name: data.name,
    clerkId: data.clerk_id,
    status: data.status,
    role: data.role,
    permissions: data.permissions || {},
    packageId: data.package_id,
    packageExpiresAt: data.package_expires_at,
    monthlyArticleCount: data.monthly_article_count || 0,
    totalArticleCount: data.total_article_count || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateUserPassword(id: string, password: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('user_accounts')
    .update({
      password_hash: password,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    console.error('更新密码失败:', error);
    return false;
  }
  
  return true;
}

// ==================== 套餐管理 ====================

export async function getUserPackages(): Promise<UserPackage[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_packages')
    .select('*')
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('获取套餐列表失败:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    code: item.code,
    description: item.description,
    price: item.price,
    originalPrice: item.original_price,
    billingCycle: item.billing_cycle,
    features: item.features || {},
    sortOrder: item.sort_order,
    isActive: item.is_active,
    isRecommended: item.is_recommended,
    createdAt: item.created_at,
  }));
}

export async function upsertUserPackage(pkg: Partial<UserPackage> & { code: string }): Promise<UserPackage | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_packages')
    .upsert({
      code: pkg.code,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price || '0',
      original_price: pkg.originalPrice,
      billing_cycle: pkg.billingCycle || 'monthly',
      features: pkg.features || {},
      sort_order: pkg.sortOrder || 0,
      is_active: pkg.isActive ?? true,
      is_recommended: pkg.isRecommended ?? false,
    }, { onConflict: 'code' })
    .select()
    .single();
  
  if (error || !data) {
    console.error('保存套餐失败:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    description: data.description,
    price: data.price,
    originalPrice: data.original_price,
    billingCycle: data.billing_cycle,
    features: data.features || {},
    sortOrder: data.sort_order,
    isActive: data.is_active,
    isRecommended: data.is_recommended,
    createdAt: data.created_at,
  };
}

export async function deleteUserPackage(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // 检查是否有用户正在使用该套餐
  const { data: usersWithPackage } = await supabase
    .from('user_accounts')
    .select('id')
    .eq('package_id', id)
    .limit(1);
  
  if (usersWithPackage && usersWithPackage.length > 0) {
    return false; // 有用户使用该套餐，不能删除
  }
  
  const { error } = await supabase
    .from('user_packages')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除套餐失败:', error);
    return false;
  }
  
  return true;
}

// ==================== 意见管理 ====================

export async function getUserFeedbacks(filters?: {
  status?: string;
  type?: string;
}): Promise<UserFeedback[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('user_feedbacks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('获取意见列表失败:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    id: item.id,
    userId: item.user_id,
    businessId: item.business_id,
    type: item.type,
    title: item.title,
    content: item.content,
    attachments: item.attachments,
    status: item.status,
    priority: item.priority,
    adminReply: item.admin_reply,
    repliedBy: item.replied_by,
    repliedAt: item.replied_at,
    userRating: item.user_rating,
    userComment: item.user_comment,
    createdAt: item.created_at,
  }));
}

export async function replyUserFeedback(
  id: string,
  reply: string,
  adminId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('user_feedbacks')
    .update({
      admin_reply: reply,
      replied_by: adminId,
      replied_at: new Date().toISOString(),
      status: 'resolved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    console.error('回复意见失败:', error);
    return false;
  }
  
  return true;
}

export async function updateFeedbackStatus(
  id: string,
  status: UserFeedback['status'],
  priority?: UserFeedback['priority']
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (priority) updateData.priority = priority;
  
  const { error } = await supabase
    .from('user_feedbacks')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('更新意见状态失败:', error);
    return false;
  }
  
  return true;
}

// ==================== 通知管理 ====================

export async function getFeatureNotifications(filters?: {
  status?: string;
  category?: string;
}): Promise<FeatureNotification[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('feature_notifications')
    .select('*')
    .order('publish_at', { ascending: false });
  
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('获取通知列表失败:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    content: item.content,
    summary: item.summary,
    category: item.category,
    icon: item.icon,
    link: item.link,
    publishAt: item.publish_at,
    expireAt: item.expire_at,
    targetRoles: item.target_roles,
    status: item.status,
    isPinned: item.is_pinned,
    viewCount: item.view_count,
    publishedBy: item.published_by,
    createdAt: item.created_at,
  }));
}

export async function createFeatureNotification(
  notification: Omit<FeatureNotification, 'id' | 'viewCount' | 'createdAt'> & { publishedBy: string }
): Promise<FeatureNotification | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('feature_notifications')
    .insert({
      title: notification.title,
      content: notification.content,
      summary: notification.summary,
      category: notification.category,
      icon: notification.icon,
      link: notification.link,
      publish_at: notification.publishAt,
      expire_at: notification.expireAt,
      target_roles: notification.targetRoles,
      status: notification.status,
      is_pinned: notification.isPinned,
      published_by: notification.publishedBy,
    })
    .select()
    .single();
  
  if (error || !data) {
    console.error('创建通知失败:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    summary: data.summary,
    category: data.category,
    icon: data.icon,
    link: data.link,
    publishAt: data.publish_at,
    expireAt: data.expire_at,
    targetRoles: data.target_roles,
    status: data.status,
    isPinned: data.is_pinned,
    viewCount: data.view_count,
    publishedBy: data.published_by,
    createdAt: data.created_at,
  };
}

export async function updateFeatureNotification(
  id: string,
  updates: Partial<Pick<FeatureNotification, 'title' | 'content' | 'summary' | 'status' | 'isPinned'>>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (updates.title) updateData.title = updates.title;
  if (updates.content) updateData.content = updates.content;
  if (updates.summary) updateData.summary = updates.summary;
  if (updates.status) updateData.status = updates.status;
  if (updates.isPinned !== undefined) updateData.is_pinned = updates.isPinned;
  
  const { error } = await supabase
    .from('feature_notifications')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('更新通知失败:', error);
    return false;
  }
  
  return true;
}

export async function deleteFeatureNotification(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('feature_notifications')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除通知失败:', error);
    return false;
  }
  
  return true;
}
