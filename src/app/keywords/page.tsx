'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Globe,
  Search,
  X,
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
  
  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">关键词库</h1>
          <p className="text-sm text-gray-600">
            您可以通过手动添加，文档上传、关键词挖掘或者网站监视来创建关键词库
          </p>
          <p className="text-sm text-gray-600">
            AI会根据您上传的各个关键词进行训练，并由此创作文章
          </p>
        </div>
        
        {/* 操作按钮组 */}
        <div className="flex items-center gap-3">
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setShowAddKeywordsDialog(true)}
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
                      onClick={() => setShowAddKeywordsDialog(true)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>录入关键词</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="batch-upload" className="mt-4">
            <TabsList className="grid grid-cols-4 gap-1 h-auto p-1 bg-gray-100 rounded-lg">
              <TabsTrigger 
                value="batch-upload"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md py-2"
              >
                批量上传
              </TabsTrigger>
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
                关键词挖掘
              </TabsTrigger>
              <TabsTrigger 
                value="web-crawl"
                className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-md py-2"
              >
                网站抓取
              </TabsTrigger>
            </TabsList>
            
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
              <div className="text-center py-8">
                <div className="w-24 h-24 mb-4 mx-auto flex items-center justify-center">
                  <div className="relative">
                    <Cloud className="w-16 h-16 text-gray-200" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Search className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 mb-4">还没有添加网站，请点击这里添加</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  挖掘关键词
                </Button>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                  取消
                </Button>
              </DialogFooter>
            </TabsContent>
            
            {/* 网站抓取 */}
            <TabsContent value="web-crawl" className="mt-4">
              <div className="text-center py-8">
                <div className="w-24 h-24 mb-4 mx-auto flex items-center justify-center">
                  <div className="relative">
                    <Cloud className="w-16 h-16 text-gray-200" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 mb-4">还没有添加网站，请点击这里添加</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  新的网站分析
                </Button>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowAddKeywordsDialog(false)}>
                  取消
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
