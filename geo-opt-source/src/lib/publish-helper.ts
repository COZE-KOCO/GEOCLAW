/**
 * 发布助手
 * 提供一键发布到各平台的功能
 */

// 平台发布页面配置
export const PLATFORM_PUBLISH_CONFIG: Record<string, {
  name: string;
  icon: string;
  publishUrl: string;
  color: string;
  supportsAutoFill: boolean;
  instructions: string[];
}> = {
  xiaohongshu: {
    name: '小红书',
    icon: '📕',
    publishUrl: 'https://creator.xiaohongshu.com/publish/publish',
    color: '#ff2442',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将自动打开小红书创作者中心',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 添加图片/视频后点击发布',
    ],
  },
  zhihu: {
    name: '知乎',
    icon: '💡',
    publishUrl: 'https://zhuanlan.zhihu.com/write',
    color: '#0066ff',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将自动打开知乎专栏',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 添加封面图后点击发布',
    ],
  },
  wechat: {
    name: '微信公众号',
    icon: '💚',
    publishUrl: 'https://mp.weixin.qq.com',
    color: '#07c160',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开微信公众平台',
      '2. 登录后进入图文消息编辑',
      '3. 内容已复制到剪贴板，请粘贴使用',
    ],
  },
  toutiao: {
    name: '今日头条',
    icon: '📰',
    publishUrl: 'https://mp.toutiao.com/profile_v4/graphic/publish',
    color: '#ff0000',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将自动打开头条号后台',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 选择分类后点击发布',
    ],
  },
  baijiahao: {
    name: '百家号',
    icon: '📘',
    publishUrl: 'https://baijiahao.baidu.com/builder/app/publish',
    color: '#2932e1',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将自动打开百家号后台',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 选择分类后点击发布',
    ],
  },
  douyin: {
    name: '抖音',
    icon: '🎵',
    publishUrl: 'https://creator.douyin.com/creator-micro/content/upload',
    color: '#000000',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开抖音创作者中心',
      '2. 文案已复制，请配合视频使用',
      '3. 上传视频后粘贴文案发布',
    ],
  },
  weibo: {
    name: '微博',
    icon: '🔴',
    publishUrl: 'https://weibo.com',
    color: '#ff8200',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开微博首页',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 添加图片后点击发布',
    ],
  },
  bilibili: {
    name: 'B站',
    icon: '📺',
    publishUrl: 'https://member.bilibili.com/platform/home',
    color: '#00a1d6',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开B站创作中心',
      '2. 选择投稿类型（专栏/视频）',
      '3. 内容已复制到剪贴板，请粘贴使用',
    ],
  },
  jianshu: {
    name: '简书',
    icon: '📝',
    publishUrl: 'https://www.jianshu.com/writer',
    color: '#ea6f5a',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开简书编辑器',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 选择专题后点击发布',
    ],
  },
  douban: {
    name: '豆瓣',
    icon: '📖',
    publishUrl: 'https://www.douban.com/note/create',
    color: '#007722',
    supportsAutoFill: false,
    instructions: [
      '1. 点击发布后，将打开豆瓣日记',
      '2. 内容已复制到剪贴板，请粘贴使用',
      '3. 选择推荐后点击发布',
    ],
  },
};

/**
 * 复制内容到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案：使用 execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * 格式化内容用于发布
 */
export function formatContentForPublish(
  title: string,
  content: string,
  platform: string,
  options?: {
    tags?: string[];
    includeTitle?: boolean;
  }
): string {
  const config = PLATFORM_PUBLISH_CONFIG[platform];
  if (!config) return content;

  let formattedContent = '';

  // 根据平台特点格式化
  switch (platform) {
    case 'xiaohongshu':
      // 小红书：标题+正文+标签
      formattedContent = `${title}\n\n${content}`;
      if (options?.tags?.length) {
        formattedContent += '\n\n' + options.tags.map(t => `#${t}`).join(' ');
      }
      break;

    case 'weibo':
      // 微博：字数限制，简洁为主
      formattedContent = content.substring(0, 2000);
      if (options?.tags?.length) {
        formattedContent += ' ' + options.tags.slice(0, 3).map(t => `#${t}#`).join(' ');
      }
      break;

    case 'douyin':
      // 抖音：短视频文案，简洁
      formattedContent = content.substring(0, 500);
      if (options?.tags?.length) {
        formattedContent += '\n' + options.tags.slice(0, 5).map(t => `#${t}`).join(' ');
      }
      break;

    default:
      // 默认：标题+正文
      if (options?.includeTitle !== false) {
        formattedContent = `# ${title}\n\n${content}`;
      } else {
        formattedContent = content;
      }
  }

  return formattedContent;
}

/**
 * 一键发布到平台
 * 1. 复制内容到剪贴板
 * 2. 打开平台发布页面
 */
export async function publishToPlatform(
  platform: string,
  content: string,
  options?: {
    title?: string;
    tags?: string[];
  }
): Promise<{ success: boolean; message: string }> {
  const config = PLATFORM_PUBLISH_CONFIG[platform];
  if (!config) {
    return { success: false, message: '不支持的平台' };
  }

  // 格式化内容
  const formattedContent = options?.title 
    ? formatContentForPublish(options.title, content, platform, { tags: options.tags })
    : content;

  // 复制到剪贴板
  const copied = await copyToClipboard(formattedContent);
  
  if (!copied) {
    return { success: false, message: '复制到剪贴板失败，请手动复制' };
  }

  // 打开发布页面
  window.open(config.publishUrl, '_blank');

  return { 
    success: true, 
    message: `内容已复制！正在打开${config.name}发布页面...`,
  };
}

/**
 * 批量发布到多个平台
 */
export async function batchPublish(
  platforms: string[],
  title: string,
  content: string,
  options?: {
    tags?: string[];
    onProgress?: (platform: string, index: number, total: number) => void;
  }
): Promise<{ platform: string; success: boolean; message: string }[]> {
  const results: { platform: string; success: boolean; message: string }[] = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    options?.onProgress?.(platform, i, platforms.length);
    
    const result = await publishToPlatform(platform, content, { title, tags: options?.tags });
    results.push({ platform, ...result });

    // 间隔一段时间，避免浏览器阻止弹出窗口
    if (i < platforms.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * 获取平台发布配置
 */
export function getPlatformConfig(platform: string) {
  return PLATFORM_PUBLISH_CONFIG[platform];
}

/**
 * 获取所有支持的平台列表
 */
export function getSupportedPlatforms() {
  return Object.entries(PLATFORM_PUBLISH_CONFIG).map(([id, config]) => ({
    id,
    ...config,
  }));
}
