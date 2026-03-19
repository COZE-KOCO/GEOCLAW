'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  Brain,
  FileCheck,
  Shield,
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

interface EnhancedScoreDisplayProps {
  score: {
    total: number;
    breakdown: {
      problemOriented: number;
      aiRecognition: number;
      contentQuality: number;
      trustBuilding: number;
      structuredData: number;
      multiPlatform: number;
      seakeywords: number;
    };
    problemAnalysis: {
      questionPatterns: string[];
      questionScore: number;
      suggestions: string[];
    };
    contentTemplate?: {
      type: string;
      confidence: number;
      improvements: string[];
    };
    platformSuggestions: {
      primary: string[];
      secondary: string[];
      reasons: string[];
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
}

const scoreConfig = {
  problemOriented: {
    name: '问题导向',
    max: 2.0,
    icon: Target,
    color: 'text-blue-500',
    description: '内容是否围绕用户问题展开',
  },
  aiRecognition: {
    name: 'AI识别友好',
    max: 2.0,
    icon: Brain,
    color: 'text-purple-500',
    description: '内容是否易于AI抓取理解',
  },
  contentQuality: {
    name: '内容质量',
    max: 2.0,
    icon: FileCheck,
    color: 'text-green-500',
    description: '内容深度、数据和案例',
  },
  trustBuilding: {
    name: '信任建立',
    max: 1.5,
    icon: Shield,
    color: 'text-amber-500',
    description: '权威性和第三方验证',
  },
  structuredData: {
    name: '结构化数据',
    max: 1.0,
    icon: Database,
    color: 'text-cyan-500',
    description: 'Schema标记和表格结构',
  },
  multiPlatform: {
    name: '多平台适配',
    max: 1.0,
    icon: Share2,
    color: 'text-pink-500',
    description: '适合多平台分发',
  },
  seakeywords: {
    name: 'SEO关键词',
    max: 0.5,
    icon: Search,
    color: 'text-orange-500',
    description: '关键词覆盖度',
  },
};

export function EnhancedScoreDisplay({
  score,
  grade,
  templateRecommendation,
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
      {score.quickWins.length > 0 && (
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
      {score.problemAnalysis.questionPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              问题类型识别
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-3">
              {score.problemAnalysis.questionPatterns.map((pattern, index) => (
                <Badge key={index} variant="secondary">
                  {pattern}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">问题匹配度:</span>
              <Progress value={score.problemAnalysis.questionScore} className="flex-1" />
              <span className="text-sm font-semibold">{score.problemAnalysis.questionScore}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细评分维度 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">评分详情</CardTitle>
          <CardDescription>基于阿里云GEO优化指南的七大维度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(score.breakdown).map(([key, value]) => {
              const config = scoreConfig[key as keyof typeof scoreConfig];
              const Icon = config.icon;
              const percentage = (value / config.max) * 100;

              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${config.color}`}>
                        {value.toFixed(1)}
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
      {score.platformSuggestions.primary.length > 0 && (
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
                  {score.platformSuggestions.primary.map((platform, index) => (
                    <Badge key={index} className="bg-green-500 text-white">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-600 mb-2">次要平台</div>
                <div className="flex flex-wrap gap-2">
                  {score.platformSuggestions.secondary.map((platform, index) => (
                    <Badge key={index} variant="outline">
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                {score.platformSuggestions.reasons.map((reason, index) => (
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
      {score.suggestions.length > 0 && (
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
            <p>✅ <strong>内容深度</strong>：3000-5000字最佳，包含数据和案例</p>
            <p>✅ <strong>信任建立</strong>：引用权威来源，添加第三方验证</p>
            <p>✅ <strong>结构清晰</strong>：使用表格和列表，便于AI提取</p>
            <p>✅ <strong>持续优化</strong>：每周监测数据，动态调整策略</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
