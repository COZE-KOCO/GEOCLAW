/**
 * 用户认证服务
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SignJWT, jwtVerify } from 'jose';
import { getUserAccountById } from './admin-store';

const JWT_SECRET = process.env.JWT_SECRET || 'user-secret-key-change-in-production';

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  businessId?: string; // 用户所属企业ID，用于数据隔离（可选，用户可能还未创建企业）
  role: 'user' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'pending';
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
}

/**
 * 验证用户登录
 * 允许没有企业的用户登录，后续引导创建企业
 */
export async function verifyUserLogin(
  account: string, // 邮箱或手机号
  password: string
): Promise<{ success: boolean; user?: UserSession; error?: string }> {
  const supabase = getSupabaseClient();
  
  // 尝试通过邮箱查找
  let { data: user, error } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('email', account)
    .eq('status', 'active')
    .single();
  
  // 如果邮箱没找到，尝试手机号
  if (!user) {
    const result = await supabase
      .from('user_accounts')
      .select('*')
      .eq('phone', account)
      .eq('status', 'active')
      .single();
    user = result.data;
    error = result.error;
  }
  
  if (error || !user) {
    return { success: false, error: '账号或密码错误' };
  }
  
  // 验证密码
  if (user.password_hash !== password) {
    return { success: false, error: '账号或密码错误' };
  }
  
  // 更新最后登录时间
  await supabase
    .from('user_accounts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', user.id);
  
  return {
    success: true,
    user: {
      id: user.id,
      name: user.name || '',
      email: user.email,
      phone: user.phone,
      businessId: user.business_id || undefined, // 可选，用户可能还未创建企业
      role: user.role,
      status: user.status,
      permissions: user.permissions || {},
      packageId: user.package_id,
      packageExpiresAt: user.package_expires_at,
    },
  };
}

/**
 * 创建用户 Token
 */
export async function createUserToken(user: UserSession): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    businessId: user.businessId,
    role: user.role,
    permissions: user.permissions,
    packageId: user.packageId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7天有效期
    .sign(secret);
  
  return token;
}

/**
 * 验证用户 Token
 */
export async function verifyUserToken(token: string): Promise<UserSession | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // 从数据库获取最新的用户信息
    const user = await getUserAccountById(payload.id as string);
    
    if (!user || user.status !== 'active') {
      return null;
    }
    
    return {
      id: user.id,
      name: user.name || '',
      email: user.email,
      phone: user.phone,
      businessId: user.businessId || undefined, // 可选
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      packageId: user.packageId,
      packageExpiresAt: user.packageExpiresAt,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 从请求中获取当前用户
 */
export async function getCurrentUser(request: Request): Promise<UserSession | null> {
  // 尝试从 Authorization header 获取
  const authHeader = request.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyUserToken(token);
  }
  
  // 尝试从 cookie 获取
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const userTokenCookie = cookies.find(c => c.startsWith('user_token='));
    if (userTokenCookie) {
      const token = userTokenCookie.split('=')[1];
      return verifyUserToken(token);
    }
  }
  
  return null;
}

/**
 * 检查用户是否有某个权限
 */
export function hasPermission(user: UserSession, permission: keyof NonNullable<UserSession['permissions']>): boolean {
  return user.permissions?.[permission] === true;
}

/**
 * 检查套餐是否过期
 */
export function isPackageExpired(user: UserSession): boolean {
  if (!user.packageExpiresAt) {
    return true; // 没有套餐视为过期
  }
  return new Date(user.packageExpiresAt) < new Date();
}

/**
 * 检查用户是否有权访问指定企业的数据
 * @param user 当前用户
 * @param businessId 要访问的企业ID
 * @returns 是否有权访问
 */
/**
 * 验证企业所有权
 * @param userId 用户ID
 * @param businessId 企业ID
 * @returns 是否拥有该企业
 */
export async function validateBusinessOwnership(
  userId: string, 
  businessId: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data: business, error } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();
  
  if (error || !business) {
    return false;
  }
  
  return business.owner_id === userId;
}

/**
 * 验证用户对企业的访问权限（旧版兼容，基于 businessId 字段）
 * @deprecated 请使用 validateBusinessOwnership 异步函数
 * @param user 当前用户
 * @param businessId 要访问的企业ID（可选）
 * @returns 如果无权限，返回错误响应；有权限返回 null
 */
export function validateBusinessAccess(
  user: UserSession, 
  businessId: string | null | undefined
): { error: string; status: number } | null {
  // 如果用户没有企业
  if (!user.businessId) {
    return { 
      error: '您还没有创建企业，请先创建企业', 
      status: 403 
    };
  }
  
  // 如果没有提供 businessId，使用用户自己的 businessId
  if (!businessId) {
    return null;
  }
  
  // 验证用户是否有权访问该企业数据
  if (user.businessId !== businessId) {
    return { 
      error: '您没有权限访问该企业的数据', 
      status: 403 
    };
  }
  
  return null;
}

/**
 * 获取用户可创建的企业数量限制
 * @param role 用户角色
 * @returns 可创建的企业数量，-1 表示无限制
 */
export function getMaxBusinesses(role: UserSession['role']): number {
  switch (role) {
    case 'enterprise':
      return -1; // 无限制
    case 'premium':
      return 1;
    case 'user':
    default:
      return 1;
  }
}
