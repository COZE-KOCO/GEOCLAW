-- 发布任务表
-- 用于管理文章自动化发布任务

CREATE TABLE IF NOT EXISTS publish_tasks (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL,
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

-- 创建索引
CREATE INDEX IF NOT EXISTS publish_tasks_business_id_idx ON publish_tasks(business_id);
CREATE INDEX IF NOT EXISTS publish_tasks_draft_id_idx ON publish_tasks(draft_id);
CREATE INDEX IF NOT EXISTS publish_tasks_status_idx ON publish_tasks(status);
CREATE INDEX IF NOT EXISTS publish_tasks_scheduled_at_idx ON publish_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS publish_tasks_task_type_idx ON publish_tasks(task_type);

-- 添加注释
COMMENT ON TABLE publish_tasks IS '发布任务表 - 管理文章自动化发布任务';
COMMENT ON COLUMN publish_tasks.task_type IS '任务类型: scheduled(定时发布), immediate(立即发布), recurring(周期发布)';
COMMENT ON COLUMN publish_tasks.status IS '任务状态: pending(待执行), queued(排队中), running(执行中), completed(已完成), failed(失败), cancelled(已取消)';
COMMENT ON COLUMN publish_tasks.target_platforms IS '发布目标平台列表，JSON格式: [{platform, accountId, accountName}]';
COMMENT ON COLUMN publish_tasks.results IS '发布结果列表，JSON格式: [{platform, accountId, status, publishedUrl, error, publishedAt}]';
