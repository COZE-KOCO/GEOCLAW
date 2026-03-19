'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/app-layout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Link2,
  Target,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
} from 'lucide-react';

interface MonitorData {
  citations: Array<{
    id: string;
    source: string;
    query: string;
    position: number;
    timestamp: string;
    platform: string;
  }>;
  exposure: Array<{
    id: string;
    date: string;
    impressions: number;
    ai_displays: number;
    click_rate: number;
  }>;
  conversions: Array<{
    id: string;
    date: string;
    visits: number;
    conversions: number;
    rate: number;
  }>;
  summary: {
    totalCitations: number;
    totalExposure: number;
    avgPosition: number;
    conversionRate: number;
  };
  platformCount?: Record<string, number>;
  topQueries?: Array<{ query: string; count: number }>;
}

export default function MonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('14d');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/monitor?range=${timeRange}`);
      const result = await response.json();

      if (result.success && result.data) {
        setData({
          citations: result.data.citations || [],
          exposure: result.data.exposure || [],
          conversions: result.data.conversions || [],
          summary: result.data.summary || {
            totalCitations: 0,
            totalExposure: 0,
            avgPosition: 0,
            conversionRate: 0,
          },
          platformCount: result.data.platformCount || {},
          topQueries: result.data.topQueries || [],
        });
      } else {
        throw new Error(result.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取监测数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
      setData({
        citations: [],
        exposure: [],
        conversions: [],
        summary: {
          totalCitations: 0,
          totalExposure: 0,
          avgPosition: 0,
          conversionRate: 0,
        },
        platformCount: {},
        topQueries: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const refreshData = () => {
    fetchData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
            <p className="text-slate-500">加载数据中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              数据监测
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              追踪您的GEO优化效果和AI引用表现
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="h-4 w-4 text-slate-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-slate-600 dark:text-slate-400"
              >
                <option value="7d">近7天</option>
                <option value="14d">近14天</option>
                <option value="30d">近30天</option>
              </select>
            </div>
            <Button variant="outline" onClick={refreshData} className="border-slate-200 dark:border-slate-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        {/* 核心指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">总引用次数</p>
                  <p className="text-2xl font-bold text-purple-600">{data.summary.totalCitations}</p>
                </div>
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-green-500 mt-2">↑ 15% 较上周</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">AI展示次数</p>
                  <p className="text-2xl font-bold text-purple-600">{data.summary.totalExposure}</p>
                </div>
                <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-xs text-green-500 mt-2">↑ 23% 较上周</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">平均排名</p>
                  <p className="text-2xl font-bold text-green-600">#{data.summary.avgPosition}</p>
                </div>
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-green-500 mt-2">↑ 排名提升 0.3</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">转化率</p>
                  <p className="text-2xl font-bold text-orange-600">{data.summary.conversionRate}%</p>
                </div>
                <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-green-500 mt-2">↑ 2.1% 较上周</p>
            </CardContent>
          </Card>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* 曝光趋势 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-500" />
                AI展示趋势
              </CardTitle>
              <CardDescription>内容在AI平台中的展示次数变化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.exposure}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ai_displays"
                      name="AI展示次数"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="impressions"
                      name="总曝光"
                      stroke="#3B82F6"
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 转化趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                流量转化
              </CardTitle>
              <CardDescription>从AI引用带来的流量转化情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.conversions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="visits" name="访问量" fill="#3B82F6" />
                    <Bar dataKey="conversions" name="转化数" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 引用详情表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              最近引用记录
            </CardTitle>
            <CardDescription>各AI平台的引用详情</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">平台</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">查询词</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">排名</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.citations.slice(0, 10).map((citation) => (
                    <tr key={citation.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <Badge variant="outline">{citation.platform}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{citation.query}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={citation.position === 1 ? 'default' : 'secondary'}
                          className={citation.position === 1 ? 'bg-green-500' : ''}
                        >
                          #{citation.position}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(citation.timestamp).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 平台分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>引用平台分布</CardTitle>
            </CardHeader>
            <CardContent>
              {data.platformCount && Object.keys(data.platformCount).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(data.platformCount).map(([platform, count]) => {
                    const percentage = data.summary.totalCitations > 0 
                      ? ((count as number) / data.summary.totalCitations * 100).toFixed(0)
                      : 0;
                    return (
                      <div key={platform} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{platform}</span>
                          <span className="text-gray-500">{count}次 ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无平台引用数据
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>热门查询词</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topQueries && data.topQueries.length > 0 ? (
                <div className="space-y-3">
                  {data.topQueries.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <span className="text-sm">{item.query}</span>
                      <Badge>{item.count}次引用</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无热门查询词数据
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
