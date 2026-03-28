/**
 * Admin 认证服务
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'super_admin' | 'admin';
  lastLoginAt?: string;
  createdAt: string;
}

/**
 * 初始化默认管理员
 */
async function initializeDefaultAdmin(): Promise<AdminUser | null> {
  const supabase = getSupabaseClient();
  
  try {
    // 尝试创建默认管理员
    const { data: newAdmin, error } = await supabase
      .from('admin_users')
      .insert({
        username: 'admin',
        password_hash: 'admin123',
        name: '超级管理员',
        role: 'super_admin',
        is_active: true,
      })
      .select()
      .single();
    
    if (error) {
      console.error('初始化默认管理员失败:', error);
      
      // 如果是表不存在错误，返回一个临时的管理员对象
      // PGRST205: Could not find the table in the schema cache
      // 42P01: PostgreSQL table does not exist
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log('admin_users表不存在，返回临时管理员');
        return {
          id: 'temp-admin-id',
          username: 'admin',
          name: '超级管理员（临时）',
          role: 'super_admin',
          createdAt: new Date().toISOString(),
        };
      }
      
      return null;
    }
    
    return {
      id: newAdmin.id,
      username: newAdmin.username,
      name: newAdmin.name,
      role: newAdmin.role,
      createdAt: newAdmin.created_at,
    };
  } catch (err) {
    console.error('初始化默认管理员异常:', err);
    return null;
  }
}

/**
 * 验证管理员登录
 */
export async function verifyAdminLogin(
  username: string,
  password: string
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  const supabase = getSupabaseClient();
  
  // 如果是默认账号，尝试初始化
  if (username === 'admin' && password === 'admin123') {
    // 先检查是否已有admin用户
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', 'admin')
      .single();
    
    if (existingAdmin) {
      // 已存在，验证密码
      if (existingAdmin.password_hash === password && existingAdmin.is_active) {
        // 更新最后登录时间
        await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', existingAdmin.id);
        
        return {
          success: true,
          admin: {
            id: existingAdmin.id,
            username: existingAdmin.username,
            name: existingAdmin.name,
            email: existingAdmin.email,
            role: existingAdmin.role,
            lastLoginAt: existingAdmin.last_login_at,
            createdAt: existingAdmin.created_at,
          },
        };
      }
    } else {
      // 不存在，尝试创建
      const newAdmin = await initializeDefaultAdmin();
      if (newAdmin) {
        return { success: true, admin: newAdmin };
      }
    }
  }
  
  // 查询管理员
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single();
  
  if (error || !admin) {
    // 如果表不存在，且是默认账号，返回临时管理员
    if (username === 'admin' && password === 'admin123' && 
        (error?.code === '42P01' || error?.code === 'PGRST205')) {
      return {
        success: true,
        admin: {
          id: 'temp-admin-id',
          username: 'admin',
          name: '超级管理员（临时）',
          role: 'super_admin',
          createdAt: new Date().toISOString(),
        },
      };
    }
    return { success: false, error: '用户名或密码错误' };
  }
  
  // 验证密码（简单比较，生产环境应使用bcrypt）
  if (admin.password_hash !== password) {
    return { success: false, error: '用户名或密码错误' };
  }
  
  // 更新最后登录时间
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id);
  
  return {
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      lastLoginAt: admin.last_login_at,
      createdAt: admin.created_at,
    },
  };
}

/**
 * 创建Admin Token
 */
export async function createAdminToken(admin: AdminUser): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  
  const token = await new SignJWT({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
  
  return token;
}

/**
 * 验证Admin Token
 */
export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as 'super_admin' | 'admin',
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    return null;
  }
}

/**
 * 从请求中获取当前管理员
 */
export async function getCurrentAdmin(request: Request): Promise<AdminUser | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    // 尝试从cookie获取
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const adminTokenCookie = cookies.find(c => c.startsWith('admin_token='));
      if (adminTokenCookie) {
        const token = adminTokenCookie.split('=')[1];
        return verifyAdminToken(token);
      }
    }
    return null;
  }
  
  const token = authHeader.substring(7);
  return verifyAdminToken(token);
}
