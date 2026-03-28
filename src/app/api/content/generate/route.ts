/**
 * 内容生成 API
 * 
 * POST - 根据配置生成文章内容
 * 
 * 供全自动创作发布调度器调用，执行批量创作的核心生成逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  type GenerationConfig, 
  defaultGenerationConfig,
  validateGenerationConfig,
} from '@/lib/types/generation-config';
import { 
  createContent,
  type ContentCreationRequest,
} from '@/lib/content-generation';
import { 
  processImageMarkers, 
  processStockImages,
  processArticleImages,
  extractImageHeaders,
} from '@/lib/image-generation';
import { selectArticleType, articleTypeMap, articleSizeMap } from './utils';

// 获取关键词
async function getKeywords(
  config: GenerationConfig
): Promise<string[]> {
  const keywords: string[] = [];
  
  switch (config.generateMethod) {
    case 'keyword':
      // 关键词方式：每行一个关键词
      const keywordLines = config.keywords.split('\n').filter(k => k.trim());
      keywords.push(...keywordLines.map(k => k.trim()));
      break;
      
    case 'keyword-library':
      // 关键词库方式：从数据库获取关键词库
      if (config.keywordLibraryId) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('keyword_libraries')
          .select('keywords')
          .eq('id', config.keywordLibraryId)
          .single();
        
        if (data?.keywords) {
          let libKeywords = data.keywords;
          
          // 根据选择模式筛选
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
            // 'all' 不做筛选
          }
          
          keywords.push(...libKeywords.map((k: any) => 
            typeof k === 'string' ? k : k.keyword || k.word
          ));
        }
      }
      break;
      
    case 'title':
      // 标题方式：每行一个标题
      const titleLines = config.keywords.split('\n').filter(t => t.trim());
      keywords.push(...titleLines.map(t => t.trim()));
      break;
      
    case 'description':
      // 描述方式：根据描述生成一个主题
      keywords.push(config.description.trim());
      break;
  }
  
  return keywords;
}

/**
 * POST /api/content/generate
 * 生成文章内容
 * 
 * Body:
 * - businessId: 商家ID
 * - planId: 计划ID（可选，用于创建任务记录）
 * - config: GenerationConfig 或 ruleId
 * - keyword: 指定关键词（可选，覆盖配置中的关键词）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, planId, keyword } = body;
    
    // 获取配置
    let config: GenerationConfig;
    
    if (body.ruleId) {
      // 从规则加载配置
      const supabase = getSupabaseClient();
      const { data: rule, error } = await supabase
        .from('creation_rules')
        .select('config')
        .eq('id', body.ruleId)
        .single();
      
      if (error || !rule) {
        return NextResponse.json(
          { success: false, error: '规则不存在' },
          { status: 404 }
        );
      }
      
      config = { ...defaultGenerationConfig, ...rule.config };
    } else if (body.config) {
      config = { ...defaultGenerationConfig, ...body.config };
    } else {
      return NextResponse.json(
        { success: false, error: '缺少配置或规则ID' },
        { status: 400 }
      );
    }
    
    // 验证配置（严格模式，因为要立即执行生成）
    const validation = validateGenerationConfig(config, true);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      );
    }
    
    // 获取关键词
    let targetKeywords: string[];
    if (keyword) {
      targetKeywords = [keyword];
    } else {
      targetKeywords = await getKeywords(config);
    }
    
    if (targetKeywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可用的关键词' },
        { status: 400 }
      );
    }
    
    // 取第一个关键词生成（批量生成时调度器会多次调用）
    const targetKeyword = targetKeywords[0];
    
    // 根据分布随机选择文章类型
    const selectedArticleType = selectArticleType(config.articleTypeDistribution);
    
    // 处理全文替换
    let processedKeyword = targetKeyword;
    if (config.replacements?.length) {
      for (const rule of config.replacements) {
        processedKeyword = processedKeyword.replace(new RegExp(rule.find, 'g'), rule.replace);
      }
    }
    
    // 构建创作请求 - 传递所有配置
    const creationRequest: ContentCreationRequest = {
      targetModel: 'doubao', // 默认使用豆包
      targetQuestion: processedKeyword,
      articleType: articleTypeMap[selectedArticleType] || 'guide',
      length: articleSizeMap[config.articleSize] || 'long',
      generateMode: 'article',
      tone: config.tone as any || 'professional',
      additionalKeywords: config.contentIncludeKeywords.split('\n').filter(k => k.trim()),
      brandInfo: config.customInstructions,
      
      // 图片设置
      imageSource: config.imageSource,
      imageFilter: config.imageFilter,
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
      replacements: config.replacements,
      enableWebSearch: config.enableWebSearch,
      knowledgeBaseId: config.knowledgeBaseId,
      includeKeywords: config.includeKeywords,
      
      // 图文笔记专属设置
      targetPlatforms: config.targetPlatforms,
      emojiDensity: config.emojiDensity,
      hashtagCount: config.hashtagCount,
      paragraphStyle: config.paragraphStyle,
      enableHook: config.enableHook,
      enableCTA: config.enableCTA,
    };
    
    // 调用内容生成服务
    const result = await createContent(creationRequest);
    
    if (!result?.generated) {
      return NextResponse.json(
        { success: false, error: '内容生成失败' },
        { status: 500 }
      );
    }
    
    // 图片后处理：根据配置处理图片标注
    let finalContent = result.generated.content;
    let coverImageUrl: string | undefined;
    let contentImageUrls: string[] = [];
    
    // 提取请求头用于图片生成 API
    const customHeaders = extractImageHeaders(request.headers);
    
    // 使用统一的图片处理入口
    if (config.imageSource !== 'none') {
      try {
        console.log(`[图片处理] 开始处理，来源: ${config.imageSource}`);
        
        const imageResult = await processArticleImages(result.generated.content, {
          imageSource: config.imageSource,
          businessId: businessId,
          imageFilter: config.imageFilter,
          customHeaders,
          onProgress: (stage, current, total) => {
            console.log(`[图片处理] ${stage}: ${current}/${total}`);
          },
        });
        
        finalContent = imageResult.processedContent;
        
        if (imageResult.coverImage) {
          coverImageUrl = imageResult.coverImage.url;
          console.log('[图片处理] 封面图处理成功');
        }
        
        if (imageResult.contentImages.length > 0) {
          contentImageUrls = imageResult.contentImages.map(img => img.url);
          console.log(`[图片处理] 处理了 ${contentImageUrls.length} 张内容配图`);
        }
        
        // 更新 distillationWords 中的图片信息
        if (coverImageUrl || contentImageUrls.length > 0) {
          result.generated.distillationWords.push(
            `[图片处理] 封面: ${coverImageUrl ? '已处理' : '未处理'}, 配图: ${contentImageUrls.length}张`
          );
        }
      } catch (imageError) {
        console.error('[图片处理] 处理失败:', imageError);
        // 图片处理失败不影响文章保存，继续使用原文内容
      }
    }
    
    const supabase = getSupabaseClient();
    
    // 保存草稿到数据库
    const { data: draft, error: draftError } = await supabase
      .from('content_drafts')
      .insert({
        business_id: businessId,
        title: result.generated.title,
        content: finalContent, // 使用处理后的内容（包含生成的图片）
        distillation_words: result.generated.distillationWords,
        outline: result.generated.outline,
        seo_score: result.generated.seoScore,
        target_model: config.model,
        article_type: selectedArticleType,
        status: 'ready',
      })
      .select()
      .single();
    
    if (draftError) {
      console.error('保存草稿失败:', draftError);
      return NextResponse.json(
        { success: false, error: '保存草稿失败' },
        { status: 500 }
      );
    }
    
    // 如果有 planId，创建创作任务记录
    if (planId) {
      await supabase
        .from('creation_tasks')
        .insert({
          plan_id: planId,
          business_id: businessId,
          status: 'completed',
          params: {
            generateMethod: config.generateMethod,
            keyword: targetKeyword,
            articleType: selectedArticleType,
          },
          result: {
            draftId: draft.id,
            title: result.generated.title,
            content: finalContent,
            seoScore: result.generated.seoScore,
            coverImageUrl,
            contentImageUrls,
          },
          scheduled_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        draftId: draft.id,
        title: result.generated.title,
        content: finalContent,
        seoScore: result.generated.seoScore,
        distillationWords: result.generated.distillationWords,
        coverImageUrl,
        contentImageUrls,
      },
    });
  } catch (error) {
    console.error('内容生成异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
