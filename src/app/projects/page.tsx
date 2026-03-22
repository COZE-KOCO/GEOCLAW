'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app-layout';
import { useBusiness } from '@/contexts/business-context';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  Eye,
  MoreVertical,
  Plus,
  Calendar,
  Target,
  BarChart3,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Copy,
  ExternalLink,
  Trash2,
  Loader2,
  Search,
  RotateCcw,
  Inbox,
  Edit,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';

// 文章类型定义
interface Article {
  id: string;
  title: string;
  rule: string;
  source: string;
  isPublished: boolean;
  createdAt: Date;
  type: string;
  tags: string[];
}

// 统计数据
interface Stats {
  total: number;
  published: number;
  active: number;
  avgScore: number;
  totalCitations: number;
}

export default function ProjectsPage() {
  const { selectedBusiness } = useBusiness();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    active: 0,
    avgScore: 0,
    totalCitations: 0,
  });

  // 筛选状态
  const [titleFilter, setTitleFilter] = useState('');
  const [ruleFilter, setRuleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (selectedBusiness) {
      fetchData();
    }
  }, [selectedBusiness]);

  const fetchData = async () => {
    if (!selectedBusiness) return;
    
    setLoading(true);
    try {
      // 并行获取文章列表和统计信息
      const [draftsRes, statsRes] = await Promise.all([
        fetch(`/api/content-drafts?businessId=${selectedBusiness}`),
        fetch(`/api/content-drafts?businessId=${selectedBusiness}&stats=true`),
      ]);

      if (!draftsRes.ok || !statsRes.ok) {
        throw new Error('获取数据失败');
      }

      const draftsData = await draftsRes.json();
      const statsData = await statsRes.json();

      // 转换数据格式
      const formattedArticles: Article[] = (draftsData.drafts || []).map((draft: any) => {
        // 处理 distillationWords，可能是字符串或数组
        let tags: string[] = [];
        if (draft.distillationWords) {
          if (Array.isArray(draft.distillationWords)) {
            tags = draft.distillationWords.slice(0, 3);
          } else if (typeof draft.distillationWords === 'string') {
            tags = draft.distillationWords.split(',').slice(0, 3);
          }
        }
        
        return {
          id: draft.id,
          title: draft.title,
          rule: draft.targetModel || '默认规则',
          source: draft.articleType || 'AI创作',
          isPublished: draft.status === 'published',
          createdAt: new Date(draft.createdAt),
          type: draft.articleType || '文章',
          tags,
        };
      });

      setArticles(formattedArticles);
      setStats({
        total: statsData.stats?.total || formattedArticles.length,
        published: statsData.stats?.published || formattedArticles.filter(a => a.isPublished).length,
        active: statsData.stats?.ready || 0,
        avgScore: statsData.stats?.avgSeoScore || 0,
        totalCitations: statsData.stats?.totalCitations || 0,
      });
    } catch (error) {
      console.error('获取数据失败:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置筛选
  const handleReset = () => {
    setTitleFilter('');
    setRuleFilter('');
    setTypeFilter('all');
    setTagFilter('');
    setSourceFilter('all');
    setStatusFilter('all');
  };

  // 查询筛选
  const handleSearch = () => {
    // TODO: 实现筛选逻辑
    toast.success('查询完成');
  };

  // 筛选后的文章
  const filteredArticles = articles.filter(article => {
    if (titleFilter && !article.title.includes(titleFilter)) return false;
    if (ruleFilter && !article.rule.includes(ruleFilter)) return false;
    if (typeFilter !== 'all' && article.type !== typeFilter) return false;
    if (tagFilter && !article.tags.some(tag => tag.includes(tagFilter))) return false;
    if (sourceFilter !== 'all' && article.source !== sourceFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'published' && !article.isPublished) return false;
      if (statusFilter === 'unpublished' && article.isPublished) return false;
    }
    return true;
  });

  // 格式化时间
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 复制链接
  const handleCopyLink = (articleId: string) => {
    const url = `${window.location.origin}/content/${articleId}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  // 查看文章
  const handleViewArticle = (articleId: string) => {
    window.open(`/content-drafts/${articleId}`, '_blank');
  };

  // 编辑文章
  const handleEditArticle = (articleId: string) => {
    window.open(`/content-drafts/${articleId}?edit=true`, '_blank');
  };

  // 预览文章
  const handlePreviewArticle = (articleId: string) => {
    window.open(`/content-drafts/${articleId}?preview=true`, '_blank');
  };

  // 删除文章
  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/content-drafts?id=${articleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      toast.success('文章已删除');
      fetchData(); // 刷新列表
    } catch (error) {
      console.error('删除文章失败:', error);
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              所有文章
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              浏览您到目前为止生成的所有文章。
            </p>
          </div>
          <Link href="/matrix/generation-plans">
            <Button variant="outline" size="sm">
              <ListChecks className="h-4 w-4 mr-2" />
              生成计划
            </Button>
          </Link>
        </div>

        {/* 统计卡片 - 监测功能 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">总项目数</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">已发布</p>
                  <p className="text-3xl font-bold text-green-600">{stats.published}</p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">运行中</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">平均评分</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.avgScore}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">总引用次数</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalCitations}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选栏 */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Input
                placeholder="按标题筛选"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                className="lg:col-span-1"
              />
              <Input
                placeholder="按生成规则筛选"
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value)}
                className="lg:col-span-1"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="按文章类型筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="科普">科普</SelectItem>
                  <SelectItem value="指南">指南</SelectItem>
                  <SelectItem value="教程">教程</SelectItem>
                  <SelectItem value="评测">评测</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="按标签过滤"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              />
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="按来源过滤" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部来源</SelectItem>
                  <SelectItem value="AI智能创作">AI智能创作</SelectItem>
                  <SelectItem value="批量创作">批量创作</SelectItem>
                  <SelectItem value="模板创作">模板创作</SelectItem>
                  <SelectItem value="GEO优化">GEO优化</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="所有" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="unpublished">未发布</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  查询
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 文章列表 */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
                <p>加载中...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-16">
                <Inbox className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">暂无数据</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900">
                    <TableHead className="font-medium">标题</TableHead>
                    <TableHead className="font-medium">规则</TableHead>
                    <TableHead className="font-medium">来源</TableHead>
                    <TableHead className="font-medium">是否发布</TableHead>
                    <TableHead className="font-medium">时间</TableHead>
                    <TableHead className="text-right font-medium">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {article.title}
                          </p>
                          {article.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {article.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        {article.rule}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{article.source}</Badge>
                      </TableCell>
                      <TableCell>
                        {article.isPublished ? (
                          <Badge className="bg-green-500 text-white">
                            <Globe className="h-3 w-3 mr-1" />
                            已发布
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3 mr-1" />
                            未发布
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(article.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewArticle(article.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看文章
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditArticle(article.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑文章
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(article.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              复制链接
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreviewArticle(article.id)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              预览文章
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteArticle(article.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除文章
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 新建内容按钮 */}
        <Link href="/matrix/batch/create">
          <Button className="fixed bottom-8 right-8 bg-purple-500 hover:bg-purple-600 shadow-lg rounded-full w-14 h-14">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
}
