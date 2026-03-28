'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Brain,
  Heart,
  FileCheck,
  Shield,
  Quote,
  Database,
  Share2,
  Search,
  Zap,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DIMENSION_CONFIG } from '@/lib/geo-scoring-unified';

interface EnhancedScoreDisplayProps {
  score: {
    total: number;
    breakdown: {
      problemOriented: number;
      aiRecognition: number;
      humanizedExpression: number;
      contentQuality: number;
      trustAuthority: number;
      preciseCitation: number;
      structuredData: number;
      multiPlatform: number;
      seoKeywords: number;
    };
    analysis?: {
      questionPatterns: string[];
      contentTemplate?: {
        type: string;
        confidence: number;
        improvements: string[];
      };
      wordCount: number;
      hasImages: boolean;
      hasSchema: boolean;
      hasFAQ: boolean;
      keywordsInTitle: boolean;
      keywordDensity: number;
      hasExaggeration: boolean;
      citationFormat: boolean;
      hasAuthorInfo: boolean;
    };
    suggestions: string[];
    quickWins: string[];
  };
  grade: {
    grade: string;
    color: string;
    description: string;
    aiReferenceRate: string;
  };
  templateRecommendation?: {
    templateType: string;
    templateName: string;
    confidence: number;
    reason: string;
    aiReferenceRate: string;
    tips: string[];
  };
  platformSuggestions?: {
    primary: string[];
    secondary: string[];
    reasons: string[];
  };
}

// 维度图标映射
const dimensionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  problemOriented: Target,
  aiRecognition: Brain,
  humanizedExpression: Heart,
  contentQuality: FileCheck,
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

export function EnhancedScoreDisplay({
  score,
  grade,
  templateRecommendation,
  platformSuggestions,
}: EnhancedScoreDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 总分展示 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">
                <span className={grade.color}>{score.total.toFixed(1)}</span>
                <span className="text-xl text-gray-500"> / 10</span>
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                <Badge className={`${grade.color} bg-transparent border-current text-lg px-3 py-1`}>
                  {grade.grade}
                </Badge>
                <span className="ml-2">{grade.description}</span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">AI引用率预测</div>
              <div className="text-xl font-bold text-green-600">{grade.aiReferenceRate}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 模板推荐 */}
      {templateRecommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              推荐内容模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">{templateRecommendation.templateName}</div>
                <div className="text-sm text-gray-500">{templateRecommendation.reason}</div>
              </div>
              <Badge variant="outline">
                AI引用率 {templateRecommendation.aiReferenceRate}
              </Badge>
            </div>
            <div className="space-y-2">
              {templateRecommendation.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 快速提升建议 */}
      {score.quickWins && score.quickWins.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              快速提升建议
            </CardTitle>
            <CardDescription>这些优化可以在短时间内完成</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {score.quickWins.map((win, index) => (
                <div key={index} className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 p-2 rounded">
                  <span className="text-yellow-500">⚡</span>
                  <span>{win}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 问题分析 */}
      {score.analysis?.questionPatterns && score.analysis.questionPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              问题类型识别
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {score.analysis.questionPatterns.map((pattern, index) => (
                <Badge key={index} variant="secondary">
                  {pattern}
                </Badge>
              ))}
            </div>
            {score.analysis.contentTemplate && (
              <div className="text-sm text-gray-500">
                内容模板：<span className="font-medium">{score.analysis.contentTemplate.type}</span>
                {score.analysis.contentTemplate.confidence > 0 && (
                  <span className="ml-2 text-gray-400">
                    (置信度: {(score.analysis.contentTemplate.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 详细评分维度 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">评分详情</CardTitle>
          <CardDescription>基于统一GEO评分体系的九大维度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(score.breakdown).map(([key, value]) => {
              const config = DIMENSION_CONFIG[key as keyof typeof DIMENSION_CONFIG];
              if (!config) return null;
              
              const Icon = dimensionIcons[key] || Target;
              const colorClass = dimensionColors[key] || 'text-gray-500';
              const percentage = (value / config.max) * 100;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${colorClass}`}>
                        {value.toFixed(2)}
                      </span>
                      <span className="text-gray-500"> / {config.max}</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 平台发布建议 */}
      {platformSuggestions && platformSuggestions.primary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              平台发布建议
            </CardTitle>
            <CardDescription>根据内容特征推荐的高引用率平台</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-green-600 mb-2">主推平台</div>
                <div className="flex flex-wrap gap-2">
                  {platformSuggestions.primary.map((platform, index) => (
                    <Badge key={index} className="bg-green-500 text-white">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-600 mb-2">次要平台</div>
                <div className="flex flex-wrap gap-2">
                  {platformSuggestions.secondary.map((platform, index) => (
                    <Badge key={index} variant="outline">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                {platformSuggestions.reasons.map((reason, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {reason}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 优化建议 */}
      {score.suggestions && score.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              优化建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {score.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">{suggestion}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 文章要点提示 */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-500" />
            GEO优化核心要点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>✅ <strong>问题导向</strong>：标题用问句形式，第一段开门见山</p>
            <p>✅ <strong>人性化表达</strong>：使用"我们"、"你"等语言，避免夸大</p>
            <p>✅ <strong>内容质量</strong>：2500字以上，包含具体数据和案例</p>
            <p>✅ <strong>信任权威</strong>：引用权威来源，展示E-E-A-T</p>
            <p>✅ <strong>精准引用</strong>：使用[1][2]标注，确保可追溯</p>
            <p>✅ <strong>结构清晰</strong>：使用表格和列表，便于AI提取</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
