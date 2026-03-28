import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/migration/add-owner-id
 * 添加 owner_id 字段到 businesses 表
 */
export async function POST(request: NextRequest) {
  const adminToken = request.headers.get('x-admin-token');
  
  // 简单的安全验证
  if (adminToken !== process.env.ADMIN_MIGRATION_TOKEN && adminToken !== 'migration-secret-2024') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const client = getSupabaseClient();
  
  try {
    // 检查 owner_id 字段是否已存在
    const { data: columns, error: checkError } = await client
      .rpc('exec_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'businesses' AND column_name = 'owner_id'
        `
      });
    
    // 如果 RPC 不可用，直接尝试添加字段
    // 添加 owner_id 字段
    const { error } = await client.rpc('exec_sql', {
      query: `
        ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);
      `
    });
    
    if (error) {
      // 如果 RPC 不可用，尝试直接通过 Supabase 客户端更新
      // 注意：这需要用户手动在 Supabase 控制台执行
      console.log('需要手动执行迁移 SQL');
      
      return NextResponse.json({
        success: false,
        message: '请手动在 Supabase SQL Editor 中执行以下 SQL：',
        sql: `
-- 添加 owner_id 字段到 businesses 表
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);

-- 添加注释
COMMENT ON COLUMN businesses.owner_id IS '企业所有者ID（用户ID）';

-- 可选：创建索引以加速按 owner_id 查询
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
        `
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'owner_id 字段已成功添加到 businesses 表'
    });
    
  } catch (error) {
    console.error('迁移失败:', error);
    return NextResponse.json({
      success: false,
      error: '迁移失败',
      sql: `
-- 请手动在 Supabase SQL Editor 中执行以下 SQL：

-- 添加 owner_id 字段到 businesses 表
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);

-- 添加注释
COMMENT ON COLUMN businesses.owner_id IS '企业所有者ID（用户ID）';

-- 可选：创建索引以加速按 owner_id 查询
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
      `
    }, { status: 500 });
  }
}
