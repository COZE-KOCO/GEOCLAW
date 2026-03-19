'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Copy,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  getSupportedPlatforms,
  getPlatformConfig,
  copyToClipboard,
  formatContentForPublish,
} from '@/lib/publish-helper';

interface PublishAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  tags?: string[];
  accounts?: Array<{
    platform: string;
    displayName: string;
  }>;
}

export function PublishAssistant({
  open,
  onOpenChange,
  title,
  content,
  tags = [],
  accounts = [],
}: PublishAssistantProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<Map<string, { success: boolean; message: string }>>(new Map());
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const platforms = getSupportedPlatforms();

  // 按平台分组账号
  const accountsByPlatform = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) {
      acc[account.platform] = [];
    }
    acc[account.platform].push(account);
    return acc;
  }, {} as Record<string, typeof accounts>);

  // 切换平台选择
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  // 复制内容（针对特定平台格式化）
  const handleCopyContent = async (platformId: string) => {
    const formattedContent = formatContentForPublish(title, content, platformId, { tags });
    const success = await copyToClipboard(formattedContent);
    
    if (success) {
      setCopiedPlatform(platformId);
      setTimeout(() => setCopiedPlatform(null), 2000);
    }
  };

  // 一键发布到单个平台
  const handlePublishToPlatform = async (platformId: string) => {
    const config = getPlatformConfig(platformId);
    if (!config) return;

    setPublishing(true);

    // 复制内容
    const formattedContent = formatContentForPublish(title, content, platformId, { tags });
    const copied = await copyToClipboard(formattedContent);

    if (copied) {
      // 打开发布页面
      window.open(config.publishUrl, '_blank');
      setPublishResults(prev => new Map(prev).set(platformId, { success: true, message: '内容已复制，已打开发布页面' }));
    } else {
      setPublishResults(prev => new Map(prev).set(platformId, { success: false, message: '复制失败，请手动复制' }));
    }

    setPublishing(false);
  };

  // 批量发布
  const handleBatchPublish = async () => {
    if (selectedPlatforms.length === 0) return;

    setPublishing(true);
    setPublishResults(new Map());

    for (const platformId of selectedPlatforms) {
      const config = getPlatformConfig(platformId);
      if (!config) continue;

      // 复制内容
      const formattedContent = formatContentForPublish(title, content, platformId, { tags });
      const copied = await copyToClipboard(formattedContent);

      if (copied) {
        // 打开发布页面
        window.open(config.publishUrl, '_blank');
        setPublishResults(prev => new Map(prev).set(platformId, { success: true, message: '已打开' }));
      } else {
        setPublishResults(prev => new Map(prev).set(platformId, { success: false, message: '复制失败' }));
      }

      // 间隔1秒，避免浏览器阻止弹窗
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setPublishing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            一键发布助手
          </DialogTitle>
          <DialogDescription>
            选择平台，自动复制内容并打开发布页面
          </DialogDescription>
        </DialogHeader>

        {/* 内容预览 */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">发布内容预览</span>
          </div>
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {content.substring(0, 150)}...
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 5).map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* 平台列表 */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">选择发布平台</h4>
            {selectedPlatforms.length > 0 && (
              <Button size="sm" onClick={handleBatchPublish} disabled={publishing}>
                {publishing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                批量发布 ({selectedPlatforms.length})
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {platforms.map((platform) => {
                const platformAccounts = accountsByPlatform[platform.id] || [];
                const isSelected = selectedPlatforms.includes(platform.id);
                const result = publishResults.get(platform.id);

                return (
                  <div
                    key={platform.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePlatform(platform.id)}
                        />
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                          style={{ backgroundColor: platform.color }}
                        >
                          {platform.icon}
                        </div>
                        <div>
                          <div className="font-medium">{platform.name}</div>
                          {platformAccounts.length > 0 ? (
                            <div className="text-xs text-gray-500">
                              已绑定: {platformAccounts.map(a => a.displayName).join(', ')}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">未绑定账号</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {result && (
                          <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                            {result.success ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> {result.message}</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 mr-1" /> {result.message}</>
                            )}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyContent(platform.id)}
                        >
                          {copiedPlatform === platform.id ? (
                            <><CheckCircle2 className="h-4 w-4 mr-1" /> 已复制</>
                          ) : (
                            <><Copy className="h-4 w-4 mr-1" /> 复制</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublishToPlatform(platform.id)}
                          disabled={publishing}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          发布
                        </Button>
                      </div>
                    </div>

                    {/* 发布说明 */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500 space-y-1">
                          {platform.instructions.map((instruction, i) => (
                            <p key={i}>{instruction}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 底部提示 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 提示：点击"发布"后，内容会自动复制到剪贴板，同时打开对应平台的发布页面。
            在发布页面中按 Ctrl+V 粘贴内容即可。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
