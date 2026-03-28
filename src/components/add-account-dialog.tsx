'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Bot,
  Building2,
  Webhook,
  TestTube,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  PlatformCategory,
  AIModel,
  AI_MODEL_NAMES,
  PLATFORM_LIST,
  AI_MODEL_GEO_PLATFORMS,
  getPlatformAiModels,
} from '@/config/platforms';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  defaultCategory?: PlatformCategory;
  defaultAiModel?: AIModel;
  defaultPlatform?: string;
  onSuccess?: () => void;
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

export function AddAccountDialog({
  open,
  onOpenChange,
  businessId,
  defaultCategory,
  defaultAiModel,
  defaultPlatform,
  onSuccess,
}: AddAccountDialogProps) {
  const [category, setCategory] = useState<PlatformCategory>(
    defaultCategory || PlatformCategory.PLATFORM
  );
  const [aiModel, setAiModel] = useState<AIModel>(
    defaultAiModel || AIModel.DEEPSEEK
  );
  const [platform, setPlatform] = useState<string>(defaultPlatform || '');
  const [accountName, setAccountName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  
  // Webhook配置
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookMethod, setWebhookMethod] = useState<'POST' | 'GET' | 'PUT'>('POST');
  const [webhookAuthToken, setWebhookAuthToken] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  
  // 状态
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 重置表单
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory || PlatformCategory.PLATFORM);
      setAiModel(defaultAiModel || AIModel.DEEPSEEK);
      setPlatform(defaultPlatform || '');
      setAccountName('');
      setDisplayName('');
      setHomepageUrl('');
      setWebhookUrl('');
      setWebhookMethod('POST');
      setWebhookAuthToken('');
      setWebhookEnabled(true);
      setTestResult(null);
    }
  }, [open, defaultCategory, defaultAiModel, defaultPlatform]);

  // 获取当前分类可用的平台列表
  const getAvailablePlatforms = () => {
    if (category === PlatformCategory.PLATFORM) {
      return PLATFORM_LIST;
    }
    if (category === PlatformCategory.GEO_PLATFORM) {
      return AI_MODEL_GEO_PLATFORMS[aiModel] || [];
    }
    return []; // 官网不需要选择平台
  };

  // 测试Webhook连接
  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      setTestResult({ success: false, message: '请输入Webhook URL' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookConfig: {
            url: webhookUrl,
            method: webhookMethod,
            authToken: webhookAuthToken,
            enabled: webhookEnabled,
          },
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试失败，请检查网络连接',
      });
    } finally {
      setTesting(false);
    }
  };

  // 保存账号
  const handleSave = async () => {
    if (!accountName) {
      alert('请输入账号名称');
      return;
    }

    if (category !== PlatformCategory.OFFICIAL_SITE && !platform) {
      alert('请选择平台');
      return;
    }

    if (category === PlatformCategory.OFFICIAL_SITE && !webhookUrl) {
      alert('官网账号需要配置Webhook URL');
      return;
    }

    setSaving(true);

    try {
      const body: any = {
        businessId,
        platform: platform || 'official_site',
        platformCategory: category,
        accountName,
        displayName,
        homepageUrl,
        status: 'active',
      };

      if (category === PlatformCategory.GEO_PLATFORM) {
        body.aiModel = aiModel;
      }

      if (category === PlatformCategory.OFFICIAL_SITE) {
        body.webhookConfig = {
          url: webhookUrl,
          method: webhookMethod,
          authToken: webhookAuthToken,
          enabled: webhookEnabled,
        };
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSuccess?.();
        onOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>添加账号</DialogTitle>
          <DialogDescription>
            添加自媒体平台、GEO采集平台或官网账号
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 分类选择 */}
          <div className="space-y-2">
            <Label>账号分类</Label>
            <div className="flex gap-2">
              <Button
                variant={category === PlatformCategory.PLATFORM ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(PlatformCategory.PLATFORM)}
              >
                <Globe className="h-4 w-4 mr-1" />
                自媒体
              </Button>
              <Button
                variant={category === PlatformCategory.GEO_PLATFORM ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(PlatformCategory.GEO_PLATFORM)}
              >
                <Bot className="h-4 w-4 mr-1" />
                GEO平台
              </Button>
              <Button
                variant={category === PlatformCategory.OFFICIAL_SITE ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(PlatformCategory.OFFICIAL_SITE)}
              >
                <Building2 className="h-4 w-4 mr-1" />
                官网
              </Button>
            </div>
          </div>

          {/* GEO平台 - AI模型选择 */}
          {category === PlatformCategory.GEO_PLATFORM && (
            <div className="space-y-2">
              <Label>AI模型</Label>
              <Select value={aiModel} onValueChange={(v) => {
                setAiModel(v as AIModel);
                setPlatform(''); // 切换模型时清空平台选择
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_MODEL_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* 显示该AI模型采集的平台 */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-slate-500">采集平台:</span>
                {getAvailablePlatforms().map((p) => (
                  <Badge
                    key={p.id}
                    variant={p.id === platform ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => setPlatform(p.id)}
                  >
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 平台选择（非官网） */}
          {category !== PlatformCategory.OFFICIAL_SITE && (
            <div className="space-y-2">
              <Label>平台</Label>
              <Select value={platform || undefined} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePlatforms().map((p) => {
                    const icon = platformIcons[p.id];
                    const aiModels = category === PlatformCategory.GEO_PLATFORM 
                      ? getPlatformAiModels(p.id) 
                      : [];
                    
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          {icon && (
                            <img src={icon} alt="" className="w-4 h-4" />
                          )}
                          <span>{p.name}</span>
                          {aiModels.length > 1 && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {aiModels.length}个AI
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>账号名称 *</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="输入账号名称"
              />
            </div>
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="输入显示名称"
              />
            </div>
          </div>

          {/* 主页URL */}
          {category !== PlatformCategory.OFFICIAL_SITE && (
            <div className="space-y-2">
              <Label>主页URL</Label>
              <Input
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {/* 官网Webhook配置 */}
          {category === PlatformCategory.OFFICIAL_SITE && (
            <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Webhook className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Webhook配置</span>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL *</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-site.com/api/webhook"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>请求方法</Label>
                  <Select
                    value={webhookMethod}
                    onValueChange={(v) => setWebhookMethod(v as typeof webhookMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>认证Token（可选）</Label>
                  <Input
                    type="password"
                    value={webhookAuthToken}
                    onChange={(e) => setWebhookAuthToken(e.target.value)}
                    placeholder="Bearer token"
                  />
                </div>
              </div>

              {/* 测试连接 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhook}
                  disabled={testing || !webhookUrl}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-1" />
                  )}
                  测试连接
                </Button>
                
                {testResult && (
                  <div className={`flex items-center gap-1 text-sm ${
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddAccountDialog;
