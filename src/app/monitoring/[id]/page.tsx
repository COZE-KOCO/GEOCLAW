'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/app-layout';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  Eye,
  Target,
  BarChart3,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';
import type { GEOProject, TimeSeriesData } from '@/lib/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function MonitoringPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<GEOProject | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, timeSeriesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/timeseries`)
      ]);

      const projectData = await projectRes.json();
      const timeSeriesData = await timeSeriesRes.json();

      if (projectData.success) {
        setProject(projectData.data);
      }
      if (timeSeriesData.success) {
        setTimeSeriesData(timeSeriesData.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-purple-500" />
            <p className="text-gray-600 dark:text-gray-400">加载数据中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-gray-600 dark:text-gray-400">项目不存在</p>
            <Link href="/projects">
              <Button className="mt-4">返回项目列表</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const { monitoring } = project;

  // 最近7天的数据
  const recentData = timeSeriesData.slice(-7);

  // 平台分布数据
  const platformData = monitoring.summary.platforms
    .filter(p => p.citations > 0)
    .map(p => ({
      name: p.platform,
      value: p.citations,
      exposure: p.exposure
    }));

  // 引用情感分析
  const sentimentData = [
    { name: '正面', value: monitoring.aiCitations.filter(c => c.sentiment === 'positive').length, color: '#10B981' },
    { name: '中性', value: monitoring.aiCitations.filter(c => c.sentiment === 'neutral').length, color: '#6B7280' },
    { name: '负面', value: monitoring.aiCitations.filter(c => c.sentiment === 'negative').length, color: '#EF4444' }
  ];

  // 最近引用记录
  const recentCitations = monitoring.aiCitations
    .slice(-10)
    .reverse();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                数据监测
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {project.title}
              </p>
            </div>
          </div>
          <Badge className="text-lg px-4 py-2 bg-purple-500 text-white">
            评分: {project.score.toFixed(1)} ({project.grade})
          </Badge>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">总引用次数</p>
                  <p className="text-4xl font-bold">{monitoring.summary.totalCitations}</p>
                </div>
                <TrendingUp className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">总曝光量</p>
                  <p className="text-4xl font-bold">
                    {(monitoring.summary.totalExposure / 1000).toFixed(1)}K
                  </p>
                </div>
                <Eye className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">引用率</p>
                  <p className="text-4xl font-bold">
                    {monitoring.summary.avgCitationRate.toFixed(1)}%
                  </p>
                </div>
                <Target className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">转化数</p>
                  <p className="text-4xl font-bold">{monitoring.summary.totalConversions}</p>
                </div>
                <BarChart3 className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细数据 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="citations">引用详情</TabsTrigger>
            <TabsTrigger value="platforms">平台分析</TabsTrigger>
            <TabsTrigger value="trends">趋势分析</TabsTrigger>
          </TabsList>

          {/* 概览 */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 趋势图 */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>引用趋势</CardTitle>
                  <CardDescription>最近7天的引用情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={recentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="citations" 
                        stroke="#10B981" 
                        name="引用次数"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="exposure" 
                        stroke="#3B82F6" 
                        name="曝光量"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 平台分布 */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>平台分布</CardTitle>
                  <CardDescription>各AI平台的引用分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 情感分析 */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>引用情感分析</CardTitle>
                  <CardDescription>AI引用时的情感倾向</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sentimentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="次数">
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    {sentimentData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 评分详情 */}
              <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                  <CardTitle>评分详情</CardTitle>
                  <CardDescription>GEO优化评分分解</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">人性化GEO</span>
                      <span className="text-sm font-bold">{project.breakdown.humanizedGeo.toFixed(1)}/2.5</span>
                    </div>
                    <Progress value={(project.breakdown.humanizedGeo / 2.5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">内容交叉验证</span>
                      <span className="text-sm font-bold">{project.breakdown.crossValidation.toFixed(1)}/2.5</span>
                    </div>
                    <Progress value={(project.breakdown.crossValidation / 2.5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">E-E-A-T原则</span>
                      <span className="text-sm font-bold">{project.breakdown.eeat.toFixed(1)}/1.5</span>
                    </div>
                    <Progress value={(project.breakdown.eeat / 1.5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">精准引用</span>
                      <span className="text-sm font-bold">{project.breakdown.preciseCitation.toFixed(1)}/1.5</span>
                    </div>
                    <Progress value={(project.breakdown.preciseCitation / 1.5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">结构化内容</span>
                      <span className="text-sm font-bold">{project.breakdown.structuredContent.toFixed(1)}/1.0</span>
                    </div>
                    <Progress value={(project.breakdown.structuredContent / 1.0) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">SEO关键词</span>
                      <span className="text-sm font-bold">{project.breakdown.seoKeywords.toFixed(1)}/1.0</span>
                    </div>
                    <Progress value={(project.breakdown.seoKeywords / 1.0) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 引用详情 */}
          <TabsContent value="citations">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle>最近引用记录</CardTitle>
                <CardDescription>AI平台引用详情</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCitations.map((citation, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {citation.cited ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {citation.query}
                          </p>
                          <p className="text-sm text-gray-500">
                            {citation.platform} · 位置 #{citation.position}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={
                            citation.sentiment === 'positive' ? 'bg-green-500' :
                            citation.sentiment === 'negative' ? 'bg-red-500' :
                            'bg-gray-500'
                          }
                        >
                          {citation.sentiment === 'positive' ? '正面' : 
                           citation.sentiment === 'negative' ? '负面' : '中性'}
                        </Badge>
                        <span className="text-sm text-gray-500">{citation.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 平台分析 */}
          <TabsContent value="platforms">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monitoring.summary.platforms.map((platform, index) => (
                <Card key={index} className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-base">{platform.platform}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">引用次数</span>
                      <span className="font-bold text-green-600">{platform.citations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">曝光量</span>
                      <span className="font-bold text-blue-600">{platform.exposure.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">转化率</span>
                      <span className="font-bold text-purple-600">{platform.conversionRate.toFixed(2)}%</span>
                    </div>
                    <Progress 
                      value={(platform.citations / Math.max(...monitoring.summary.platforms.map(p => p.citations))) * 100} 
                      className="h-2"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 趋势分析 */}
          <TabsContent value="trends">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle>完整趋势数据</CardTitle>
                <CardDescription>过去30天的数据趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="citations" 
                      stroke="#10B981" 
                      name="引用次数"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="exposure" 
                      stroke="#3B82F6" 
                      name="曝光量"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversions" 
                      stroke="#F59E0B" 
                      name="转化数"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
