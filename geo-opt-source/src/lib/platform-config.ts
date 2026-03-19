/**
 * 平台内容格式配置
 * 定义各发布渠道支持的内容类型、风格特性和限制
 */

export type ContentType = 'article' | 'image-text' | 'video' | 'link' | 'jump';

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  
  // 支持的内容格式
  supportedFormats: ContentType[];
  
  // 默认内容格式
  defaultFormat: ContentType;
  
  // 平台特性
  features: {
    maxTitleLength: number;
    maxContentLength: number;
    maxImages: number;
    maxVideoDuration: number; // 秒
    supportsEmoji: boolean;
    supportsMarkdown: boolean;
    supportsHashtag: boolean;
    supportsMention: boolean;
    supportsLink: boolean;
    supportsJump: boolean; // 跳转到其他平台
  };
  
  // 内容风格指南
  styleGuide: {
    tone: string; // 语气风格
    structure: string; // 结构建议
    keywords: string[]; // 风格关键词
    avoidWords: string[]; // 避免使用的词
    formatting: string; // 格式建议
  };
  
  // 平台用户画像
  audience: {
    demographics: string; // 人群特征
    preferences: string[]; // 偏好
    peakTime: string; // 活跃时段
  };
  
  // 算法偏好
  algorithmPreference: {
    emphasis: string[]; // 重视的因素
    penalty: string[]; // 惩罚的因素
  };
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  wechat: {
    id: 'wechat',
    name: '微信公众号',
    icon: '📱',
    description: '适合深度内容、专业文章、品牌故事',
    supportedFormats: ['article', 'image-text'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 64,
      maxContentLength: 20000,
      maxImages: 20,
      maxVideoDuration: 1800, // 30分钟
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: false,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '专业、权威、有深度',
      structure: '标题→导语→正文→总结→互动引导',
      keywords: ['干货', '实用', '深度', '原创', '独家'],
      avoidWords: ['震惊', '必看', '转发有奖'],
      formatting: '段落清晰，多用小标题，配合图片说明',
    },
    audience: {
      demographics: '25-45岁，中高收入群体，追求专业内容',
      preferences: ['专业资讯', '深度分析', '实用技巧', '情感共鸣'],
      peakTime: '早8-9点，午12-13点，晚20-22点',
    },
    algorithmPreference: {
      emphasis: ['阅读完成率', '分享率', '在看率', '粉丝互动'],
      penalty: ['标题党', '诱导分享', '低质内容'],
    },
  },
  
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    description: '适合种草分享、生活方式、美妆时尚',
    supportedFormats: ['image-text', 'video'],
    defaultFormat: 'image-text',
    features: {
      maxTitleLength: 20,
      maxContentLength: 1000,
      maxImages: 9,
      maxVideoDuration: 900, // 15分钟
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: false,
      supportsJump: false,
    },
    styleGuide: {
      tone: '真实、亲切、种草感强',
      structure: '吸睛标题→封面图→正文+标签→互动提问',
      keywords: ['推荐', '必入', '亲测', '宝藏', '绝绝子', 'yyds'],
      avoidWords: ['广告', '推广', '转发'],
      formatting: '多图+短文，表情包丰富，标签明确',
    },
    audience: {
      demographics: '18-35岁女性为主，追求品质生活',
      preferences: ['种草', '测评', '教程', '分享', '颜值'],
      peakTime: '午12-14点，晚20-23点',
    },
    algorithmPreference: {
      emphasis: ['点击率', '收藏率', '点赞评论', '账号权重'],
      penalty: ['硬广', '低质图', '无标签'],
    },
  },
  
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    description: '适合短视频、娱乐内容、热点追踪',
    supportedFormats: ['video'],
    defaultFormat: 'video',
    features: {
      maxTitleLength: 55,
      maxContentLength: 500,
      maxImages: 0,
      maxVideoDuration: 300, // 5分钟（普通用户）
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: false,
      supportsJump: true,
    },
    styleGuide: {
      tone: '轻松、有趣、节奏感强',
      structure: '黄金3秒开头→内容高潮→互动引导',
      keywords: ['太绝了', '学废了', 'yyds', '收藏', '点赞'],
      avoidWords: ['长篇大论', '无聊', '拖沓'],
      formatting: '短句为主，配合热门BGM，话题标签',
    },
    audience: {
      demographics: '全年龄段，下沉市场占比高',
      preferences: ['搞笑', '知识', '美食', '剧情', '热点'],
      peakTime: '午12-13点，晚18-22点',
    },
    algorithmPreference: {
      emphasis: ['完播率', '点赞率', '评论率', '转发率'],
      penalty: ['水印', '低质', '搬运'],
    },
  },
  
  weibo: {
    id: 'weibo',
    name: '微博',
    icon: '📢',
    description: '适合热点评论、资讯传播、粉丝互动',
    supportedFormats: ['article', 'image-text', 'video', 'link'],
    defaultFormat: 'image-text',
    features: {
      maxTitleLength: 0, // 无标题概念
      maxContentLength: 2000,
      maxImages: 18,
      maxVideoDuration: 300,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '观点鲜明、快速传播、互动性强',
      structure: '核心观点→论据支撑→话题标签→互动引导',
      keywords: ['热搜', '爆料', '独家', '重磅', '转发'],
      avoidWords: ['水军', '营销号'],
      formatting: '短小精悍，话题明确，配图有力',
    },
    audience: {
      demographics: '18-40岁，关注热点，喜欢表达',
      preferences: ['热点', '明星', '社会事件', '搞笑'],
      peakTime: '全天活跃，晚20-23点高峰',
    },
    algorithmPreference: {
      emphasis: ['转发', '评论', '点赞', '话题参与'],
      penalty: ['敏感词', '违规内容'],
    },
  },
  
  zhihu: {
    id: 'zhihu',
    name: '知乎',
    icon: '💡',
    description: '适合专业问答、知识分享、深度分析',
    supportedFormats: ['article', 'image-text', 'video', 'link'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 50,
      maxContentLength: 50000,
      maxImages: 30,
      maxVideoDuration: 1800,
      supportsEmoji: false,
      supportsMarkdown: true,
      supportsHashtag: false,
      supportsMention: true,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '专业、理性、有逻辑',
      structure: '问题解答→分析论证→数据支撑→总结观点',
      keywords: ['谢邀', '首先', '结论', '数据', '引用'],
      avoidWords: ['震惊', '标题党', '营销'],
      formatting: '逻辑清晰，引用来源，专业术语适当解释',
    },
    audience: {
      demographics: '20-40岁，高学历，追求专业知识',
      preferences: ['干货', '分析', '经验', '观点'],
      peakTime: '早9-10点，午12-13点，晚21-23点',
    },
    algorithmPreference: {
      emphasis: ['赞同', '收藏', '评论', '专业权重'],
      penalty: ['低质', '搬运', '广告'],
    },
  },
  
  bilibili: {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    description: '适合长视频、知识科普、二次元文化',
    supportedFormats: ['video', 'article'],
    defaultFormat: 'video',
    features: {
      maxTitleLength: 80,
      maxContentLength: 20000,
      maxImages: 0,
      maxVideoDuration: 7200, // 2小时
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '有趣、专业、有梗',
      structure: '精彩开场→内容主体→互动结尾',
      keywords: ['干货', '教程', '必看', '三连', '投币'],
      avoidWords: ['无聊', '拖沓', '标题党'],
      formatting: '视频为主，配合弹幕文化，简介要详细',
    },
    audience: {
      demographics: '18-30岁，Z世代为主，追求兴趣内容',
      preferences: ['知识', '娱乐', '游戏', '二次元', '美食'],
      peakTime: '午12-14点，晚18-24点',
    },
    algorithmPreference: {
      emphasis: ['播放量', '三连', '弹幕', '评论'],
      penalty: ['低质', '重复', '违规'],
    },
  },
  
  toutiao: {
    id: 'toutiao',
    name: '今日头条',
    icon: '📰',
    description: '适合新闻资讯、热点评论、泛内容分发',
    supportedFormats: ['article', 'image-text', 'video', 'link'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 30,
      maxContentLength: 10000,
      maxImages: 12,
      maxVideoDuration: 600,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '客观、清晰、信息量大',
      structure: '新闻标题→核心信息→详细内容→延伸阅读',
      keywords: ['最新', '重磅', '独家', '爆料'],
      avoidWords: ['无信息量', '重复'],
      formatting: '标题吸睛，首图重要，段落清晰',
    },
    audience: {
      demographics: '25-50岁，三四线城市用户多',
      preferences: ['新闻', '热点', '生活', '娱乐'],
      peakTime: '早6-8点，午12-13点，晚20-22点',
    },
    algorithmPreference: {
      emphasis: ['点击率', '阅读时长', '互动', '账号权重'],
      penalty: ['标题党', '低质', '重复'],
    },
  },
  
  // 跳转链接配置（跨平台引流）
  jump_douyin: {
    id: 'jump_douyin',
    name: '跳转抖音',
    icon: '🔗',
    description: '内容中嵌入抖音链接，引导用户跳转',
    supportedFormats: ['jump'],
    defaultFormat: 'jump',
    features: {
      maxTitleLength: 30,
      maxContentLength: 500,
      maxImages: 9,
      maxVideoDuration: 0,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '引导性强、简短有力',
      structure: '吸引注意→引导点击→行动号召',
      keywords: ['点击查看', '完整版', '更多内容'],
      avoidWords: ['长篇'],
      formatting: '简短文案+跳转链接',
    },
    audience: {
      demographics: '跨平台用户',
      preferences: ['完整内容', '更多精彩'],
      peakTime: '全时段',
    },
    algorithmPreference: {
      emphasis: ['点击率', '转化率'],
      penalty: [],
    },
  },
  
  jump_xiaohongshu: {
    id: 'jump_xiaohongshu',
    name: '跳转小红书',
    icon: '🔗',
    description: '内容中嵌入小红书链接，引导用户跳转',
    supportedFormats: ['jump'],
    defaultFormat: 'jump',
    features: {
      maxTitleLength: 30,
      maxContentLength: 500,
      maxImages: 9,
      maxVideoDuration: 0,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: true,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '种草感强、引导自然',
      structure: '预告内容→引导点击→福利吸引',
      keywords: ['小红书搜索', '更多干货', '完整攻略'],
      avoidWords: ['硬广'],
      formatting: '简短文案+搜索引导',
    },
    audience: {
      demographics: '跨平台用户',
      preferences: ['种草', '攻略', '测评'],
      peakTime: '全时段',
    },
    algorithmPreference: {
      emphasis: ['点击率', '转化率'],
      penalty: [],
    },
  },
  
  // 百家号
  baijiahao: {
    id: 'baijiahao',
    name: '百家号',
    icon: '📘',
    description: '百度内容生态核心平台，适合新闻资讯、知识分享',
    supportedFormats: ['article', 'image-text', 'video'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 30,
      maxContentLength: 10000,
      maxImages: 20,
      maxVideoDuration: 1800,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: false,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '权威、专业、信息量大',
      structure: '标题→导语→正文→总结',
      keywords: ['专业', '权威', '深度', '独家'],
      avoidWords: ['标题党', '虚假信息'],
      formatting: '标题简洁有力，段落清晰，配图恰当',
    },
    audience: {
      demographics: '25-45岁，注重信息获取',
      preferences: ['新闻', '知识', '生活', '科技'],
      peakTime: '早7-9点，午12-13点，晚20-22点',
    },
    algorithmPreference: {
      emphasis: ['阅读量', '互动率', '内容质量'],
      penalty: ['低质', '搬运', '标题党'],
    },
  },
  
  // 搜狐号
  sohu: {
    id: 'sohu',
    name: '搜狐号',
    icon: '🟠',
    description: '搜狐自媒体平台，适合深度文章、行业观点',
    supportedFormats: ['article', 'image-text'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 30,
      maxContentLength: 8000,
      maxImages: 15,
      maxVideoDuration: 0,
      supportsEmoji: false,
      supportsMarkdown: false,
      supportsHashtag: false,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '专业、深度、有观点',
      structure: '标题→引言→正文→结语',
      keywords: ['独家', '深度', '观点', '解析'],
      avoidWords: ['水军', '广告'],
      formatting: '段落清晰，配图恰当，观点明确',
    },
    audience: {
      demographics: '25-50岁，中高收入群体',
      preferences: ['财经', '科技', '汽车', '生活'],
      peakTime: '早8-10点，晚19-22点',
    },
    algorithmPreference: {
      emphasis: ['阅读量', '转发', '评论'],
      penalty: ['低质', '抄袭'],
    },
  },
  
  // 企鹅号
  penguin: {
    id: 'penguin',
    name: '企鹅号',
    icon: '🐧',
    description: '腾讯内容开放平台，适合新闻资讯、娱乐内容',
    supportedFormats: ['article', 'image-text', 'video'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 30,
      maxContentLength: 10000,
      maxImages: 20,
      maxVideoDuration: 900,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '轻松、有趣、贴近生活',
      structure: '标题→内容→互动引导',
      keywords: ['热点', '有趣', '实用', '精彩'],
      avoidWords: ['无聊', '重复'],
      formatting: '标题吸引人，内容有趣，配图精美',
    },
    audience: {
      demographics: '18-40岁，追求娱乐和信息',
      preferences: ['娱乐', '游戏', '生活', '科技'],
      peakTime: '午12-14点，晚18-22点',
    },
    algorithmPreference: {
      emphasis: ['点击率', '完读率', '互动'],
      penalty: ['低质', '标题党'],
    },
  },
  
  // 网易号
  netease: {
    id: 'netease',
    name: '网易号',
    icon: '🔴',
    description: '网易自媒体平台，适合新闻、观点、生活类内容',
    supportedFormats: ['article', 'image-text', 'video'],
    defaultFormat: 'article',
    features: {
      maxTitleLength: 30,
      maxContentLength: 8000,
      maxImages: 15,
      maxVideoDuration: 600,
      supportsEmoji: true,
      supportsMarkdown: false,
      supportsHashtag: true,
      supportsMention: false,
      supportsLink: true,
      supportsJump: true,
    },
    styleGuide: {
      tone: '有态度、有观点、有温度',
      structure: '标题→观点→论据→结论',
      keywords: ['态度', '观点', '深度', '独家'],
      avoidWords: ['跟风', '无观点'],
      formatting: '标题有力，观点鲜明，论据充分',
    },
    audience: {
      demographics: '20-45岁，注重观点和态度',
      preferences: ['新闻', '观点', '生活', '科技'],
      peakTime: '早7-9点，晚20-23点',
    },
    algorithmPreference: {
      emphasis: ['跟贴', '分享', '阅读量'],
      penalty: ['低质', '搬运'],
    },
  },
};

/**
 * 获取平台配置
 */
export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return PLATFORM_CONFIGS[platformId];
}

/**
 * 获取平台支持的内容格式列表
 */
export function getSupportedFormats(platformId: string): ContentType[] {
  const config = PLATFORM_CONFIGS[platformId];
  return config?.supportedFormats || ['article'];
}

/**
 * 获取平台风格提示词
 */
export function getPlatformStylePrompt(platformId: string): string {
  const config = PLATFORM_CONFIGS[platformId];
  if (!config) return '';
  
  return `
## 平台风格要求：${config.name}

### 内容风格
- 语气：${config.styleGuide.tone}
- 结构：${config.styleGuide.structure}
- 格式：${config.styleGuide.formatting}

### 风格关键词
${config.styleGuide.keywords.map(k => `- ${k}`).join('\n')}

### 避免使用
${config.styleGuide.avoidWords.map(w => `- ${w}`).join('\n')}

### 受众特征
- 人群：${config.audience.demographics}
- 偏好：${config.audience.preferences.join('、')}
- 活跃时段：${config.audience.peakTime}

### 算法偏好
- 重视因素：${config.algorithmPreference.emphasis.join('、')}
- 惩罚因素：${config.algorithmPreference.penalty.join('、') || '无特殊限制'}

### 内容限制
- 标题最长${config.features.maxTitleLength || '无限制'}字
- 正文最长${config.features.maxContentLength}字
- ${config.features.maxImages > 0 ? `最多${config.features.maxImages}张图片` : '不支持图片'}
- ${config.features.maxVideoDuration > 0 ? `视频最长${Math.floor(config.features.maxVideoDuration / 60)}分钟` : '不支持视频'}
- ${config.features.supportsHashtag ? '支持话题标签' : '不支持话题标签'}
- ${config.features.supportsEmoji ? '支持表情符号' : '避免使用表情符号'}
- ${config.features.supportsMarkdown ? '支持Markdown格式' : '不支持Markdown格式'}
`;
}

/**
 * 内容格式名称映射
 */
export const CONTENT_FORMAT_NAMES: Record<ContentType, string> = {
  article: '图文文章',
  'image-text': '图文笔记',
  video: '视频内容',
  link: '链接分享',
  jump: '跳转引导',
};

/**
 * 内容格式图标映射
 */
export const CONTENT_FORMAT_ICONS: Record<ContentType, string> = {
  article: '📝',
  'image-text': '🖼️',
  video: '🎬',
  link: '🔗',
  jump: '➡️',
};
