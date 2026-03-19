/**
 * 数据库初始化 API
 * 用于检查和创建数据库表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 创建表的 SQL 语句
const CREATE_TABLES_SQL = `
-- 企业/商家表
CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  sub_industry VARCHAR(100),
  description TEXT,
  logo VARCHAR(500),
  website VARCHAR(500),
  address VARCHAR(500),
  city VARCHAR(100),
  district VARCHAR(100),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  phone VARCHAR(50),
  business_hours JSONB,
  brand_keywords JSONB DEFAULT '[]',
  target_keywords JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 矩阵账号表
CREATE TABLE IF NOT EXISTS matrix_accounts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar VARCHAR(500),
  followers INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  persona_id VARCHAR(36),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 人设表
CREATE TABLE IF NOT EXISTS personas (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  expertise TEXT NOT NULL,
  tone VARCHAR(50) NOT NULL,
  style VARCHAR(50) NOT NULL,
  writing_style TEXT,
  example_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 内容草稿表
CREATE TABLE IF NOT EXISTS content_drafts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  distillation_words JSONB DEFAULT '[]',
  outline JSONB,
  seo_score INTEGER DEFAULT 0,
  target_model VARCHAR(50),
  article_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 发布记录表
CREATE TABLE IF NOT EXISTS publish_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id VARCHAR(36) NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  published_url VARCHAR(500),
  published_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 发布计划表
CREATE TABLE IF NOT EXISTS publish_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  draft_id VARCHAR(36),
  plan_name VARCHAR(200) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'recurring',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
  scheduled_time VARCHAR(10),
  scheduled_days JSONB DEFAULT '[]',
  scheduled_dates JSONB DEFAULT '[]',
  custom_cron VARCHAR(100),
  max_runs INTEGER DEFAULT 0,
  current_runs INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  target_platforms JSONB NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 5,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay INTEGER NOT NULL DEFAULT 60,
  notify_on_complete BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_fail BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 发布任务表
CREATE TABLE IF NOT EXISTS publish_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36),
  draft_id VARCHAR(36),
  task_name VARCHAR(200) NOT NULL,
  task_type VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  priority INTEGER NOT NULL DEFAULT 5,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  target_platforms JSONB NOT NULL DEFAULT '[]',
  scheduled_at TIMESTAMPTZ,
  recurring_rule VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total_platforms INTEGER NOT NULL DEFAULT 0,
  published_platforms INTEGER NOT NULL DEFAULT 0,
  failed_platforms INTEGER NOT NULL DEFAULT 0,
  results JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay INTEGER NOT NULL DEFAULT 60,
  notify_on_complete BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_fail BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GEO项目表
CREATE TABLE IF NOT EXISTS geo_projects (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100),
  keywords JSONB DEFAULT '[]',
  references JSONB DEFAULT '[]',
  score INTEGER NOT NULL,
  grade VARCHAR(5) NOT NULL,
  breakdown JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ
);

-- GEO引用表
CREATE TABLE IF NOT EXISTS geo_citations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  query VARCHAR(500) NOT NULL,
  position INTEGER NOT NULL,
  cited BOOLEAN NOT NULL DEFAULT FALSE,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  date VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GEO转化表
CREATE TABLE IF NOT EXISTS geo_conversions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  date VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GEO曝光表
CREATE TABLE IF NOT EXISTS geo_exposure (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  date VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GEO分析任务表
CREATE TABLE IF NOT EXISTS geo_analysis_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36),
  analysis_type VARCHAR(20) NOT NULL,
  input_text VARCHAR(500) NOT NULL,
  competitors JSONB DEFAULT '[]',
  target_brand VARCHAR(200),
  industry VARCHAR(100),
  selected_platforms JSONB NOT NULL DEFAULT '[]',
  selected_questions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  results JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GEO分析结果详情表
CREATE TABLE IF NOT EXISTS geo_analysis_results (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(36) NOT NULL,
  question VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  platform VARCHAR(50) NOT NULL,
  cited BOOLEAN NOT NULL DEFAULT FALSE,
  cited_brand VARCHAR(200),
  title VARCHAR(500),
  url VARCHAR(1000),
  media_source VARCHAR(100),
  raw_response TEXT,
  content_description TEXT,
  visibility INTEGER NOT NULL DEFAULT 0,
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  confidence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS businesses_type_idx ON businesses(type);
CREATE INDEX IF NOT EXISTS businesses_industry_idx ON businesses(industry);
CREATE INDEX IF NOT EXISTS businesses_city_idx ON businesses(city);
CREATE INDEX IF NOT EXISTS businesses_status_idx ON businesses(status);

CREATE INDEX IF NOT EXISTS matrix_accounts_business_id_idx ON matrix_accounts(business_id);
CREATE INDEX IF NOT EXISTS matrix_accounts_platform_idx ON matrix_accounts(platform);
CREATE INDEX IF NOT EXISTS matrix_accounts_status_idx ON matrix_accounts(status);

CREATE INDEX IF NOT EXISTS personas_business_id_idx ON personas(business_id);

CREATE INDEX IF NOT EXISTS content_drafts_business_id_idx ON content_drafts(business_id);
CREATE INDEX IF NOT EXISTS content_drafts_status_idx ON content_drafts(status);

CREATE INDEX IF NOT EXISTS publish_records_draft_id_idx ON publish_records(draft_id);
CREATE INDEX IF NOT EXISTS publish_records_account_id_idx ON publish_records(account_id);
CREATE INDEX IF NOT EXISTS publish_records_status_idx ON publish_records(status);

CREATE INDEX IF NOT EXISTS publish_plans_business_id_idx ON publish_plans(business_id);
CREATE INDEX IF NOT EXISTS publish_plans_status_idx ON publish_plans(status);
CREATE INDEX IF NOT EXISTS publish_plans_next_run_at_idx ON publish_plans(next_run_at);
CREATE INDEX IF NOT EXISTS publish_plans_frequency_idx ON publish_plans(frequency);

CREATE INDEX IF NOT EXISTS publish_tasks_business_id_idx ON publish_tasks(business_id);
CREATE INDEX IF NOT EXISTS publish_tasks_plan_id_idx ON publish_tasks(plan_id);
CREATE INDEX IF NOT EXISTS publish_tasks_draft_id_idx ON publish_tasks(draft_id);
CREATE INDEX IF NOT EXISTS publish_tasks_status_idx ON publish_tasks(status);
CREATE INDEX IF NOT EXISTS publish_tasks_scheduled_at_idx ON publish_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS publish_tasks_task_type_idx ON publish_tasks(task_type);

CREATE INDEX IF NOT EXISTS geo_citations_date_idx ON geo_citations(date);
CREATE INDEX IF NOT EXISTS geo_citations_project_id_idx ON geo_citations(project_id);

CREATE INDEX IF NOT EXISTS geo_conversions_date_idx ON geo_conversions(date);
CREATE INDEX IF NOT EXISTS geo_conversions_project_id_idx ON geo_conversions(project_id);

CREATE INDEX IF NOT EXISTS geo_exposure_date_idx ON geo_exposure(date);
CREATE INDEX IF NOT EXISTS geo_exposure_project_id_idx ON geo_exposure(project_id);

CREATE INDEX IF NOT EXISTS geo_projects_business_id_idx ON geo_projects(business_id);
CREATE INDEX IF NOT EXISTS geo_projects_created_at_idx ON geo_projects(created_at);
CREATE INDEX IF NOT EXISTS geo_projects_status_idx ON geo_projects(status);

CREATE INDEX IF NOT EXISTS geo_analysis_tasks_business_id_idx ON geo_analysis_tasks(business_id);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_type_idx ON geo_analysis_tasks(analysis_type);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_status_idx ON geo_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_created_at_idx ON geo_analysis_tasks(created_at);

CREATE INDEX IF NOT EXISTS geo_analysis_results_task_id_idx ON geo_analysis_results(task_id);
CREATE INDEX IF NOT EXISTS geo_analysis_results_platform_idx ON geo_analysis_results(platform);
CREATE INDEX IF NOT EXISTS geo_analysis_results_cited_idx ON geo_analysis_results(cited);
`;

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 检查现有表
    const { data: tables, error: tablesError } = await client
      .from('health_check')
      .select('id')
      .limit(1);

    // 如果 health_check 表不存在，说明需要初始化数据库
    if (tablesError && tablesError.code === '42P01') {
      return NextResponse.json({
        success: true,
        initialized: false,
        message: '数据库表未初始化，请调用 POST 接口进行初始化',
        hint: '发送 POST 请求到 /api/db/init 来创建数据库表',
      });
    }

    // 获取现有表列表
    const { data: existingTables, error } = await client.rpc('exec_sql', {
      query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    });

    return NextResponse.json({
      success: true,
      initialized: true,
      message: '数据库已初始化',
      tables: existingTables || [],
    });
  } catch (error) {
    console.error('数据库检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '检查数据库失败',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // Supabase 不支持直接执行 DDL 语句
    // 我们需要使用 Supabase 的 RPC 或者在控制台执行
    // 这里我们尝试逐个创建表

    const tables = [
      'businesses',
      'matrix_accounts',
      'personas',
      'content_drafts',
      'publish_records',
      'publish_plans',
      'publish_tasks',
      'geo_projects',
      'geo_citations',
      'geo_conversions',
      'geo_exposure',
      'health_check',
      'geo_analysis_tasks',
      'geo_analysis_results',
    ];

    const results: { table: string; status: string; error?: string }[] = [];

    // 尝试检查每个表是否存在
    for (const table of tables) {
      try {
        const { error } = await client.from(table).select('id').limit(1);
        if (error) {
          if (error.code === '42P01') {
            results.push({ table, status: 'missing' });
          } else {
            results.push({ table, status: 'error', error: error.message });
          }
        } else {
          results.push({ table, status: 'exists' });
        }
      } catch (e) {
        results.push({ table, status: 'error', error: String(e) });
      }
    }

    const missingTables = results.filter(r => r.status === 'missing');
    const existingTables = results.filter(r => r.status === 'exists');

    return NextResponse.json({
      success: true,
      message: missingTables.length > 0 
        ? `发现 ${missingTables.length} 个表未创建，请在 Supabase 控制台执行建表 SQL`
        : '所有表已存在',
      tables: results,
      missingTables: missingTables.map(r => r.table),
      existingTables: existingTables.map(r => r.table),
      sql: missingTables.length > 0 ? CREATE_TABLES_SQL : undefined,
      hint: missingTables.length > 0 
        ? '请在 Supabase 控制台的 SQL Editor 中执行上述 SQL 语句来创建缺失的表'
        : undefined,
    });
  } catch (error) {
    console.error('数据库初始化检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '初始化检查失败',
    });
  }
}
