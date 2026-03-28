/**
 * 平台配置
 * 定义平台分类、AI模型映射和权重信息
 */

// 平台分类枚举
export enum PlatformCategory {
  PLATFORM = 'platform',           // 传统自媒体平台
  GEO_PLATFORM = 'geo_platform',   // GEO采集平台
  OFFICIAL_SITE = 'official_site'  // 官网
}

// AI 模型类型枚举
export enum AIModel {
  DEEPSEEK = 'deepseek',           // DeepSeek
  DOUBAO = 'doubao',               // 豆包
  YUANBAO = 'yuanbao',             // 元宝
  BAIDU = 'baidu',                 // 百度/文心
  KIMI = 'kimi',                   // Kimi
  QIANWEN = 'qianwen',             // 千问/夸克
}

// AI 模型显示名称
export const AI_MODEL_NAMES: Record<AIModel, string> = {
  [AIModel.DEEPSEEK]: 'DeepSeek',
  [AIModel.DOUBAO]: '豆包',
  [AIModel.YUANBAO]: '元宝',
  [AIModel.BAIDU]: '百度/文心',
  [AIModel.KIMI]: 'Kimi',
  [AIModel.QIANWEN]: '千问/夸克',
};

// 平台分类显示名称
export const CATEGORY_NAMES: Record<PlatformCategory, string> = {
  [PlatformCategory.PLATFORM]: '自媒体平台',
  [PlatformCategory.GEO_PLATFORM]: 'GEO采集平台',
  [PlatformCategory.OFFICIAL_SITE]: '官网',
};

// 平台基本信息接口
export interface PlatformInfo {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

// ==================== 平台定义 ====================

/**
 * 平台（传统自媒体平台）
 * 支持自动发布，账号授权管理
 */
export const PLATFORM_LIST: PlatformInfo[] = [
  { id: 'toutiao', name: '今日头条', description: '资讯分发平台' },
  { id: 'zhihu', name: '知乎', description: '问答社区平台' },
  { id: 'weibo', name: '微博', description: '社交媒体平台' },
  { id: 'bilibili', name: 'B站', description: '视频分享平台' },
  { id: 'xiaohongshu', name: '小红书', description: '生活方式分享平台' },
  { id: 'douyin', name: '抖音', description: '短视频平台' },
  { id: 'weixin', name: '微信公众号', description: '微信生态内容平台' },
];

/**
 * GEO采集平台基本信息
 * 这些平台会被AI搜索引擎采集
 */
export const GEO_PLATFORM_LIST: PlatformInfo[] = [
  { id: 'sohu', name: '搜狐号', description: '搜狐自媒体平台' },
  { id: 'wangyi', name: '网易号', description: '网易内容平台' },
  { id: 'tencent', name: '腾讯网', description: '腾讯新闻平台' },
  { id: 'baike', name: '百度百科', description: '百度百科词条' },
  { id: 'baijiahao', name: '百家号', description: '百度内容平台' },
  { id: 'smzdm', name: '什么值得买', description: '消费决策平台' },
  { id: 'weixin', name: '微信公众号', description: '微信生态内容平台' },
];

/**
 * AI模型与GEO采集平台映射
 * 每个AI模型优先采集的平台列表
 */
export const AI_MODEL_GEO_PLATFORMS: Record<AIModel, PlatformInfo[]> = {
  [AIModel.DEEPSEEK]: [
    { id: 'sohu', name: '搜狐号', description: 'DeepSeek首选采集源' },
    { id: 'wangyi', name: '网易号', description: 'DeepSeek采集源' },
    { id: 'tencent', name: '腾讯网', description: 'DeepSeek采集源' },
    { id: 'baike', name: '百度百科', description: 'DeepSeek采集源' },
  ],
  [AIModel.DOUBAO]: [
    { id: 'toutiao', name: '今日头条', description: '豆包首选采集源' },
    { id: 'douyin', name: '抖音', description: '豆包采集源' },
    { id: 'sohu', name: '搜狐号', description: '豆包采集源' },
    { id: 'smzdm', name: '什么值得买', description: '豆包采集源' },
  ],
  [AIModel.YUANBAO]: [
    { id: 'weixin', name: '微信公众号', description: '元宝首选采集源' },
    { id: 'sohu', name: '搜狐号', description: '元宝采集源' },
    { id: 'wangyi', name: '网易号', description: '元宝采集源' },
  ],
  [AIModel.BAIDU]: [
    { id: 'baijiahao', name: '百家号', description: '百度/文心首选采集源' },
    { id: 'bilibili', name: 'B站', description: '百度/文心采集源' },
    { id: 'zhihu', name: '知乎', description: '百度/文心采集源' },
  ],
  [AIModel.KIMI]: [
    { id: 'sohu', name: '搜狐号', description: 'Kimi首选采集源' },
    { id: 'zhihu', name: '知乎', description: 'Kimi采集源' },
  ],
  [AIModel.QIANWEN]: [
    { id: 'sohu', name: '搜狐号', description: '千问/夸克首选采集源' },
    { id: 'wangyi', name: '网易号', description: '千问/夸克采集源' },
    { id: 'tencent', name: '腾讯网', description: '千问/夸克采集源' },
  ],
};

/**
 * 获取所有GEO平台（去重）
 */
export function getAllGeoPlatforms(): PlatformInfo[] {
  const platformMap = new Map<string, PlatformInfo>();
  
  Object.values(AI_MODEL_GEO_PLATFORMS).forEach(platforms => {
    platforms.forEach(p => {
      if (!platformMap.has(p.id)) {
        platformMap.set(p.id, p);
      }
    });
  });
  
  return Array.from(platformMap.values());
}

/**
 * 获取平台被哪些AI模型采集
 */
export function getPlatformAiModels(platformId: string): AIModel[] {
  const models: AIModel[] = [];
  
  Object.entries(AI_MODEL_GEO_PLATFORMS).forEach(([model, platforms]) => {
    if (platforms.some(p => p.id === platformId)) {
      models.push(model as AIModel);
    }
  });
  
  return models;
}

/**
 * 获取所有平台（传统自媒体 + GEO采集）
 */
export function getAllPlatforms(): PlatformInfo[] {
  const platformMap = new Map<string, PlatformInfo>();
  
  // 添加传统自媒体平台
  PLATFORM_LIST.forEach(p => platformMap.set(p.id, p));
  
  // 添加GEO采集平台（去重）
  getAllGeoPlatforms().forEach(p => {
    if (!platformMap.has(p.id)) {
      platformMap.set(p.id, p);
    }
  });
  
  return Array.from(platformMap.values());
}

/**
 * 获取平台信息
 */
export function getPlatformInfo(platformId: string): PlatformInfo | undefined {
  const allPlatforms = getAllPlatforms();
  return allPlatforms.find(p => p.id === platformId);
}

/**
 * 检查平台是否为GEO采集平台
 */
export function isGeoPlatform(platformId: string): boolean {
  return getAllGeoPlatforms().some(p => p.id === platformId);
}

/**
 * 获取按AI模型分组的GEO平台
 */
export function getGeoPlatformsGroupByModel(): Record<AIModel, PlatformInfo[]> {
  return AI_MODEL_GEO_PLATFORMS;
}

// 默认导出
export default {
  PlatformCategory,
  AIModel,
  AI_MODEL_NAMES,
  CATEGORY_NAMES,
  PLATFORM_LIST,
  GEO_PLATFORM_LIST,
  AI_MODEL_GEO_PLATFORMS,
  getAllGeoPlatforms,
  getPlatformAiModels,
  getAllPlatforms,
  getPlatformInfo,
  isGeoPlatform,
  getGeoPlatformsGroupByModel,
};
