/**
 * 生成计划 API
 * 
 * GET  - 获取生成计划列表
 * POST - 创建生成计划并开始执行
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  type GenerationConfig,
  defaultGenerationConfig,
  validateGenerationConfig,
} from '@/lib/types/generation-config';
import { selectArticleType, articleTypeMap, articleSizeMap } from '../content/generate/utils';
import { createContent, type ContentCreationRequest } from '@/lib/content-generation';

// 获取文章类型分布的映射
function getArticleTypesFromDistribution(
  distribution: GenerationConfig['articleTypeDistribution'],
  count: number
): Array<'what' | 'how' | 'top' | 'normal'> {
  const types: Array<'what' | 'how' | 'top' | 'normal'> = [];
  const weights = [distribution.what, distribution.how, distribution.top, distribution.normal];
  const typeKeys: Array<'what' | 'how' | 'top' | 'normal'> = ['what', 'how', 'top', 'normal'];
  
  // 计算总权重
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  if (totalWeight === 0) {
    // 默认全部常规类型
    return Array(count).fill('normal');
  }
  
  // 按权重分配
  for (let i = 0; i < count; i++) {
    let random = Math.random() * totalWeight;
    for (let j = 0; j < typeKeys.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        types.push(typeKeys[j]);
        break;
      }
    }
    // 兜底
    if (types.length <= i) {
      types.push('normal');
    }
  }
  
  return types;
}

// 获取关键词列表
async function getKeywords(config: GenerationConfig): Promise<string[]> {
  const keywords: string[] = [];
  
  switch (config.generateMethod) {
    case 'keyword':
      const keywordLines = config.keywords.split('\n').filter(k => k.trim());
      keywords.push(...keywordLines.map(k => k.trim()));
      break;
      
    case 'keyword-library':
      if (config.keywordLibraryId) {
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('keyword_libraries')
          .select('keywords')
          .eq('id', config.keywordLibraryId)
          .single();
        
        if (data?.keywords) {
          let libKeywords = data.keywords;
          
          switch (config.keywordSelectMode) {
            case 'top5':
              libKeywords = libKeywords.slice(0, 5);
              break;
            case 'top10':
              libKeywords = libKeywords.slice(0, 10);
              break;
            case 'top20':
              libKeywords = libKeywords.slice(0, 20);
              break;
            case 'top50':
              libKeywords = libKeywords.slice(0, 50);
              break;
            case 'random':
              libKeywords = libKeywords.sort(() => Math.random() - 0.5);
              libKeywords = libKeywords.slice(0, config.keywordCount || 1);
              break;
          }
          
          keywords.push(...libKeywords.map((k: any) => 
            typeof k === 'string' ? k : k.keyword || k.word
          ));
        }
      }
      break;
      
    case 'title':
      const titleLines = config.keywords.split('\n').filter(t => t.trim());
      keywords.push(...titleLines.map(t => t.trim()));
      break;
      
    case 'description':
      keywords.push(config.description.trim());
      break;
  }
  
  return keywords;
}

// 建表 SQL
const CREATE_GENERATION_PLANS_SQL = `
-- 生成计划表（用户触发的批量生成任务）
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

/**
 * GET /api/generation-plans
 * 获取生成计划列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: '缺少 businessId' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generation_plans')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) {
      // 如果表不存在，返回初始化提示
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({
          success: true,
          plans: [],
          needsInit: true,
          sql: CREATE_GENERATION_PLANS_SQL,
          hint: '请在 Supabase 控制台 -> SQL Editor 中执行 SQL 创建表',
        });
      }
      console.error('获取计划列表失败:', error);
      return NextResponse.json(
        { success: false, error: `获取计划列表失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      plans: (data || []).map((plan: any) => ({
        id: plan.id,
        businessId: plan.business_id,
        name: plan.name,
        status: plan.status,
        totalCount: plan.total_count,
        completedCount: plan.completed_count,
        failedCount: plan.failed_count,
        mode: plan.mode,
        createdAt: plan.created_at,
        startedAt: plan.started_at,
        completedAt: plan.completed_at,
        draftIds: plan.draft_ids,
        keywords: plan.keywords,
        config: plan.config,
      })),
    });
  } catch (error) {
    console.error('获取生成计划失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/generation-plans
 * 创建生成计划并开始执行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, config, mode } = body;
    
    if (!businessId) {
      return NextResponse.json(
        { success: false, error: '缺少 businessId' },
        { status: 400 }
      );
    }
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: '缺少配置' },
        { status: 400 }
      );
    }
    
    // 合并配置
    const fullConfig: GenerationConfig = {
      ...defaultGenerationConfig,
      ...config,
    };
    
    // 验证配置
    const validation = validateGenerationConfig(fullConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      );
    }
    
    // 获取关键词
    const keywords = await getKeywords(fullConfig);
    
    if (keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可用的关键词' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // 创建生成计划
    const now = new Date().toISOString();
    const planName = `生成计划 ${new Date().toLocaleString('zh-CN')}`;
    
    const { data: plan, error: planError } = await supabase
      .from('generation_plans')
      .insert({
        business_id: businessId,
        name: planName,
        status: 'processing',
        config: fullConfig,
        total_count: fullConfig.articleCount,
        completed_count: 0,
        failed_count: 0,
        keywords: keywords, // 保存所有关键词，执行时会循环使用
        draft_ids: [],
        created_at: now,
        started_at: now,
        mode: mode || 'article',
      })
      .select()
      .single();
    
    if (planError) {
      console.error('创建计划失败:', planError);
      
      // 如果表不存在，返回建表 SQL
      if (planError.code === '42P01' || planError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          { 
            success: false, 
            error: '数据库表 generation_plans 不存在',
            needsInit: true,
            sql: CREATE_GENERATION_PLANS_SQL,
            hint: '请在 Supabase 控制台 -> SQL Editor 中执行上述 SQL 语句创建表',
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: `创建计划失败: ${planError.message}` },
        { status: 500 }
      );
    }
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: '创建计划失败: 未返回数据' },
        { status: 500 }
      );
    }
    
    // 分配文章类型 - 数量应该与文章数一致
    const articleTypes = getArticleTypesFromDistribution(
      fullConfig.articleTypeDistribution,
      fullConfig.articleCount
    );
    
    // 异步执行生成任务（使用 setTimeout 确保在请求完成后执行）
    // 注意：在生产环境中应该使用消息队列或专门的 worker
    setTimeout(() => {
      executeGenerationTasks(plan.id, businessId, keywords, articleTypes, fullConfig)
        .catch(error => {
          console.error('生成任务执行失败:', error);
        });
    }, 100);
    
    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('创建生成计划失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 执行生成任务（后台执行）
 */
async function executeGenerationTasks(
  planId: string,
  businessId: string,
  keywords: string[],
  articleTypes: Array<'what' | 'how' | 'top' | 'normal'>,
  config: GenerationConfig
) {
  console.log(`[生成任务] 开始执行计划 ${planId}，关键词: ${keywords.join(', ')}, 文章数: ${config.articleCount}`);
  const supabase = getSupabaseClient();
  const draftIds: string[] = [];
  let completedCount = 0;
  let failedCount = 0;
  
  // 使用 articleCount 决定循环次数，关键词不足时循环使用
  const totalCount = config.articleCount;
  
  for (let i = 0; i < totalCount; i++) {
    // 循环使用关键词
    const keyword = keywords[i % keywords.length];
    const articleType = articleTypes[i] || 'normal';
    console.log(`[生成任务] 处理第 ${i + 1}/${totalCount} 篇文章，关键词: ${keyword}，类型: ${articleType}`);
    
    try {
      // 构建创作请求 - 传递所有配置
      const creationRequest: ContentCreationRequest = {
        targetModel: 'doubao',
        targetQuestion: keyword,
        articleType: articleTypeMap[articleType] || 'guide',
        length: articleSizeMap[config.articleSize] || 'long',
        generateMode: 'article',
        tone: config.tone as any || 'professional',
        additionalKeywords: config.contentIncludeKeywords.split('\n').filter(k => k.trim()),
        brandInfo: config.customInstructions,
        
        // 图片设置
        enableThumbnail: config.enableThumbnail,
        enableContentImages: config.enableContentImages,
        imageCount: config.imageCount,
        
        // TOP排行设置
        productName: config.productName,
        productDescription: config.productDescription,
        rankingDisplay: config.rankingDisplay,
        competitors: config.competitors?.split('\n').filter(c => c.trim()),
        
        // 内容格式
        enableBold: config.enableBold,
        enableItalic: config.enableItalic,
        enableTable: config.enableTable,
        enableQuote: config.enableQuote,
        
        // 文章结构
        ctaUrl: config.ctaUrl,
        enableSummary: config.enableSummary,
        enableConclusion: config.enableConclusion,
        enableFaq: config.enableFaq,
        enableAutoTitle: config.enableAutoTitle,
        customTitle: config.customTitle,
        
        // 内部链接
        sitemaps: config.sitemaps,
        internalLinksPerH2: config.internalLinksPerH2,
        
        // 外部链接
        externalLinks: config.externalLinks,
        enableAutoExternalLinks: config.enableAutoExternalLinks,
        
        // 固定开头结尾
        enableFixedIntro: config.enableFixedIntro,
        fixedIntro: config.fixedIntro,
        enableFixedOutro: config.enableFixedOutro,
        fixedOutro: config.fixedOutro,
        
        // 其他
        language: config.language,
        targetCountry: config.targetCountry,
        creativityLevel: config.creativityLevel,
        perspective: config.perspective,
        formality: config.formality,
        personaId: config.personaId,
        replacements: config.replacements,
        enableWebSearch: config.enableWebSearch,
        knowledgeBaseId: config.knowledgeBaseId,
        includeKeywords: config.includeKeywords,
      };
      
      // 调用内容生成服务
      const result = await createContent(creationRequest);
      
      if (result?.generated) {
        // 保存草稿
        const { data: draft } = await supabase
          .from('content_drafts')
          .insert({
            business_id: businessId,
            title: result.generated.title,
            content: result.generated.content,
            distillation_words: result.generated.distillationWords,
            outline: result.generated.outline,
            seo_score: result.generated.seoScore,
            target_model: config.model,
            article_type: articleType,
            status: 'ready',
          })
          .select()
          .single();
        
        if (draft) {
          draftIds.push(draft.id);
          completedCount++;
        } else {
          failedCount++;
        }
      } else {
        failedCount++;
      }
    } catch (error) {
      console.error(`生成关键词 "${keyword}" 失败:`, error);
      failedCount++;
    }
    
    // 更新计划进度
    await supabase
      .from('generation_plans')
      .update({
        completed_count: completedCount,
        failed_count: failedCount,
        draft_ids: draftIds,
      })
      .eq('id', planId);
  }
  
  // 标记计划完成
  await supabase
    .from('generation_plans')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_count: completedCount,
      failed_count: failedCount,
      draft_ids: draftIds,
    })
    .eq('id', planId);
}
