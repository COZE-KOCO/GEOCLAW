'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 平台图标映射
const platformIcons: Record<string, string> = {
  xiaohongshu: '📕',
  douyin: '🎵',
  kuaishou: '⚡',
  weixin: '💬',
  zhihu: '📘',
  weibo: '🔴',
  bilibili: '📺',
  toutiao: '📰',
};

// 平台名称映射
const platformNames: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  kuaishou: '快手',
  weixin: '微信',
  zhihu: '知乎',
  weibo: '微博',
  bilibili: 'B站',
  toutiao: '今日头条',
};

interface Account {
  id: string;
  platform: string;
  accountName: string;
  accountId: string;
  status: 'active' | 'expired' | 'error';
  avatar?: string;
}

interface PlatformAccountSelectorProps {
  value: Array<{
    platform: string;
    accountId: string;
    accountName?: string;
  }>;
  onChange: (value: PlatformAccountSelectorProps['value']) => void;
  businessId?: string;
  disabled?: boolean;
}

/**
 * 平台账号选择器组件
 * 
 * 支持多选已绑定的平台账号
 */
export function PlatformAccountSelector({
  value,
  onChange,
  businessId,
  disabled,
}: PlatformAccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载账号列表
  useEffect(() => {
    if (businessId) {
      loadAccounts();
    }
  }, [businessId]);

  const loadAccounts = async () => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('加载账号列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 按平台分组
  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  // 过滤搜索结果
  const filteredGroups = Object.entries(groupedAccounts).filter(([platform, accs]) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      platformNames[platform]?.toLowerCase().includes(query) ||
      accs.some(acc => acc.accountName.toLowerCase().includes(query))
    );
  });

  // 检查是否选中
  const isSelected = (accountId: string) => {
    return value.some(v => v.accountId === accountId);
  };

  // 切换选择
  const toggleSelect = (account: Account) => {
    if (isSelected(account.id)) {
      onChange(value.filter(v => v.accountId !== account.id));
    } else {
      onChange([
        ...value,
        {
          platform: account.platform,
          accountId: account.id,
          accountName: account.accountName,
        },
      ]);
    }
  };

  // 获取账号状态图标
  const getStatusIcon = (status: Account['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // 获取账号状态文本
  const getStatusText = (status: Account['status']) => {
    switch (status) {
      case 'active':
        return '正常';
      case 'expired':
        return '已过期';
      case 'error':
        return '异常';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载账号列表...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">暂无已绑定的账号</p>
        <p className="text-xs mt-1">请在桌面版中绑定平台账号</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索平台或账号..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 账号列表 */}
      <ScrollArea className="h-[200px] border rounded-lg">
        <div className="p-2 space-y-4">
          {filteredGroups.map(([platform, accs]) => (
            <div key={platform}>
              {/* 平台标题 */}
              <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                <span>{platformIcons[platform] || '📱'}</span>
                <span>{platformNames[platform] || platform}</span>
                <Badge variant="outline" className="text-xs">
                  {accs.length}
                </Badge>
              </div>

              {/* 账号列表 */}
              <div className="space-y-1 mt-1">
                {accs.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => !disabled && toggleSelect(account)}
                    className={cn(
                      'flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors',
                      isSelected(account.id)
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Checkbox
                      checked={isSelected(account.id)}
                      onCheckedChange={() => toggleSelect(account)}
                      disabled={disabled}
                    />
                    
                    {/* 账号头像 */}
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.accountName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                        {account.accountName.charAt(0)}
                      </div>
                    )}

                    {/* 账号信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {account.accountName}
                        </span>
                        {getStatusIcon(account.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{account.accountId}</span>
                        <span>·</span>
                        <span>{getStatusText(account.status)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 已选择数量 */}
      {value.length > 0 && (
        <div className="text-sm text-muted-foreground">
          已选择 {value.length} 个账号
        </div>
      )}
    </div>
  );
}
