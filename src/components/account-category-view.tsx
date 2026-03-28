'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe,
  Bot,
  Building2,
  RefreshCw,
  Plus,
  Webhook,
  Settings,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { 
  PlatformCategory, 
  AIModel, 
  CATEGORY_NAMES, 
  AI_MODEL_NAMES,
  PLATFORM_LIST,
  AI_MODEL_GEO_PLATFORMS,
  getPlatformAiModels,
  type PlatformInfo 
} from '@/config/platforms';

interface Account {
  id: string;
  businessId: string;
  platform: string;
  platformCategory?: PlatformCategory;
  aiModel?: AIModel;
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers: number;
  status: 'active' | 'inactive' | 'pending';
  webhookConfig?: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT';
    headers?: Record<string, string>;
    authToken?: string;
    enabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface AccountCategoryViewProps {
  businessId: string;
  onAddAccount?: (category: PlatformCategory, aiModel?: AIModel, platformId?: string) => void;
  onEditAccount?: (account: Account) => void;
  onDeleteAccount?: (accountId: string) => void;
  onTestWebhook?: (account: Account) => void;
}

// 平台图标映射
const platformIcons: Record<string, string> = {
  toutiao: 'https://api.iconify.design/simple-icons/toutiao.svg?color=%23ff0000',
  zhihu: 'https://api.iconify.design/simple-icons/zhihu.svg?color=%230066ff',
  weibo: 'https://api.iconify.design/simple-icons/sinaweibo.svg?color=%23ff8200',
  bilibili: 'https://api.iconify.design/simple-icons/bilibili.svg?color=%2300a1d6',
  xiaohongshu: 'https://api.iconify.design/simple-icons/xiaohongshu.svg?color=%23ff2442',
  douyin: 'https://api.iconify.design/simple-icons/tiktok.svg?color=%23000000',
  weixin: 'https://api.iconify.design/simple-icons/wechat.svg?color=%2307c160',
  sohu: 'https://api.iconify.design/simple-icons/sohu.svg?color=%23ff6600',
  wangyi: 'https://api.iconify.design/simple-icons/netease.svg?color=%23d43c33',
  tencent: 'https://api.iconify.design/simple-icons/tencentqq.svg?color=%2312b7f5',
  baike: 'https://api.iconify.design/simple-icons/baidu.svg?color=%232932e1',
  baijiahao: 'https://api.iconify.design/simple-icons/baidu.svg?color=%232932e1',
  smzdm: 'https://api.iconify.design/simple-icons/shenmemezhide.svg?color=%23e31436',
};

export function AccountCategoryView({
  businessId,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onTestWebhook,
}: AccountCategoryViewProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载账号数据
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('加载账号失败:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // 按分类分组账号
  const platformAccounts = accounts.filter(a => 
    !a.platformCategory || a.platformCategory === PlatformCategory.PLATFORM
  );
  const geoAccounts = accounts.filter(a => 
    a.platformCategory === PlatformCategory.GEO_PLATFORM
  );
  const officialSiteAccounts = accounts.filter(a => 
    a.platformCategory === PlatformCategory.OFFICIAL_SITE
  );

  // 获取账号数量（按平台）
  const getAccountCountByPlatform = (platformId: string) => {
    return accounts.filter(a => a.platform === platformId).length;
  };

  // 获取GEO平台账号数量（按平台）
  const getGeoAccountCountByPlatform = (platformId: string) => {
    return geoAccounts.filter(a => a.platform === platformId).length;
  };

  // 获取平台图标
  const getPlatformIcon = (platformId: string) => {
    return platformIcons[platformId] || '';
  };

  // 渲染账号卡片
  const renderAccountCard = (account: Account) => {
    const icon = getPlatformIcon(account.platform);
    
    return (
      <div
        key={account.id}
        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          {/* 平台图标 */}
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
            {icon ? (
              <img src={icon} alt="" className="w-6 h-6" onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} />
            ) : (
              <span className="text-lg">{account.platform.charAt(0).toUpperCase()}</span>
            )}
          </div>
          
          {/* 账号信息 */}
          <div>
            <div className="font-medium">{account.displayName || account.accountName}</div>
            <div className="text-sm text-slate-500">
              {account.followers > 0 && (
                <span>{(account.followers / 1000).toFixed(1)}k 粉丝</span>
              )}
            </div>
          </div>
        </div>
        
        {/* 状态 */}
        <div className="flex items-center gap-2">
          {account.status === 'active' ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              活跃
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              未激活
            </Badge>
          )}
          
          {account.webhookConfig?.enabled && (
            <Badge className="bg-blue-100 text-blue-800">
              <Webhook className="h-3 w-3 mr-1" />
              Webhook
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // 渲染平台选择按钮
  const renderPlatformButton = (
    platformId: string, 
    platformName: string,
    onClick?: () => void
  ) => {
    const count = getAccountCountByPlatform(platformId);
    const icon = getPlatformIcon(platformId);
    
    return (
      <button
        key={platformId}
        onClick={onClick}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer
          ${count > 0 
            ? 'border-green-500 bg-green-50 dark:bg-green-950 hover:border-blue-500' 
            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950'
          }
        `}
      >
        {count > 0 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {count}
          </div>
        )}
        
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
          {icon ? (
            <img src={icon} alt={platformName} className="w-6 h-6" onError={(e) => {
              e.currentTarget.style.display = 'none';
            }} />
          ) : (
            <span className="text-lg font-bold text-slate-600">{platformName.charAt(0)}</span>
          )}
        </div>
        
        <span className="text-xs font-medium text-center">{platformName}</span>
        
        {count > 0 ? (
          <span className="text-xs text-green-600">已绑定{count}个</span>
        ) : (
          <span className="text-xs text-blue-600">点击绑定</span>
        )}
      </button>
    );
  };

  // 渲染GEO平台按钮（带AI模型标记）
  const renderGeoPlatformButton = (
    platformId: string,
    platformName: string,
    aiModels: AIModel[],
    onClick?: () => void
  ) => {
    const count = getGeoAccountCountByPlatform(platformId);
    const icon = getPlatformIcon(platformId);
    
    return (
      <button
        key={platformId}
        onClick={onClick}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all cursor-pointer
          ${count > 0 
            ? 'border-green-500 bg-green-50 dark:bg-green-950 hover:border-blue-500' 
            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950'
          }
        `}
      >
        {count > 0 && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {count}
          </div>
        )}
        
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
          {icon ? (
            <img src={icon} alt={platformName} className="w-6 h-6" onError={(e) => {
              e.currentTarget.style.display = 'none';
            }} />
          ) : (
            <span className="text-lg font-bold text-slate-600">{platformName.charAt(0)}</span>
          )}
        </div>
        
        <span className="text-xs font-medium text-center">{platformName}</span>
        
        {/* 显示采集此平台的AI模型 */}
        <div className="flex flex-wrap gap-0.5 justify-center">
          {aiModels.slice(0, 3).map(model => (
            <Badge key={model} variant="outline" className="text-[10px] px-1 py-0">
              {AI_MODEL_NAMES[model]}
            </Badge>
          ))}
        </div>
      </button>
    );
  };

  // 统计数据
  const stats = {
    platform: platformAccounts.length,
    geo: geoAccounts.length,
    official: officialSiteAccounts.length,
  };

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.platform}</div>
                <div className="text-sm text-slate-500">自媒体平台</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.geo}</div>
                <div className="text-sm text-slate-500">GEO采集平台</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.official}</div>
                <div className="text-sm text-slate-500">官网</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类展示 */}
      <Tabs defaultValue={PlatformCategory.PLATFORM} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value={PlatformCategory.PLATFORM}>
            <Globe className="h-4 w-4 mr-2" />
            自媒体平台 ({stats.platform})
          </TabsTrigger>
          <TabsTrigger value={PlatformCategory.GEO_PLATFORM}>
            <Bot className="h-4 w-4 mr-2" />
            GEO采集平台 ({stats.geo})
          </TabsTrigger>
          <TabsTrigger value={PlatformCategory.OFFICIAL_SITE}>
            <Building2 className="h-4 w-4 mr-2" />
            官网 ({stats.official})
          </TabsTrigger>
        </TabsList>

        {/* ========== 自媒体平台 ========== */}
        <TabsContent value={PlatformCategory.PLATFORM} className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>自媒体平台账号</CardTitle>
                  <CardDescription>
                    传统自媒体平台，支持自动发布
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddAccount?.(PlatformCategory.PLATFORM)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加账号
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 平台选择网格 */}
              <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                {PLATFORM_LIST.map(platform => (
                  renderPlatformButton(
                    platform.id,
                    platform.name,
                    () => onAddAccount?.(PlatformCategory.PLATFORM, undefined, platform.id)
                  )
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 已绑定账号列表 */}
          {platformAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">已绑定账号</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {platformAccounts.map(renderAccountCard)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== GEO采集平台 ========== */}
        <TabsContent value={PlatformCategory.GEO_PLATFORM} className="mt-4 space-y-6">
          {/* 高权重提示 */}
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    GEO优化策略
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    搜狐号在 DeepSeek、豆包、元宝、Kimi、千问等多个AI模型中都是高优先级采集源，强烈推荐优先绑定！
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 按AI模型分组显示 */}
          {Object.entries(AI_MODEL_GEO_PLATFORMS).map(([model, platforms]) => (
            <Card key={model}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-500" />
                    <CardTitle>{AI_MODEL_NAMES[model as AIModel]}</CardTitle>
                    <Badge variant="outline">
                      {platforms.length}个平台
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddAccount?.(PlatformCategory.GEO_PLATFORM, model as AIModel)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加账号
                  </Button>
                </div>
                <CardDescription>
                  {model === AIModel.DEEPSEEK && 'DeepSeek AI 搜索优先采集以下平台'}
                  {model === AIModel.DOUBAO && '豆包 AI 搜索优先采集以下平台'}
                  {model === AIModel.YUANBAO && '元宝 AI 搜索优先采集以下平台'}
                  {model === AIModel.BAIDU && '百度/文心 AI 搜索优先采集以下平台'}
                  {model === AIModel.KIMI && 'Kimi AI 搜索优先采集以下平台'}
                  {model === AIModel.QIANWEN && '千问/夸克 AI 搜索优先采集以下平台'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {platforms.map(platform => (
                    renderGeoPlatformButton(
                      platform.id,
                      platform.name,
                      getPlatformAiModels(platform.id),
                      () => onAddAccount?.(PlatformCategory.GEO_PLATFORM, model as AIModel, platform.id)
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 已绑定账号列表 */}
          {geoAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">已绑定GEO账号</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {geoAccounts.map(account => (
                      <div key={account.id} className="flex items-center gap-2">
                        {renderAccountCard(account)}
                        {account.aiModel && (
                          <Badge variant="outline" className="shrink-0">
                            {AI_MODEL_NAMES[account.aiModel]}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== 官网 ========== */}
        <TabsContent value={PlatformCategory.OFFICIAL_SITE} className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>官网推送配置</CardTitle>
                  <CardDescription>
                    通过Webhook推送内容到企业官网
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddAccount?.(PlatformCategory.OFFICIAL_SITE)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加官网
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-slate-500">加载中...</div>
              ) : officialSiteAccounts.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无官网配置</p>
                  <p className="text-sm">添加官网并配置Webhook实现内容推送</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {officialSiteAccounts.map(renderAccountCard)}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Webhook配置说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook推送说明
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-2">
              <p>1. 添加官网并配置Webhook URL</p>
              <p>2. 设置请求方法（POST/GET/PUT）和认证Token</p>
              <p>3. 测试连接确保配置正确</p>
              <p>4. 发布内容时选择官网推送</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AccountCategoryView;
