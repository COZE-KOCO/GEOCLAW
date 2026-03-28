/**
 * GEO优化项目数据模型
 */

/**
 * 统一评分维度（九维度）
 */
export interface GEOScoreBreakdown {
  problemOriented: number;      // 问题导向
  aiRecognition: number;        // AI识别友好
  humanizedExpression: number;  // 人性化表达
  contentQuality: number;       // 内容质量
  trustAuthority: number;       // 信任权威
  preciseCitation: number;      // 精准引用
  structuredData: number;       // 结构化数据
  multiPlatform: number;        // 多平台适配
  seoKeywords: number;          // SEO关键词
}

export interface GEOProject {
  id: string;
  title: string;
  content: string;
  author?: string;
  keywords: string[];
  references: string[];
  score: number;
  grade: string;
  breakdown: GEOScoreBreakdown;
  status: 'draft' | 'active' | 'paused' | 'completed';
  isPublic: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  monitoring: MonitoringData;
}

export interface MonitoringData {
  // AI引用数据
  aiCitations: CitationRecord[];
  // 曝光数据
  exposure: ExposureRecord[];
  // 转化数据
  conversions: ConversionRecord[];
  // 统计摘要
  summary: {
    totalCitations: number;
    totalExposure: number;
    totalConversions: number;
    avgCitationRate: number;
    platforms: PlatformStats[];
  };
}

export interface CitationRecord {
  date: string;
  platform: AIPlatform;
  query: string;
  position: number; // 1-10，AI答案中的位置
  cited: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ExposureRecord {
  date: string;
  platform: AIPlatform;
  impressions: number;
  reach: number;
}

export interface ConversionRecord {
  date: string;
  source: AIPlatform;
  clicks: number;
  leads: number;
  conversions: number;
}

export type AIPlatform = 
  | 'ChatGPT'
  | 'DeepSeek'
  | 'Claude'
  | 'Gemini'
  | 'Perplexity'
  | '豆包'
  | '文心一言'
  | 'Kimi'
  | '其他';

export interface PlatformStats {
  platform: AIPlatform;
  citations: number;
  exposure: number;
  conversionRate: number;
}

export interface TimeSeriesData {
  date: string;
  citations: number;
  exposure: number;
  conversions: number;
}

export interface ProjectFilter {
  status?: GEOProject['status'];
  platform?: AIPlatform;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minScore?: number;
}
