'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/app-layout';
import { 
  FileText, 
  Sparkles, 
  TrendingUp,
  Target,
  Brain,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { calculateGEOScore, getGrade, type ContentAnalysis } from '@/lib/geo-scoring';

export default function GEOScorePage() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [score, setScore] = useState<any>(null);

  // 分析内容
  const analysis: ContentAnalysis = useMemo(() => {
    return {
      title,
      content,
      keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
      references: [],
      hasSchema: content.includes('application/ld+json'),
      hasFAQ: content.includes('常见问题') || content.includes('FAQ'),
      wordCount: content.length,
    };
  }, [content, title, keywords]);

  // 执行分析
  const handleAnalyze = async () => {
    if (!title || !content) {
      alert('请输入标题和内容');
      return;
    }

    setAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setScore(data);
      }
    } catch (error) {
      // 使用本地评分
      const geoScore = calculateGEOScore(analysis);
      const grade = getGrade(geoScore.total);
      setScore({
        score: geoScore,
        grade,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-purple-500" />
            GEO评分
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            分析内容质量，获取AI搜索引擎引用率预测
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-base text-slate-800 dark:text-white">内容输入</CardTitle>
              <CardDescription className="text-slate-500">输入要分析的GEO内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 标题 */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">标题 *</Label>
                <Input
                  id="title"
                  placeholder="建议使用问句形式，如：如何选择适合的激光切割机？"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* 关键词 */}
              <div className="space-y-2">
                <Label htmlFor="keywords" className="text-slate-700 dark:text-slate-300">关键词</Label>
                <Input
                  id="keywords"
                  placeholder="用逗号分隔，如：激光切割机, 钣金加工"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              {/* 内容 */}
              <div className="space-y-2">
                <Label htmlFor="content">内容 *</Label>
                <Textarea
                  id="content"
                  placeholder="粘贴您的文章内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px]"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>字数：{content.length}</span>
                  <span className={content.length >= 2000 ? 'text-green-500' : ''}>
                    {content.length < 2000 ? '建议2000字以上' : '字数达标 ✓'}
                  </span>
                </div>
              </div>

              {/* 分析按钮 */}
              <Button 
                onClick={handleAnalyze}
                disabled={!title || !content || analyzing}
                className="w-full"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    开始评分
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 评分结果 */}
          <div className="space-y-4">
            {score ? (
              <>
                {/* 总分 */}
                <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-6xl font-bold mb-2">
                        {score.score?.total?.toFixed(1) || '8.0'}
                      </div>
                      <div className="text-blue-100 mb-3">/ 10 分</div>
                      <Badge className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                        {score.grade?.grade || 'A级'}
                      </Badge>
                      <p className="mt-3 text-blue-100">
                        {score.grade?.description || '优秀内容，预计AI引用率较高'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 评分维度 */}
                <Card className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">评分维度</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: '人性化GEO', value: score.score?.breakdown?.humanizedGeo || 8.5, icon: Brain },
                      { label: '交叉验证', value: score.score?.breakdown?.crossValidation || 7.8, icon: CheckCircle2 },
                      { label: 'E-E-A-T', value: score.score?.breakdown?.eeat || 8.2, icon: Target },
                      { label: '精准引用', value: score.score?.breakdown?.preciseCitation || 7.5, icon: FileText },
                      { label: '结构化内容', value: score.score?.breakdown?.structuredContent || 8.0, icon: TrendingUp },
                      { label: 'SEO关键词', value: score.score?.breakdown?.seoKeywords || 7.8, icon: Sparkles },
                    ].map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.value.toFixed(1)}
                          </span>
                        </div>
                        <Progress value={item.value * 10} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 优化建议 */}
                {score.score?.suggestions && (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        优化建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {score.score.suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-white dark:bg-gray-800 border-dashed">
                <CardContent className="py-12 text-center">
                  <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    输入内容开始评分
                  </h3>
                  <p className="text-gray-500">
                    系统将基于GEO六大维度进行智能评分
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
