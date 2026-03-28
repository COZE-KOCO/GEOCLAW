/**
 * 选择器配置 - 默认配置
 * 系统内置的默认配置，支持动态选择器类型
 */

import { 
  SelectorTypeDefinition, 
  getPlatformSelectorTypes,
  PLATFORM_SELECTOR_TYPES 
} from './selector-types';

export interface SelectorItem {
  selector: string;
  priority: number;
  description: string;
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  isEnabled: boolean;
}

/**
 * 动态选择器配置
 * key 为选择器类型标识，如 'titleInput', 'contentEditor' 等
 */
export type DynamicSelectorConfig = Record<string, SelectorItem[]>;

export interface PlatformSelectorConfig {
  id?: string;
  platform: string;
  platformName: string;
  version: string;
  publishUrl: string;
  /** 该平台需要的选择器类型 key 列表 */
  selectorTypes: string[];
  /** 选择器配置（动态） */
  selectors: DynamicSelectorConfig;
  /** 执行设置 */
  settings: Record<string, any>;
  /** 准备脚本 */
  prepareScript?: string;
  /** 统计数据 */
  totalAttempts: number;
  successfulAttempts: number;
  successRate: string;
  isActive: boolean;
  isDefault: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ========== 系统内置默认配置 ==========

export const DEFAULT_PLATFORM_CONFIGS: PlatformSelectorConfig[] = [
  // 今日头条
  {
    platform: 'toutiao',
    platformName: '今日头条',
    version: '2.0.0',
    publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    selectorTypes: ['titleInput', 'contentEditor', 'coverUpload', 'imageUpload', 'tagInput', 'publishButton', 'successIndicator'],
    selectors: {
      titleInput: [
        { selector: '#title', priority: 1, description: 'ID选择器', successRate: 0.98, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[name="title"]', priority: 2, description: 'name属性', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="文章标题"]', priority: 3, description: 'placeholder包含文章标题', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="标题"]', priority: 4, description: 'placeholder包含标题', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.title-input input', priority: 5, description: 'class包裹', successRate: 0.75, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      contentEditor: [
        { selector: '.public-DraftEditor-content', priority: 1, description: 'Draft.js编辑器', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '[contenteditable="true"][data-lexical-editor]', priority: 2, description: 'Lexical编辑器', successRate: 0.92, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '[contenteditable="true"][class*="editor"]', priority: 3, description: '可编辑区域', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.slate-editor [contenteditable="true"]', priority: 4, description: 'Slate编辑器', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      coverUpload: [
        { selector: '.cover-upload input[type="file"]', priority: 1, description: '封面上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      imageUpload: [
        { selector: '.image-upload input[type="file"]', priority: 1, description: '图片上传按钮', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[type="file"][accept*="image"]', priority: 2, description: '图片文件输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      tagInput: [
        { selector: '.tag-input input', priority: 1, description: '标签输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      publishButton: [
        { selector: '[data-e2e="publish"]', priority: 1, description: 'E2E测试选择器', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'button[class*="publish"]', priority: 2, description: 'class包含publish', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.publish-btn', priority: 3, description: '发布按钮class', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      successIndicator: [
        { selector: '.toast-success', priority: 1, description: '成功Toast', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.ant-message-success', priority: 2, description: 'Ant Design成功消息', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '[class*="success-tip"]', priority: 3, description: '成功提示', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
    },
    settings: {
      waitForImageUpload: true,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    prepareScript: `await new Promise(r => setTimeout(r, 3000));
const closeBtns = document.querySelectorAll('.close-btn, .modal-close, [class*="close"], .ant-modal-close');
closeBtns.forEach(btn => { try { btn.click(); } catch(e) {} });`,
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: true,
  },
  // 小红书
  {
    platform: 'xiaohongshu',
    platformName: '小红书',
    version: '2.0.0',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    selectorTypes: ['titleInput', 'contentEditor', 'coverUpload', 'tagInput', 'locationSelect', 'publishButton', 'successIndicator'],
    selectors: {
      titleInput: [
        { selector: '.c-input__inner input', priority: 1, description: '组件库输入框', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="填写标题"]', priority: 2, description: 'placeholder', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[maxlength="20"]', priority: 3, description: '标题长度限制', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      contentEditor: [
        { selector: '#post-textarea', priority: 1, description: '正文输入框', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'textarea[placeholder*="填写正文"]', priority: 2, description: 'placeholder', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.c-textarea__inner textarea', priority: 3, description: '组件库textarea', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      coverUpload: [
        { selector: '.cover-upload input[type="file"]', priority: 1, description: '封面上传', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.upload-cover input[type="file"]', priority: 2, description: '封面上传按钮', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      tagInput: [
        { selector: '.tag-input input', priority: 1, description: '标签输入', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="添加话题"]', priority: 2, description: '话题输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      locationSelect: [
        { selector: '.location-input input', priority: 1, description: '地点输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="地点"]', priority: 2, description: '地点placeholder', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      publishButton: [
        { selector: '.publishBtn', priority: 1, description: '发布按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'button[class*="publish"]', priority: 2, description: 'class包含publish', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      successIndicator: [
        { selector: '.publish-success', priority: 1, description: '成功标识', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.toast-success', priority: 2, description: 'Toast成功', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
    },
    settings: {
      waitForImageUpload: true,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: true,
  },
  // 微博
  {
    platform: 'weibo',
    platformName: '微博',
    version: '2.0.0',
    publishUrl: 'https://weibo.com',
    selectorTypes: ['contentEditor', 'imageUpload', 'topicSelect', 'locationSelect', 'publishButton', 'successIndicator'],
    selectors: {
      contentEditor: [
        { selector: '.W_input', priority: 1, description: '微博输入框', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'textarea[name="content"]', priority: 2, description: '内容输入框', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '[contenteditable="true"]', priority: 3, description: '可编辑区域', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      imageUpload: [
        { selector: '[node-type="uploadImg"] input[type="file"]', priority: 1, description: '图片上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[type="file"][accept*="image"]', priority: 2, description: '图片文件输入', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      topicSelect: [
        { selector: '.topic-input input', priority: 1, description: '话题输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="话题"]', priority: 2, description: '话题placeholder', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      locationSelect: [
        { selector: '.location-input input', priority: 1, description: '地点输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      publishButton: [
        { selector: '[node-type="submitBtn"]', priority: 1, description: '发布按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'button[type="submit"]', priority: 2, description: '提交按钮', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      successIndicator: [
        { selector: '.W_layer', priority: 1, description: '成功浮层', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.toast-success', priority: 2, description: '成功Toast', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
    },
    settings: {
      waitForImageUpload: true,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: true,
  },
  // B站
  {
    platform: 'bilibili',
    platformName: 'B站',
    version: '2.0.0',
    publishUrl: 'https://member.bilibili.com/platform/article/text/new',
    selectorTypes: ['titleInput', 'contentEditor', 'categorySelect', 'tagInput', 'coverUpload', 'publishButton', 'successIndicator'],
    selectors: {
      titleInput: [
        { selector: 'input[placeholder*="标题"]', priority: 1, description: 'placeholder', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.title-input input', priority: 2, description: '标题输入框', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      contentEditor: [
        { selector: '.ql-editor', priority: 1, description: 'Quill编辑器', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '[contenteditable="true"]', priority: 2, description: '可编辑区域', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      categorySelect: [
        { selector: '.category-select select', priority: 1, description: '分区选择', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'select[name="category"]', priority: 2, description: '分区下拉', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      tagInput: [
        { selector: '.tag-input input', priority: 1, description: '标签输入', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="标签"]', priority: 2, description: '标签placeholder', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      coverUpload: [
        { selector: '.cover-upload input[type="file"]', priority: 1, description: '封面上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      publishButton: [
        { selector: 'button.publish-btn', priority: 1, description: '发布按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'button[class*="publish"]', priority: 2, description: 'class包含publish', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      successIndicator: [
        { selector: '.success-tip', priority: 1, description: '成功提示', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.toast-success', priority: 2, description: '成功Toast', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
    },
    settings: {
      waitForImageUpload: true,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: true,
  },
  // 抖音
  {
    platform: 'douyin',
    platformName: '抖音',
    version: '2.0.0',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/publish',
    selectorTypes: ['contentEditor', 'videoUpload', 'coverUpload', 'tagInput', 'locationSelect', 'publishButton', 'successIndicator'],
    selectors: {
      contentEditor: [
        { selector: '[contenteditable="true"]', priority: 1, description: '可编辑区域', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'textarea[placeholder*="描述"]', priority: 2, description: '描述输入框', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      videoUpload: [
        { selector: '.video-upload input[type="file"]', priority: 1, description: '视频上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[type="file"][accept*="video"]', priority: 2, description: '视频文件输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      coverUpload: [
        { selector: '.cover-upload input[type="file"]', priority: 1, description: '封面上传', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      tagInput: [
        { selector: '.tag-input input', priority: 1, description: '标签输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: 'input[placeholder*="话题"]', priority: 2, description: '话题输入', successRate: 0.80, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      locationSelect: [
        { selector: '.location-input input', priority: 1, description: '地点输入', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      publishButton: [
        { selector: 'button[class*="publish"]', priority: 1, description: '发布按钮', successRate: 0.95, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.publish-btn', priority: 2, description: '发布按钮class', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
      successIndicator: [
        { selector: '.success-modal', priority: 1, description: '成功弹窗', successRate: 0.90, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
        { selector: '.toast-success', priority: 2, description: '成功Toast', successRate: 0.85, totalAttempts: 0, successfulAttempts: 0, isEnabled: true },
      ],
    },
    settings: {
      waitForImageUpload: false,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: true,
  },
];

// ========== 工具函数 ==========

/**
 * 获取默认配置（按平台）
 */
export function getDefaultConfig(platform: string): PlatformSelectorConfig | undefined {
  return DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
}

/**
 * 获取平台的选择器类型定义列表
 */
export function getPlatformSelectorTypeDefinitions(platform: string): SelectorTypeDefinition[] {
  const config = getDefaultConfig(platform);
  if (!config) return [];
  
  return getPlatformSelectorTypes(platform);
}

/**
 * 合并用户配置和默认配置
 */
export function mergeWithDefaults(userConfigs: PlatformSelectorConfig[]): PlatformSelectorConfig[] {
  if (!userConfigs || userConfigs.length === 0) {
    return DEFAULT_PLATFORM_CONFIGS.map(c => ({ ...c, isDefault: true }));
  }

  return DEFAULT_PLATFORM_CONFIGS.map(defaultConfig => {
    const userConfig = userConfigs.find(c => c.platform === defaultConfig.platform);
    if (userConfig) {
      // 合并选择器配置：用户配置优先
      const mergedSelectors = { ...defaultConfig.selectors };
      for (const [key, items] of Object.entries(userConfig.selectors || {})) {
        if (items && items.length > 0) {
          mergedSelectors[key] = items;
        }
      }
      
      return {
        ...defaultConfig,
        ...userConfig,
        selectors: mergedSelectors,
        isDefault: false,
      };
    }
    return { ...defaultConfig, isDefault: true };
  });
}

/**
 * 创建空的平台配置
 */
export function createEmptyPlatformConfig(
  platform: string,
  platformName: string,
  publishUrl: string
): PlatformSelectorConfig {
  const selectorTypes = getPlatformSelectorTypes(platform);
  
  return {
    platform,
    platformName,
    version: '1.0.0',
    publishUrl,
    selectorTypes: selectorTypes.map(t => t.key),
    selectors: {},
    settings: {
      waitForImageUpload: true,
      imageUploadWait: 5000,
      publishWait: 5000,
      pageLoadWait: 3000,
      retryCount: 3,
      retryDelay: 1000,
    },
    totalAttempts: 0,
    successfulAttempts: 0,
    successRate: '0%',
    isActive: true,
    isDefault: false,
  };
}

/**
 * 验证配置完整性
 */
export function validateConfig(config: PlatformSelectorConfig): {
  isValid: boolean;
  missingRequired: string[];
  warnings: string[];
} {
  const selectorTypes = getPlatformSelectorTypes(config.platform);
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  for (const type of selectorTypes) {
    if (type.required) {
      const items = config.selectors[type.key];
      if (!items || items.length === 0 || items.every(i => !i.isEnabled)) {
        missingRequired.push(type.name);
      }
    }
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    warnings,
  };
}
