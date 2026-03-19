-- =============================================
-- 发布计划和发布任务数据库表
-- =============================================

-- 1. 发布计划表
-- 用于管理自动化发布计划
CREATE TABLE IF NOT EXISTS publish_plans (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  draft_id VARCHAR(36),
  
  -- 计划基本信息
  plan_name VARCHAR(200) NOT NULL,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'recurring', -- once, daily, weekly, monthly, custom
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, completed, cancelled
  
  -- 发布频率配置
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily', -- once, hourly, daily, weekly, monthly
  scheduled_time VARCHAR(10), -- HH:mm 格式，如 "09:30"
  scheduled_days JSONB DEFAULT '[]', -- 周几发布 [0-6]，0表示周日
  scheduled_dates JSONB DEFAULT '[]', -- 每月哪几天发布 [1-31]
  custom_cron VARCHAR(100), -- 自定义cron表达式
  
  -- 运行次数限制
  max_runs INTEGER DEFAULT 0, -- 最大运行次数，0表示无限
  current_runs INTEGER DEFAULT 0 NOT NULL, -- 当前已运行次数
  
  -- 时间范围
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- 发布内容
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  
  -- 发布目标
  target_platforms JSONB NOT NULL DEFAULT '[]', -- [{platform, accountId}]
  
  -- 任务配置
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay INTEGER NOT NULL DEFAULT 60,
  
  -- 通知配置
  notify_on_complete BOOLEAN NOT NULL DEFAULT true,
  notify_on_fail BOOLEAN NOT NULL DEFAULT true,
  
  -- 上次和下次执行时间
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 发布计划表索引
CREATE INDEX IF NOT EXISTS publish_plans_business_id_idx ON publish_plans(business_id);
CREATE INDEX IF NOT EXISTS publish_plans_status_idx ON publish_plans(status);
CREATE INDEX IF NOT EXISTS publish_plans_next_run_at_idx ON publish_plans(next_run_at);
CREATE INDEX IF NOT EXISTS publish_plans_frequency_idx ON publish_plans(frequency);

-- 发布计划表注释
COMMENT ON TABLE publish_plans IS '发布计划表 - 管理文章自动化发布计划';
COMMENT ON COLUMN publish_plans.plan_type IS '计划类型: once(一次性), daily(每天), weekly(每周), monthly(每月), custom(自定义)';
COMMENT ON COLUMN publish_plans.frequency IS '发布频率: once(仅一次), hourly(每小时), daily(每天), weekly(每周), monthly(每月)';
COMMENT ON COLUMN publish_plans.status IS '计划状态: active(运行中), paused(已暂停), completed(已完成), cancelled(已取消)';
COMMENT ON COLUMN publish_plans.scheduled_days IS '周几发布，JSON数组 [0-6]，0表示周日';
COMMENT ON COLUMN publish_plans.scheduled_dates IS '每月哪几天发布，JSON数组 [1-31]';
COMMENT ON COLUMN publish_plans.max_runs IS '最大运行次数，0表示无限循环';

-- =============================================

-- 2. 发布任务表（如果不存在则创建）
CREATE TABLE IF NOT EXISTS publish_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36), -- 关联发布计划
  draft_id VARCHAR(36),
  
  -- 任务配置
  task_name VARCHAR(200) NOT NULL,
  task_type VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled, immediate, recurring
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10, 1最高优先级
  
  -- 发布内容
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  
  -- 发布目标
  target_platforms JSONB NOT NULL DEFAULT '[]', -- [{platform, accountId}]
  
  -- 定时配置
  scheduled_at TIMESTAMP WITH TIME ZONE,
  recurring_rule VARCHAR(100), -- cron表达式，用于周期性任务
  
  -- 执行状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, queued, running, completed, failed, cancelled
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100
  total_platforms INTEGER NOT NULL DEFAULT 0,
  published_platforms INTEGER NOT NULL DEFAULT 0,
  failed_platforms INTEGER NOT NULL DEFAULT 0,
  
  -- 执行结果
  results JSONB DEFAULT '[]', -- [{platform, accountId, status, publishedUrl, error, publishedAt}]
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  
  -- 重试配置
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay INTEGER NOT NULL DEFAULT 60, -- 重试延迟（秒）
  
  -- 通知配置
  notify_on_complete BOOLEAN NOT NULL DEFAULT true,
  notify_on_fail BOOLEAN NOT NULL DEFAULT true,
  
  -- 元数据
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 发布任务表索引（如果不存在则创建）
CREATE INDEX IF NOT EXISTS publish_tasks_business_id_idx ON publish_tasks(business_id);
CREATE INDEX IF NOT EXISTS publish_tasks_plan_id_idx ON publish_tasks(plan_id);
CREATE INDEX IF NOT EXISTS publish_tasks_draft_id_idx ON publish_tasks(draft_id);
CREATE INDEX IF NOT EXISTS publish_tasks_status_idx ON publish_tasks(status);
CREATE INDEX IF NOT EXISTS publish_tasks_scheduled_at_idx ON publish_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS publish_tasks_task_type_idx ON publish_tasks(task_type);

-- 发布任务表注释
COMMENT ON TABLE publish_tasks IS '发布任务表 - 管理文章发布任务';
COMMENT ON COLUMN publish_tasks.task_type IS '任务类型: scheduled(定时发布), immediate(立即发布), recurring(周期发布)';
COMMENT ON COLUMN publish_tasks.status IS '任务状态: pending(待执行), queued(排队中), running(执行中), completed(已完成), failed(失败), cancelled(已取消)';
COMMENT ON COLUMN publish_tasks.target_platforms IS '发布目标平台列表，JSON格式: [{platform, accountId, accountName}]';
COMMENT ON COLUMN publish_tasks.results IS '发布结果列表，JSON格式: [{platform, accountId, status, publishedUrl, error, publishedAt}]';
COMMENT ON COLUMN publish_tasks.plan_id IS '关联的发布计划ID，用于追踪计划生成的任务';
