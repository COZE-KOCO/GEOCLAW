'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
  Globe,
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  category: string;
  maxTitleLength: number;
  maxContentLength: number;
  supportsImage: boolean;
  supportsVideo: boolean;
}

interface PublishResult {
  platform: string;
  status: 'success' | 'failed' | 'pending';
  message: string;
  publishedUrl?: string;
  warnings: string[];
}

interface MultiPlatformPublisherProps {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  onPublishComplete?: (results: PublishResult[]) => void;
}

export function MultiPlatformPublisherComponent({
  title,
  content,
  images,
  tags,
  onPublishComplete,
}: MultiPlatformPublisherProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [recommendations, setRecommendations] = useState<{
    primary: string[];
    secondary: string[];
    reasons: Record<string, string[]>;
  } | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 加载平台列表和推荐
    const params = new URLSearchParams({ title, content });
    fetch(`/api/publish?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPlatforms(data.data.platforms || []);
          setRecommendations(data.data.recommendations || null);
          if (data.data.recommendations?.primary) {
            setSelectedPlatforms(data.data.recommendations.primary);
          }
        }
      })
      .catch(err => {
        console.error('加载平台列表失败:', err);
        setPlatforms([]);
      });
  }, [title, content]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePublish = async () => {
    if (!title || !content) {
      return;
    }

    setPublishing(true);
    setResults([]);

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          images,
          tags,
          platforms: selectedPlatforms,
          scheduled: scheduledTime || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data.results);
        onPublishComplete?.(data.data.results);
      }
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setPublishing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      content: '内容平台',
      social: '社交平台',
      video: '视频平台',
      qa: '问答平台',
    };
    return labels[category] || category;
  };

  const groupedPlatforms = (platforms || []).reduce((acc, platform) => {
    if (!acc[platform.category]) {
      acc[platform.category] = [];
    }
    acc[platform.category].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Send className="h-4 w-4" />
          一键发布
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            多平台一键发布
          </DialogTitle>
          <DialogDescription>
            选择目标平台，内容将自动适配后发布
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* 平台推荐 */}
          {recommendations && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-semibold">推荐平台：</span>
                {recommendations.primary.map(p => (
                  <Badge key={p} variant="outline" className="ml-2">{p}</Badge>
                ))}
                <span className="text-gray-500 ml-2">
                  基于内容类型和长度智能推荐
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* 平台选择 */}
          <div className="space-y-4">
            {Object.entries(groupedPlatforms).map(([category, categoryPlatforms]) => (
              <div key={category}>
                <h4 className="font-semibold text-sm text-gray-500 mb-2">
                  {getCategoryLabel(category)}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {categoryPlatforms.map(platform => (
                    <Card
                      key={platform.id}
                      className={`cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPlatforms.includes(platform.id)}
                            onChange={() => togglePlatform(platform.id)}
                          />
                          <span className="text-xl">{platform.icon}</span>
                          <span className="font-medium text-sm">{platform.name}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          标题最多{platform.maxTitleLength}字 · 
                          内容最多{Math.floor(platform.maxContentLength / 1000)}k字
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 定时发布 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">定时发布：</span>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            />
          </div>

          {/* 发布按钮 */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              已选择 {selectedPlatforms.length} 个平台
            </div>
            <Button
              onClick={handlePublish}
              disabled={selectedPlatforms.length === 0 || publishing}
              className="gap-2"
            >
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  发布中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  开始发布
                </>
              )}
            </Button>
          </div>

          {/* 发布结果 */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">发布结果</h4>
              <div className="space-y-2">
                {results.map((result, index) => {
                  const platform = platforms.find(p => p.id === result.platform);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{platform?.icon}</span>
                        <span className="font-medium">{platform?.name}</span>
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{result.message}</span>
                        {result.publishedUrl && (
                          <a
                            href={result.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {results.some(r => r.warnings.length > 0) && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    <p className="font-semibold text-yellow-800">内容适配提示</p>
                    <ul className="text-sm text-yellow-700 mt-1">
                      {results
                        .filter(r => r.warnings.length > 0)
                        .flatMap(r => r.warnings)
                        .map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
