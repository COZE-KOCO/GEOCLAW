-- 添加内容发布相关字段
ALTER TABLE geo_projects 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE geo_projects 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- 添加索引以优化公开内容查询
CREATE INDEX IF NOT EXISTS geo_projects_is_public_idx ON geo_projects(is_public);
CREATE INDEX IF NOT EXISTS geo_projects_published_at_idx ON geo_projects(published_at DESC);

-- 添加发布时间约束：只有公开的内容才有发布时间
-- 注意：这个约束在应用层处理，数据库层不强制
