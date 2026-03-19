/**
 * 内容创作API
 * 整合蒸馏词分析与内容生成
 * 支持平台风格适配
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createContent,
  analyzeTargetQuestion,
  generateOutline,
  generateArticle,
  polishContent,
  expandContent,
  type ContentCreationRequest,
  type AIModel,
  type ArticleType,
  type GenerateMode,
} from '@/lib/content-generation';
import { PLATFORM_CONFIGS, CONTENT_FORMAT_NAMES, type ContentType } from '@/lib/platform-config';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 获取支持的配置
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      models: [
        { 
          id: 'doubao', 
          name: '豆包', 
          icon: '🫘',
          iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/doubao-color.png',
          description: '字节跳动旗下AI助手，擅长多模态交互',
          color: '#6366F1'
        },
        { 
          id: 'deepseek', 
          name: 'DeepSeek', 
          icon: '🐋',
          iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/deepseek-color.png',
          description: '深度求索，专注深度探索的AI模型',
          color: '#4D6BFE'
        },
        { 
          id: 'qwen', 
          name: '千问', 
          icon: '💫',
          iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/qwen-color.png',
          description: '阿里巴巴通义千问，多模态大模型',
          color: '#6366F1'
        },
        { 
          id: 'kimi', 
          name: 'Kimi', 
          icon: '🌙',
          iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/kimi-color.png',
          description: '月之暗面出品，擅长长文本处理',
          color: '#8B5CF6'
        },
      ],
      articleTypes: [
        { id: 'technical', name: '技术解析', description: '深入解析技术原理与实践' },
        { id: 'product-review', name: '产品评测', description: '全面评测产品功能与体验' },
        { id: 'industry-insight', name: '行业洞察', description: '分析行业趋势与市场动态' },
        { id: 'guide', name: '实操指南', description: '提供详细的操作步骤与方法' },
        { id: 'comparison', name: '竞品对比', description: '对比分析不同产品或方案' },
        { id: 'case-study', name: '案例分析', description: '深入剖析成功案例' },
        { id: 'faq', name: '常见问题', description: '解答用户常见疑问' },
        { id: 'news', name: '行业资讯', description: '报道行业最新动态' },
      ],
      lengths: [
        { id: 'short', name: '短篇', range: '800-1500字' },
        { id: 'medium', name: '中篇', range: '1500-3000字' },
        { id: 'long', name: '长篇', range: '3000-5000字' },
        { id: 'custom', name: '自定义', placeholder: '请输入字数' },
      ],
      tones: [
        { id: 'professional', name: '专业严谨' },
        { id: 'friendly', name: '亲切易懂' },
        { id: 'academic', name: '学术规范' },
        { id: 'casual', name: '轻松活泼' },
      ],
      // 平台配置
      platforms: Object.values(PLATFORM_CONFIGS).map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        description: p.description,
        supportedFormats: p.supportedFormats.map(f => ({
          id: f,
          name: CONTENT_FORMAT_NAMES[f],
        })),
        defaultFormat: p.defaultFormat,
        features: p.features,
      })),
    },
  });
}

// 创建内容
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetModel,
      targetQuestion,
      articleType,
      length,
      customLength,
      generateMode,
      additionalKeywords,
      tone,
      brandInfo,
      avoidTopics,
      action, // 'create' | 'analyze' | 'outline' | 'article' | 'polish' | 'expand' | 'rewrite'
      content, // 用于润色或扩写或仿写
      distillation, // 用于单独生成文章
      outline, // 用于单独生成文章
      mediaFiles, // 媒体文件
      // 平台相关参数
      targetPlatforms, // 目标发布平台
      contentFormat, // 内容格式
      // 仿写相关参数
      question,
      platform,
      title,
      source,
    } = body;

    // 获取自定义请求头
    const customHeaders: Record<string, string> = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      customHeaders['Authorization'] = authHeader;
    }

    // 构建基础请求对象
    const buildCreationRequest = (): ContentCreationRequest => ({
      targetModel: targetModel as AIModel,
      targetQuestion,
      articleType: (articleType || 'guide') as ArticleType,
      length: length || 'medium',
      customLength,
      generateMode: (generateMode || 'article') as GenerateMode,
      additionalKeywords,
      tone,
      brandInfo,
      avoidTopics,
      mediaFiles,
      targetPlatforms,
      contentFormat: contentFormat as ContentType,
    });

    // 根据不同action处理
    switch (action) {
      case 'analyze': {
        // 仅分析蒸馏词
        if (!targetModel || !targetQuestion) {
          return NextResponse.json(
            { success: false, error: '缺少必要参数' },
            { status: 400 }
          );
        }

        const result = await analyzeTargetQuestion(buildCreationRequest(), customHeaders);

        return NextResponse.json({ success: true, data: result });
      }

      case 'outline': {
        // 生成大纲
        if (!targetModel || !targetQuestion) {
          return NextResponse.json(
            { success: false, error: '缺少必要参数' },
            { status: 400 }
          );
        }

        const creationRequest = buildCreationRequest();
        const distillationResult = await analyzeTargetQuestion(creationRequest, customHeaders);
        const outlineResult = await generateOutline(creationRequest, distillationResult, customHeaders);

        return NextResponse.json({
          success: true,
          data: {
            distillation: distillationResult,
            outline: outlineResult,
          },
        });
      }

      case 'article': {
        // 基于大纲生成文章
        if (!distillation || !outline || !targetModel || !targetQuestion) {
          return NextResponse.json(
            { success: false, error: '缺少必要参数' },
            { status: 400 }
          );
        }

        const result = await generateArticle(buildCreationRequest(), distillation, outline, customHeaders);

        return NextResponse.json({ success: true, data: result });
      }

      case 'polish': {
        // 内容润色
        if (!content) {
          return NextResponse.json(
            { success: false, error: '缺少内容' },
            { status: 400 }
          );
        }

        const result = await polishContent(
          content,
          { tone, focusKeywords: additionalKeywords },
          customHeaders
        );

        return NextResponse.json({ success: true, data: { content: result } });
      }

      case 'expand': {
        // 内容扩写
        if (!content) {
          return NextResponse.json(
            { success: false, error: '缺少内容' },
            { status: 400 }
          );
        }

        const result = await expandContent(
          content,
          customLength || 2000,
          additionalKeywords,
          customHeaders
        );

        return NextResponse.json({ success: true, data: { content: result } });
      }

      case 'rewrite': {
        // 仿写功能：基于原始内容生成新内容
        if (!content) {
          return NextResponse.json(
            { success: false, error: '缺少原始内容' },
            { status: 400 }
          );
        }

        // 构建品牌信息提示
        let brandPrompt = '';
        if (brandInfo) {
          const { brandName, companyName, storeName, industry, location, contact, website, features } = brandInfo;
          const infoParts = [];
          if (brandName) infoParts.push(`品牌名称：${brandName}`);
          if (companyName) infoParts.push(`公司名称：${companyName}`);
          if (storeName) infoParts.push(`店名：${storeName}`);
          if (industry) infoParts.push(`行业：${industry}`);
          if (location) infoParts.push(`地区：${location}`);
          if (contact) infoParts.push(`联系方式：${contact}`);
          if (website) infoParts.push(`官网：${website}`);
          if (features) infoParts.push(`特色卖点：${features}`);
          
          if (infoParts.length > 0) {
            brandPrompt = `\n\n品牌基本信息：\n${infoParts.join('\n')}\n\n重要：请在内容中自然融入上述品牌信息，确保内容与品牌紧密关联。`;
          }
        }

        // 使用流式响应
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const prompt = `你是一位专业的内容创作者。请基于以下引用资料，创作一篇新的、原创的内容。
${brandPrompt}
要求：
1. 保持核心信息准确，但用不同的表达方式
2. 内容结构清晰，逻辑连贯
3. 语言流畅自然，避免直接复制原文
4. 适当扩展和补充相关信息
5. ${brandInfo && (brandInfo.brandName || brandInfo.companyName || brandInfo.storeName) ? '自然融入品牌信息，但不要过度营销，保持内容的专业性和可读性' : '保持内容客观专业'}

原始问题：${question || '无'}
来源平台：${platform || '未知'}

原始引用资料：
标题：${title || '无标题'}
来源：${source || '未知来源'}
内容摘要：
${content}

请直接输出创作的新内容，不要添加任何前言或解释：`;

              const config = new Config();
              const llmClient = new LLMClient(config, customHeaders);
              
              const response = await llmClient.invoke([
                {
                  role: 'user',
                  content: prompt,
                },
              ], { 
                model: 'doubao-seed-2-0-pro-260215',
                temperature: 0.7 
              });

              controller.enqueue(encoder.encode(response.content));
              controller.close();
            } catch (error) {
              console.error('仿写生成失败:', error);
              controller.enqueue(encoder.encode('\n\n[生成失败，请重试]'));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Transfer-Encoding': 'chunked',
          },
        });
      }

      case 'create':
      default: {
        // 完整创作流程
        if (!targetModel || !targetQuestion) {
          return NextResponse.json(
            { success: false, error: '缺少必要参数' },
            { status: 400 }
          );
        }

        const result = await createContent(buildCreationRequest(), customHeaders);

        return NextResponse.json({ success: true, data: result });
      }
    }
  } catch (error) {
    console.error('内容创作失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '内容创作失败' },
      { status: 500 }
    );
  }
}
