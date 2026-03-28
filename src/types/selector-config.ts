/**
 * 平台选择器配置类型定义
 */

// 单个选择器项
export interface SelectorItem {
  selector: string;              // CSS 选择器
  priority: number;              // 优先级 (1 最高，数字越大优先级越低)
  description: string;           // 描述
  successRate: number;           // 历史成功率 (0-1)
  totalAttempts: number;         // 总尝试次数
  successfulAttempts: number;    // 成功次数
  lastSuccess?: string;          // 最后成功时间
  lastFailure?: string;          // 最后失败时间
  platformVersion?: string;      // 适用平台版本
  condition?: string;            // 匹配条件 (JS 表达式)
  isEnabled: boolean;            // 是否启用
}

// 目标类型
export type SelectorTargetType = 
  | 'titleInput' 
  | 'contentEditor' 
  | 'imageUpload' 
  | 'publishButton' 
  | 'successIndicator'
  | 'tagInput'
  | 'coverUpload'
  | 'categorySelect';

// 选择器配置
export interface SelectorConfig {
  titleInput: SelectorItem[];
  contentEditor: SelectorItem[];
  imageUpload: SelectorItem[];
  publishButton: SelectorItem[];
  successIndicator: SelectorItem[];
  tagInput?: SelectorItem[];
  coverUpload?: SelectorItem[];
  categorySelect?: SelectorItem[];
}

// 执行设置
export interface ExecutionSettings {
  waitForImageUpload: boolean;
  imageUploadWait: number;       // 毫秒
  publishWait: number;           // 毫秒
  pageLoadWait: number;          // 毫秒
  retryCount: number;
  retryDelay: number;            // 毫秒
  uploadedImageUrlSelector?: string;
}

// 完整的平台选择器配置
export interface PlatformSelectorConfig {
  id: string;
  platform: string;
  platformName: string;
  version: string;
  publishUrl: string;
  selectors: SelectorConfig;
  settings: ExecutionSettings;
  prepareScript?: string;
  verifyScript?: string;
  totalAttempts: number;
  successfulAttempts: number;
  successRate: number;
  isActive: boolean;
  isDefault: boolean;
  metadata?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 创建/更新配置的输入类型
export interface CreateSelectorConfigInput {
  platform: string;
  platformName: string;
  version?: string;
  publishUrl: string;
  selectors: SelectorConfig;
  settings?: Partial<ExecutionSettings>;
  prepareScript?: string;
  verifyScript?: string;
  isDefault?: boolean;
  notes?: string;
}

export interface UpdateSelectorConfigInput {
  platformName?: string;
  version?: string;
  publishUrl?: string;
  selectors?: Partial<SelectorConfig>;
  settings?: Partial<ExecutionSettings>;
  prepareScript?: string;
  verifyScript?: string;
  isActive?: boolean;
  isDefault?: boolean;
  notes?: string;
}

// 选择器执行结果
export interface SelectorExecutionResult {
  success: boolean;
  found: boolean;
  filled: boolean;
  verified: boolean;
  selector: string;
  executionTime: number;
  error?: string;
  debugInfo?: Record<string, any>;
}

// 选择器测试请求
export interface SelectorTestRequest {
  platform: string;
  targetType: SelectorTargetType;
  selector: string;
  testUrl?: string;
}

// 选择器测试结果
export interface SelectorTestResult {
  selector: string;
  found: boolean;
  elementInfo?: {
    tagName: string;
    type?: string;
    placeholder?: string;
    isVisible: boolean;
    isEditable: boolean;
  };
  error?: string;
}

// 智能匹配选项
export interface SmartMatchOptions {
  preferHighSuccessRate: boolean;    // 优先使用高成功率选择器
  skipDisabled: boolean;             // 跳过已禁用的选择器
  maxAttempts: number;               // 最大尝试次数
  recordResult: boolean;             // 是否记录执行结果
}

// 默认匹配选项
export const DEFAULT_MATCH_OPTIONS: SmartMatchOptions = {
  preferHighSuccessRate: true,
  skipDisabled: true,
  maxAttempts: 5,
  recordResult: true,
};

// 默认执行设置
export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = {
  waitForImageUpload: true,
  imageUploadWait: 5000,
  publishWait: 5000,
  pageLoadWait: 3000,
  retryCount: 3,
  retryDelay: 1000,
};
