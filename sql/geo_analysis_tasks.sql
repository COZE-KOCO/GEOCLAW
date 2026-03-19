-- GEO分析任务表
CREATE TABLE IF NOT EXISTS geo_analysis_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  
  -- 分析类型和输入
  analysis_type VARCHAR(20) NOT NULL,
  input_text VARCHAR(500) NOT NULL,
  
  -- 分析配置
  competitors JSONB DEFAULT '[]',
  target_brand VARCHAR(200),
  industry VARCHAR(100),
  selected_platforms JSONB DEFAULT '[]' NOT NULL,
  selected_questions JSONB DEFAULT '[]' NOT NULL,
  
  -- 任务状态
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  total_questions INTEGER DEFAULT 0 NOT NULL,
  completed_questions INTEGER DEFAULT 0 NOT NULL,
  error TEXT,
  
  -- 分析结果
  results JSONB DEFAULT '[]',
  
  -- 时间戳
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_business_id_idx ON geo_analysis_tasks(business_id);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_type_idx ON geo_analysis_tasks(analysis_type);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_status_idx ON geo_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS geo_analysis_tasks_created_at_idx ON geo_analysis_tasks(created_at);

-- 添加注释
COMMENT ON TABLE geo_analysis_tasks IS 'GEO分析任务表';
COMMENT ON COLUMN geo_analysis_tasks.analysis_type IS '分析类型: brand, keyword, question';
COMMENT ON COLUMN geo_analysis_tasks.status IS '任务状态: pending, processing, completed, failed';
