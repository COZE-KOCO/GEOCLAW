'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  Monitor,
} from 'lucide-react';
import { DownloadClientDialog } from './download-client-dialog';

// 类型定义
interface Account {
  id: string;
  businessId: string;
  platform: string;
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  avatar?: string;
  followers: number;
  status: 'active' | 'inactive';
  authStatus: 'pending' | 'authorized' | 'expired';
  metadata?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    platformData?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthPlatform {
  platform: string;
  name: string;
  icon: string;
  color: string;
  features: {
    autoPublish: boolean;
    autoFetchInfo: boolean;
    refreshable: boolean;
  };
  configured?: boolean; // OAuth凭证是否已配置
}

interface ElectronAccount {
  id: string;
  platform: string;
  platformName: string;
  name: string;
  avatar?: string;
  fansCount?: number;
  createdAt: number;
}

interface AccountManagerProps {
  businessId: string;
}

// 平台信息（包含OAuth支持状态）
const platformInfo: Record<string, { name: string; icon: string; color: string; supportsOAuth: boolean }> = {
  wechat: { name: '微信公众号', icon: '💚', color: '#07c160', supportsOAuth: true },
  zhihu: { name: '知乎', icon: '💡', color: '#0066ff', supportsOAuth: true },
  weibo: { name: '微博', icon: '🔴', color: '#ff8200', supportsOAuth: true },
  toutiao: { name: '今日头条', icon: '📰', color: '#ff0000', supportsOAuth: true },
  bilibili: { name: 'B站', icon: '📺', color: '#00a1d6', supportsOAuth: true },
  xiaohongshu: { name: '小红书', icon: '📕', color: '#ff2442', supportsOAuth: true },
  douyin: { name: '抖音', icon: '🎵', color: '#000000', supportsOAuth: true },
  baijiahao: { name: '百家号', icon: '📘', color: '#2932e1', supportsOAuth: false },
};

export function AccountManager({ businessId }: AccountManagerProps) {
  // 检测是否在Electron环境
  const [isElectron, setIsElectron] = useState(false);
  
  // 状态
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [oauthPlatforms, setOauthPlatforms] = useState<OAuthPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorizingPlatform, setAuthorizingPlatform] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  
  // OAuth回调结果
  const [oauthResult, setOauthResult] = useState<{
    success: boolean;
    platform?: string;
    accountName?: string;
    error?: string;
  } | null>(null);
  
  // 下载客户端弹窗
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadPlatform, setDownloadPlatform] = useState<string | null>(null);

  // 检测Electron环境
  useEffect(() => {
    const checkElectron = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.isElectron();
        setIsElectron(result);
        // 设置businessId用于数据隔离
        if (result && window.electronAPI) {
          await window.electronAPI.setBusinessId(businessId);
        }
      }
    };
    checkElectron();
  }, [businessId]);

  // 加载账号列表
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      // Electron环境：使用electronAPI（数据来自服务器API，与Web版共享）
      if (isElectron && window.electronAPI) {
        const savedAccounts = await window.electronAPI.getSavedAccounts(businessId);
        // 转换为统一的Account格式
        const allAccounts: Account[] = [];
        Object.entries(savedAccounts).forEach(([platform, accounts]) => {
          (accounts as ElectronAccount[]).forEach(acc => {
            allAccounts.push({
              id: acc.id,
              businessId: businessId,
              platform: acc.platform,
              accountName: acc.name,
              displayName: acc.name,
              avatar: acc.avatar,
              followers: acc.fansCount || 0,
              status: 'active',
              authStatus: 'authorized',
              createdAt: new Date(acc.createdAt),
              updatedAt: new Date(acc.createdAt),
            });
          });
        });
        setAccounts(allAccounts);
      } else {
        // Web环境：使用API
        const res = await fetch(`/api/accounts?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          setAccounts(data.accounts || []);
        }
      }
    } catch (error) {
      console.error('加载账号失败:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId, isElectron]);

  // 加载OAuth平台列表（仅Web环境）
  const loadOAuthPlatforms = useCallback(async () => {
    if (isElectron) return; // Electron环境不需要
    try {
      const res = await fetch('/api/oauth/authorize');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOauthPlatforms(data.data || []);
        }
      }
    } catch (error) {
      console.error('加载OAuth平台失败:', error);
    }
  }, [isElectron]);

  useEffect(() => {
    loadAccounts();
    loadOAuthPlatforms();
  }, [loadAccounts, loadOAuthPlatforms]);

  // 检查URL中的OAuth回调结果
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth_success');
    const oauthError = urlParams.get('oauth_error');
    const platform = urlParams.get('platform');
    const accountName = urlParams.get('account_name');

    if (oauthSuccess === 'true' && platform) {
      setOauthResult({
        success: true,
        platform,
        accountName: accountName || undefined,
      });
      // 清除URL参数
      window.history.replaceState({}, '', window.location.pathname);
      // 刷新账号列表
      loadAccounts();
    } else if (oauthError && platform) {
      setOauthResult({
        success: false,
        platform,
        error: oauthError,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadAccounts]);

  // 发起授权（Electron环境：打开登录窗口；Web环境：OAuth跳转）
  const handleAuthorize = async (platform: string) => {
    setAuthorizingPlatform(platform);
    try {
      // Electron环境：使用内置登录窗口
      if (isElectron && window.electronAPI) {
        const result = await window.electronAPI.platformLogin(platform, businessId);
        if (result.success && result.account) {
          setOauthResult({
            success: true,
            platform: result.account.platform,
            accountName: result.account.name,
          });
          loadAccounts();
        } else {
          setOauthResult({
            success: false,
            platform,
            error: result.error || '登录失败',
          });
        }
        setAuthorizingPlatform(null);
      } else {
        // Web环境：OAuth跳转
        const res = await fetch(`/api/oauth/authorize?platform=${platform}&businessId=${businessId}`);
        const data = await res.json();
        
        if (data.success && data.data.authUrl) {
          // 跳转到授权页面
          window.location.href = data.data.authUrl;
        } else {
          throw new Error(data.error || '获取授权链接失败');
        }
      }
    } catch (error: any) {
      console.error('授权失败:', error);
      setOauthResult({
        success: false,
        platform,
        error: error.message,
      });
      setAuthorizingPlatform(null);
    }
  };

  // 解绑账号
  const handleUnbind = async (accountId: string) => {
    try {
      // Electron环境
      if (isElectron && window.electronAPI) {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
          await window.electronAPI.removeAccount(account.platform, accountId);
          loadAccounts();
        }
        return;
      }
      
      // Web环境
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          data: { id: accountId },
        }),
      });
      
      if (res.ok) {
        loadAccounts();
      }
    } catch (error) {
      console.error('解绑失败:', error);
    }
  };

  // 刷新账号信息
  const handleRefresh = async (accountId: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refresh',
          data: { id: accountId },
        }),
      });
      
      if (res.ok) {
        loadAccounts();
      }
    } catch (error) {
      console.error('刷新失败:', error);
    }
  };

  // 获取授权状态Badge
  const getAuthStatusBadge = (account: Account) => {
    switch (account.authStatus) {
      case 'authorized':
        return (
          <Badge className="bg-green-100 text-green-800">
            <ShieldCheck className="h-3 w-3 mr-1" />
            已授权
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800">
            <ShieldAlert className="h-3 w-3 mr-1" />
            已过期
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3 mr-1" />
            待授权
          </Badge>
        );
    }
  };

  // 计算已绑定和未绑定的平台
  const boundPlatforms = Object.keys(platformInfo).filter(p => 
    accounts.some(a => a.platform === p)
  );
  const unboundPlatforms = Object.keys(platformInfo).filter(p => 
    !accounts.some(a => a.platform === p)
  );

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            账号授权管理
            {isElectron && (
              <Badge className="bg-blue-100 text-blue-800">
                <Monitor className="h-3 w-3 mr-1" />
                桌面版
              </Badge>
            )}
          </h3>
          <p className="text-sm text-gray-500">
            {isElectron 
              ? '点击平台图标，在弹窗中登录即可自动绑定账号，无需配置OAuth凭证'
              : '通过OAuth授权绑定平台账号，授权后自动获取账号信息'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAccounts}>
          <RefreshCw className="h-4 w-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* Electron环境提示 */}
      {isElectron && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Monitor className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  桌面版免配置登录
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  点击平台图标，系统会打开登录窗口，登录成功后自动绑定账号。无需申请OAuth凭证！
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OAuth结果提示 */}
      {oauthResult && (
        <Card className={oauthResult.success ? 'border-green-500' : 'border-red-500'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {oauthResult.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">
                      账号授权成功！
                    </p>
                    <p className="text-sm text-green-600">
                      {platformInfo[oauthResult.platform!]?.name} - {oauthResult.accountName}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">
                      授权失败
                    </p>
                    <p className="text-sm text-red-600">
                      {platformInfo[oauthResult.platform!]?.name}: {oauthResult.error}
                    </p>
                  </div>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setOauthResult(null)}
              >
                关闭
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加账号 - 平台选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-500" />
            绑定新账号
          </CardTitle>
          <CardDescription>
            {isElectron 
              ? '点击平台图标，在弹窗中登录即可自动绑定账号'
              : '点击平台图标下载客户端，使用客户端绑定账号'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
            {Object.entries(platformInfo).map(([id, info]) => {
              const isBound = accounts.some(a => a.platform === id);
              const isAuthorizing = authorizingPlatform === id;
              // Web环境检查OAuth配置，Electron环境所有平台都可用
              const platformConfig = oauthPlatforms.find(p => p.platform === id);
              const isConfigured = isElectron ? true : (platformConfig?.configured ?? false);
              const canAuthorize = isElectron ? true : (info.supportsOAuth && isConfigured);
              
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (!isBound) {
                      if (isElectron) {
                        // Electron环境：使用内置登录
                        handleAuthorize(id);
                      } else {
                        // Web环境：显示下载客户端提示
                        setDownloadPlatform(id);
                        setShowDownloadDialog(true);
                      }
                    }
                  }}
                  disabled={isBound || isAuthorizing}
                  className={`
                    relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${isBound 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950 cursor-default' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer'
                    }
                  `}
                >
                  {/* 已绑定标记 */}
                  {isBound && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  
                  {/* 平台图标 */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${info.color}20` }}
                  >
                    {info.icon}
                  </div>
                  
                  {/* 平台名称 */}
                  <span className="text-xs font-medium text-center">{info.name}</span>
                  
                  {/* 状态 */}
                  {isAuthorizing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {isBound && !isAuthorizing && (
                    <span className="text-xs text-green-600">已绑定</span>
                  )}
                  {!isBound && !isAuthorizing && (
                    <span className="text-xs text-blue-600">点击绑定</span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 已绑定账号 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            已绑定账号 ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无已绑定的账号</p>
              <p className="text-sm">点击上方平台图标开始授权绑定</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {accounts.map((account) => {
                  const info = platformInfo[account.platform] || { name: account.platform, icon: '?', color: '#888' };
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {/* 平台图标 */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${info.color}20` }}
                        >
                          {account.avatar ? (
                            <img src={account.avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            info.icon
                          )}
                        </div>
                        
                        {/* 账号信息 */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.displayName}</span>
                            {account.homepageUrl && (
                              <a
                                href={account.homepageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{info.name}</span>
                            {account.followers > 0 && (
                              <>
                                <span>•</span>
                                <span>{(account.followers / 1000).toFixed(1)}k 粉丝</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getAuthStatusBadge(account)}
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefresh(account.id)}
                            title="刷新信息"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setAccountToDelete(account.id)}
                            title="解绑账号"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">1</div>
            <p>点击平台图标发起授权，将跳转到对应平台进行登录授权</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">2</div>
            <p>授权成功后自动返回，系统将自动获取账号名称、头像、粉丝数等信息</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium shrink-0">3</div>
            <p>账号绑定后，可在"自动化发布"中使用该账号进行自动发布</p>
          </div>
          <Separator className="my-3" />
          <div className="flex items-start gap-2 text-yellow-700 bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>部分平台需要在开放平台申请OAuth应用，配置相应的App ID和Secret后才能使用授权功能</p>
          </div>
        </CardContent>
      </Card>

      {/* 手动配置/未配置对话框 */}
      <Dialog open={showOAuthDialog} onOpenChange={setShowOAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlatform && platformInfo[selectedPlatform]?.supportsOAuth 
                ? 'OAuth凭证未配置' 
                : '手动配置账号'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlatform && platformInfo[selectedPlatform]?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedPlatform && platformInfo[selectedPlatform]?.supportsOAuth ? (
              <>
                <p className="text-sm text-gray-600">
                  该平台的OAuth凭证尚未配置，无法使用一键授权功能。
                </p>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium mb-2">配置方法：</p>
                  <ol className="text-sm text-gray-600 space-y-2">
                    <li>1. 前往 {platformInfo[selectedPlatform]?.name} 开放平台申请OAuth应用</li>
                    <li>2. 获取 App ID 和 App Secret</li>
                    <li>3. 联系管理员配置环境变量：</li>
                  </ol>
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    {selectedPlatform.toUpperCase()}_APP_ID=xxx<br />
                    {selectedPlatform.toUpperCase()}_APP_SECRET=xxx
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  该平台暂不支持OAuth授权接口。
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-500">
                  <li>• 使用浏览器插件进行自动发布</li>
                  <li>• 通过平台官方创作者工具发布</li>
                  <li>• 联系我们了解更多解决方案</li>
                </ul>
              </>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowOAuthDialog(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 解绑确认对话框 */}
      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑账号</AlertDialogTitle>
            <AlertDialogDescription>
              解绑后将无法使用该账号进行自动发布，确定要解绑吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (accountToDelete) {
                  handleUnbind(accountToDelete);
                  setAccountToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              确认解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 下载客户端弹窗 */}
      <DownloadClientDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        platform={downloadPlatform || undefined}
      />
    </div>
  );
}
