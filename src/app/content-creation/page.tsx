'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  ExternalLink, 
  Sparkles, 
  Copy, 
  Save,
  FileText,
  Link as LinkIcon,
  Globe,
  MessageSquare,
  Loader2,
  Building2,
  Store,
  Tag,
  MapPin,
  Phone,
  Globe2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// 平台信息
const platformInfo: Record<string, { name: string; icon: string }> = {
  doubao: { name: '豆包', icon: '🤖' },
  deepseek: { name: 'DeepSeek', icon: '🔬' },
  kimi: { name: 'Kimi', icon: '🌙' },
};

function ContentCreationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 从 URL 参数获取数据
  const mode = searchParams.get('mode');
  const title = searchParams.get('title') || '';
  const url = searchParams.get('url') || '';
  const source = searchParams.get('source') || '';
  const content = searchParams.get('content') || '';
  const question = searchParams.get('question') || '';
  const platform = searchParams.get('platform') || '';
  
  // 基本信息状态
  const [brandInfo, setBrandInfo] = useState({
    brandName: '',      // 品牌名称
    companyName: '',    // 公司名称
    storeName: '',      // 店名
    industry: '',       // 行业
    location: '',       // 地区/地址
    contact: '',        // 联系方式
    website: '',        // 官网
    features: '',       // 特色/卖点
  });
  
  // 内容状态
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(true);

  // 平台信息
  const platformData = platformInfo[platform] || { name: '未知平台', icon: '📄' };

  // 更新品牌信息
  const updateBrandInfo = (field: string, value: string) => {
    setBrandInfo(prev => ({ ...prev, [field]: value }));
  };

  // AI 仿写功能
  const handleGenerate = async () => {
    if (!content) {
      alert('没有可用的引用内容');
      return;
    }
    
    // 检查是否填写了基本信息
    const hasBrandInfo = brandInfo.brandName || brandInfo.companyName || brandInfo.storeName;
    if (!hasBrandInfo) {
      const confirmed = confirm('您还没有填写品牌基本信息，是否继续生成？\n\n建议填写品牌名称、公司名称或店名，以便生成更贴合的内容。');
      if (!confirmed) {
        setShowBrandForm(true);
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/content-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewrite',
          content,
          title,
          question,
          platform,
          brandInfo,
        }),
      });
      
      if (!response.ok) throw new Error('生成失败');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');
      
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        result += chunk;
      }
      
      setNewContent(result);
      // 根据品牌信息生成标题
      const brandTitle = brandInfo.brandName || brandInfo.storeName || brandInfo.companyName;
      setNewTitle(brandTitle ? `${brandTitle} - ${question.substring(0, 20)}...` : `仿写：${title.substring(0, 30)}...`);
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存功能
  const handleSave = async () => {
    if (!newTitle || !newContent) {
      alert('请填写标题和内容');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          keywords: [question.substring(0, 20)],
          source: 'rewrite',
          originalUrl: url,
          platform: platform,
          brandInfo,
        }),
      });
      
      if (!response.ok) throw new Error('保存失败');
      
      const data = await response.json();
      alert('保存成功！');
      router.push(`/content/${data.id}`);
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(newContent);
    alert('已复制到剪贴板');
  };

  return (
    <AppLayout>
      <div className="px-6 py-6">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 text-slate-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 左侧：原始引用资料 */}
          <Card className="lg:col-span-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-800 dark:text-white">
                <FileText className="h-5 w-5" />
                原始引用资料
              </CardTitle>
              <CardDescription className="text-slate-500">
                来自 {platformData.icon} {platformData.name} 的搜索结果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 标题 */}
              <div>
                <Label className="text-xs text-slate-500">标题</Label>
                <p className="text-sm font-medium mt-1 line-clamp-2 text-slate-800 dark:text-white">{title || '-'}</p>
              </div>
              
              {/* URL */}
              {url && (
                <div>
                  <Label className="text-xs text-slate-500">来源链接</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <LinkIcon className="h-3 w-3 text-slate-400" />
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate"
                    >
                      {url.length > 30 ? url.substring(0, 30) + '...' : url}
                    </a>
                    <ExternalLink className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              )}
              
              {/* 来源 */}
              {source && (
                <div>
                  <Label className="text-xs text-gray-500">来源媒体</Label>
                  <div className="flex items-center gap-1 mt-1">
                    <Globe className="h-3 w-3 text-gray-400" />
                    <span className="text-xs">{source}</span>
                  </div>
                </div>
              )}
              
              {/* 原始问题 */}
              {question && (
                <div>
                  <Label className="text-xs text-gray-500">模拟问题</Label>
                  <div className="flex items-start gap-1 mt-1">
                    <MessageSquare className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 dark:text-gray-300">{question}</p>
                  </div>
                </div>
              )}
              
              {/* 内容摘要 */}
              <div>
                <Label className="text-xs text-gray-500">内容摘要</Label>
                <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {content || '暂无内容'}
                  </p>
                </div>
              </div>
              
              {/* 平台标签 */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {platformData.icon} {platformData.name}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  仿写模式
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 中间+右侧：创作区域 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 品牌基本信息卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5" />
                    品牌基本信息
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBrandForm(!showBrandForm)}
                    className="text-xs"
                  >
                    {showBrandForm ? '收起' : '展开'}
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  填写品牌信息，让AI生成更贴合您业务的内容
                </CardDescription>
              </CardHeader>
              {showBrandForm && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 品牌名称 */}
                    <div>
                      <Label htmlFor="brandName" className="text-xs flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        品牌名称
                      </Label>
                      <Input
                        id="brandName"
                        value={brandInfo.brandName}
                        onChange={(e) => updateBrandInfo('brandName', e.target.value)}
                        placeholder="如：华为、小米"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 公司名称 */}
                    <div>
                      <Label htmlFor="companyName" className="text-xs flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        公司名称
                      </Label>
                      <Input
                        id="companyName"
                        value={brandInfo.companyName}
                        onChange={(e) => updateBrandInfo('companyName', e.target.value)}
                        placeholder="如：华为技术有限公司"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 店名 */}
                    <div>
                      <Label htmlFor="storeName" className="text-xs flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        店名/门店名称
                      </Label>
                      <Input
                        id="storeName"
                        value={brandInfo.storeName}
                        onChange={(e) => updateBrandInfo('storeName', e.target.value)}
                        placeholder="如：华为旗舰店"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 行业 */}
                    <div>
                      <Label htmlFor="industry" className="text-xs flex items-center gap-1">
                        <Globe2 className="h-3 w-3" />
                        行业/领域
                      </Label>
                      <Input
                        id="industry"
                        value={brandInfo.industry}
                        onChange={(e) => updateBrandInfo('industry', e.target.value)}
                        placeholder="如：智能手机、餐饮"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 地区 */}
                    <div>
                      <Label htmlFor="location" className="text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        地区/地址
                      </Label>
                      <Input
                        id="location"
                        value={brandInfo.location}
                        onChange={(e) => updateBrandInfo('location', e.target.value)}
                        placeholder="如：北京市朝阳区"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 联系方式 */}
                    <div>
                      <Label htmlFor="contact" className="text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        联系方式
                      </Label>
                      <Input
                        id="contact"
                        value={brandInfo.contact}
                        onChange={(e) => updateBrandInfo('contact', e.target.value)}
                        placeholder="如：400-xxx-xxxx"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 官网 */}
                    <div>
                      <Label htmlFor="website" className="text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        官网/链接
                      </Label>
                      <Input
                        id="website"
                        value={brandInfo.website}
                        onChange={(e) => updateBrandInfo('website', e.target.value)}
                        placeholder="如：www.example.com"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    
                    {/* 特色卖点 */}
                    <div className="md:col-span-2 lg:col-span-1">
                      <Label htmlFor="features" className="text-xs flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        特色/卖点
                      </Label>
                      <Input
                        id="features"
                        value={brandInfo.features}
                        onChange={(e) => updateBrandInfo('features', e.target.value)}
                        placeholder="如：性价比高、服务好"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 内容创作卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-5 w-5" />
                      内容创作
                    </CardTitle>
                    <CardDescription className="text-xs">
                      基于引用资料和品牌信息创作新内容
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !content}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI 仿写
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 标题输入 */}
                <div>
                  <Label htmlFor="title">标题</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="请输入标题..."
                    className="mt-1"
                  />
                </div>
                
                {/* 内容编辑 */}
                <div>
                  <Label htmlFor="content">内容</Label>
                  <Textarea
                    id="content"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="点击 AI 仿写按钮自动生成，或手动编辑内容..."
                    className="mt-1 min-h-[350px]"
                  />
                </div>
                
                {/* 操作按钮 */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    {newContent.length > 0 && (
                      <span>共 {newContent.length} 字</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {newContent && (
                      <Button variant="outline" onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        复制
                      </Button>
                    )}
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving || !newTitle || !newContent}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          保存
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ContentCreationPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppLayout>
    }>
      <ContentCreationContent />
    </Suspense>
  );
}
