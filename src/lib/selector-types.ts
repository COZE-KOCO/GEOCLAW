/**
 * 选择器类型注册表
 * 
 * 定义所有支持的选择器类型，包括：
 * - 基础选择器类型（标题、内容、发布按钮等）
 * - 平台特有选择器类型（分区、话题、地点等）
 * 
 * 每个平台可以从中选择需要的选择器类型，也可以自定义
 */

/**
 * 选择器操作类型
 */
export type SelectorInputType = 
  | 'text'      // 文本输入（标题、内容等）
  | 'click'     // 点击操作（发布按钮等）
  | 'upload'    // 文件上传（封面、图片等）
  | 'triggered-upload'  // 触发式上传（点击触发器→弹窗→上传）
  | 'select'    // 下拉选择（分区、分类等）
  | 'multi-select'; // 多选（标签等）

/**
 * 选择器类型定义
 */
export interface SelectorTypeDefinition {
  /** 类型标识，用于代码引用 */
  key: string;
  /** 显示名称 */
  name: string;
  /** 描述说明 */
  description: string;
  /** 是否必填 */
  required: boolean;
  /** 是否支持多个选择器（优先级排序） */
  multiple: boolean;
  /** 操作类型 */
  inputType: SelectorInputType;
  /** 默认值提示 */
  placeholder?: string;
  /** 如果是选择类型，可能的选项来源 */
  optionsSource?: 'static' | 'dynamic' | 'api';
  /** 静态选项列表 */
  staticOptions?: string[];
  /** 图标名称 (lucide-react) */
  icon?: string;
  /** 排序权重 */
  order: number;
  /** 所属分类 */
  category: 'content' | 'media' | 'metadata' | 'action' | 'verification';
}

/**
 * 选择器类型分类
 */
export const SELECTOR_CATEGORIES = {
  content: { name: '内容相关', icon: 'FileText', order: 1 },
  media: { name: '媒体相关', icon: 'Image', order: 2 },
  metadata: { name: '元数据', icon: 'Tags', order: 3 },
  action: { name: '操作按钮', icon: 'MousePointer', order: 4 },
  verification: { name: '验证相关', icon: 'CheckCircle', order: 5 },
} as const;

/**
 * 全局选择器类型注册表
 * 包含所有已知的选择器类型定义
 */
export const SELECTOR_TYPE_REGISTRY: SelectorTypeDefinition[] = [
  // ========== 内容相关 ==========
  {
    key: 'titleInput',
    name: '标题输入框',
    description: '文章或帖子的标题输入位置',
    required: true,
    multiple: true,
    inputType: 'text',
    placeholder: '请输入标题...',
    icon: 'Type',
    order: 1,
    category: 'content',
  },
  {
    key: 'contentEditor',
    name: '内容编辑器',
    description: '正文内容编辑区域，支持富文本或纯文本',
    required: true,
    multiple: true,
    inputType: 'text',
    placeholder: '请输入正文内容...',
    icon: 'FileText',
    order: 2,
    category: 'content',
  },
  {
    key: 'summaryInput',
    name: '摘要输入框',
    description: '文章摘要或简介输入位置',
    required: false,
    multiple: true,
    inputType: 'text',
    placeholder: '请输入摘要...',
    icon: 'AlignLeft',
    order: 3,
    category: 'content',
  },

  // ========== 媒体相关 ==========
  {
    key: 'coverUpload',
    name: '封面上传',
    description: '文章或视频的封面图片上传位置',
    required: false,
    multiple: false,
    inputType: 'upload',
    icon: 'ImagePlus',
    order: 10,
    category: 'media',
  },
  {
    key: 'imageUpload',
    name: '图片上传',
    description: '内容中图片的上传位置',
    required: false,
    multiple: false,
    inputType: 'upload',
    icon: 'ImageUp',
    order: 11,
    category: 'media',
  },
  {
    key: 'videoUpload',
    name: '视频上传',
    description: '视频文件上传位置',
    required: false,
    multiple: false,
    inputType: 'upload',
    icon: 'Video',
    order: 12,
    category: 'media',
  },
  {
    key: 'triggeredImageUpload',
    name: '触发式图片上传',
    description: '点击触发器后弹窗内的图片上传（第1个选择器为触发按钮，后续为上传元素）',
    required: false,
    multiple: true,
    inputType: 'triggered-upload',
    icon: 'ImageUp',
    order: 13,
    category: 'media',
  },
  {
    key: 'triggeredCoverUpload',
    name: '触发式封面上传',
    description: '点击触发器后弹窗内的封面上传（第1个选择器为触发按钮，后续为上传元素）',
    required: false,
    multiple: true,
    inputType: 'triggered-upload',
    icon: 'ImagePlus',
    order: 14,
    category: 'media',
  },
  {
    key: 'triggeredVideoUpload',
    name: '触发式视频上传',
    description: '点击触发器后弹窗内的视频上传（第1个选择器为触发按钮，后续为上传元素）',
    required: false,
    multiple: true,
    inputType: 'triggered-upload',
    icon: 'Video',
    order: 15,
    category: 'media',
  },

  // ========== 元数据 ==========
  {
    key: 'tagInput',
    name: '标签输入',
    description: '话题标签或关键词输入位置',
    required: false,
    multiple: true,
    inputType: 'text',
    placeholder: '输入标签后回车添加...',
    icon: 'Tag',
    order: 20,
    category: 'metadata',
  },
  {
    key: 'categorySelect',
    name: '分区选择',
    description: '内容分类或分区选择（如B站分区）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'dynamic',
    icon: 'FolderTree',
    order: 21,
    category: 'metadata',
  },
  {
    key: 'topicSelect',
    name: '话题选择',
    description: '关联话题选择（如微博话题）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'dynamic',
    icon: 'Hash',
    order: 22,
    category: 'metadata',
  },
  {
    key: 'locationSelect',
    name: '地点选择',
    description: '发布地点选择（如小红书打卡地）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'dynamic',
    icon: 'MapPin',
    order: 23,
    category: 'metadata',
  },
  {
    key: 'visibilitySelect',
    name: '可见性设置',
    description: '内容可见范围设置（公开/私密/好友可见）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'static',
    staticOptions: ['公开', '私密', '好友可见', '仅自己可见'],
    icon: 'Eye',
    order: 24,
    category: 'metadata',
  },
  {
    key: 'authorInput',
    name: '作者署名',
    description: '作者名称输入位置（如有）',
    required: false,
    multiple: false,
    inputType: 'text',
    icon: 'User',
    order: 25,
    category: 'metadata',
  },
  {
    key: 'sourceInput',
    name: '来源填写',
    description: '内容来源或原文链接',
    required: false,
    multiple: false,
    inputType: 'text',
    icon: 'Link',
    order: 26,
    category: 'metadata',
  },

  // ========== 操作按钮 ==========
  {
    key: 'saveButton',
    name: '保存按钮',
    description: '保存草稿按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Save',
    order: 28,
    category: 'action',
  },
  {
    key: 'previewButton',
    name: '预览按钮',
    description: '预览内容按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Eye',
    order: 29,
    category: 'action',
  },
  {
    key: 'clickButton',
    name: '点击选择按钮',
    description: '通用的点击按钮选择器，可重复添加（如封面类型、广告投放等单选按钮）',
    required: false,
    multiple: true,
    inputType: 'click',
    icon: 'MousePointer2',
    order: 30,
    category: 'action',
  },
  {
    key: 'clickButton1',
    name: '点击选择按钮_1',
    description: '通用点击按钮选择器1（如封面类型、广告投放等单选按钮）',
    required: false,
    multiple: true,
    inputType: 'click',
    icon: 'MousePointer2',
    order: 31,
    category: 'action',
  },
  {
    key: 'clickButton2',
    name: '点击选择按钮_2',
    description: '通用点击按钮选择器2（如封面类型、广告投放等单选按钮）',
    required: false,
    multiple: true,
    inputType: 'click',
    icon: 'MousePointer2',
    order: 32,
    category: 'action',
  },
  {
    key: 'publishButton',
    name: '发布按钮',
    description: '点击发布内容的按钮（始终在最后执行）',
    required: true,
    multiple: true,
    inputType: 'click',
    icon: 'Send',
    order: 35,
    category: 'action',
  },

  // ========== 验证相关 ==========
  {
    key: 'successIndicator',
    name: '成功标识',
    description: '发布成功后出现的元素（Toast、弹窗等）',
    required: true,
    multiple: true,
    inputType: 'text',
    icon: 'CheckCircle',
    order: 40,
    category: 'verification',
  },
  {
    key: 'errorIndicator',
    name: '错误标识',
    description: '发布失败时出现的错误提示元素',
    required: false,
    multiple: true,
    inputType: 'text',
    icon: 'AlertCircle',
    order: 41,
    category: 'verification',
  },
  {
    key: 'loadingIndicator',
    name: '加载标识',
    description: '发布中加载状态元素',
    required: false,
    multiple: false,
    inputType: 'text',
    icon: 'Loader2',
    order: 42,
    category: 'verification',
  },

  // ========== 扩展元数据 ==========
  {
    key: 'originalDeclare',
    name: '原创声明',
    description: '原创声明勾选框或按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'CheckCircle',
    order: 27,
    category: 'metadata',
  },
  {
    key: 'columnSelect',
    name: '专栏选择',
    description: '选择发布到的专栏（如知乎专栏）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'dynamic',
    icon: 'BookOpen',
    order: 28,
    category: 'metadata',
  },
  {
    key: 'collectionSelect',
    name: '合集选择',
    description: '选择添加到的合集或收藏夹',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'dynamic',
    icon: 'FolderPlus',
    order: 29,
    category: 'metadata',
  },
  {
    key: 'scheduleTime',
    name: '定时发布',
    description: '定时发布时间设置',
    required: false,
    multiple: false,
    inputType: 'text',
    icon: 'Clock',
    order: 33,
    category: 'metadata',
  },
  {
    key: 'commentSettings',
    name: '评论设置',
    description: '评论权限设置（开启/关闭评论）',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'static',
    staticOptions: ['允许评论', '禁止评论', '仅关注者可评论'],
    icon: 'MessageSquare',
    order: 34,
    category: 'metadata',
  },
  {
    key: 'copyrightSettings',
    name: '版权设置',
    description: '版权声明或转载设置',
    required: false,
    multiple: false,
    inputType: 'select',
    optionsSource: 'static',
    staticOptions: ['原创', '转载', '翻译'],
    icon: 'Copyright',
    order: 35,
    category: 'metadata',
  },
  {
    key: 'watermarkSettings',
    name: '水印设置',
    description: '图片或视频水印开关',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Droplet',
    order: 36,
    category: 'metadata',
  },
  {
    key: 'recommendSettings',
    name: '推荐设置',
    description: '推荐相关设置（如是否允许推荐）',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Sparkles',
    order: 37,
    category: 'metadata',
  },
  {
    key: 'interactionSettings',
    name: '互动设置',
    description: '互动权限设置（点赞、收藏、分享等）',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Heart',
    order: 38,
    category: 'metadata',
  },

  // ========== 扩展操作按钮 ==========
  {
    key: 'nextStepButton',
    name: '下一步按钮',
    description: '多步骤发布流程中的下一步按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'ArrowRight',
    order: 50,
    category: 'action',
  },
  {
    key: 'confirmButton',
    name: '确认按钮',
    description: '确认发布的二次确认按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'Check',
    order: 51,
    category: 'action',
  },
  {
    key: 'cancelButton',
    name: '取消按钮',
    description: '取消发布或关闭弹窗按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'X',
    order: 52,
    category: 'action',
  },
  {
    key: 'draftButton',
    name: '存草稿按钮',
    description: '保存为草稿按钮',
    required: false,
    multiple: false,
    inputType: 'click',
    icon: 'FileEdit',
    order: 53,
    category: 'action',
  },

  // ========== 扩展内容相关 ==========
  {
    key: 'subtitleInput',
    name: '副标题输入',
    description: '副标题或导语输入位置',
    required: false,
    multiple: false,
    inputType: 'text',
    icon: 'Subtitles',
    order: 4,
    category: 'content',
  },
  {
    key: 'keywordInput',
    name: '关键词输入',
    description: 'SEO关键词或搜索关键词输入',
    required: false,
    multiple: true,
    inputType: 'text',
    placeholder: '输入关键词...',
    icon: 'Search',
    order: 5,
    category: 'content',
  },
  {
    key: 'anchorText',
    name: '锚文本链接',
    description: '文章中插入的超链接锚文本',
    required: false,
    multiple: true,
    inputType: 'text',
    icon: 'Link2',
    order: 6,
    category: 'content',
  },
];

/**
 * 根据分类获取选择器类型
 */
export function getSelectorTypesByCategory(category: SelectorTypeDefinition['category']) {
  return SELECTOR_TYPE_REGISTRY.filter(type => type.category === category);
}

/**
 * 根据 key 获取选择器类型定义
 */
export function getSelectorTypeByKey(key: string): SelectorTypeDefinition | undefined {
  return SELECTOR_TYPE_REGISTRY.find(type => type.key === key);
}

/**
 * 获取必填的选择器类型
 */
export function getRequiredSelectorTypes(): SelectorTypeDefinition[] {
  return SELECTOR_TYPE_REGISTRY.filter(type => type.required);
}

/**
 * 平台选择器类型配置
 * 定义每个平台需要哪些选择器类型
 */
export interface PlatformSelectorTypes {
  platform: string;
  platformName: string;
  /** 该平台需要的选择器类型 key 列表 */
  requiredTypes: string[];
  /** 可选的选择器类型 key 列表 */
  optionalTypes: string[];
  /** 类型特殊配置（如某些平台封面必填） */
  typeOverrides?: Record<string, Partial<SelectorTypeDefinition>>;
}

/**
 * 各平台默认的选择器类型配置
 */
export const PLATFORM_SELECTOR_TYPES: PlatformSelectorTypes[] = [
  {
    platform: 'toutiao',
    platformName: '今日头条',
    requiredTypes: ['titleInput', 'contentEditor', 'publishButton', 'successIndicator'],
    optionalTypes: ['coverUpload', 'imageUpload', 'tagInput', 'saveButton'],
  },
  {
    platform: 'xiaohongshu',
    platformName: '小红书',
    requiredTypes: ['titleInput', 'contentEditor', 'coverUpload', 'publishButton', 'successIndicator'],
    optionalTypes: ['tagInput', 'locationSelect', 'visibilitySelect'],
    typeOverrides: {
      coverUpload: { required: true }, // 小红书封面必填
    },
  },
  {
    platform: 'weibo',
    platformName: '微博',
    requiredTypes: ['contentEditor', 'publishButton', 'successIndicator'],
    optionalTypes: ['imageUpload', 'topicSelect', 'locationSelect'],
    typeOverrides: {
      titleInput: { required: false }, // 微博通常没有标题
    },
  },
  {
    platform: 'bilibili',
    platformName: 'B站',
    requiredTypes: ['titleInput', 'contentEditor', 'categorySelect', 'tagInput', 'publishButton', 'successIndicator'],
    optionalTypes: ['coverUpload', 'saveButton', 'previewButton'],
    typeOverrides: {
      categorySelect: { required: true }, // B站分区必填
      tagInput: { required: true }, // B站标签必填
    },
  },
  {
    platform: 'douyin',
    platformName: '抖音',
    requiredTypes: ['contentEditor', 'publishButton', 'successIndicator'],
    optionalTypes: ['videoUpload', 'coverUpload', 'tagInput', 'locationSelect'],
  },
];

/**
 * 获取平台的选择器类型定义列表
 */
export function getPlatformSelectorTypes(platform: string): SelectorTypeDefinition[] {
  const platformConfig = PLATFORM_SELECTOR_TYPES.find(p => p.platform === platform);
  if (!platformConfig) {
    return SELECTOR_TYPE_REGISTRY.filter(type => type.required);
  }

  const typeKeys = [...platformConfig.requiredTypes, ...platformConfig.optionalTypes];
  return typeKeys
    .map(key => {
      const baseType = getSelectorTypeByKey(key);
      if (!baseType) return null;
      
      // 应用平台特定覆盖配置
      const override = platformConfig.typeOverrides?.[key];
      if (override) {
        return { ...baseType, ...override };
      }
      return baseType;
    })
    .filter((type): type is SelectorTypeDefinition => type !== null);
}

/**
 * 创建自定义选择器类型
 */
export function createCustomSelectorType(
  key: string,
  name: string,
  options: Partial<SelectorTypeDefinition> = {}
): SelectorTypeDefinition {
  return {
    key,
    name,
    description: options.description || '自定义选择器',
    required: options.required ?? false,
    multiple: options.multiple ?? true,
    inputType: options.inputType ?? 'text',
    placeholder: options.placeholder,
    icon: options.icon ?? 'Plus',
    order: options.order ?? 100,
    category: options.category ?? 'metadata',
    ...options,
  };
}
