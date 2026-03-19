/**
 * GEO优化项目数据模型
 */

export interface GEOProject {
  id: string;
  title: string;
  content: string;
  author?: string;
  keywords: string[];
  references: string[];
  score: number;
  grade: string;
  breakdown: {
    humanizedGeo: number;
    crossValidation: number;
    eeat: number;
    preciseCitation: number;
    structuredContent: number;
    seoKeywords: number;
  };
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
