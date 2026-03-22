/**
 * 创建 generation_plans 表
 * 使用 pg 库直接连接数据库执行 DDL
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建表的 SQL
const CREATE_GENERATION_PLANS_TABLE = `
CREATE TABLE IF NOT EXISTS generation_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  keywords JSONB DEFAULT '[]',
  draft_ids JSONB DEFAULT '[]',
  mode VARCHAR(20) NOT NULL DEFAULT 'article',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS generation_plans_business_id_idx ON generation_plans(business_id);
CREATE INDEX IF NOT EXISTS generation_plans_status_idx ON generation_plans(status);
CREATE INDEX IF NOT EXISTS generation_plans_created_at_idx ON generation_plans(created_at);
`;

export async function POST(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    // 从环境变量获取数据库连接信息
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      // 尝试从 Supabase 环境变量构建连接字符串
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({
          success: false,
          error: '数据库连接信息未配置',
        }, { status: 500 });
      }
      
      // 从 Supabase URL 提取项目引用
      const url = new URL(supabaseUrl);
      const projectRef = url.hostname.split('.')[0];
      
      return NextResponse.json({
        success: false,
        error: '无法获取数据库连接字符串，请在 Supabase 控制台执行以下 SQL',
        sql: CREATE_GENERATION_PLANS_TABLE,
        hint: `在 Supabase 控制台 -> SQL Editor 中执行上述 SQL 语句`,
      }, { status: 500 });
    }
    
    // 创建数据库连接池
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    
    // 执行建表 SQL
    await pool.query(CREATE_GENERATION_PLANS_TABLE);
    
    return NextResponse.json({
      success: true,
      message: 'generation_plans 表创建成功',
    });
  } catch (error) {
    console.error('创建表失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '创建表失败',
      sql: CREATE_GENERATION_PLANS_TABLE,
      hint: '请在 Supabase 控制台 -> SQL Editor 中执行上述 SQL 语句',
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
