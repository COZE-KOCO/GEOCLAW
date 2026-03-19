'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AppLayout } from '@/components/app-layout';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaUpload, type MediaFile } from '@/components/media-upload';
import { PublishAssistant } from '@/components/publish-assistant';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';
import { 
  Network,
  Users,
  Target,
  TrendingUp,
  Settings,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  FileText,
  Send,
  Building2,
  Globe,
  CheckCircle2,
  ChevronRight,
  Copy,
  RefreshCw,
  Wand2,
  Layers,
  PlayCircle,
  ImageIcon,
  Upload,
  ExternalLink,
} from 'lucide-react';

// 类型定义
interface Business {
  id: string;
  name: string;
  type: 'store' | 'brand' | 'company' | 'chain';
  industry?: string;
  address?: string;
}

interface Account {
  id: string;
  businessId: string;
  platform: string;
  accountName: string;
  displayName: string;
  homepageUrl?: string;
  status: 'active' | 'inactive';
  authStatus: 'pending' | 'authorized' | 'expired';
  followers: number;
  avatar?: string;
}

interface Persona {
  id: string;
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
}

interface ContentDraft {
  id: string;
  title: string;
  content: string;
  distillationWords: string[];
  status: 'draft' | 'ready' | 'published';
  createdAt: Date;
}

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  accounts: number;
}

export default function MatrixPage() {
  // 全局商家状态
  const { 
    selectedBusiness, 
    setSelectedBusiness, 
    businesses, 
    refreshBusinesses 
  } = useBusiness();
  
  // 本地状态
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [contentDrafts, setContentDrafts] = useState<ContentDraft[]>([]);
  
  // 内容创作状态
  const [creationMode, setCreationMode] = useState<string | null>(null); // 创作模式
  const [targetModel, setTargetModel] = useState<string>('doubao');
  const [targetQuestion, setTargetQuestion] = useState('');
  const [articleType, setArticleType] = useState<string>('guide');
  const [articleLength, setArticleLength] = useState<string>('medium');
  const [generateMode, setGenerateMode] = useState<'article' | 'outline'>('article');
  const [brandInfo, setBrandInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [distillation, setDistillation] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]); // 媒体文件
  const [showMediaUpload, setShowMediaUpload] = useState(false); // 显示媒体上传区域
  // 发布渠道与内容格式
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]); // 选中的发布平台
  const [contentFormat, setContentFormat] = useState<string>('article'); // 内容格式
  
  // 批量发布状态
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [publishProgress, setPublishProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // 对话框状态
  const [showAddBusinessDialog, setShowAddBusinessDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showPublishAssistant, setShowPublishAssistant] = useState(false);
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    type: 'store' as 'store' | 'brand' | 'company' | 'chain',
    industry: '',
    address: '',
    city: '',
  });
  const [newAccount, setNewAccount] = useState({
    platform: '',
    accountName: '',
    displayName: '',
    homepageUrl: '',
    followers: 0,
    authStatus: 'pending' as 'pending' | 'authorized' | 'expired',
  });
  
  // 平台列表（全部可选）
  const platforms: Platform[] = [
    { id: 'wechat', name: '公众号', icon: '💚', color: 'bg-green-500', accounts: 1 },
    { id: 'toutiao', name: '头条号', icon: '📰', color: 'bg-red-600', accounts: 1 },
    { id: 'baijiahao', name: '百家号', icon: '📘', color: 'bg-blue-600', accounts: 0 },
    { id: 'xiaohongshu', name: '小红书', icon: '📕', color: 'bg-red-500', accounts: 3 },
    { id: 'douyin', name: '抖音', icon: '🎵', color: 'bg-black', accounts: 2 },
    { id: 'weixin_video', name: '视频号', icon: '📹', color: 'bg-green-600', accounts: 0 },
    { id: 'sohu', name: '搜狐号', icon: '🟠', color: 'bg-orange-500', accounts: 0 },
    { id: 'zhihu', name: '知乎', icon: '💡', color: 'bg-blue-500', accounts: 2 },
    { id: 'penguin', name: '企鹅号', icon: '🐧', color: 'bg-yellow-500', accounts: 0 },
    { id: 'autohome', name: '车家号', icon: '🚗', color: 'bg-blue-700', accounts: 0 },
    { id: 'dayu', name: '大鱼号', icon: '🐟', color: 'bg-orange-600', accounts: 0 },
    { id: 'xueqiu', name: '雪球号', icon: '❄️', color: 'bg-cyan-500', accounts: 0 },
    { id: 'douban', name: '豆瓣', icon: '📖', color: 'bg-green-700', accounts: 0 },
    { id: 'baidu_zhidao', name: '百度知道', icon: '❓', color: 'bg-blue-500', accounts: 0 },
    { id: 'jianshu', name: '简书号', icon: '📝', color: 'bg-red-400', accounts: 0 },
    { id: 'netease', name: '网易号', icon: '🔴', color: 'bg-red-700', accounts: 0 },
  ];
  
  // 模型列表（图标来源：LobeHub官方CDN - GitHub Raw）
  const aiModels = [
    { 
      id: 'doubao', 
      name: '豆包', 
      icon: '🫘',
      iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/doubao-color.png',
      description: '字节跳动旗下AI助手',
      color: '#6366F1'
    },
    { 
      id: 'deepseek', 
      name: 'DeepSeek', 
      icon: '🐋',
      iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/deepseek-color.png',
      description: '深度求索AI模型',
      color: '#4D6BFE'
    },
    { 
      id: 'qwen', 
      name: '千问', 
      icon: '💫',
      iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/qwen-color.png',
      description: '阿里巴巴通义千问',
      color: '#6366F1'
    },
    { 
      id: 'kimi', 
      name: 'Kimi', 
      icon: '🌙',
      iconUrl: 'https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/light/kimi-color.png',
      description: '月之暗面出品',
      color: '#8B5CF6'
    },
  ];
  
  // 文章类型
  const articleTypes = [
    { id: 'technical', name: '技术解析' },
    { id: 'product-review', name: '产品评测' },
    { id: 'industry-insight', name: '行业洞察' },
    { id: 'guide', name: '实操指南' },
    { id: 'comparison', name: '竞品对比' },
    { id: 'case-study', name: '案例分析' },
    { id: 'faq', name: '常见问题' },
    { id: 'news', name: '行业资讯' },
  ];

  // 创建企业
  const handleCreateBusiness = async () => {
    if (!newBusiness.name.trim()) {
      return;
    }
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBusiness),
      });
      if (res.ok) {
        const data = await res.json();
        // 刷新商家列表并选中新建的商家
        await refreshBusinesses();
        setSelectedBusiness(data.business.id);
        setShowAddBusinessDialog(false);
        setNewBusiness({ name: '', type: 'store', industry: '', address: '', city: '' });
      }
    } catch (error) {
      console.error('创建企业失败:', error);
    }
  };

  // 创建账号
  const handleCreateAccount = async () => {
    if (!selectedBusiness || !newAccount.platform || !newAccount.displayName.trim()) {
      return;
    }
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness,
          platform: newAccount.platform,
          accountName: newAccount.accountName,
          displayName: newAccount.displayName,
          homepageUrl: newAccount.homepageUrl,
          followers: newAccount.followers,
          metadata: { authStatus: newAccount.authStatus },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => [...prev, { ...data.account, authStatus: newAccount.authStatus }]);
        setShowAddAccountDialog(false);
        setNewAccount({ platform: '', accountName: '', displayName: '', homepageUrl: '', followers: 0, authStatus: 'pending' });
      }
    } catch (error) {
      console.error('创建账号失败:', error);
    }
  };

  // 根据选择的企业加载数据
  useEffect(() => {
    if (selectedBusiness) {
      loadBusinessData(selectedBusiness);
    }
  }, [selectedBusiness]);

  const loadBusinessData = async (businessId: string) => {
    try {
      // 加载账号
      const accountsRes = await fetch(`/api/accounts?businessId=${businessId}`);
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }
      
      // 加载人设
      const personasRes = await fetch(`/api/persona?businessId=${businessId}`);
      if (personasRes.ok) {
        const data = await personasRes.json();
        setPersonas(data.personas || []);
      }
    } catch (error) {
      console.error('加载企业数据失败:', error);
    }
  };

  // 计算已绑定的平台（根据实际账号数据）
  const boundPlatforms = useMemo(() => {
    // 统计每个平台的账号数量
    const platformAccountCounts: Record<string, number> = {};
    accounts.forEach(account => {
      const platformId = account.platform;
      platformAccountCounts[platformId] = (platformAccountCounts[platformId] || 0) + 1;
    });

    // 过滤出有绑定账号的平台，并更新账号数量
    return platforms
      .filter(platform => platformAccountCounts[platform.id] > 0)
      .map(platform => ({
        ...platform,
        accounts: platformAccountCounts[platform.id] || 0,
      }));
  }, [accounts]);

  // 生成内容
  const handleGenerate = async () => {
    if (!targetQuestion.trim()) {
      alert('请输入目标问题');
      return;
    }
    
    setIsGenerating(true);
    setDistillation(null);
    setGeneratedContent(null);
    
    try {
      const response = await fetch('/api/content-creation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          targetModel,
          targetQuestion,
          articleType,
          length: articleLength,
          generateMode,
          brandInfo,
          mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
          targetPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          contentFormat,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDistillation(data.data.distillation);
          setGeneratedContent(data.data.generated);
        }
      }
    } catch (error) {
      console.error('生成内容失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存为草稿
  const handleSaveDraft = () => {
    if (!generatedContent) return;
    
    const draft: ContentDraft = {
      id: Date.now().toString(),
      title: generatedContent.title,
      content: generatedContent.content,
      distillationWords: generatedContent.distillationWords,
      status: 'draft',
      createdAt: new Date(),
    };
    
    setContentDrafts([draft, ...contentDrafts]);
  };

  // 批量发布
  const handleBatchPublish = async () => {
    if (selectedAccounts.length === 0 || !generatedContent) {
      alert('请选择要发布的账号');
      return;
    }
    
    setIsPublishing(true);
    setPublishProgress(0);
    
    // 模拟发布进度
    const total = selectedAccounts.length;
    for (let i = 0; i < total; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setPublishProgress(((i + 1) / total) * 100);
    }
    
    setIsPublishing(false);
    alert(`成功发布到 ${total} 个账号！`);
  };

  // 切换账号选择
  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 头部 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                内容创作
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                面向多账号、多平台的内容运营场景，支持统一配置、批量生成与发布
              </p>
            </div>
            
            {/* 企业选择器 */}
            <div className="flex items-center gap-3">
              <BusinessSelector />
              <Dialog open={showAddBusinessDialog} onOpenChange={setShowAddBusinessDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" title="添加企业/商家">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>添加企业/商家</DialogTitle>
                    <DialogDescription>创建新的企业或商家，用于管理内容矩阵</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">名称</Label>
                      <Input 
                        id="name" 
                        value={newBusiness.name} 
                        onChange={e => setNewBusiness(prev => ({ ...prev, name: e.target.value }))}
                        className="col-span-3" 
                        placeholder="企业或商家名称" 
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">类型</Label>
                      <Select value={newBusiness.type} onValueChange={(v: any) => setNewBusiness(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="store">门店</SelectItem>
                          <SelectItem value="brand">品牌</SelectItem>
                          <SelectItem value="company">公司</SelectItem>
                          <SelectItem value="chain">连锁</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="industry" className="text-right">行业</Label>
                      <Input 
                        id="industry" 
                        value={newBusiness.industry} 
                        onChange={e => setNewBusiness(prev => ({ ...prev, industry: e.target.value }))}
                        className="col-span-3" 
                        placeholder="所属行业" 
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="city" className="text-right">城市</Label>
                      <Input 
                        id="city" 
                        value={newBusiness.city} 
                        onChange={e => setNewBusiness(prev => ({ ...prev, city: e.target.value }))}
                        className="col-span-3" 
                        placeholder="所在城市" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddBusinessDialog(false)}>取消</Button>
                    <Button onClick={handleCreateBusiness} disabled={!newBusiness.name.trim()}>创建</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* 主要内容区 - 内容创作工作台 */}
        <div className="space-y-6">
            {!creationMode ? (
              /* 模式选择卡片 */
              <div className="space-y-6">
                {/* 标题区域 */}
                <div className="text-center py-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    AI创作
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    开始你的文章创作之旅
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    选择最适合您需求和时间限制的写作模式
                  </p>
                </div>
                
                {/* 模式选择提示 */}
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    选择你的写作模式:
                  </span>
                </div>
                
                {/* 四种模式卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* 卡片1: AI智能创作 */}
                  <Card className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => setCreationMode('ai-smart')}>
                    {/* 推荐标签 */}
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-green-500 text-white hover:bg-green-600">
                        推荐
                      </Badge>
                    </div>
                    
                    {/* 顶部图标区域 */}
                    <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 flex items-center justify-center">
                      <div className="w-20 h-16 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center">
                        <Wand2 className="h-10 w-10 text-orange-500" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">AI智能创作</CardTitle>
                      <CardDescription>智能分析+一键生成</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>智能关键词分析</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>多平台适配</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>GEO评分优化</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>自动生成大纲</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                          创作记录
                        </Button>
                        <Button size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={(e) => { e.stopPropagation(); setCreationMode('ai-smart'); }}>
                          点击开始
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 卡片2: GEO优化创作 */}
                  <Card className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => setCreationMode('geo-optimize')}>
                    {/* 顶部图标区域 */}
                    <div className="h-32 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 flex items-center justify-center">
                      <div className="w-20 h-16 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center">
                        <Target className="h-10 w-10 text-purple-500" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">GEO优化创作</CardTitle>
                      <CardDescription>针对AI搜索引擎优化</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>多AI平台分析</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>品牌曝光优化</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>引用源分析</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>竞争力提升</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                          创作记录
                        </Button>
                        <Button size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={(e) => { e.stopPropagation(); setCreationMode('geo-optimize'); }}>
                          点击开始
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 卡片3: 批量自动创作 */}
                  <Card className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => setCreationMode('batch-create')}>
                    {/* 顶部图标区域 */}
                    <div className="h-32 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center">
                      <div className="w-20 h-16 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center">
                        <Layers className="h-10 w-10 text-blue-500" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">批量自动创作</CardTitle>
                      <CardDescription>根据规则批量生成</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>关键词/标题导入</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>自定义创作规则</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>批量生成发布</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>任务队列管理</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                          创作记录
                        </Button>
                        <Button size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={(e) => { e.stopPropagation(); setCreationMode('batch-create'); }}>
                          点击开始
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* 卡片4: 模板快速创作 */}
                  <Card className="relative overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => setCreationMode('template-create')}>
                    {/* 顶部图标区域 */}
                    <div className="h-32 bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-800/20 flex items-center justify-center">
                      <div className="w-20 h-16 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center justify-center">
                        <FileText className="h-10 w-10 text-cyan-500" />
                      </div>
                    </div>
                    
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">模板快速创作</CardTitle>
                      <CardDescription>自由创作+AI辅助</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>AI模板选择</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>自由编辑创作</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>素材库调用</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span>一键AI润色</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); }}>
                          创作记录
                        </Button>
                        <Button size="sm" className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={(e) => { e.stopPropagation(); setCreationMode('template-create'); }}>
                          点击开始
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* 创作工作台 */
              <div className="space-y-4">
                {/* 返回按钮和标题 */}
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setCreationMode(null)}
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                    返回模式选择
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <div>
                    <h3 className="font-semibold text-lg">
                      {creationMode === 'ai-smart' && 'AI智能创作'}
                      {creationMode === 'geo-optimize' && 'GEO优化创作'}
                      {creationMode === 'batch-create' && '批量自动创作'}
                      {creationMode === 'template-create' && '模板快速创作'}
                    </h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 左侧：创作配置 */}
                  <div className="lg:col-span-1 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">目标设定</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 发布渠道 */}
                        <div className="space-y-3">
                          <Label className="text-base font-medium">发布渠道</Label>
                          
                          {boundPlatforms.length === 0 && (
                            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                              暂无已绑定的发布渠道，请先在「账号管理」中绑定平台账号
                            </div>
                          )}
                          
                          <div className="grid grid-cols-4 gap-3">
                            {boundPlatforms.map(platform => {
                              const isSelected = selectedPlatforms.includes(platform.id);
                              return (
                                <div
                                  key={platform.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform.id));
                                    } else {
                                      setSelectedPlatforms([...selectedPlatforms, platform.id]);
                                    }
                                  }}
                                  className={`
                                    relative bg-white rounded-lg p-2 cursor-pointer transition-all
                                    border-2 hover:shadow-md
                                    ${isSelected ? 'border-purple-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
                                  `}
                                >
                                  <div className={`
                                    absolute top-2 right-2 w-4 h-4 rounded border-2 flex items-center justify-center
                                    ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'}
                                  `}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-center pt-1">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${platform.color}`}>
                                      <span className="text-sm">{platform.icon}</span>
                                    </div>
                                    <span className="mt-2 text-xs text-gray-700 font-medium">{platform.name}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* 内容格式 */}
                        {selectedPlatforms.length > 0 && (
                          <div className="space-y-2">
                            <Label>内容格式</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant={contentFormat === 'article' ? 'default' : 'outline'} size="sm" onClick={() => setContentFormat('article')} className="justify-start">
                                <FileText className="h-4 w-4 mr-2" />
                                图文文章
                              </Button>
                              <Button variant={contentFormat === 'image-text' ? 'default' : 'outline'} size="sm" onClick={() => setContentFormat('image-text')} className="justify-start">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                图文笔记
                              </Button>
                              <Button variant={contentFormat === 'video' ? 'default' : 'outline'} size="sm" onClick={() => setContentFormat('video')} className="justify-start">
                                <PlayCircle className="h-4 w-4 mr-2" />
                                视频内容
              </Button>
                              <Button variant={contentFormat === 'jump' ? 'default' : 'outline'} size="sm" onClick={() => setContentFormat('jump')} className="justify-start">
                                <ChevronRight className="h-4 w-4 mr-2" />
                                跳转引导
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              {contentFormat === 'article' && '适合深度内容，支持Markdown格式'}
                              {contentFormat === 'image-text' && '适合图文分享，简洁明了'}
                              {contentFormat === 'video' && '生成视频脚本和内容文案'}
                              {contentFormat === 'jump' && '生成引导用户跳转的内容'}
                            </p>
                          </div>
                        )}
                        
                        {/* 目标模型 */}
                        <div className="space-y-2">
                          <Label>目标AI模型</Label>
                          <Select value={targetModel} onValueChange={setTargetModel}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="选择AI模型" />
                            </SelectTrigger>
                            <SelectContent>
                              {aiModels.map(model => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex items-center gap-2">
                                    <img src={model.iconUrl} alt={model.name} className="w-5 h-5 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    <span>{model.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {targetModel && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {(() => {
                                const selectedModel = aiModels.find(m => m.id === targetModel);
                                return selectedModel ? (
                                  <>
                                    <img src={selectedModel.iconUrl} alt={selectedModel.name} className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    <span>{selectedModel.description}</span>
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}
                          <p className="text-xs text-gray-500">选择希望优化的AI搜索平台</p>
                        </div>
                        
                        {/* 目标问题 */}
                        <div className="space-y-2">
                          <Label>目标问题/行业/业务类型</Label>
                          <Textarea placeholder="例如：激光切割机哪个品牌好？智能制造解决方案有哪些？" value={targetQuestion} onChange={(e) => setTargetQuestion(e.target.value)} className="min-h-[80px]" />
                        </div>
                        
                        {/* 文章类型 */}
                        <div className="space-y-2">
                          <Label>文章类型</Label>
                          <Select value={articleType} onValueChange={setArticleType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {articleTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* 篇幅设置 */}
                        <div className="space-y-2">
                          <Label>文章篇幅</Label>
                          <Select value={articleLength} onValueChange={setArticleLength}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">短篇 (800-1500字)</SelectItem>
                              <SelectItem value="medium">中篇 (1500-3000字)</SelectItem>
                              <SelectItem value="long">长篇 (3000-5000字)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* 生成模式 */}
                        <div className="space-y-2">
                          <Label>生成模式</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant={generateMode === 'article' ? 'default' : 'outline'} onClick={() => setGenerateMode('article')} className="w-full">
                              <FileText className="h-4 w-4 mr-2" />
                              完整文章
                            </Button>
                            <Button variant={generateMode === 'outline' ? 'default' : 'outline'} onClick={() => setGenerateMode('outline')} className="w-full">
                              <Layers className="h-4 w-4 mr-2" />
                              仅大纲
                            </Button>
                          </div>
                        </div>
                        
                        {/* 品牌信息 */}
                        <div className="space-y-2">
                          <Label>品牌信息（可选）</Label>
                          <Textarea placeholder="填写品牌名称、核心优势等，系统将在内容中自然融入" value={brandInfo} onChange={(e) => setBrandInfo(e.target.value)} className="min-h-[60px]" />
                        </div>
                        
                        {/* 媒体文件上传 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>媒体文件（可选）</Label>
                            <Button variant="ghost" size="sm" onClick={() => setShowMediaUpload(!showMediaUpload)}>
                              {showMediaUpload ? '收起' : '展开'}
                              <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showMediaUpload ? 'rotate-90' : ''}`} />
                            </Button>
                          </div>
                          {showMediaUpload && <MediaUpload value={mediaFiles} onChange={setMediaFiles} maxFiles={10} />}
                          {mediaFiles.length > 0 && !showMediaUpload && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <ImageIcon className="h-4 w-4" />
                              <span>已上传 {mediaFiles.length} 个媒体文件</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 生成按钮 */}
                        <Button className="w-full" size="lg" onClick={handleGenerate} disabled={isGenerating || !targetQuestion.trim()}>
                          {isGenerating ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              开始创作
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 中间：蒸馏词分析 */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-yellow-500" />
                          蒸馏词分析
                        </CardTitle>
                        <CardDescription>基于AI搜索行为的智能分析</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {distillation ? (
                          <div className="space-y-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">核心信息</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">{distillation.coreMessage}</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                              <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">用户意图</p>
                              <p className="text-sm text-purple-700 dark:text-purple-300">{distillation.userIntent}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-2">提炼关键词</p>
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-2">
                                  {distillation.keywords.map((kw: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                      <Badge variant={kw.category === 'core' ? 'default' : kw.category === 'longtail' ? 'secondary' : kw.category === 'question' ? 'outline' : 'destructive'}>
                                        {kw.category === 'core' ? '核心' : kw.category === 'longtail' ? '长尾' : kw.category === 'question' ? '问题' : '品牌'}
                                      </Badge>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{kw.word}</p>
                                        <p className="text-xs text-gray-500">{kw.reasoning}</p>
                                      </div>
                                      <div className="text-xs text-gray-400">{kw.importance}%</div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                            {distillation.competitorGaps?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">竞争空白点</p>
                                <div className="flex flex-wrap gap-1">
                                  {distillation.competitorGaps.map((gap: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">{gap}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-gray-400 py-12">
                            <div>
                              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>开始创作后，蒸馏词将在此展示</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* 右侧：生成结果 */}
                  <div className="lg:col-span-1">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-500" />
                          生成结果
                        </CardTitle>
                        <CardDescription>
                          {generatedContent?.geoScore ? (
                            <span className={generatedContent.geoScore.gradeColor}>GEO评分: {generatedContent.geoScore.grade} ({generatedContent.geoScore.total}/10)</span>
                          ) : generatedContent ? `SEO评分: ${generatedContent.seoScore}/100` : 'AI生成的内容'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {generatedContent ? (
                          <div className="space-y-4">
                            {generatedContent.geoScore && (
                              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <img src={aiModels.find(m => m.id === targetModel)?.iconUrl} alt="" className="w-6 h-6" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    <span className="font-medium">GEO评分</span>
                                  </div>
                                  <Badge className={generatedContent.geoScore.gradeColor}>{generatedContent.geoScore.grade}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {Object.entries(generatedContent.geoScore.breakdown).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-gray-500">{key === 'humanizedGeo' ? '人性化' : key === 'crossValidation' ? '交叉验证' : key === 'eeat' ? 'EEAT' : key === 'preciseCitation' ? '精确引用' : key === 'structuredContent' ? '结构化' : 'SEO关键词'}</span>
                                      <span className="font-medium">{value as number}/10</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div>
                              <h4 className="font-medium mb-2">{generatedContent.title}</h4>
                              <ScrollArea className="h-[300px]">
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{generatedContent.content}</div>
                              </ScrollArea>
                            </div>
                            {generatedContent.suggestions?.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">优化建议</p>
                                <div className="space-y-1">
                                  {generatedContent.suggestions.map((s: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5" />
                                      <span>{s}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1" onClick={() => { navigator.clipboard.writeText(generatedContent.content); }}>
                                <Copy className="h-4 w-4 mr-1" />
                                复制
                              </Button>
                              <Button size="sm" className="flex-1" onClick={() => setShowPublishAssistant(true)}>
                                <Send className="h-4 w-4 mr-1" />
                                一键发布
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center text-gray-400 py-12">
                            <div>
                              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>生成的内容将在此展示</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* 发布助手对话框 */}
      <PublishAssistant
        open={showPublishAssistant}
        onOpenChange={setShowPublishAssistant}
        title={generatedContent?.title || ''}
        content={generatedContent?.content || ''}
        tags={generatedContent?.distillationWords || []}
        accounts={accounts.map(a => ({ platform: a.platform, displayName: a.displayName }))}
      />
    </AppLayout>
  );
}
