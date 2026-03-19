'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app-layout';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  BarChart3,
  Target,
  AlertCircle,
  X,
  ListChecks,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Key,
  HelpCircle,
  Zap,
  Shield,
  CloudUpload,
  Clock,
} from 'lucide-react';

// 支持的AI平台（图标来源：LobeHub官方CDN）
const AI_PLATFORMS = [
  { 
    id: 'doubao' as const, 
    name: '豆包', 
    icon: '🫛',
    iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/doubao-color.png',
    description: '字节跳动AI助手' 
  },
  { 
    id: 'deepseek' as const, 
    name: 'DeepSeek', 
    icon: '🔍',
    iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/deepseek-color.png',
    description: '深度求索AI' 
  },
  { 
    id: 'kimi' as const, 
    name: 'Kimi', 
    icon: '🌙',
    iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/kimi-color.png',
    description: '月之暗面AI' 
  },
  // Qwen 模型暂不支持，SDK更新后启用
  // { id: 'qwen' as const, name: '通义千问', icon: '🤖', description: '阿里云AI' },
];

type PlatformId = typeof AI_PLATFORMS[number]['id'];
type AnalysisType = 'keyword' | 'question';
type AnalysisStep = 'input' | 'select' | 'submitting';

interface ExtractedQuestion {
  id: number;
  question: string;
  category: string;
}

export default function GeoAnalysisPage() {
  const router = useRouter();
  
  // 分析类型和步骤
  const [analysisType, setAnalysisType] = useState<AnalysisType>('keyword');
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('input');
  
  // 状态
  const [extractingQuestions, setExtractingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>(AI_PLATFORMS.map(p => p.id));

  // 提取的问题
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  // 输入状态
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('');
  const [question, setQuestion] = useState('');
  const [targetBrand, setTargetBrand] = useState('');

  // 获取当前输入
  const getCurrentInput = () => {
    switch (analysisType) {
      case 'keyword': return keyword;
      case 'question': return question;
    }
  };

  // 平台选择
  const togglePlatform = (platformId: PlatformId) => {
    if (selectedPlatforms.includes(platformId)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformId));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  // 切换分析类型
  const handleTypeChange = (type: AnalysisType) => {
    setAnalysisType(type);
    setCurrentStep('input');
    setError(null);
    setExtractedQuestions([]);
    setSelectedQuestions([]);
    setKeyword('');
    setQuestion('');
    setIndustry('');
    setTargetBrand('');
  };

  // 提取相关问题（仅关键词分析使用）或直接创建任务（问题分析）
  const handleNextStep = async () => {
    const currentInput = getCurrentInput();
    if (!currentInput.trim()) {
      setError(`请输入${analysisType === 'keyword' ? '关键词' : '问题'}`);
      return;
    }

    // 问题分析：直接创建任务
    if (analysisType === 'question') {
      await createQuestionTask();
      return;
    }

    // 关键词分析：提取相关问题
    await extractQuestions();
  };

  // 问题分析：直接创建任务
  const createQuestionTask = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // 直接用输入的问题创建任务
      const questionData = {
        id: 1,
        question: question,
        category: '用户提问',
      };

      const response = await fetch('/api/geo-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          inputText: question,
          targetBrand: targetBrand || undefined,
          selectedPlatforms,
          selectedQuestions: [questionData],
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push('/geo-tasks');
      } else {
        setError(data.error || '创建任务失败');
      }
    } catch (err) {
      console.error('创建任务失败:', err);
      setError('创建任务失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 提取相关问题（仅关键词分析）
  const extractQuestions = async () => {
    setExtractingQuestions(true);
    setError(null);

    try {
      const response = await fetch('/api/geo-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract-questions',
          analysisType,
          input: keyword,
          industry,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.questions?.length > 0) {
        setExtractedQuestions(data.questions);
        setSelectedQuestions(data.questions.map((q: ExtractedQuestion) => q.id));
        setCurrentStep('select');
      } else {
        setError('未能提取到相关问题，请尝试其他关键词');
      }
    } catch (err) {
      console.error('提取问题失败:', err);
      setError('提取问题失败，请稍后重试');
    } finally {
      setExtractingQuestions(false);
    }
  };

  // 问题选择
  const toggleQuestion = (questionId: number) => {
    if (selectedQuestions.includes(questionId)) {
      if (selectedQuestions.length > 1) {
        setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
      }
    } else {
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };

  // 全选/取消全选
  const toggleAllQuestions = () => {
    if (selectedQuestions.length === extractedQuestions.length) {
      setSelectedQuestions([extractedQuestions[0].id]);
    } else {
      setSelectedQuestions(extractedQuestions.map(q => q.id));
    }
  };

  // 创建分析任务
  const createTask = async () => {
    if (selectedQuestions.length === 0) {
      setError('请至少选择一个问题');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/geo-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          inputText: getCurrentInput(),
          industry,
          targetBrand: targetBrand || undefined,
          selectedPlatforms,
          selectedQuestions: extractedQuestions.filter(q => selectedQuestions.includes(q.id)),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push('/geo-tasks');
      } else {
        setError(data.error || '创建任务失败');
      }
    } catch (err) {
      console.error('创建任务失败:', err);
      setError('创建任务失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 返回上一步
  const goBack = () => {
    setCurrentStep('input');
    setExtractedQuestions([]);
    setSelectedQuestions([]);
    setError(null);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              GEO分析
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              分析关键词或问题在AI搜索引擎中的表现
            </p>
          </div>
          <Link href="/geo-tasks">
            <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-700">
              <ListChecks className="h-4 w-4" />
              查看任务列表
            </Button>
          </Link>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            currentStep === 'input' ? 'bg-purple-500 text-white' : 'bg-green-500 text-white'
          }`}>
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</span>
            <span className="text-sm font-medium">输入内容</span>
          </div>
          
          {/* 关键词分析显示"选择问题"步骤 */}
          {analysisType === 'keyword' && (
            <>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                currentStep === 'select' ? 'bg-blue-500 text-white' : 
                currentStep === 'submitting' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-sm font-medium">选择问题</span>
              </div>
            </>
          )}
          
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700`}>
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {analysisType === 'keyword' ? '3' : '2'}
            </span>
            <span className="text-sm font-medium">后台分析</span>
          </div>
        </div>

        {/* 分析类型切换 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleTypeChange('keyword')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              analysisType === 'keyword' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Key className="h-4 w-4" />
            关键词分析
          </button>
          <button
            onClick={() => handleTypeChange('question')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              analysisType === 'question' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            问题分析
          </button>
        </div>

        {/* 步骤1：输入内容 */}
        {currentStep === 'input' && (
          <Card className="bg-white dark:bg-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {analysisType === 'keyword' && '关键词分析配置'}
                {analysisType === 'question' && '问题分析配置'}
              </CardTitle>
              <CardDescription>
                {analysisType === 'keyword' && '输入关键词，系统将提取相关问题供您选择'}
                {analysisType === 'question' && '输入问题，直接分析该问题在AI搜索引擎中的表现'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 关键词分析输入 */}
              {analysisType === 'keyword' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      关键词 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="例如：智能手机、新能源汽车、在线教育..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && extractQuestions()}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      所属行业（可选）
                    </label>
                    <Input
                      placeholder="例如：科技、汽车、教育..."
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 问题分析输入 */}
              {analysisType === 'question' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      问题 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="例如：哪个品牌的手机性价比最高？"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      关注品牌（可选）
                    </label>
                    <Input
                      placeholder="例如：华为、小米..."
                      value={targetBrand}
                      onChange={(e) => setTargetBrand(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">系统会特别关注该品牌在AI回答中的表现</p>
                  </div>
                </>
              )}

              {/* 平台选择 */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  分析平台 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {AI_PLATFORMS.map(platform => (
                    <div
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={platform.iconUrl} 
                          alt={platform.name}
                          className="w-6 h-6"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'inline';
                          }}
                        />
                        <span className="text-xl hidden">{platform.icon}</span>
                        <span className="font-medium text-sm">{platform.name}</span>
                      </div>
                      {selectedPlatforms.includes(platform.id) && (
                        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">已选择</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <Button 
                onClick={handleNextStep} 
                disabled={(analysisType === 'keyword' && extractingQuestions) || 
                          (analysisType === 'question' && submitting) || 
                          !getCurrentInput().trim()}
                className="w-full"
              >
                {analysisType === 'keyword' ? (
                  // 关键词分析：提取相关问题
                  extractingQuestions ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在提取问题...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      提取相关问题
                    </>
                  )
                ) : (
                  // 问题分析：直接开始分析
                  submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在创建任务...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      开始分析
                    </>
                  )
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 步骤2：选择问题 */}
        {currentStep === 'select' && (
          <Card className="bg-white dark:bg-gray-800 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">选择要分析的问题</CardTitle>
                  <CardDescription>
                    已提取 {extractedQuestions.length} 个相关问题，已选择 {selectedQuestions.length} 个
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={toggleAllQuestions}>
                  {selectedQuestions.length === extractedQuestions.length ? '取消全选' : '全选'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 问题列表 */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {extractedQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedQuestions.includes(q.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedQuestions.includes(q.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {q.question}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{q.category}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={goBack} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  返回修改
                </Button>
                <Button 
                  onClick={createTask} 
                  disabled={submitting || selectedQuestions.length === 0}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-4 w-4 mr-2" />
                      创建分析任务
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 功能说明 */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">分析功能说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Key className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">关键词分析</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    分析特定关键词在AI搜索引擎中的表现，包括排名、可见度、竞争情况等
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <HelpCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">问题分析</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    分析特定问题在AI回答中的表现，了解内容被引用的情况和优化机会
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">多平台支持</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    支持豆包、DeepSeek、Kimi、通义千问等主流AI平台
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">后台执行</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    任务在后台异步执行，可随时查看进度和结果
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
