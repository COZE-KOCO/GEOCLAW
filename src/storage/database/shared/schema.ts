import { pgTable, index, varchar, integer, boolean, timestamp, serial, text, jsonb, decimal } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ==================== 企业/商家表 ====================
export const businesses = pgTable(
  "businesses",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    type: varchar({ length: 20 }).notNull(), // 'store' | 'brand' | 'company' | 'chain'
    industry: varchar({ length: 100 }).notNull(),
    subIndustry: varchar("sub_industry", { length: 100 }),
    description: text("description"),
    logo: varchar({ length: 500 }),
    website: varchar({ length: 500 }),
    
    // 本地商家信息
    address: varchar({ length: 500 }),
    city: varchar({ length: 100 }),
    district: varchar({ length: 100 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    phone: varchar({ length: 50 }),
    businessHours: jsonb("business_hours"),
    
    // 品牌信息
    brandKeywords: jsonb("brand_keywords").default([]),
    targetKeywords: jsonb("target_keywords").default([]),
    
    // 状态
    status: varchar({ length: 20 }).default('active').notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("businesses_type_idx").on(table.type),
    index("businesses_industry_idx").on(table.industry),
    index("businesses_city_idx").on(table.city),
    index("businesses_status_idx").on(table.status),
  ]
);

// ==================== 矩阵账号表 ====================
export const matrixAccounts = pgTable(
  "matrix_accounts",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    platform: varchar({ length: 50 }).notNull(), // zhihu, xiaohongshu, wechat, etc.
    accountName: varchar("account_name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    avatar: varchar({ length: 500 }),
    followers: integer("followers").default(0).notNull(),
    status: varchar({ length: 20 }).default('active').notNull(),
    personaId: varchar("persona_id", { length: 36 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("matrix_accounts_business_id_idx").on(table.businessId),
    index("matrix_accounts_platform_idx").on(table.platform),
    index("matrix_accounts_status_idx").on(table.status),
  ]
);

// ==================== 人设表 ====================
export const personas = pgTable(
  "personas",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    expertise: text("expertise").notNull(),
    tone: varchar({ length: 50 }).notNull(),
    style: varchar({ length: 50 }).notNull(),
    writingStyle: text("writing_style"),
    exampleContent: text("example_content"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("personas_business_id_idx").on(table.businessId),
  ]
);

// ==================== 内容草稿表 ====================
export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    title: varchar({ length: 500 }).notNull(),
    content: text("content").notNull(),
    distillationWords: jsonb("distillation_words").default([]),
    outline: jsonb("outline"),
    seoScore: integer("seo_score").default(0),
    targetModel: varchar("target_model", { length: 50 }),
    articleType: varchar("article_type", { length: 50 }),
    status: varchar({ length: 20 }).default('draft').notNull(), // draft, ready, published
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("content_drafts_business_id_idx").on(table.businessId),
    index("content_drafts_status_idx").on(table.status),
  ]
);

// ==================== 发布记录表 ====================
export const publishRecords = pgTable(
  "publish_records",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    draftId: varchar("draft_id", { length: 36 }).notNull(),
    accountId: varchar("account_id", { length: 36 }).notNull(),
    platform: varchar({ length: 50 }).notNull(),
    status: varchar({ length: 20 }).default('pending').notNull(), // pending, published, failed
    publishedUrl: varchar("published_url", { length: 500 }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("publish_records_draft_id_idx").on(table.draftId),
    index("publish_records_account_id_idx").on(table.accountId),
    index("publish_records_status_idx").on(table.status),
  ]
);

// ==================== 发布计划表 ====================
export const publishPlans = pgTable(
  "publish_plans",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    draftId: varchar("draft_id", { length: 36 }),
    
    // 计划基本信息
    planName: varchar("plan_name", { length: 200 }).notNull(),
    planType: varchar("plan_type", { length: 20 }).default('recurring').notNull(), // once, daily, weekly, monthly, custom
    status: varchar({ length: 20 }).default('active').notNull(), // active, paused, completed, cancelled
    
    // 发布频率配置
    frequency: varchar({ length: 20 }).default('daily').notNull(), // once, hourly, daily, weekly, monthly
    scheduledTime: varchar("scheduled_time", { length: 10 }), // HH:mm 格式，如 "09:30"
    scheduledDays: jsonb("scheduled_days").default([]), // 周几发布 [0-6]，0表示周日
    scheduledDates: jsonb("scheduled_dates").default([]), // 每月哪几天发布 [1-31]
    customCron: varchar("custom_cron", { length: 100 }), // 自定义cron表达式
    
    // 运行次数限制
    maxRuns: integer("max_runs").default(0), // 最大运行次数，0表示无限
    currentRuns: integer("current_runs").default(0).notNull(), // 当前已运行次数
    
    // 时间范围
    startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
    endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
    
    // 发布内容
    title: varchar({ length: 500 }).notNull(),
    content: text("content").notNull(),
    images: jsonb("images").default([]),
    tags: jsonb("tags").default([]),
    
    // 发布目标
    targetPlatforms: jsonb("target_platforms").default([]).notNull(), // [{platform, accountId}]
    
    // 任务配置
    priority: integer().default(5).notNull(), // 1-10
    maxRetries: integer("max_retries").default(3).notNull(),
    retryDelay: integer("retry_delay").default(60).notNull(),
    
    // 通知配置
    notifyOnComplete: boolean("notify_on_complete").default(true).notNull(),
    notifyOnFail: boolean("notify_on_fail").default(true).notNull(),
    
    // 上次和下次执行时间
    lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: 'string' }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: 'string' }),
    
    // 元数据
    metadata: jsonb("metadata").default({}),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("publish_plans_business_id_idx").on(table.businessId),
    index("publish_plans_status_idx").on(table.status),
    index("publish_plans_next_run_at_idx").on(table.nextRunAt),
    index("publish_plans_frequency_idx").on(table.frequency),
  ]
);

// ==================== 发布任务表 ====================
export const publishTasks = pgTable(
  "publish_tasks",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    planId: varchar("plan_id", { length: 36 }), // 关联发布计划
    draftId: varchar("draft_id", { length: 36 }),
    
    // 任务配置
    taskName: varchar("task_name", { length: 200 }).notNull(),
    taskType: varchar("task_type", { length: 20 }).default('scheduled').notNull(), // scheduled, immediate, recurring
    priority: integer().default(5).notNull(), // 1-10, 1最高优先级
    
    // 发布内容
    title: varchar({ length: 500 }).notNull(),
    content: text("content").notNull(),
    images: jsonb("images").default([]),
    tags: jsonb("tags").default([]),
    
    // 发布目标
    targetPlatforms: jsonb("target_platforms").default([]).notNull(), // [{platform, accountId}]
    
    // 定时配置
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }),
    recurringRule: varchar("recurring_rule", { length: 100 }), // cron表达式，用于周期性任务
    
    // 执行状态
    status: varchar({ length: 20 }).default('pending').notNull(), // pending, queued, running, completed, failed, cancelled
    progress: integer().default(0).notNull(), // 0-100
    totalPlatforms: integer("total_platforms").default(0).notNull(),
    publishedPlatforms: integer("published_platforms").default(0).notNull(),
    failedPlatforms: integer("failed_platforms").default(0).notNull(),
    
    // 执行结果
    results: jsonb("results").default([]), // [{platform, accountId, status, publishedUrl, error, publishedAt}]
    startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
    error: text("error"),
    
    // 重试配置
    retryCount: integer("retry_count").default(0).notNull(),
    maxRetries: integer("max_retries").default(3).notNull(),
    retryDelay: integer("retry_delay").default(60).notNull(), // 重试延迟（秒）
    
    // 通知配置
    notifyOnComplete: boolean("notify_on_complete").default(true).notNull(),
    notifyOnFail: boolean("notify_on_fail").default(true).notNull(),
    
    // 元数据
    metadata: jsonb("metadata").default({}),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("publish_tasks_business_id_idx").on(table.businessId),
    index("publish_tasks_plan_id_idx").on(table.planId),
    index("publish_tasks_draft_id_idx").on(table.draftId),
    index("publish_tasks_status_idx").on(table.status),
    index("publish_tasks_scheduled_at_idx").on(table.scheduledAt),
    index("publish_tasks_task_type_idx").on(table.taskType),
  ]
);

// ==================== 原有表（保留） ====================

export const geoCitations = pgTable("geo_citations", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	projectId: varchar("project_id", { length: 36 }).notNull(),
	platform: varchar({ length: 50 }).notNull(),
	query: varchar({ length: 500 }).notNull(),
	position: integer().notNull(),
	cited: boolean().default(false).notNull(),
	sentiment: varchar({ length: 20 }).default('neutral').notNull(),
	date: varchar({ length: 10 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("geo_citations_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("geo_citations_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const geoConversions = pgTable("geo_conversions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	projectId: varchar("project_id", { length: 36 }).notNull(),
	platform: varchar({ length: 50 }).notNull(),
	clicks: integer().default(0).notNull(),
	leads: integer().default(0).notNull(),
	conversions: integer().default(0).notNull(),
	date: varchar({ length: 10 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("geo_conversions_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("geo_conversions_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const geoExposure = pgTable("geo_exposure", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	projectId: varchar("project_id", { length: 36 }).notNull(),
	platform: varchar({ length: 50 }).notNull(),
	impressions: integer().default(0).notNull(),
	reach: integer().default(0).notNull(),
	date: varchar({ length: 10 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("geo_exposure_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("geo_exposure_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const geoProjects = pgTable("geo_projects", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	businessId: varchar("business_id", { length: 36 }),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	author: varchar({ length: 100 }),
	keywords: jsonb().default([]),
	references: jsonb().default([]),
	score: integer().notNull(),
	grade: varchar({ length: 5 }).notNull(),
	breakdown: jsonb().notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	isPublic: boolean("is_public").default(false).notNull(),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("geo_projects_business_id_idx").on(table.businessId),
	index("geo_projects_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("geo_projects_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

// ==================== GEO分析任务表 ====================
export const geoAnalysisTasks = pgTable(
  "geo_analysis_tasks",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }),
    
    // 分析类型和输入
    analysisType: varchar("analysis_type", { length: 20 }).notNull(), // 'brand' | 'keyword' | 'question'
    inputText: varchar("input_text", { length: 500 }).notNull(), // 品牌名/关键词/问题
    
    // 分析配置
    competitors: jsonb("competitors").default([]), // 竞品列表
    targetBrand: varchar("target_brand", { length: 200 }), // 目标品牌（问题分析）
    industry: varchar({ length: 100 }), // 行业
    selectedPlatforms: jsonb("selected_platforms").default([]).notNull(), // 选择的AI平台
    selectedQuestions: jsonb("selected_questions").default([]).notNull(), // 选择的问题列表
    
    // 任务状态
    status: varchar({ length: 20 }).default('pending').notNull(), // pending, processing, completed, failed
    progress: integer("progress").default(0).notNull(), // 0-100
    totalQuestions: integer("total_questions").default(0).notNull(),
    completedQuestions: integer("completed_questions").default(0).notNull(),
    error: text("error"),
    
    // 分析结果
    results: jsonb("results").default([]), // 分析结果数组
    
    // 时间戳
    startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("geo_analysis_tasks_business_id_idx").on(table.businessId),
    index("geo_analysis_tasks_type_idx").on(table.analysisType),
    index("geo_analysis_tasks_status_idx").on(table.status),
    index("geo_analysis_tasks_created_at_idx").on(table.createdAt),
  ]
);

// ==================== GEO分析结果详情表 ====================
export const geoAnalysisResults = pgTable(
  "geo_analysis_results",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    taskId: varchar("task_id", { length: 36 }).notNull(),
    
    // 问题信息
    question: varchar({ length: 500 }).notNull(), // 分析的问题
    category: varchar({ length: 100 }), // 问题分类
    
    // AI平台结果
    platform: varchar({ length: 50 }).notNull(), // AI平台
    
    // 引用分析结果
    cited: boolean().default(false).notNull(), // 是否被引用
    citedBrand: varchar("cited_brand", { length: 200 }), // 引用的品牌
    title: varchar({ length: 500 }), // 引用标题
    url: varchar({ length: 1000 }), // 引用URL
    mediaSource: varchar("media_source", { length: 100 }), // 媒体来源（如携程、知乎等）
    
    // AI回答内容
    rawResponse: text("raw_response"), // AI原始回答
    contentDescription: text("content_description"), // 内容摘要
    
    // 分析指标
    visibility: integer().default(0).notNull(), // 可见度分数 0-100
    sentiment: varchar({ length: 20 }).default('neutral').notNull(), // positive, neutral, negative
    confidence: integer().default(0).notNull(), // 置信度 0-100
    
    // 时间戳
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index("geo_analysis_results_task_id_idx").on(table.taskId),
    index("geo_analysis_results_platform_idx").on(table.platform),
    index("geo_analysis_results_cited_idx").on(table.cited),
  ]
);

// ==================== 创作计划表 ====================
export const creationPlans = pgTable(
  "creation_plans",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    
    // 计划基本信息
    planName: varchar("plan_name", { length: 200 }).notNull(),
    status: varchar({ length: 20 }).default('active').notNull(), // active, paused, completed, cancelled
    
    // 创作频率配置
    frequency: varchar({ length: 20 }).default('daily').notNull(), // daily, weekly, monthly, hourly
    articlesPerRun: integer("articles_per_run").default(1).notNull(),
    scheduledTime: varchar("scheduled_time", { length: 10 }), // HH:mm 格式
    scheduledDays: jsonb("scheduled_days").default([]), // 周几执行 [0-6]
    scheduledDates: jsonb("scheduled_dates").default([]), // 每月哪天执行 [1-31]
    
    // 创作内容配置 - 使用 jsonb 存储完整的 GenerationConfig
    contentConfig: jsonb("content_config").default({}).notNull(),
    
    // 发布配置
    publishConfig: jsonb("publish_config").default({}).notNull(),
    // { autoPublish, publishDelay, targetPlatforms, publishStrategy, publishTimeSlots }
    
    // 运行统计
    totalCreated: integer("total_created").default(0).notNull(),
    totalPublished: integer("total_published").default(0).notNull(),
    successRate: decimal("success_rate", { precision: 5, scale: 2 }).default('0'),
    lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: 'string' }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: 'string' }),
    
    // 时间范围
    startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }),
    endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
    
    // 关键词进度追踪
    lastKeywordIndex: integer("last_keyword_index").default(0),  // 上次执行到第几个关键词
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("creation_plans_business_id_idx").on(table.businessId),
    index("creation_plans_status_idx").on(table.status),
    index("creation_plans_frequency_idx").on(table.frequency),
    index("creation_plans_next_run_at_idx").on(table.nextRunAt),
  ]
);

// ==================== 创作任务表 ====================
export const creationTasks = pgTable(
  "creation_tasks",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    planId: varchar("plan_id", { length: 36 }).notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    
    // 任务状态
    status: varchar({ length: 20 }).default('pending').notNull(), // pending, processing, completed, failed, cancelled
    priority: integer().default(5).notNull(), // 1-10, 1最高优先级
    
    // 创作参数 - 存储 GenerationConfig 的子集
    params: jsonb("params").default({}).notNull(),
    // { generateMethod, keyword, keywords, keywordLibraryId, articleType, ruleConfig }
    
    // 生成结果
    result: jsonb("result"),
    // { draftId, title, content, seoScore, keywords }
    
    // 发布任务关联
    publishTaskId: varchar("publish_task_id", { length: 36 }),
    
    // 执行信息
    scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
    error: text("error"),
    
    // 重试
    retryCount: integer("retry_count").default(0).notNull(),
    maxRetries: integer("max_retries").default(3).notNull(),
    
    // 元数据
    metadata: jsonb("metadata").default({}),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("creation_tasks_plan_id_idx").on(table.planId),
    index("creation_tasks_business_id_idx").on(table.businessId),
    index("creation_tasks_status_idx").on(table.status),
    index("creation_tasks_scheduled_at_idx").on(table.scheduledAt),
    index("creation_tasks_publish_task_id_idx").on(table.publishTaskId),
  ]
);

// ==================== 素材文件夹表 ====================
export const assetFolders = pgTable(
  "asset_folders",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    
    // 文件夹信息
    name: varchar({ length: 200 }).notNull(),
    parentId: varchar("parent_id", { length: 36 }), // 父文件夹ID，支持嵌套
    
    // 元数据
    color: varchar({ length: 20 }), // 文件夹颜色标识
    icon: varchar({ length: 50 }), // 图标
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("asset_folders_business_id_idx").on(table.businessId),
    index("asset_folders_parent_id_idx").on(table.parentId),
  ]
);

// ==================== 素材文件表 ====================
export const assets = pgTable(
  "assets",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    folderId: varchar("folder_id", { length: 36 }),
    
    // 文件信息
    name: varchar({ length: 500 }).notNull(),
    originalName: varchar("original_name", { length: 500 }), // 原始文件名
    type: varchar({ length: 20 }).notNull(), // image, video, audio, document
    mimeType: varchar("mime_type", { length: 100 }),
    size: integer().notNull(), // 文件大小（字节）
    
    // 存储信息
    url: varchar({ length: 1000 }), // 文件URL
    thumbnail: varchar({ length: 1000 }), // 缩略图URL
    storageKey: varchar("storage_key", { length: 500 }), // 存储键
    
    // 元数据
    width: integer(), // 图片/视频宽度
    height: integer(), // 图片/视频高度
    duration: integer(), // 音视频时长（秒）
    
    // 描述和标签
    description: text("description"),
    tags: jsonb("tags").default([]),
    
    // 状态
    status: varchar({ length: 20 }).default('active').notNull(), // active, deleted, processing
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("assets_business_id_idx").on(table.businessId),
    index("assets_folder_id_idx").on(table.folderId),
    index("assets_type_idx").on(table.type),
    index("assets_status_idx").on(table.status),
  ]
);

// ==================== 关键词库表 ====================
export const keywordLibraries = pgTable(
  "keyword_libraries",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    
    // 关键词库信息
    name: varchar({ length: 200 }).notNull(),
    description: text("description"),
    
    // 关键词数据
    keywords: jsonb("keywords").default([]).notNull(),
    
    // 统计
    keywordCount: integer("keyword_count").default(0).notNull(),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("keyword_libraries_business_id_idx").on(table.businessId),
  ]
);

// ==================== 创作规则表 ====================
export const creationRules = pgTable(
  "creation_rules",
  {
    id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
    businessId: varchar("business_id", { length: 36 }).notNull(),
    
    // 规则信息
    name: varchar({ length: 200 }).notNull(),
    description: text("description"),
    type: varchar({ length: 20 }).notNull(), // article, image-text
    
    // 配置 - 存储 GenerationConfig
    config: jsonb("config").default({}).notNull(),
    
    // 使用统计
    useCount: integer("use_count").default(0).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  },
  (table) => [
    index("creation_rules_business_id_idx").on(table.businessId),
    index("creation_rules_type_idx").on(table.type),
  ]
);
