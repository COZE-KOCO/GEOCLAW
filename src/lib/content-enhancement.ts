/**
 * 内容增强服务
 * 
 * 提供联网搜索、知识库搜索、站点地图抓取等功能
 * 用于增强AI生成内容的质量和准确性
 */

import { SearchClient, Config as SearchConfig, HeaderUtils } from 'coze-coding-dev-sdk';
import { KnowledgeClient, Config as KnowledgeConfig, DataSourceType } from 'coze-coding-dev-sdk';

// ==================== 类型定义 ====================

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  siteName?: string;
  publishTime?: string;
}

export interface KnowledgeSearchResult {
  content: string;
  score: number;
  docId?: string;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface EnhancementContext {
  keyword: string;
  enableWebSearch?: boolean;
  knowledgeBaseId?: string;
  enableAutoExternalLinks?: boolean;
  customHeaders?: Record<string, string>;
}

export interface EnhancementResult {
  webSearchResults: WebSearchResult[];
  knowledgeResults: KnowledgeSearchResult[];
  internalLinks: SitemapUrl[];
  externalLinks: { url: string; anchor: string }[];
  contextSummary: string;
}

/**
 * 内容增强配置
 */
export interface ContentEnhancementConfig {
  enableWebSearch?: boolean;
  enableKnowledgeBase?: boolean;
  knowledgeBaseId?: string;
  sitemapUrl?: string;
  targetDomain?: string;
}

/**
 * 内容增强服务类
 */
export class ContentEnhancementService {
  private customHeaders?: Record<string, string>;

  constructor(customHeaders?: Record<string, string>) {
    this.customHeaders = customHeaders;
  }

  /**
   * 执行内容增强
   */
  async enhanceContent(
    query: string,
    keywords: string[],
    config: ContentEnhancementConfig
  ): Promise<{
    enhancedContext: string;
    webSearchResult?: { query: string; results: WebSearchResult[] };
    knowledgeResult?: { query: string; results: KnowledgeSearchResult[] };
    sitemapUrls?: SitemapUrl[];
    externalLinks?: { url: string; title: string }[];
  }> {
    const parts: string[] = [];
    let webSearchResult: { query: string; results: WebSearchResult[] } | undefined;
    let knowledgeResult: { query: string; results: KnowledgeSearchResult[] } | undefined;
    let sitemapUrls: SitemapUrl[] | undefined;
    const externalLinks: { url: string; title: string }[] = [];

    // 1. 联网搜索
    if (config.enableWebSearch) {
      const results = await performWebSearch(query, { customHeaders: this.customHeaders });
      if (results.length > 0) {
        webSearchResult = { query, results };
        parts.push('\n【最新资讯参考】以下是从网络获取的最新相关信息，请在文章中适当引用：');
        results.slice(0, 3).forEach((item, i) => {
          parts.push(`${i + 1}. ${item.title}: ${item.snippet}`);
          parts.push(`   来源: ${item.siteName || '网络'} - ${item.url}`);
        });
      }
    }

    // 2. 知识库搜索
    if (config.enableKnowledgeBase && config.knowledgeBaseId) {
      const results = await searchKnowledgeBase(query, {
        tableNames: [config.knowledgeBaseId],
        topK: 5,
        customHeaders: this.customHeaders,
      });
      if (results.length > 0) {
        knowledgeResult = { query, results };
        parts.push('\n【知识库参考】以下是从知识库检索的相关内容，请作为写作素材：');
        results.slice(0, 3).forEach((item, i) => {
          parts.push(`${i + 1}. [相关度: ${(item.score * 100).toFixed(0)}%] ${item.content.slice(0, 200)}...`);
        });
      }
    }

    // 3. 站点地图抓取
    if (config.sitemapUrl) {
      const urls = await fetchSitemap(config.sitemapUrl);
      if (urls.length > 0) {
        sitemapUrls = urls;
        parts.push(`\n【站点链接】已抓取 ${urls.length} 个站内链接可供引用`);
      }
    }

    return {
      enhancedContext: parts.join('\n'),
      webSearchResult,
      knowledgeResult,
      sitemapUrls,
      externalLinks,
    };
  }
}

// ==================== 联网搜索 ====================

/**
 * 执行联网搜索
 * 
 * @param query 搜索关键词
 * @param options 搜索选项
 * @returns 搜索结果
 */
export async function performWebSearch(
  query: string,
  options?: {
    count?: number;
    timeRange?: string;
    sites?: string;
    customHeaders?: Record<string, string>;
  }
): Promise<WebSearchResult[]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config, options?.customHeaders);
    
    const response = await client.advancedSearch(query, {
      searchType: 'web',
      count: options?.count || 5,
      timeRange: options?.timeRange,
      sites: options?.sites,
      needSummary: false,
    });
    
    if (!response.web_items || response.web_items.length === 0) {
      return [];
    }
    
    return response.web_items.map(item => ({
      title: item.title || '',
      url: item.url || '',
      snippet: item.snippet || '',
      siteName: item.site_name,
      publishTime: item.publish_time,
    }));
  } catch (error) {
    console.error('[WebSearch] 搜索失败:', error);
    return [];
  }
}

/**
 * 搜索权威来源（用于自动外部链接）
 * 
 * @param keyword 关键词
 * @param customHeaders 自定义请求头
 * @returns 权威来源链接
 */
export async function searchAuthoritativeSources(
  keyword: string,
  customHeaders?: Record<string, string>
): Promise<{ url: string; anchor: string }[]> {
  try {
    const config = new SearchConfig();
    const client = new SearchClient(config, customHeaders);
    
    // 搜索权威来源：.gov、.edu、行业报告等
    const response = await client.advancedSearch(keyword, {
      searchType: 'web',
      count: 5,
      needSummary: false,
      // 优先搜索权威站点
      sites: '.gov,.edu,wikipedia.org',
    });
    
    if (!response.web_items || response.web_items.length === 0) {
      // 如果没有找到权威来源，尝试普通搜索
      const fallbackResponse = await client.webSearch(keyword, 5, false);
      if (!fallbackResponse.web_items || fallbackResponse.web_items.length === 0) {
        return [];
      }
      return fallbackResponse.web_items.map(item => ({
        url: item.url || '',
        anchor: item.title || keyword,
      }));
    }
    
    return response.web_items.map(item => ({
      url: item.url || '',
      anchor: item.title || keyword,
    }));
  } catch (error) {
    console.error('[WebSearch] 搜索权威来源失败:', error);
    return [];
  }
}

// ==================== 知识库搜索 ====================

/**
 * 在知识库中搜索相关内容
 * 
 * @param query 搜索查询
 * @param options 搜索选项
 * @returns 搜索结果
 */
export async function searchKnowledgeBase(
  query: string,
  options?: {
    tableNames?: string[];
    topK?: number;
    minScore?: number;
    customHeaders?: Record<string, string>;
  }
): Promise<KnowledgeSearchResult[]> {
  try {
    const config = new KnowledgeConfig();
    const client = new KnowledgeClient(config, options?.customHeaders);
    
    const response = await client.search(
      query,
      options?.tableNames,
      options?.topK || 5,
      options?.minScore || 0.5
    );
    
    if (response.code !== 0 || !response.chunks) {
      console.error('[KnowledgeSearch] 搜索失败:', response.msg);
      return [];
    }
    
    return response.chunks.map(chunk => ({
      content: chunk.content,
      score: chunk.score,
      docId: chunk.doc_id,
    }));
  } catch (error) {
    console.error('[KnowledgeSearch] 搜索异常:', error);
    return [];
  }
}

// ==================== 站点地图抓取 ====================

/**
 * 抓取并解析站点地图
 * 
 * @param sitemapUrl 站点地图URL
 * @returns URL列表
 */
export async function fetchSitemap(sitemapUrl: string): Promise<SitemapUrl[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GEO-Bot/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[Sitemap] 获取失败: ${response.status} ${sitemapUrl}`);
      return [];
    }
    
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    if (contentType.includes('application/json') || text.trim().startsWith('{')) {
      // JSON 格式的站点地图
      return parseJsonSitemap(text);
    } else if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.trim().startsWith('<urlset')) {
      // XML 格式的站点地图
      return await parseXmlSitemap(text);
    } else {
      // 尝试解析为文本格式（每行一个URL）
      return parseTextSitemap(text);
    }
  } catch (error) {
    console.error(`[Sitemap] 抓取异常: ${sitemapUrl}`, error);
    return [];
  }
}

/**
 * 解析 XML 站点地图
 */
async function parseXmlSitemap(xml: string): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  
  try {
    // 简单的 XML 解析（不依赖外部库）
    const urlMatches = xml.matchAll(/<url>([\s\S]*?)<\/url>/g);
    
    for (const match of urlMatches) {
      const urlBlock = match[1];
      
      const locMatch = urlBlock.match(/<loc>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/);
      const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
      const changefreqMatch = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/);
      const priorityMatch = urlBlock.match(/<priority>(.*?)<\/priority>/);
      
      if (locMatch) {
        urls.push({
          loc: locMatch[1].trim(),
          lastmod: lastmodMatch?.[1]?.trim(),
          changefreq: changefreqMatch?.[1]?.trim(),
          priority: priorityMatch ? parseFloat(priorityMatch[1]) : undefined,
        });
      }
    }
    
    // 处理 sitemap index（嵌套站点地图）
    const sitemapMatches = xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g);
    for (const match of sitemapMatches) {
      const locMatch = match[1].match(/<loc>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/);
      if (locMatch) {
        // 递归获取子站点地图
        const childUrls = await fetchSitemap(locMatch[1].trim());
        urls.push(...childUrls);
      }
    }
  } catch (error) {
    console.error('[Sitemap] XML解析失败:', error);
  }
  
  return urls;
}

/**
 * 解析 JSON 站点地图
 */
function parseJsonSitemap(json: string): SitemapUrl[] {
  try {
    const data = JSON.parse(json);
    const urls: SitemapUrl[] = [];
    
    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'string') {
          urls.push({ loc: item });
        } else if (item.url || item.loc) {
          urls.push({
            loc: item.url || item.loc,
            lastmod: item.lastmod || item.lastModified,
            changefreq: item.changefreq || item.changeFrequency,
            priority: item.priority,
          });
        }
      }
    } else if (data.urls && Array.isArray(data.urls)) {
      for (const item of data.urls) {
        urls.push({
          loc: item.url || item.loc,
          lastmod: item.lastmod || item.lastModified,
          changefreq: item.changefreq || item.changeFrequency,
          priority: item.priority,
        });
      }
    }
    
    return urls;
  } catch (error) {
    console.error('[Sitemap] JSON解析失败:', error);
    return [];
  }
}

/**
 * 解析文本格式站点地图
 */
function parseTextSitemap(text: string): SitemapUrl[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http://') || line.startsWith('https://'))
    .map(url => ({ loc: url }));
}

/**
 * 根据过滤条件过滤站点地图URL
 */
export function filterSitemapUrls(
  urls: SitemapUrl[],
  options?: {
    filterMode?: string;  // 包含模式
    excludeMode?: string; // 排除模式
    limit?: number;       // 最大数量
  }
): SitemapUrl[] {
  let filtered = urls;
  
  // 应用包含过滤
  if (options?.filterMode && options.filterMode.trim()) {
    const patterns = options.filterMode.split(',').map(p => p.trim()).filter(Boolean);
    filtered = filtered.filter(url => 
      patterns.some(pattern => url.loc.includes(pattern))
    );
  }
  
  // 应用排除过滤
  if (options?.excludeMode && options.excludeMode.trim()) {
    const patterns = options.excludeMode.split(',').map(p => p.trim()).filter(Boolean);
    filtered = filtered.filter(url => 
      !patterns.some(pattern => url.loc.includes(pattern))
    );
  }
  
  // 限制数量
  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

// ==================== 综合增强 ====================

/**
 * 为内容生成执行综合增强
 * 
 * @param context 增强上下文
 * @returns 增强结果
 */
export async function enhanceContent(
  context: EnhancementContext
): Promise<EnhancementResult> {
  const {
    keyword,
    enableWebSearch,
    knowledgeBaseId,
    enableAutoExternalLinks,
    customHeaders,
  } = context;
  
  const result: EnhancementResult = {
    webSearchResults: [],
    knowledgeResults: [],
    internalLinks: [],
    externalLinks: [],
    contextSummary: '',
  };
  
  // 并行执行所有增强操作
  const promises: Promise<void>[] = [];
  
  // 1. 联网搜索
  if (enableWebSearch) {
    promises.push(
      performWebSearch(keyword, { count: 5, customHeaders }).then(results => {
        result.webSearchResults = results;
      })
    );
  }
  
  // 2. 知识库搜索
  if (knowledgeBaseId) {
    promises.push(
      searchKnowledgeBase(keyword, {
        tableNames: [knowledgeBaseId],
        topK: 5,
        customHeaders,
      }).then(results => {
        result.knowledgeResults = results;
      })
    );
  }
  
  // 3. 自动外部链接搜索
  if (enableAutoExternalLinks) {
    promises.push(
      searchAuthoritativeSources(keyword, customHeaders).then(links => {
        result.externalLinks = links;
      })
    );
  }
  
  // 等待所有操作完成
  await Promise.all(promises);
  
  // 生成上下文摘要
  const summaryParts: string[] = [];
  
  if (result.webSearchResults.length > 0) {
    summaryParts.push(`【联网搜索结果】找到 ${result.webSearchResults.length} 条相关信息`);
    result.webSearchResults.forEach((item, i) => {
      summaryParts.push(`${i + 1}. ${item.title}: ${item.snippet.slice(0, 100)}...`);
    });
  }
  
  if (result.knowledgeResults.length > 0) {
    summaryParts.push(`【知识库搜索结果】找到 ${result.knowledgeResults.length} 条相关内容`);
    result.knowledgeResults.forEach((item, i) => {
      summaryParts.push(`${i + 1}. [相关度: ${(item.score * 100).toFixed(0)}%] ${item.content.slice(0, 100)}...`);
    });
  }
  
  if (result.externalLinks.length > 0) {
    summaryParts.push(`【权威来源链接】找到 ${result.externalLinks.length} 个可引用来源`);
  }
  
  result.contextSummary = summaryParts.join('\n');
  
  return result;
}

/**
 * 生成增强后的 Prompt 上下文
 */
export function buildEnhancedPromptContext(
  enhancement: EnhancementResult,
  options?: {
    maxWebSearchSnippets?: number;
    maxKnowledgeSnippets?: number;
  }
): string {
  const parts: string[] = [];
  
  // 联网搜索结果
  if (enhancement.webSearchResults.length > 0) {
    const maxSnippets = options?.maxWebSearchSnippets || 3;
    parts.push('\n【最新资讯参考】以下是从网络获取的最新相关信息，请在文章中适当引用：');
    
    enhancement.webSearchResults.slice(0, maxSnippets).forEach((item, i) => {
      parts.push(`\n${i + 1}. 来源: ${item.siteName || '网络'}`);
      parts.push(`   标题: ${item.title}`);
      parts.push(`   摘要: ${item.snippet}`);
      parts.push(`   链接: ${item.url}`);
    });
  }
  
  // 知识库搜索结果
  if (enhancement.knowledgeResults.length > 0) {
    const maxSnippets = options?.maxKnowledgeSnippets || 3;
    parts.push('\n【知识库参考】以下是从知识库检索的相关内容，请作为写作素材：');
    
    enhancement.knowledgeResults.slice(0, maxSnippets).forEach((item, i) => {
      parts.push(`\n${i + 1}. [相关度: ${(item.score * 100).toFixed(0)}%]`);
      parts.push(`   ${item.content}`);
    });
  }
  
  // 自动外部链接
  if (enhancement.externalLinks.length > 0) {
    parts.push('\n【权威引用建议】请在文章中适当引用以下权威来源：');
    enhancement.externalLinks.forEach((link, i) => {
      parts.push(`${i + 1}. [${link.anchor}](${link.url})`);
    });
  }
  
  return parts.join('\n');
}
