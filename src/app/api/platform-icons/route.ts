import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 平台图标配置 - 使用可靠的 CDN 源
const platformIconConfig: Record<string, { 
  name: string; 
  iconUrl: string; 
  color: string;
  searchKeywords?: string;
}> = {
  wechat: {
    name: '微信公众号',
    iconUrl: 'https://api.iconify.design/simple-icons/wechat.svg?color=%2307c160',
    color: '#07c160',
    searchKeywords: '微信公众号 logo icon',
  },
  zhihu: {
    name: '知乎',
    iconUrl: 'https://api.iconify.design/simple-icons/zhihu.svg?color=%230066ff',
    color: '#0066ff',
    searchKeywords: '知乎 zhihu logo icon',
  },
  weibo: {
    name: '微博',
    iconUrl: 'https://api.iconify.design/simple-icons/sinaweibo.svg?color=%23ff8200',
    color: '#ff8200',
    searchKeywords: '新浪微博 weibo logo icon',
  },
  toutiao: {
    name: '今日头条',
    iconUrl: 'https://api.iconify.design/simple-icons/toutiao.svg?color=%23ff0000',
    color: '#ff0000',
    searchKeywords: '今日头条 toutiao logo icon',
  },
  bilibili: {
    name: 'B站',
    iconUrl: 'https://api.iconify.design/simple-icons/bilibili.svg?color=%2300a1d6',
    color: '#00a1d6',
    searchKeywords: '哔哩哔哩 bilibili logo icon',
  },
  xiaohongshu: {
    name: '小红书',
    iconUrl: 'https://api.iconify.design/simple-icons/xiaohongshu.svg?color=%23ff2442',
    color: '#ff2442',
    searchKeywords: '小红书 xiaohongshu logo icon',
  },
  douyin: {
    name: '抖音',
    iconUrl: 'https://api.iconify.design/simple-icons/tiktok.svg?color=%23000000',
    color: '#000000',
    searchKeywords: '抖音 douyin tiktok logo icon',
  },
  baijiahao: {
    name: '百家号',
    iconUrl: 'https://api.iconify.design/simple-icons/baidu.svg?color=%232932e1',
    color: '#2932e1',
    searchKeywords: '百家号 baijiahao baidu logo icon',
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  const search = searchParams.get('search') === 'true';

  // 如果指定了平台，返回该平台的图标信息
  if (platform && platformIconConfig[platform]) {
    const config = platformIconConfig[platform];
    
    // 如果需要搜索更新图标
    if (search) {
      try {
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const client = new SearchClient(new Config(), customHeaders);
        
        const response = await client.imageSearch(`${config.searchKeywords} official`, 5);
        
        if (response.image_items && response.image_items.length > 0) {
          // 返回搜索到的图标URL
          return NextResponse.json({
            success: true,
            data: {
              ...config,
              searchedIcons: response.image_items.slice(0, 3).map(item => ({
                url: item.image.url,
                title: item.title,
                source: item.site_name,
              })),
            },
          });
        }
      } catch (error) {
        console.error('搜索图标失败:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: config,
    });
  }

  // 返回所有平台图标配置
  return NextResponse.json({
    success: true,
    data: platformIconConfig,
  });
}
