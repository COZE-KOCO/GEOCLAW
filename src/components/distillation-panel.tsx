'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  TrendingUp, 
  Target,
  Lightbulb,
  Plus,
  AlertCircle,
  Zap,
  Building2,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface DistillationWord {
  id: string;
  word: string;
  category: 'core' | 'longtail' | 'question' | 'brand';
  industry?: string;
  searchVolume: number;
  aiMentionRate: number;
  competitionLevel: 'low' | 'medium' | 'high';
  relevanceScore: number;
  relatedQuestions: string[];
}

interface IndustryAnalysis {
  primaryIndustry: string;
  subIndustry?: string;
  confidence: number;
  relatedIndustries: string[];
  reasoning: string;
}

interface DistillationAnalysis {
  industry: IndustryAnalysis;
  words: DistillationWord[];
  recommendations: {
    highPriority: string[];
    mediumPriority: string[];
    longTail: string[];
  };
  contentSuggestions: string[];
}

interface DistillationPanelProps {
  content?: string;
  title?: string;
  onWordSelect?: (word: string) => void;
}

export function DistillationPanel({ content, title, onWordSelect }: DistillationPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DistillationAnalysis | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analyzeContent = async () => {
    const contentToAnalyze = content || searchTerm;
    if (!contentToAnalyze) return;

    setAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/distillation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToAnalyze,
          title: title,
          // 不再传递固定行业，让LLM自动判断
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysisResult(data.data);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (err) {
      console.error('分析失败:', err);
      setError('分析失败，请稍后重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const getCompetitionBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-green-500">低竞争</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">中竞争</Badge>;
      case 'high':
        return <Badge className="bg-red-500">高竞争</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'core':
        return <Badge variant="default">核心词</Badge>;
      case 'longtail':
        return <Badge variant="secondary">长尾词</Badge>;
      case 'question':
        return <Badge variant="outline">问题词</Badge>;
      case 'brand':
        return <Badge variant="outline">品牌词</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  // 按类别分组词汇
  const groupedWords = (analysisResult?.words || []).reduce((acc, word) => {
    if (!acc[word.category]) {
      acc[word.category] = [];
    }
    acc[word.category].push(word);
    return acc;
  }, {} as Record<string, DistillationWord[]>);

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center gap-4">
        {!content && (
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="输入内容进行分析，系统将自动识别行业..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyzeContent()}
            />
          </div>
        )}

        <Button onClick={analyzeContent} disabled={analyzing || (!content && !searchTerm)}>
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              AI分析中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              智能分析
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 行业分析结果 */}
      {analysisResult?.industry && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              行业识别结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">主行业</p>
                <p className="text-xl font-bold text-blue-700">
                  {analysisResult.industry.primaryIndustry}
                </p>
                {analysisResult.industry.subIndustry && (
                  <p className="text-sm text-gray-600">
                    细分领域: {analysisResult.industry.subIndustry}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">置信度</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={analysisResult.industry.confidence * 100} 
                    className="w-24 h-2" 
                  />
                  <span className="text-lg font-bold">
                    {Math.round(analysisResult.industry.confidence * 100)}%
                  </span>
                </div>
              </div>
              {analysisResult.industry.relatedIndustries.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500">相关行业</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.industry.relatedIndustries.map((ind, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {analysisResult.industry.reasoning && (
              <p className="text-sm text-gray-600 mt-3">
                <span className="font-medium">判断依据：</span>
                {analysisResult.industry.reasoning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 统计摘要 */}
      {analysisResult?.words && analysisResult.words.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">蒸馏词总数</p>
                  <p className="text-2xl font-bold">{analysisResult.words.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">核心词</p>
                  <p className="text-2xl font-bold">{groupedWords['core']?.length || 0}</p>
                </div>
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">平均AI提及率</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      analysisResult.words.reduce((sum, w) => sum + w.aiMentionRate, 0) / 
                      analysisResult.words.length
                    )}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">低竞争机会词</p>
                  <p className="text-2xl font-bold">
                    {analysisResult.words.filter(w => w.competitionLevel === 'low').length}
                  </p>
                </div>
                <Lightbulb className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 内容优化建议 */}
      {analysisResult?.contentSuggestions && analysisResult.contentSuggestions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-800">内容优化建议</p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-2">
                  {analysisResult.contentSuggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 蒸馏词列表 */}
      {analysisResult?.words && analysisResult.words.length > 0 && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">
              全部 ({analysisResult.words.length})
            </TabsTrigger>
            <TabsTrigger value="core">
              核心词 ({groupedWords['core']?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="longtail">
              长尾词 ({groupedWords['longtail']?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="question">
              问题词 ({groupedWords['question']?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <WordsTable 
              words={analysisResult.words} 
              onWordSelect={onWordSelect}
              getCategoryBadge={getCategoryBadge}
              getCompetitionBadge={getCompetitionBadge}
            />
          </TabsContent>

          <TabsContent value="core">
            <WordsTable 
              words={groupedWords['core'] || []} 
              onWordSelect={onWordSelect}
              getCategoryBadge={getCategoryBadge}
              getCompetitionBadge={getCompetitionBadge}
            />
          </TabsContent>

          <TabsContent value="longtail">
            <WordsTable 
              words={groupedWords['longtail'] || []} 
              onWordSelect={onWordSelect}
              getCategoryBadge={getCategoryBadge}
              getCompetitionBadge={getCompetitionBadge}
            />
          </TabsContent>

          <TabsContent value="question">
            <WordsTable 
              words={groupedWords['question'] || []} 
              onWordSelect={onWordSelect}
              getCategoryBadge={getCategoryBadge}
              getCompetitionBadge={getCompetitionBadge}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* 推荐关键词 */}
      {analysisResult?.recommendations && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysisResult.recommendations.highPriority.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-red-500" />
                  高优先级
                </CardTitle>
                <CardDescription>必须覆盖的核心关键词</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.recommendations.highPriority.map((word, i) => (
                    <Badge 
                      key={i} 
                      variant="default"
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => onWordSelect?.(word)}
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysisResult.recommendations.mediumPriority.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                  中优先级
                </CardTitle>
                <CardDescription>建议覆盖的关键词</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.recommendations.mediumPriority.map((word, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                      onClick={() => onWordSelect?.(word)}
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysisResult.recommendations.longTail.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-500" />
                  长尾机会
                </CardTitle>
                <CardDescription>低竞争、高转化词</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.recommendations.longTail.map((word, i) => (
                    <Badge 
                      key={i} 
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => onWordSelect?.(word)}
                    >
                      {word}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// 词汇表格组件
function WordsTable({ 
  words, 
  onWordSelect,
  getCategoryBadge,
  getCompetitionBadge 
}: { 
  words: DistillationWord[];
  onWordSelect?: (word: string) => void;
  getCategoryBadge: (cat: string) => React.ReactNode;
  getCompetitionBadge: (level: string) => React.ReactNode;
}) {
  if (words.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-500">
          暂无数据
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>关键词</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>搜索量</TableHead>
              <TableHead>AI提及率</TableHead>
              <TableHead>竞争度</TableHead>
              <TableHead>相关度</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map((word) => (
              <TableRow key={word.id}>
                <TableCell className="font-medium">{word.word}</TableCell>
                <TableCell>{getCategoryBadge(word.category)}</TableCell>
                <TableCell>{word.searchVolume.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={word.aiMentionRate} className="w-16 h-2" />
                    <span className="text-sm">{word.aiMentionRate}%</span>
                  </div>
                </TableCell>
                <TableCell>{getCompetitionBadge(word.competitionLevel)}</TableCell>
                <TableCell>{word.relevanceScore}%</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onWordSelect?.(word.word)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
