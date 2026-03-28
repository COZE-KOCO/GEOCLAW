'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw,
  Plus,
  Upload,
  Cloud,
  Search,
  X,
  Loader2,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DialogContent,
} from '@/components/ui/dialog';
import { useBusiness } from '@/contexts/business-context';

// 关键词库类型定义
interface KeywordLibrary {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  keywords: string[];
  keywordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 蒸馏词类型
interface DistillationKeyword {
  word: string;
  category: 'core' | 'longtail' | 'question' | 'brand';
  importance: number;
  reasoning: string;
  selected?: boolean;
}

// 蒸馏词结果
interface DistillationResult {
  keywords: DistillationKeyword[];
  coreMessage: string;
  userIntent: string;
  competitorGaps: string[];
}

export default function KeywordsPage() {
  const { selectedBusiness } = useBusiness();
  const [libraries, setLibraries] = useState<KeywordLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<KeywordLibrary | null>(null);
  const [showAddLibraryDialog, setShowAddLibraryDialog] = useState(false);
  const [showAddKeywordsDialog, setShowAddKeywordsDialog] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // 输入文本状态
  const [textInputKeywords, setTextInputKeywords] = useState('');
  
  // 关键词挖掘状态
  const [miningTopic, setMiningTopic] = useState('');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningResult, setMiningResult] = useState<DistillationResult | null>(null);
  
  // 初始化加载数据
  useEffect(() => {
    loadLibraries();
  }, [selectedBusiness]);
  
  // 加载关键词库数据
  const loadLibraries = async () => {
    if (!selectedBusiness) {
      setLibraries([]);
      setSelectedLibrary(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/keywords?businessId=${selectedBusiness}`);
      const data = await response.json();
      
      if (response.ok && data.libraries) {
        setLibraries(data.libraries);
        // 如果没有选中的库，默认选中第一个
        if (!selectedLibrary && data.libraries.length > 0) {
          setSelectedLibrary(data.libraries[0]);
        } else if (selectedLibrary) {
          // 更新选中库的数据
          const updated = data.libraries.find((lib: KeywordLibrary) => lib.id === selectedLibrary.id);
          if (updated) {
            setSelectedLibrary(updated);
          } else if (data.libraries.length > 0) {
            // 如果之前选中的库不在列表中，选择第一个
            setSelectedLibrary(data.libraries[0]);
          } else {
            setSelectedLibrary(null);
          }
        }
      } else {
        setLibraries([]);
        setSelectedLibrary(null);
      }
    } catch (error) {
      console.error('加载关键词库失败:', error);
      setLibraries([]);
      setSelectedLibrary(null);
    }
  };
  
  // 创建新关键词库
  const handleCreateLibrary = async () => {
    if (!newLibraryName.trim()) {
      toast.error('请输入关键词库名称');
      return;
    }
    if (!selectedBusiness) {
      toast.error('请先选择商家');
      return;
    }
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          name: newLibraryName,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.library) {
        setNewLibraryName('');
        setShowAddLibraryDialog(false);
        loadLibraries();
        toast.success('关键词库创建成功');
      } else {
        toast.error(data.error || '创建关键词库失败');
      }
    } catch (error) {
      console.error('创建关键词库失败:', error);
      toast.error('创建关键词库失败');
    }
  };
  
  // 刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLibraries();
    setRefreshing(false);
    toast.success('刷新成功');
  };
  
  // 添加关键词（文本输入）
  const handleAddKeywordsFromText = async () => {
    if (!textInputKeywords.trim()) {
      toast.error('请输入关键词');
      return;
    }
    
    if (!selectedLibrary) {
      toast.error('请先选择关键词库');
      return;
    }
    
    const keywords = textInputKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLibrary.id,
          action: 'addKeywords',
          keywords: keywords,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.library) {
        setTextInputKeywords('');
        setShowAddKeywordsDialog(false);
        loadLibraries();
        toast.success(`成功添加 ${keywords.length} 个关键词`);
      } else {
        toast.error(data.error || '添加关键词失败');
      }
    } catch (error) {
      console.error('添加关键词失败:', error);
      toast.error('添加关键词失败');
    }
  };
  
  // 删除关键词
  const handleDeleteKeyword = async (keyword: string) => {
    if (!selectedLibrary) return;
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLibrary.id,
          action: 'removeKeyword',
          keyword: keyword,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        loadLibraries();
        toast.success('关键词已删除');
      } else {
        toast.error(data.error || '删除关键词失败');
      }
    } catch (error) {
      console.error('删除关键词失败:', error);
      toast.error('删除关键词失败');
    }
  };
  
  // 关键词挖掘 - 提取蒸馏词
  const handleMiningKeywords = async () => {
    if (!miningTopic.trim()) {
      toast.error('请输入主题或关键词');
      return;
    }
    
    setMiningLoading(true);
    setMiningResult(null);
    
    try {
      const response = await fetch('/api/keywords/distill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: miningTopic,
          seedKeywords: seedKeywords ? seedKeywords.split(/[,，、\s]+/).filter(k => k.trim()) : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // 默认全选所有关键词
        const keywords = data.data.keywords.map((k: DistillationKeyword) => ({
          ...k,
          selected: true,
        }));
        setMiningResult({
          ...data.data,
          keywords,
        });
        toast.success(`成功提取 ${keywords.length} 个蒸馏词`);
      } else {
        toast.error(data.error || '提取蒸馏词失败');
      }
    } catch (error) {
      console.error('提取蒸馏词失败:', error);
      toast.error('提取蒸馏词失败');
    } finally {
      setMiningLoading(false);
    }
  };
  
  // 切换蒸馏词选中状态
  const toggleKeywordSelection = (index: number) => {
    if (!miningResult) return;
    const keywords = [...miningResult.keywords];
    keywords[index] = { ...keywords[index], selected: !keywords[index].selected };
    setMiningResult({ ...miningResult, keywords });
  };
  
  // 全选/取消全选
  const toggleAllKeywords = (selected: boolean) => {
    if (!miningResult) return;
    const keywords = miningResult.keywords.map(k => ({ ...k, selected }));
    setMiningResult({ ...miningResult, keywords });
  };
  
  // 添加选中的关键词到库
  const handleAddSelectedKeywords = async () => {
    if (!selectedLibrary) {
      toast.error('请先选择关键词库');
      return;
    }
    
    const selectedKeywords = miningResult?.keywords
      .filter(k => k.selected)
      .map(k => k.word) || [];
    
    if (selectedKeywords.length === 0) {
      toast.error('请至少选择一个关键词');
      return;
    }
    
    try {
      const response = await fetch('/api/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLibrary.id,
          action: 'addKeywords',
          keywords: selectedKeywords,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.library) {
        // 重置状态
        setMiningTopic('');
        setSeedKeywords('');
        setMiningResult(null);
        setShowAddKeywordsDialog(false);
        loadLibraries();
        toast.success(`成功添加 ${selectedKeywords.length} 个关键词`);
      } else {
        toast.error(data.error || '添加关键词失败');
      }
    } catch (error) {
      console.error('添加关键词失败:', error);
      toast.error('添加关键词失败');
    }
  };
  
  // 重置挖掘状态
  const resetMining = () => {
    setMiningTopic('');
    setSeedKeywords('');
    setMiningResult(null);
  };
  
  // 获取分类标签样式
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'longtail':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'question':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'brand':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };
  
  // 获取分类名称
  const getCategoryName = (category: string) => {
    switch (category) {
      case 'core':
        return '核心词';
      case 'longtail':
        return '长尾词';
      case 'question':
        return '问题词';
      case 'brand':
        return '品牌词';
      default:
        return '其他';
    }
  };
  
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">关键词库</h1>
          <p className="text-sm text-gray-600">
            您可以通过手动添加、文档上传或关键词挖掘来创建关键词库
          </p>
          <p className="text-sm text-gray-600">
            AI会根据您上传的各个关键词进行训练，并由此创作文章
          </p>
        </div>
        
        {/* 操作按钮组 */}
        <div className="flex items-center gap-3">
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              resetMining();
              setShowAddKeywordsDialog(true);
            }}
          >
            录入关键词
          </Button>
          <Button 
            variant="outline"
            disabled={refreshing}
            onClick={handleRefresh}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            刷新
          </Button>
        </div>
        
        {/* 主内容区 */}
        <div className="flex gap-6 min-h-[500px]">
          {/* 左侧侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium text-gray-700">关键词库</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowAddLibraryDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    新关键词库
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {libraries.map(library => (
                    <button
                      key={library.id}
                      onClick={() => setSelectedLibrary(library)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedLibrary?.id === library.id
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{library.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {library.keywords.length}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  
                  {libraries.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      暂无关键词库
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 右侧内容区 */}
          <div className="flex-1">
            <Card className="h-full">
              <CardContent className="p-6 h-full flex flex-col">
                {selectedLibrary && selectedLibrary.keywords.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">
                        共 {selectedLibrary.keywords.length} 个关键词
                      </span>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <div className="flex flex-wrap gap-2">
                        {selectedLibrary.keywords.map((keyword, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="px-3 py-1.5 text-sm bg-white border-gray-200 flex items-center gap-2"
                          >
                            {keyword}
                            <button
                              onClick={() => handleDeleteKeyword(keyword)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                ) : selectedLibrary ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                      <div className="relative">
                        <Cloud className="w-16 h-16 text-gray-200" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Search className="w-5 h-5 text-blue-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-500 mb-4">您还没有录入关键词，快去录入吧!</p>
                    <Button 
                      variant="outline"
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      onClick={() => {
                        resetMining();
                        setShowAddKeywordsDialog(true);
                      }}
                    >
                      录入关键词
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <p className="text-gray-500 mb-4">请先创建或选择一个关键词库</p>
                    <Button 
                      variant="outline"
                      className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      onClick={() => setShowAddLibraryDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      新关键词库
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* 新建关键词库弹窗 */}
      <Dialog open={showAddLibraryDialog} onOpenChange={setShowAddLibraryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建关键词库</DialogTitle>
            <DialogDescription>
              创建新的关键词库，用于管理和组织关键词
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>关键词库名称</Label>
              <Input
                placeholder="输入关键词库名称"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLibraryDialog(false)}>
              取消
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreateLibrary}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 录入关键词弹窗 */}
      <Dialog open={showAddKeywordsDialog} onOpenChange={setShowAddKeywordsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>录入关键词</DialogTitle>
            <DialogDescription>
              通过文本输入、AI挖掘或文件导入添加关键词
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="text-input" className="mt-4">
            <TabsList className="grid grid-cols-3 gap-1 h-auto p-1 bg-gray-100 rounded-lg">
              <TabsTrigger 
                value="text-input"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md py-2"
              >
                输入文本
              </TabsTrigger>
              <TabsTrigger 
                value="keyword-mining"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md py-2"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                关键词挖掘
              </TabsTrigger>
              <TabsTrigger 
                value="batch-upload"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md py-2"
              >
                批量上传
              </TabsTrigger>
            </TabsList>
            
            {/* 输入文本 */}
            <TabsContent value="text-input" className="mt-4">
              <Textarea
                placeholder="关键词（一行一个）"
                value={textInputKeywords}
                onChange={(e) => setTextInputKeywords(e.target.value)}
                rows={10}
                className="border-purple-300 focus:border-purple-500"
              />
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                  取消
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAddKeywordsFromText}>
                  确定
                </Button>
              </DialogFooter>
            </TabsContent>
            
            {/* 关键词挖掘 */}
            <TabsContent value="keyword-mining" className="mt-4">
              {!miningResult ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>主题或关键词 <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="输入主题、行业或核心关键词，如：人工智能、SEO优化、内容营销"
                      value={miningTopic}
                      onChange={(e) => setMiningTopic(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      AI将基于此主题自动提取核心词、长尾词、问题词和品牌词
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>种子关键词（可选）</Label>
                    <Input
                      placeholder="输入已有的关键词，用逗号或空格分隔"
                      value={seedKeywords}
                      onChange={(e) => setSeedKeywords(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      提供种子关键词可帮助AI生成更精准的蒸馏词
                    </p>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                      取消
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={handleMiningKeywords}
                      disabled={miningLoading || !miningTopic.trim()}
                    >
                      {miningLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          提取中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          提取蒸馏词
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 分析摘要 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">分析摘要</h4>
                    <p className="text-sm text-blue-700 mb-2">{miningResult.coreMessage}</p>
                    <p className="text-sm text-blue-600"><strong>用户意图：</strong>{miningResult.userIntent}</p>
                    {miningResult.competitorGaps.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-blue-600"><strong>竞争机会：</strong></p>
                        <ul className="text-sm text-blue-600 list-disc list-inside">
                          {miningResult.competitorGaps.slice(0, 3).map((gap, i) => (
                            <li key={i}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {/* 操作栏 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        已选择 {miningResult.keywords.filter(k => k.selected).length} / {miningResult.keywords.length} 个关键词
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllKeywords(true)}
                      >
                        全选
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleAllKeywords(false)}
                      >
                        取消全选
                      </Button>
                    </div>
                  </div>
                  
                  {/* 关键词分类展示 */}
                  {['core', 'longtail', 'question', 'brand'].map(category => {
                    const categoryKeywords = miningResult.keywords.filter(k => k.category === category);
                    if (categoryKeywords.length === 0) return null;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                          <Badge className={getCategoryStyle(category)}>
                            {getCategoryName(category)}
                          </Badge>
                          <span className="text-sm text-gray-500">({categoryKeywords.length}个)</span>
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {categoryKeywords.map((keyword, index) => {
                            const globalIndex = miningResult.keywords.indexOf(keyword);
                            return (
                              <div 
                                key={index}
                                className={cn(
                                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                  keyword.selected 
                                    ? 'border-purple-300 bg-purple-50' 
                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                )}
                                onClick={() => toggleKeywordSelection(globalIndex)}
                              >
                                <Checkbox 
                                  checked={keyword.selected}
                                  onCheckedChange={() => toggleKeywordSelection(globalIndex)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{keyword.word}</span>
                                    {keyword.selected && (
                                      <CheckCircle className="h-4 w-4 text-purple-600" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{keyword.reasoning}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  重要度: {keyword.importance}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  <DialogFooter className="flex items-center gap-2">
                    <Button variant="outline" onClick={resetMining}>
                      重新提取
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                      取消
                    </Button>
                    <Button 
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={handleAddSelectedKeywords}
                      disabled={miningResult.keywords.filter(k => k.selected).length === 0}
                    >
                      添加选中的关键词
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </TabsContent>
            
            {/* 批量上传 */}
            <TabsContent value="batch-upload" className="mt-4">
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-50/30">
                <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">点击或拖拽文件至此区域即可上传</p>
                <p className="text-xs text-gray-400">
                  支持TXT格式的单文件上传，一个关键词一个行。严禁上传敏感数据或其他非法文件。
                </p>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                  取消
                </Button>
                <Button className="bg-purple-600 hover:bg-purple-700" disabled>
                  确定
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
