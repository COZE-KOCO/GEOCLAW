/**
 * AI 图片生成服务
 * 用于解析文章中的图片标注并生成实际图片
 * 支持三种图片来源：AI生图、素材库、本地上传
 */

import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getAssetsByBusiness, type Asset } from './asset-store';

// 图片标注类型
export interface ImageMarker {
  type: 'cover' | 'content';      // 封面图或内容配图
  description: string;            // 图片描述
  fullMatch: string;              // 完整匹配文本
  index: number;                  // 在文本中的位置
}

// 生成的图片结果
export interface GeneratedImage {
  type: 'cover' | 'content';
  description: string;
  url: string;                    // 图片 URL
  originalMarker: string;         // 原始标注文本
}

// 图片生成结果
export interface ImageGenerationResult {
  coverImage?: GeneratedImage;    // 封面图
  contentImages: GeneratedImage[]; // 内容配图
  processedContent: string;       // 替换后的文章内容
}

/**
 * 解析文章中的图片标注
 * 支持格式：
 * - 【封面图】描述内容
 * - 【配图】描述内容
 */
export function parseImageMarkers(content: string): ImageMarker[] {
  const markers: ImageMarker[] = [];
  
  // 匹配封面图标注
  const coverRegex = /【封面图】([^【\]]+)/g;
  let match;
  while ((match = coverRegex.exec(content)) !== null) {
    markers.push({
      type: 'cover',
      description: match[1].trim(),
      fullMatch: match[0],
      index: match.index,
    });
  }
  
  // 匹配内容配图标注
  const contentRegex = /【配图】([^【\]]+)/g;
  while ((match = contentRegex.exec(content)) !== null) {
    markers.push({
      type: 'content',
      description: match[1].trim(),
      fullMatch: match[0],
      index: match.index,
    });
  }
  
  // 按位置排序
  markers.sort((a, b) => a.index - b.index);
  
  return markers;
}

/**
 * 生成单张图片
 */
export async function generateSingleImage(
  prompt: string,
  options?: {
    size?: '2K' | '4K' | string;
    customHeaders?: Record<string, string>;
  }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config, options?.customHeaders);

    const response = await client.generate({
      prompt,
      size: options?.size || '2K',
    });

    const helper = client.getResponseHelper(response);

    if (helper.success && helper.imageUrls.length > 0) {
      return { success: true, url: helper.imageUrls[0] };
    } else {
      return { 
        success: false, 
        error: helper.errorMessages.join('; ') || '图片生成失败' 
      };
    }
  } catch (error) {
    console.error('图片生成错误:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '图片生成异常' 
    };
  }
}

/**
 * 批量生成图片
 * 自动控制并发数，避免速率限制
 */
export async function batchGenerateImages(
  prompts: string[],
  options?: {
    size?: '2K' | '4K' | string;
    customHeaders?: Record<string, string>;
    maxConcurrent?: number;
    onProgress?: (current: number, total: number) => void;
  }
): Promise<Array<{ success: boolean; url?: string; error?: string }>> {
  const maxConcurrent = options?.maxConcurrent || 2;
  const results: Array<{ success: boolean; url?: string; error?: string }> = [];
  
  const config = new Config();
  const client = new ImageGenerationClient(config, options?.customHeaders);

  // 分批处理
  for (let i = 0; i < prompts.length; i += maxConcurrent) {
    const batch = prompts.slice(i, i + maxConcurrent);
    const batchRequests = batch.map(prompt => ({ 
      prompt, 
      size: options?.size || '2K' 
    }));
    
    try {
      const batchResults = await client.batchGenerate(batchRequests);
      
      batchResults.forEach((response, j) => {
        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          results.push({ success: true, url: helper.imageUrls[0] });
        } else {
          results.push({ 
            success: false, 
            error: helper.errorMessages.join('; ') || '图片生成失败' 
          });
        }
      });
    } catch (error) {
      // 批量失败时，单个标记为失败
      batch.forEach(() => {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : '批量生成异常' 
        });
      });
    }
    
    // 进度回调
    if (options?.onProgress) {
      options.onProgress(Math.min(i + maxConcurrent, prompts.length), prompts.length);
    }
  }

  return results;
}

/**
 * 处理文章中的图片标注，生成实际图片并替换
 */
export async function processImageMarkers(
  content: string,
  options?: {
    customHeaders?: Record<string, string>;
    onProgress?: (stage: string, current: number, total: number) => void;
  }
): Promise<ImageGenerationResult> {
  const markers = parseImageMarkers(content);
  
  const result: ImageGenerationResult = {
    contentImages: [],
    processedContent: content,
  };

  if (markers.length === 0) {
    return result;
  }

  // 分离封面图和内容配图
  const coverMarker = markers.find(m => m.type === 'cover');
  const contentMarkers = markers.filter(m => m.type === 'content');

  // 生成图片
  const allPrompts = markers.map(m => m.description);
  const promptToMarker = new Map(markers.map((m, i) => [allPrompts[i], m]));

  let generatedCount = 0;
  const totalImages = markers.length;

  if (options?.onProgress) {
    options.onProgress('生成图片中', 0, totalImages);
  }

  const imageResults = await batchGenerateImages(allPrompts, {
    customHeaders: options?.customHeaders,
    maxConcurrent: 2,
    onProgress: (current, total) => {
      generatedCount = current;
      if (options?.onProgress) {
        options.onProgress('生成图片中', current, total);
      }
    },
  });

  // 处理生成结果
  const generatedImages: GeneratedImage[] = [];
  
  markers.forEach((marker, index) => {
    const imageResult = imageResults[index];
    
    if (imageResult.success && imageResult.url) {
      const generatedImage: GeneratedImage = {
        type: marker.type,
        description: marker.description,
        url: imageResult.url,
        originalMarker: marker.fullMatch,
      };
      
      generatedImages.push(generatedImage);
      
      if (marker.type === 'cover') {
        result.coverImage = generatedImage;
      } else {
        result.contentImages.push(generatedImage);
      }
    }
  });

  // 替换文章中的标注为实际图片
  let processedContent = content;
  
  // 从后向前替换，避免位置偏移问题
  const sortedImages = [...generatedImages].sort((a, b) => {
    const indexA = content.indexOf(a.originalMarker);
    const indexB = content.indexOf(b.originalMarker);
    return indexB - indexA;
  });

  for (const image of sortedImages) {
    const imageMarkdown = image.type === 'cover'
      ? `\n\n![封面图](${image.url})\n\n`
      : `\n\n![${image.description}](${image.url})\n\n`;
    
    processedContent = processedContent.replace(image.originalMarker, imageMarkdown);
  }

  result.processedContent = processedContent;

  if (options?.onProgress) {
    options.onProgress('完成', totalImages, totalImages);
  }

  return result;
}

/**
 * 从请求头提取转发头信息
 */
export function extractImageHeaders(headers: Headers): Record<string, string> {
  return HeaderUtils.extractForwardHeaders(headers);
}

// ==================== 素材库图片匹配 ====================

/**
 * 根据描述匹配素材库图片
 * 使用简单的关键词匹配算法
 */
function matchAssetByDescription(description: string, assets: Asset[]): Asset | null {
  if (!assets.length) return null;
  
  // 提取描述中的关键词
  const keywords = description
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(k => k.length > 1);
  
  if (keywords.length === 0) {
    // 没有关键词时随机返回一张图片
    return assets[Math.floor(Math.random() * assets.length)];
  }
  
  // 计算每张素材的匹配分数
  const scoredAssets = assets.map(asset => {
    let score = 0;
    const assetName = (asset.name || '').toLowerCase();
    const assetDesc = (asset.description || '').toLowerCase();
    const assetTags = (asset.tags || []).join(' ').toLowerCase();
    const searchText = `${assetName} ${assetDesc} ${assetTags}`;
    
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score += 10;
      }
      // 完全匹配加分
      if (assetName.includes(keyword) || assetTags.includes(keyword)) {
        score += 5;
      }
    }
    
    return { asset, score };
  });
  
  // 按分数排序
  scoredAssets.sort((a, b) => b.score - a.score);
  
  // 如果最高分大于0，返回匹配度最高的
  if (scoredAssets[0].score > 0) {
    return scoredAssets[0].asset;
  }
  
  // 否则随机返回一张
  return assets[Math.floor(Math.random() * assets.length)];
}

/**
 * 处理素材库图片匹配
 * 从素材库中选择匹配的图片替换标注
 */
export async function processStockImages(
  content: string,
  businessId: string,
  options?: {
    imageFilter?: string; // 图片类型过滤
    onProgress?: (stage: string, current: number, total: number) => void;
  }
): Promise<ImageGenerationResult> {
  const markers = parseImageMarkers(content);
  
  const result: ImageGenerationResult = {
    contentImages: [],
    processedContent: content,
  };

  if (markers.length === 0) {
    return result;
  }

  // 获取素材库中的图片
  const assets = await getAssetsByBusiness(businessId, {
    type: 'image',
    status: 'active',
    limit: 100,
  });

  if (assets.length === 0) {
    console.warn('[素材库匹配] 没有可用的图片素材');
    // 移除图片标注，避免发布时出现原始文本
    let cleanedContent = content;
    for (const marker of markers) {
      cleanedContent = cleanedContent.replace(marker.fullMatch, '');
    }
    result.processedContent = cleanedContent;
    return result;
  }

  // 根据过滤条件筛选图片
  let filteredAssets = assets;
  if (options?.imageFilter && options.imageFilter !== 'all') {
    // 这里可以根据 imageFilter 做更细致的筛选
    // 目前简单处理，保留所有图片
  }

  if (options?.onProgress) {
    options.onProgress('匹配图片中', 0, markers.length);
  }

  // 为每个标注匹配图片
  const generatedImages: GeneratedImage[] = [];
  const usedAssets = new Set<string>(); // 避免重复使用同一张图片

  for (let i = 0; i < markers.length; i++) {
    const marker = markers[i];
    
    // 从未使用的图片中选择
    const availableAssets = filteredAssets.filter(a => !usedAssets.has(a.id));
    if (availableAssets.length === 0) {
      // 如果所有图片都用过了，重置可用列表
      usedAssets.clear();
    }
    
    const matchedAsset = matchAssetByDescription(
      marker.description,
      availableAssets.length > 0 ? availableAssets : filteredAssets
    );
    
    if (matchedAsset && matchedAsset.url) {
      usedAssets.add(matchedAsset.id);
      
      const generatedImage: GeneratedImage = {
        type: marker.type,
        description: marker.description,
        url: matchedAsset.url,
        originalMarker: marker.fullMatch,
      };
      
      generatedImages.push(generatedImage);
      
      if (marker.type === 'cover') {
        result.coverImage = generatedImage;
      } else {
        result.contentImages.push(generatedImage);
      }
    }
    
    if (options?.onProgress) {
      options.onProgress('匹配图片中', i + 1, markers.length);
    }
  }

  // 替换文章中的标注为实际图片
  let processedContent = content;
  
  // 从后向前替换，避免位置偏移问题
  const sortedImages = [...generatedImages].sort((a, b) => {
    const indexA = content.indexOf(a.originalMarker);
    const indexB = content.indexOf(b.originalMarker);
    return indexB - indexA;
  });

  for (const image of sortedImages) {
    const imageMarkdown = image.type === 'cover'
      ? `\n\n![封面图](${image.url})\n\n`
      : `\n\n![${image.description}](${image.url})\n\n`;
    
    processedContent = processedContent.replace(image.originalMarker, imageMarkdown);
  }

  // 移除未能匹配的标注
  for (const marker of markers) {
    if (!generatedImages.find(img => img.originalMarker === marker.fullMatch)) {
      processedContent = processedContent.replace(marker.fullMatch, '');
    }
  }

  result.processedContent = processedContent;

  if (options?.onProgress) {
    options.onProgress('完成', markers.length, markers.length);
  }

  return result;
}

/**
 * 统一的图片处理入口
 * 根据 imageSource 类型自动选择处理方式
 */
export async function processArticleImages(
  content: string,
  options: {
    imageSource: 'ai' | 'stock' | 'upload' | 'none';
    businessId?: string;
    imageFilter?: string;
    customHeaders?: Record<string, string>;
    onProgress?: (stage: string, current: number, total: number) => void;
  }
): Promise<ImageGenerationResult> {
  const markers = parseImageMarkers(content);
  
  // 没有图片标注或不需要处理
  if (markers.length === 0 || options.imageSource === 'none') {
    return {
      contentImages: [],
      processedContent: content,
    };
  }

  switch (options.imageSource) {
    case 'ai':
      return processImageMarkers(content, {
        customHeaders: options.customHeaders,
        onProgress: options.onProgress,
      });
    
    case 'stock':
      if (!options.businessId) {
        console.warn('[图片处理] 素材库模式需要提供 businessId');
        return {
          contentImages: [],
          processedContent: content,
        };
      }
      return processStockImages(content, options.businessId, {
        imageFilter: options.imageFilter,
        onProgress: options.onProgress,
      });
    
    case 'upload':
      // 本地上传模式：暂时移除标注
      // TODO: 实现从已上传图片中选择的功能
      console.log('[图片处理] 本地上传模式暂不支持自动匹配');
      let cleanedContent = content;
      for (const marker of markers) {
        cleanedContent = cleanedContent.replace(marker.fullMatch, '');
      }
      return {
        contentImages: [],
        processedContent: cleanedContent,
      };
    
    default:
      return {
        contentImages: [],
        processedContent: content,
      };
  }
}
