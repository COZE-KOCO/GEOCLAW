'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app-layout';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3,
  RefreshCw,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
  Trash2,
  Eye,
  ChevronLeft,
  Play,
  AlertCircle,
  FileText,
  X,
  Globe,
  Newspaper,
  Building,
  Tag,
} from 'lucide-react';

// AI平台配置（图标来源：LobeHub官方CDN）
const AI_PLATFORMS = [
  { id: 'doubao', name: '豆包', icon: '🫛', iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/doubao-color.png' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔍', iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/deepseek-color.png' },
  { id: 'kimi', name: 'Kimi', icon: '🌙', iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/kimi-color.png' },
  { id: 'qwen', name: '通义千问', icon: '🤖', iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/qwen-color.png' },
];

// 媒体来源图标映射
const MEDIA_ICONS: Record<string, { icon: string; color: string }> = {
  'Apple Maps': { icon: '🍎', color: 'text-gray-700' },
  'Google Maps': { icon: '🗺️', color: 'text-blue-500' },
  '高德地图': { icon: '📍', color: 'text-blue-600' },
  '百度地图': { icon: '🗺️', color: 'text-blue-500' },
  '携程': { icon: '✈️', color: 'text-blue-400' },
  '知乎': { icon: '📘', color: 'text-blue-600' },
  '小红书': { icon: '📕', color: 'text-red-500' },
  '大众点评': { icon: '⭐', color: 'text-orange-500' },
  '美团': { icon: '🛵', color: 'text-yellow-500' },
  '百度百科': { icon: '📚', color: 'text-blue-500' },
  '维基百科': { icon: '📖', color: 'text-gray-600' },
  '微信公众号': { icon: '💚', color: 'text-green-500' },
  '微博': { icon: '🔴', color: 'text-red-500' },
  '抖音': { icon: '🎵', color: 'text-black' },
  'B站': { icon: '📺', color: 'text-pink-500' },
};

// 任务状态类型
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 任务类型
interface AnalysisTask {
  id: string;
  analysis_type: 'keyword' | 'question';
  input_text: string;
  target_brand?: string;
  selected_platforms: string[];
  selected_questions: Array<{ id: number; question: string; category: string }>;
  status: TaskStatus;
  progress: number;
  total_questions: number;
  completed_questions: number;
  results: AnalysisResult[];
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// 分析结果类型
interface AnalysisResult {
  id?: string;
  question: string;
  category: string;
  platform: string;
  platformName: string;
  platformIcon: string;
  platformIconUrl?: string;
  cited: boolean;
  citedBrand?: string;
  title?: string;
  url?: string | null;
  mediaSource?: string | null;
  references?: Array<{
    title: string;
    url: string;
    source: string;
    snippet?: string;
    summary?: string;
  }>;
  // 新增：回答洞察
  keyPoints?: string[];
  mentionedBrands?: string[];
  confidence?: string | number; // 改为支持字符串（高/中/低）或数字
  rawResponse?: string;
  contentDescription?: string;
  visibility?: number;
  sentiment?: string;
  error?: string;
  resultIndex?: number;
}

export default function GeoTasksPage() {
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AnalysisTask | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [detailResult, setDetailResult] = useState<AnalysisResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 新增：仿写相关状态
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null); // 选中的行ID（用于仿写）
  const [selectedReference, setSelectedReference] = useState<{ // 选中的引用资料
    result: AnalysisResult;
    reference: {
      title: string;
      url: string;
      source: string;
      snippet: string;
    };
  } | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('all'); // 平台筛选

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/geo-tasks?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data.tasks || []);
      }
    } catch (error) {
      console.error('加载任务列表失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 轮询处理中的任务
  useEffect(() => {
    const processingTasks = tasks.filter(t => t.status === 'processing' || t.status === 'pending');
    
    if (processingTasks.length > 0) {
      const interval = setInterval(() => {
        loadTasks();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [tasks, loadTasks]);

  // 刷新列表
  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  // 删除任务
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个分析任务吗？')) return;
    
    try {
      await fetch(`/api/geo-tasks/${taskId}`, { method: 'DELETE' });
      loadTasks();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  // 手动执行任务
  const handleExecuteTask = async (taskId: string) => {
    try {
      await fetch(`/api/geo-tasks/${taskId}/execute`, { method: 'POST' });
      loadTasks();
    } catch (error) {
      console.error('执行任务失败:', error);
    }
  };

  // 切换结果选择
  const toggleResultSelection = (resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTask?.results) {
      if (selectedResults.size === selectedTask.results.length) {
        setSelectedResults(new Set());
      } else {
        setSelectedResults(new Set(selectedTask.results.map((r, i) => r.id || `${i}`)));
      }
    }
  };

  // 查看结果详情
  const viewResultDetail = (result: AnalysisResult) => {
    setDetailResult(result);
    setShowDetailModal(true);
  };

  // 获取状态图标
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // 获取状态文字
  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'processing': return '分析中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
    }
  };

  // 获取分析类型文字
  const getAnalysisTypeText = (type: string) => {
    switch (type) {
      case 'keyword': return '关键词分析';
      case 'question': return '问题分析';
      default: return '分析';
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取平台信息
  const getPlatformInfo = (platformId: string) => {
    return AI_PLATFORMS.find(p => p.id === platformId) || { name: platformId, icon: '🤖', iconUrl: '' };
  };

  // 获取媒体图标
  const getMediaIcon = (mediaSource: string | undefined) => {
    if (!mediaSource) return { icon: '🌐', color: 'text-gray-400' };
    return MEDIA_ICONS[mediaSource] || { icon: '📰', color: 'text-gray-500' };
  };

  // 选择某一行用于仿写
  const handleSelectRowForRewrite = (result: AnalysisResult, ref: { title: string; url: string; source: string; snippet: string }, rowId: string) => {
    setSelectedRowId(rowId);
    setSelectedReference({ result, reference: ref });
  };

  // 跳转到内容创作页面进行仿写
  const handleRewrite = () => {
    if (!selectedReference) {
      alert('请先选择一条引用资料');
      return;
    }
    
    // 构建跳转参数
    const params = new URLSearchParams({
      mode: 'rewrite',
      title: selectedReference.reference.title || '',
      url: selectedReference.reference.url || '',
      source: selectedReference.reference.source || '',
      content: selectedReference.reference.snippet || '',
      question: selectedReference.result.question || '',
      platform: selectedReference.result.platform || '',
    });
    
    // 跳转到内容创作页面
    window.location.href = `/content-creation?${params.toString()}`;
  };

  // 获取筛选后的结果
  const getFilteredResults = () => {
    if (!selectedTask?.results) return [];
    if (platformFilter === 'all') return selectedTask.results;
    return selectedTask.results.filter(r => r.platform === platformFilter);
  };

  // 获取各平台的结果数量
  const getPlatformCounts = () => {
    if (!selectedTask?.results) return { all: 0, doubao: 0, deepseek: 0, kimi: 0 };
    return {
      all: selectedTask.results.length,
      doubao: selectedTask.results.filter(r => r.platform === 'doubao').length,
      deepseek: selectedTask.results.filter(r => r.platform === 'deepseek').length,
      kimi: selectedTask.results.filter(r => r.platform === 'kimi').length,
    };
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              GEO任务
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              查看GEO分析任务进度和结果
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/geo-analysis">
              <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-700">
                <ChevronLeft className="h-4 w-4" />
                新建分析
              </Button>
            </Link>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2 border-slate-200 dark:border-slate-700">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：任务列表 */}
          <div className="lg:col-span-1">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-base text-slate-800 dark:text-white">任务列表</CardTitle>
                <CardDescription>
                  共 {tasks.length} 个任务
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>暂无分析任务</p>
                    <Link href="/geo-analysis" className="text-blue-500 hover:underline text-sm">
                      创建第一个分析任务
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setSelectedResults(new Set());
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedTask?.id === task.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <Badge variant="outline">{getAnalysisTypeText(task.analysis_type)}</Badge>
                          </div>
                          <span className="text-xs text-gray-400">{formatTime(task.created_at)}</span>
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white mb-2 truncate">
                          {task.input_text}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">
                            {task.completed_questions}/{task.total_questions} 问题
                          </span>
                          {task.status === 'completed' && task.results?.length > 0 && (
                            <span className="text-green-600 text-xs">
                              {task.results.length} 条结果
                            </span>
                          )}
                          {task.status === 'processing' && (
                            <span className="text-blue-500">{task.progress}%</span>
                          )}
                        </div>
                        {task.status === 'processing' && (
                          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：任务详情 */}
          <div className="lg:col-span-2">
            {!selectedTask ? (
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="py-16 text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">选择一个任务查看详情</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* 任务信息 */}
                <Card className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {getStatusIcon(selectedTask.status)}
                          {selectedTask.input_text}
                        </CardTitle>
                        <CardDescription>
                          {getAnalysisTypeText(selectedTask.analysis_type)} · 
                          {selectedTask.selected_platforms?.map(p => getPlatformInfo(p).name).join('、')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedTask.status === 'pending' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleExecuteTask(selectedTask.id)}
                            className="gap-1"
                          >
                            <Play className="h-4 w-4" />
                            执行
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteTask(selectedTask.id)}
                          className="gap-1 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedTask.status === 'failed' && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-600 mb-4">
                        <AlertCircle className="h-4 w-4" />
                        {selectedTask.error || '分析失败'}
                      </div>
                    )}
                    
                    {selectedTask.status === 'processing' && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">分析进度</span>
                          <span className="text-blue-500 font-medium">{selectedTask.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${selectedTask.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          正在分析中，您可以切换到其他页面，分析将在后台继续进行...
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>创建时间: {formatTime(selectedTask.created_at)}</span>
                      {selectedTask.completed_at && (
                        <span>完成时间: {formatTime(selectedTask.completed_at)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 分析结果表格 */}
                {selectedTask.status === 'completed' && selectedTask.results?.length > 0 && (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      {/* 顶部操作栏 */}
                      <div className="flex items-center justify-between">
                        {/* 左侧：返回按钮 */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedTask(null)}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          返回
                        </Button>
                        
                        {/* 中间：平台筛选标签 */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={platformFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPlatformFilter('all')}
                            className={platformFilter === 'all' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                          >
                            全部 ({getPlatformCounts().all})
                          </Button>
                          <Button
                            variant={platformFilter === 'doubao' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPlatformFilter('doubao')}
                            className={platformFilter === 'doubao' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                          >
                            豆包
                          </Button>
                          <Button
                            variant={platformFilter === 'deepseek' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPlatformFilter('deepseek')}
                            className={platformFilter === 'deepseek' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                          >
                            DeepSeek
                          </Button>
                          <Button
                            variant={platformFilter === 'kimi' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPlatformFilter('kimi')}
                            className={platformFilter === 'kimi' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                          >
                            Kimi
                          </Button>
                        </div>
                        
                        {/* 右侧：仿写按钮 */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRewrite}
                          disabled={!selectedReference}
                          className="gap-1 border-purple-500 text-purple-500 hover:bg-purple-50"
                        >
                          <FileText className="h-4 w-4" />
                          仿写
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* 表格式展示 */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[40px]"></th>
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[150px]">问题蒸馏词</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[200px]">模拟问题</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[280px]">AI引用分析</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">内容描述</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[80px]">平台</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getFilteredResults().map((result, resultIndex) => {
                              // 如果有引用资料，展开每条引用为一行
                              const refs = result.references && result.references.length > 0 
                                ? result.references 
                                : [{ title: null, url: null, source: null, snippet: result.error || '暂无引用资料' }];
                              
                              return (
                                <Fragment key={result.id || resultIndex}>
                                  {refs.map((ref, refIndex) => {
                                    const rowId = `${result.id || resultIndex}-${refIndex}`;
                                    const isSelected = selectedRowId === rowId;
                                    
                                    return (
                                      <tr 
                                        key={rowId}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected 
                                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                    onClick={() => ref.title && handleSelectRowForRewrite(result, ref as any, rowId)}
                                  >
                                    {/* 选择指示器 - 只在第一行显示 */}
                                    {refIndex === 0 ? (
                                      <td 
                                        className={`border px-3 py-2 text-center ${
                                          isSelected 
                                            ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        rowSpan={refs.length}
                                      >
                                        <div 
                                          className={`w-4 h-4 rounded-full border-2 mx-auto ${
                                            isSelected 
                                              ? 'border-purple-500 bg-purple-500' 
                                              : 'border-gray-300 dark:border-gray-600'
                                          }`}
                                        >
                                          {isSelected && (
                                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                          )}
                                        </div>
                                      </td>
                                    ) : null}
                                  
                                  {/* 问题蒸馏词 - 只在第一行显示 */}
                                  {refIndex === 0 ? (
                                    <td 
                                      className={`border px-3 py-2 text-sm ${
                                        isSelected 
                                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                          : 'border-gray-200 dark:border-gray-700'
                                      } text-gray-700 dark:text-gray-300`}
                                      rowSpan={refs.length}
                                    >
                                      <div className="line-clamp-2">
                                        {result.category || result.question.substring(0, 20) + '...'}
                                      </div>
                                    </td>
                                  ) : null}
                                  
                                  {/* 模拟问题 - 只在第一行显示 */}
                                  {refIndex === 0 ? (
                                    <td 
                                      className={`border px-3 py-2 text-sm ${
                                        isSelected 
                                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                          : 'border-gray-200 dark:border-gray-700'
                                      } text-gray-700 dark:text-gray-300`}
                                      rowSpan={refs.length}
                                    >
                                      <div className="flex items-start gap-1">
                                        <span className="line-clamp-2 flex-1">{result.question}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-5 w-5 p-0 flex-shrink-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            viewResultDetail(result);
                                          }}
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  ) : null}
                                  
                                  {/* AI引用分析 */}
                                  <td className={`border px-3 py-2 ${
                                    isSelected 
                                      ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}>
                                    {ref.title || ref.url ? (
                                      <div className="space-y-1">
                                        {/* 标题 */}
                                        <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                                          {ref.title || '-'}
                                        </div>
                                        {/* URL */}
                                        {ref.url && (
                                          <div className="flex items-center gap-1">
                                            <LinkIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                            <a 
                                              href={ref.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-500 hover:underline truncate max-w-[180px]"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {ref.url}
                                            </a>
                                            <ExternalLink 
                                              className="h-3 w-3 text-gray-400 cursor-pointer flex-shrink-0 hover:text-blue-500"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                ref.url && window.open(ref.url, '_blank');
                                              }}
                                            />
                                          </div>
                                        )}
                                        {/* 媒体 */}
                                        <div className="flex items-center gap-1">
                                          <span className="text-sm">{getMediaIcon(ref.source).icon}</span>
                                          <span className="text-xs text-gray-500">{ref.source || '-'}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-gray-400">{ref.snippet}</span>
                                    )}
                                  </td>
                                  
                                  {/* 内容描述 */}
                                  <td className={`border px-3 py-2 text-sm text-gray-600 dark:text-gray-400 ${
                                    isSelected 
                                      ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}>
                                    <div className="line-clamp-3">
                                      {ref.snippet || result.rawResponse?.substring(0, 150) || '-'}
                                    </div>
                                  </td>
                                  
                                  {/* 平台 - 只在第一行显示 */}
                                  {refIndex === 0 ? (
                                    <td 
                                      className={`border px-3 py-2 text-center ${
                                        isSelected 
                                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' 
                                          : 'border-gray-200 dark:border-gray-700'
                                      }`}
                                      rowSpan={refs.length}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <img 
                                          src={result.platformIconUrl || getPlatformInfo(result.platform).iconUrl} 
                                          alt={result.platformName || getPlatformInfo(result.platform).name}
                                          className="w-6 h-6"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                        <span className="text-xs text-gray-500">{result.platformName || getPlatformInfo(result.platform).name}</span>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                                    );
                                  })}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 无结果 */}
                {selectedTask.status === 'completed' && !selectedTask.results?.length && (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="py-8 text-center text-gray-500">
                      分析完成，但无有效结果
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 结果详情弹窗 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img 
                src={detailResult?.platformIconUrl} 
                alt={detailResult?.platformName || 'AI'}
                className="w-6 h-6"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              分析结果详情
            </DialogTitle>
            <DialogDescription>
              {detailResult?.platformName} · {detailResult?.question}
            </DialogDescription>
          </DialogHeader>
          
          {detailResult && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                {/* 问题区域 */}
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={detailResult.platformIconUrl} 
                      alt={detailResult.platformName}
                      className="w-5 h-5"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">{detailResult.platformName}</span>
                    {detailResult.cited && (
                      <Badge className="bg-green-100 text-green-700 text-xs">已引用</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {detailResult.question}
                  </div>
                </div>

                {/* 分栏布局：左侧AI回答 + 右侧参考资料 */}
                <div className="flex gap-4">
                  {/* 左侧：AI回答内容 */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      AI回答
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-[400px] overflow-y-auto">
                      {detailResult.rawResponse ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {detailResult.rawResponse.split('\n').map((line, idx) => (
                            <p key={idx} className="mb-2 last:mb-0">{line}</p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">暂无回答内容</span>
                      )}
                    </div>
                  </div>
                  
                  {/* 右侧：参考资料 */}
                  <div className="w-80 flex-shrink-0">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      参考资料
                      {detailResult.references && detailResult.references.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {detailResult.references.length}
                        </Badge>
                      )}
                    </h4>
                    
                    {detailResult.references && detailResult.references.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto space-y-2">
                        {detailResult.references.map((ref, refIndex) => (
                          <a
                            key={refIndex}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                          >
                            {/* 序号 + 标题 */}
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                {refIndex + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline line-clamp-2">
                                  {ref.title || '无标题'}
                                </div>
                                
                                {/* 摘要 */}
                                {ref.snippet && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                    {ref.snippet}
                                  </div>
                                )}
                                
                                {/* 来源 */}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-sm">{getMediaIcon(ref.source).icon}</span>
                                  <span className="text-xs text-gray-400">
                                    {ref.source || '未知来源'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                        <Newspaper className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-gray-500 text-sm">暂无引用资料</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 置信度等信息 */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <span>置信度:</span>
                    <Badge 
                      variant={
                        detailResult.confidence === '高' ? 'default' : 
                        detailResult.confidence === '中' ? 'secondary' : 
                        'outline'
                      }
                      className="text-xs"
                    >
                      {detailResult.confidence || '中'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>问题分类:</span>
                    <span>{detailResult.category}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
