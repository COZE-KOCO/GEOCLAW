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
import { EnhancedScoreDisplay } from '@/components/enhanced-score-display';
import { 
  FileText, 
  Sparkles, 
  TrendingUp,
  Target,
  Brain,
  Heart,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Zap,
  Shield,
  Quote,
  Database,
  Share2,
  Search,
} from 'lucide-react';
import { calculateGEOScore, getGrade, type ContentAnalysisUnified, DIMENSION_CONFIG } from '@/lib/geo-scoring-unified';

// 维度图标映射
const dimensionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  problemOriented: Target,
  aiRecognition: Brain,
  humanizedExpression: Heart,
  contentQuality: FileText,
  trustAuthority: Shield,
  preciseCitation: Quote,
  structuredData: Database,
  multiPlatform: Share2,
  seoKeywords: Search,
};

// 维度颜色映射
const dimensionColors: Record<string, string> = {
  problemOriented: 'text-blue-500',
  aiRecognition: 'text-purple-500',
  humanizedExpression: 'text-pink-500',
  contentQuality: 'text-green-500',
  trustAuthority: 'text-amber-500',
  preciseCitation: 'text-indigo-500',
  structuredData: 'text-cyan-500',
  multiPlatform: 'text-teal-500',
  seoKeywords: 'text-orange-500',
};

// 维度中文名映射
const dimensionNames: Record<string, string> = {
  problemOriented: '问题导向',
  aiRecognition: 'AI识别友好',
  humanizedExpression: '人性化表达',
  contentQuality: '内容质量',
  trustAuthority: '信任权威',
  preciseCitation: '精准引用',
  structuredData: '结构化数据',
  multiPlatform: '多平台适配',
  seoKeywords: 'SEO关键词',
};

export default function GEOScorePage() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [score, setScore] = useState<any>(null);

  // 分析内容
  const analysis: ContentAnalysisUnified = useMemo(() => {
    return {
      title,
      content,
      keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
      references: [],
      hasSchema: content.includes('application/ld+json'),
      hasFAQ: content.includes('常见问题') || content.includes('FAQ'),
      hasImages: content.includes('![图片') || content.includes('<img'),
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
        platformSuggestions: {
          primary: ['知乎专栏', '百度百家号'],
          secondary: ['今日头条', '微信公众号'],
          reasons: ['多平台分发可提升内容曝光率'],
        },
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
            GEO评分（统一版）
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            分析内容质量，获取AI搜索引擎引用率预测 - 九维度统一评分体系
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
                      {score.grade?.aiReferenceRate && (
                        <p className="mt-2 text-white/80 text-sm">
                          预测AI引用率：{score.grade.aiReferenceRate}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 评分维度 */}
                <Card className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="text-lg">九维度评分详情</CardTitle>
                    <CardDescription>合并V1和V2优势的统一评分体系</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {score.score?.breakdown && Object.entries(score.score.breakdown).map(([key, value]) => {
                      const config = DIMENSION_CONFIG[key as keyof typeof DIMENSION_CONFIG];
                      if (!config) return null;
                      
                      const Icon = dimensionIcons[key] || Target;
                      const colorClass = dimensionColors[key] || 'text-gray-500';
                      const percentage = ((value as number) / config.max) * 100;

                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${colorClass}`} />
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {dimensionNames[key] || config.name}
                              </span>
                            </div>
                            <span className={`font-medium ${colorClass}`}>
                              {(value as number).toFixed(2)} / {config.max}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-1.5" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* 快速提升建议 */}
                {score.score?.quickWins && score.score.quickWins.length > 0 && (
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        快速提升建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {score.score.quickWins.slice(0, 5).map((win: string, index: number) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <span className="text-yellow-500">⚡</span>
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 优化建议 */}
                {score.score?.suggestions && score.score.suggestions.length > 0 && (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-500" />
                        优化建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {score.score.suggestions.slice(0, 8).map((suggestion: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* 问题类型识别 */}
                {score.score?.analysis?.questionPatterns && score.score.analysis.questionPatterns.length > 0 && (
                  <Card className="bg-white dark:bg-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-green-500" />
                        问题类型识别
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {score.score.analysis.questionPatterns.map((pattern: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
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
                  <p className="text-gray-500 mb-4">
                    系统将基于九大维度进行智能评分
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>问题导向 · AI识别友好 · 人性化表达</p>
                    <p>内容质量 · 信任权威 · 精准引用</p>
                    <p>结构化数据 · 多平台适配 · SEO关键词</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
