'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sidebar } from '@/components/sidebar';
import { useBusiness } from '@/contexts/business-context';
import { 
  TrendingUp, 
  FileText, 
  Target, 
  Zap,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Globe,
  Search,
  ChevronRight,
  Brain,
  Layers,
  AlertCircle,
  Rocket,
  ExternalLink,
  AlertTriangle,
  Settings,
  Database,
  Image,
  Package,
  RefreshCw,
  PenTool,
  Network,
  Workflow,
  Users,
  Clock,
} from 'lucide-react';

// 数据类型定义
interface DashboardStats {
  totalContent: number;
  avgScore: string;
  aiReferenceRate: number;
  keywordCoverage: number;
  weeklyGrowth: number;
  totalFollowers: number;
  totalAccounts: number;
}

interface RecentContent {
  id: string;
  title: string;
  score: number;
  status: string;
  date: string;
}

interface PlatformStat {
  id: string;
  name: string;
  content: number;
  published: number;
  rate: number;
}

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  position: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentContent: RecentContent[];
  platformStats: PlatformStat[];
  keywordData: KeywordData[];
}

// 核心功能卡片配置
const coreFeatures = [
  {
    title: 'AI问答优化',
    description: '针对豆包、DeepSeek、Kimi等AI搜索引擎的问答结果优化，提升品牌曝光率',
    icon: Brain,
    gradient: 'from-purple-500 to-indigo-600',
    href: '/matrix',
  },
  {
    title: '内容创作',
    description: '基于关键词和GEO评分体系，快速创作高质量内容',
    icon: Sparkles,
    gradient: 'from-cyan-500 to-teal-500',
    href: '/matrix',
  },
  {
    title: '内容管理',
    description: '管理所有创作内容，支持批量操作和发布追踪',
    icon: Layers,
    gradient: 'from-pink-500 to-rose-500',
    href: '/projects',
  },
];

// 更多工具配置 - 只保留实际存在的页面
const moreTools = [
  { icon: Sparkles, label: '内容创作', href: '/matrix', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/50' },
  { icon: Layers, label: '内容管理', href: '/projects', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  { icon: Network, label: 'GEO分析', href: '/geo-analysis', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/50' },
  { icon: Target, label: 'GEO任务', href: '/geo-tasks', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/50' },
  { icon: BarChart3, label: 'GEO评分', href: '/geo-score', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/50' },
  { icon: TrendingUp, label: '数据监测', href: '/monitor', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/50' },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState<'yesterday' | '7days' | '30days'>('yesterday');
  
  // 运营数据状态
  const { selectedBusiness } = useBusiness();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [personas, setPersonas] = useState<any[]>([]);
  const [contentDrafts, setContentDrafts] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 根据选择的商家加载运营数据
  useEffect(() => {
    if (selectedBusiness) {
      fetchOperationData(selectedBusiness);
    }
  }, [selectedBusiness]);

  const fetchOperationData = async (businessId: string) => {
    try {
      // 加载账号
      const accountsRes = await fetch(`/api/accounts?businessId=${businessId}`);
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }
      
      // 加载人设
      const personasRes = await fetch(`/api/personas?businessId=${businessId}`);
      if (personasRes.ok) {
        const data = await personasRes.json();
        setPersonas(data.personas || []);
      }
      
      // 加载内容草稿
      const draftsRes = await fetch(`/api/content-drafts?businessId=${businessId}`);
      if (draftsRes.ok) {
        const data = await draftsRes.json();
        setContentDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('加载运营数据失败:', error);
    }
  };

  // 平台配置
  const platforms = [
    { id: 'xiaohongshu', name: '小红书', icon: '📕' },
    { id: 'douyin', name: '抖音', icon: '🎵' },
    { id: 'kuaishou', name: '快手', icon: '⚡' },
    { id: 'weixin', name: '微信', icon: '💬' },
    { id: 'zhihu', name: '知乎', icon: '📘' },
    { id: 'weibo', name: '微博', icon: '🔴' },
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '获取数据失败');
        setData(getEmptyData());
      }
    } catch (err) {
      console.error('获取Dashboard数据失败:', err);
      setError('网络错误，请稍后重试');
      setData(getEmptyData());
    } finally {
      setLoading(false);
    }
  };

  const getEmptyData = (): DashboardData => ({
    stats: {
      totalContent: 0,
      avgScore: '0',
      aiReferenceRate: 0,
      keywordCoverage: 0,
      weeklyGrowth: 0,
      totalFollowers: 0,
      totalAccounts: 0,
    },
    recentContent: [],
    platformStats: [],
    keywordData: [],
  });

  // 状态映射
  const statusMap: Record<string, { label: string; class: string }> = {
    draft: { label: '草稿', class: 'bg-gray-100 text-gray-700' },
    ready: { label: '待发布', class: 'bg-yellow-100 text-yellow-700' },
    published: { label: '已发布', class: 'bg-green-100 text-green-700' },
    optimizing: { label: '优化中', class: 'bg-blue-100 text-blue-700' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
        <Sidebar />
        <main className="flex-1 ml-56 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* 左侧导航栏 */}
      <Sidebar />
      
      {/* 右侧主内容区 */}
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-5">
          {/* 顶部合规提示栏 */}
          <div className="mb-4 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>严禁用于生成、发布违法违规内容和欺诈类内容。</span>
            </div>
          </div>

          {/* 页面头部 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
                欢迎来到 <span className="text-purple-600 dark:text-purple-400">GEO优化</span> 的工作台
              </h1>
            </div>
            <Link 
              href="/whats-new"
              className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <span className="text-base">📦</span>
              <span>V1.0.0 重磅来袭</span>
              <span className="text-slate-500 dark:text-slate-400">—— GEO优化工具上线，支持...</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">更多</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 核心指标卡片 - 保留原有4个指标 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 内容总数 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">内容总数</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {data?.stats.totalContent || 0}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-green-500 text-xs">
                      <ArrowUpRight className="h-3 w-3" />
                      <span>+{data?.stats.weeklyGrowth || 0}%</span>
                      <span className="text-slate-400">本周</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 平均GEO评分 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">平均GEO评分</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {data?.stats.avgScore || '0'}
                      <span className="text-sm text-slate-400">/10</span>
                    </p>
                    <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                      {parseFloat(data?.stats.avgScore || '0') >= 8 ? '优秀' : 
                       parseFloat(data?.stats.avgScore || '0') >= 6 ? '良好' : '待优化'}
                    </Badge>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI引用率 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">AI引用率</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {data?.stats.aiReferenceRate || 0}%
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-purple-500 text-xs">
                      <Brain className="h-3 w-3" />
                      <span>预测值</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 关键词覆盖 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">关键词覆盖</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      {data?.stats.keywordCoverage || 0}%
                    </p>
                    <Progress value={data?.stats.keywordCoverage || 0} className="mt-2 h-1.5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Search className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 运营数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* 运营账号 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">运营账号</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{accounts.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 覆盖平台 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">覆盖平台</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {platforms.filter(p => accounts.some(a => a.platform === p.id)).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 总粉丝数 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">总粉丝数</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {(accounts.reduce((sum, a) => sum + (a.followers || 0), 0) / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 人设数量 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">人设数量</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{personas.length}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <Network className="h-5 w-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 待发布 */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">待发布</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                      {contentDrafts.filter(d => d.status === 'ready').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 核心功能卡片区 - 3个并排入口 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.title} href={feature.href}>
                  <Card className={`h-full bg-gradient-to-br ${feature.gradient} text-white border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group`}>
                    <CardContent className="p-5 h-full flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold mb-1.5 group-hover:translate-x-1 transition-transform">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-white/80 line-clamp-2">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* 主内容区：左侧 + 右侧 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 左侧：最近内容 + 关键词排名 */}
            <div className="lg:col-span-2 space-y-4">
              {/* 最近内容 */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                      <CardTitle className="text-base text-slate-800 dark:text-white">最近内容</CardTitle>
                    </div>
                    <Link href="/projects" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1">
                      查看全部
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-300">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {data?.recentContent && data.recentContent.length > 0 ? (
                      data.recentContent.map((content) => (
                        <div 
                          key={content.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-800 dark:text-white truncate text-sm">
                              {content.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span>{content.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`text-base font-bold ${
                                content.score >= 8 ? 'text-green-500' : 
                                content.score >= 6 ? 'text-yellow-500' : 'text-red-500'
                              }`}>
                                {content.score.toFixed(1)}
                              </div>
                              <div className="text-xs text-slate-400">GEO评分</div>
                            </div>
                            <Badge className={statusMap[content.status]?.class || 'bg-gray-100 text-gray-700 text-xs'}>
                              {statusMap[content.status]?.label || content.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">暂无内容，开始创作吧</p>
                        <Link href="/matrix">
                          <Button size="sm" className="mt-3 bg-purple-500 hover:bg-purple-600">
                            开始创作
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 关键词排名 */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                      <CardTitle className="text-base text-slate-800 dark:text-white">关键词排名</CardTitle>
                    </div>
                    <Link href="/monitor" className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700">
                      详情
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.keywordData && data.keywordData.length > 0 ? (
                      data.keywordData.map((kw, index) => (
                        <div key={kw.keyword} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3 ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 dark:text-white text-sm truncate">
                              {kw.keyword}
                            </div>
                            <div className="text-xs text-slate-400">
                              搜索量 {kw.volume.toLocaleString()} · 排名第{kw.position}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs ${
                            kw.difficulty > 60 ? 'border-red-300 text-red-600' :
                            kw.difficulty > 40 ? 'border-yellow-300 text-yellow-600' :
                            'border-green-300 text-green-600'
                          }`}>
                            难度 {kw.difficulty}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        暂无关键词数据
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：更多工具 + 平台数据 + 快捷入口 */}
            <div className="space-y-4">
              {/* 更多工具 */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">更多工具</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {moreTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.label}
                          href={tool.href}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                        >
                          <div className={`w-8 h-8 rounded-lg ${tool.bg} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${tool.color}`} />
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {tool.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 平台数据 */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <CardTitle className="text-base text-slate-800 dark:text-white">平台数据</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.platformStats && data.platformStats.length > 0 ? (
                      data.platformStats.map((platform) => (
                        <div key={platform.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            {platform.name.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800 dark:text-white text-sm">
                                {platform.name}
                              </span>
                              <span className="text-xs text-slate-500">{platform.content}篇</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">已发布{platform.published}篇</span>
                              <Progress value={platform.rate} className="flex-1 h-1" />
                              <span className="text-xs text-slate-500">{platform.rate}%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        暂无平台数据
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 快捷入口 */}
              <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                    <CardTitle className="text-base text-slate-800 dark:text-white">快捷入口</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/matrix">
                      <Button variant="outline" className="w-full h-auto py-2.5 flex-col gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <span className="text-xs">内容创作</span>
                      </Button>
                    </Link>
                    <Link href="/projects">
                      <Button variant="outline" className="w-full h-auto py-2.5 flex-col gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Layers className="h-4 w-4 text-green-500" />
                        <span className="text-xs">内容管理</span>
                      </Button>
                    </Link>
                    <Link href="/monitor">
                      <Button variant="outline" className="w-full h-auto py-2.5 flex-col gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        <span className="text-xs">数据监测</span>
                      </Button>
                    </Link>
                    <Link href="/geo-analysis">
                      <Button variant="outline" className="w-full h-auto py-2.5 flex-col gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Target className="h-4 w-4 text-orange-500" />
                        <span className="text-xs">GEO分析</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
