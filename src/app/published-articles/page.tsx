'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Search,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 类型定义
interface PublishRecord {
  id: string;
  articleTitle: string;
  articleContent: string;
  platform: string;
  platformName: string;
  accountName: string;
  status: string;
  statusText: string;
  publishedUrl: string | null;
  publishedAt: string | null;
  error: string | null;
  createdAt: string;
}

interface ApiResponse {
  data: PublishRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// 平台列表
const PLATFORMS = [
  { value: 'all', label: '所有平台' },
  { value: 'toutiao', label: '今日头条' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'weibo', label: '微博' },
  { value: 'douyin', label: '抖音' },
  { value: 'zhihu', label: '知乎' },
  { value: 'bilibili', label: 'B站' },
  { value: 'baijiahao', label: '百家号' },
  { value: 'wechat', label: '微信公众号' },
];

// 状态列表
const STATUS_OPTIONS = [
  { value: 'all', label: '所有' },
  { value: 'success', label: '成功' },
  { value: 'failed', label: '失败' },
  { value: 'pending', label: '待发布' },
  { value: 'publishing', label: '发布中' },
];

// 状态样式配置
const STATUS_STYLES: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  pending: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  publishing: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  timeout: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

export default function PublishedArticlesPage() {
  const { selectedBusiness } = useBusiness();
  
  // 数据状态
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // 筛选条件
  const [keyword, setKeyword] = useState('');
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  
  // 自动刷新
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // 加载数据
  const loadData = useCallback(async (showLoading = true) => {
    if (!selectedBusiness) return;
    
    if (showLoading) setLoading(true);
    
    try {
      const params = new URLSearchParams({
        businessId: selectedBusiness,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (keyword) params.set('keyword', keyword);
      if (platform !== 'all') params.set('platform', platform);
      if (status !== 'all') params.set('status', status);
      
      const response = await fetch(`/api/publish-records?${params.toString()}`);
      const result: ApiResponse = await response.json();
      
      if (response.ok) {
        setRecords(result.data || []);
        setTotal(result.total || 0);
        setLastRefreshTime(new Date());
      }
    } catch (error) {
      console.error('加载发布记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, page, keyword, platform, status]);

  // 初始加载和筛选条件变化时重新加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自动刷新（每10秒）
  useEffect(() => {
    if (!autoRefresh || !selectedBusiness) return;
    
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedBusiness, loadData]);

  // 重置筛选条件
  const handleReset = () => {
    setKeyword('');
    setPlatform('all');
    setStatus('all');
    setPage(1);
  };

  // 格式化时间
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 截断标题
  const truncateTitle = (title: string, maxLength = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-500" />
              发布的文章
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              文章数据发布记录，数据每10秒刷新一次
              {lastRefreshTime && (
                <span className="ml-2 text-xs">
                  (上次刷新: {lastRefreshTime.toLocaleTimeString('zh-CN')})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <BusinessSelector />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(autoRefresh && 'text-green-600 border-green-300')}
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', autoRefresh && 'animate-spin')} />
              {autoRefresh ? '自动刷新中' : '已暂停'}
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              {/* 按文章筛选 */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="按文章标题筛选..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* 按平台筛选 */}
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="按平台筛选" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* 按状态筛选 */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="按状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* 操作按钮 */}
              <Button onClick={() => loadData()} disabled={loading}>
                <Search className="h-4 w-4 mr-1" />
                查询
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 数据表格 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <FolderOpen className="h-12 w-12 mb-4" />
                <p>暂无数据</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">文章</TableHead>
                      <TableHead className="w-[100px]">平台</TableHead>
                      <TableHead className="w-[200px]">文章地址</TableHead>
                      <TableHead className="w-[80px]">状态</TableHead>
                      <TableHead className="w-[200px]">失败原因</TableHead>
                      <TableHead className="w-[160px]">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const statusStyle = STATUS_STYLES[record.status] || STATUS_STYLES.pending;
                      const StatusIcon = statusStyle.icon;
                      
                      return (
                        <TableRow key={record.id}>
                          {/* 文章标题 */}
                          <TableCell>
                            <div className="flex flex-col">
                              <span 
                                className="font-medium truncate" 
                                title={record.articleTitle}
                              >
                                {truncateTitle(record.articleTitle)}
                              </span>
                              <span className="text-xs text-slate-400 mt-1">
                                账号: {record.accountName}
                              </span>
                            </div>
                          </TableCell>
                          
                          {/* 平台 */}
                          <TableCell>
                            <Badge variant="outline">
                              {record.platformName}
                            </Badge>
                          </TableCell>
                          
                          {/* 文章地址 */}
                          <TableCell>
                            {record.publishedUrl ? (
                              <a
                                href={record.publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 text-sm truncate max-w-[180px]"
                                title={record.publishedUrl}
                              >
                                <span className="truncate">查看文章</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          
                          {/* 状态 */}
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={cn(statusStyle.bg, statusStyle.color, 'border-0')}
                            >
                              <StatusIcon className={cn(
                                'h-3 w-3 mr-1',
                                record.status === 'publishing' && 'animate-spin'
                              )} />
                              {record.statusText}
                            </Badge>
                          </TableCell>
                          
                          {/* 失败原因 */}
                          <TableCell>
                            {record.error ? (
                              <span 
                                className="text-red-500 text-sm truncate block max-w-[180px]" 
                                title={record.error}
                              >
                                {record.error}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          
                          {/* 时间 */}
                          <TableCell className="text-sm text-slate-500">
                            {formatTime(record.publishedAt || record.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {/* 分页信息 */}
                {total > pageSize && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <span className="text-sm text-slate-500">
                      共 {total} 条记录
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        上一页
                      </Button>
                      <span className="text-sm">
                        第 {page} 页
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * pageSize >= total}
                        onClick={() => setPage(page + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
