'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Images,
  Video,
  Music,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  MoreHorizontal,
  Download,
  Trash2,
  Edit,
  Copy,
  FolderPlus,
  Folder,
  Clock,
  HardDrive,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useBusiness } from '@/contexts/business-context';

// 素材类型
type AssetType = 'image' | 'video' | 'audio' | 'document';
type AssetStatus = 'active' | 'archived';

// 素材接口
interface Asset {
  id: string;
  name: string;
  type: AssetType;
  size: number;
  url: string;
  thumbnail?: string;
  folder?: string;
  tags: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: AssetStatus;
}

// 文件夹接口
interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
  createdAt: Date;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 获取文件类型图标
const getTypeIcon = (type: AssetType) => {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'document':
      return FileText;
    default:
      return File;
  }
};

// 获取文件类型颜色
const getTypeColor = (type: AssetType) => {
  switch (type) {
    case 'image':
      return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    case 'video':
      return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    case 'audio':
      return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
    case 'document':
      return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
    default:
      return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
  }
};

export default function AssetsPage() {
  const { selectedBusiness } = useBusiness();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  // 对话框状态
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // 编辑状态
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  
  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  
  // 文件夹表单
  const [folderName, setFolderName] = useState('');
  
  // 编辑表单
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    tags: '',
  });

  useEffect(() => {
    loadAssets();
    loadFolders();
  }, [selectedBusiness, selectedFolder]);

  const loadAssets = async () => {
    if (!selectedBusiness) {
      setAssets([]);
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams({
        businessId: selectedBusiness,
        status: 'active',
      });
      
      if (filterType !== 'all') {
        params.set('type', filterType);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      
      const response = await fetch(`/api/assets?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.assets) {
        setAssets(data.assets);
      } else {
        // 如果API失败，使用空数组
        setAssets([]);
      }
    } catch (error) {
      console.error('加载素材失败:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    if (!selectedBusiness) {
      setFolders([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/assets/folders?businessId=${selectedBusiness}`);
      const data = await response.json();
      
      if (response.ok && data.folders) {
        // 转换文件夹数据格式
        const foldersWithCount = await Promise.all(
          data.folders.map(async (folder: { id: string; name: string; parentId?: string; createdAt: string }) => {
            // 获取每个文件夹的素材数量
            const countResponse = await fetch(
              `/api/assets?businessId=${selectedBusiness}&folderId=${folder.id}`
            );
            const countData = await countResponse.json();
            return {
              ...folder,
              assetCount: countData.assets?.length || 0,
              createdAt: new Date(folder.createdAt),
            };
          })
        );
        setFolders(foldersWithCount);
      } else {
        setFolders([]);
      }
    } catch (error) {
      console.error('加载文件夹失败:', error);
      setFolders([]);
    }
  };

  // 筛选素材
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesFolder = !selectedFolder || asset.folder === folders.find(f => f.id === selectedFolder)?.name;
    return matchesSearch && matchesType && matchesFolder;
  });

  // 统计信息
  const stats = {
    total: assets.length,
    images: assets.filter(a => a.type === 'image').length,
    videos: assets.filter(a => a.type === 'video').length,
    audio: assets.filter(a => a.type === 'audio').length,
    documents: assets.filter(a => a.type === 'document').length,
    totalSize: assets.reduce((sum, a) => sum + a.size, 0),
  };

  // 处理文件上传
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles(files);
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    setUploading(true);
    try {
      // 模拟上传
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 添加新素材
      const newAssets: Asset[] = uploadFiles.map((file, index) => ({
        id: Date.now().toString() + index,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document',
        size: file.size,
        url: '#',
        thumbnail: file.type.startsWith('image/') ? 'https://picsum.photos/seed/' + Date.now() + '/200/150' : undefined,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active' as AssetStatus,
      }));
      
      setAssets([...newAssets, ...assets]);
      setShowUploadDialog(false);
      setUploadFiles([]);
      toast.success(`成功上传 ${uploadFiles.length} 个文件`);
    } catch (error) {
      toast.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }
    if (!selectedBusiness) {
      toast.error('请先选择商家');
      return;
    }
    
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFolder',
          businessId: selectedBusiness,
          name: folderName,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.folder) {
        setFolders([...folders, { ...data.folder, assetCount: 0 }]);
        setShowFolderDialog(false);
        setFolderName('');
        toast.success('文件夹创建成功');
      } else {
        toast.error(data.error || '创建文件夹失败');
      }
    } catch (error) {
      console.error('创建文件夹失败:', error);
      toast.error('创建文件夹失败');
    }
  };

  // 编辑素材
  const handleEdit = async () => {
    if (!editingAsset) return;
    
    try {
      const response = await fetch('/api/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAsset.id,
          name: editForm.name,
          description: editForm.description,
          tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.asset) {
        setAssets(assets.map(a => 
          a.id === editingAsset.id ? data.asset : a
        ));
        setShowEditDialog(false);
        setEditingAsset(null);
        toast.success('素材信息已更新');
      } else {
        toast.error(data.error || '更新素材失败');
      }
    } catch (error) {
      console.error('更新素材失败:', error);
      toast.error('更新素材失败');
    }
  };

  // 删除素材
  const handleDelete = async () => {
    if (!deletingAsset) return;
    
    try {
      const response = await fetch(`/api/assets?id=${deletingAsset.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAssets(assets.filter(a => a.id !== deletingAsset.id));
        setShowDeleteDialog(false);
        setDeletingAsset(null);
        toast.success('素材已删除');
      } else {
        const data = await response.json();
        toast.error(data.error || '删除素材失败');
      }
    } catch (error) {
      console.error('删除素材失败:', error);
      toast.error('删除素材失败');
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedAssets.length === 0) return;
    
    try {
      const response = await fetch(`/api/assets?ids=${selectedAssets.join(',')}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAssets(assets.filter(a => !selectedAssets.includes(a.id)));
        setSelectedAssets([]);
        toast.success(`已删除 ${selectedAssets.length} 个素材`);
      } else {
        const data = await response.json();
        toast.error(data.error || '批量删除失败');
      }
    } catch (error) {
      console.error('批量删除失败:', error);
      toast.error('批量删除失败');
    }
  };

  // 切换选择
  const toggleSelect = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };

  // 打开编辑对话框
  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setEditForm({
      name: asset.name,
      description: asset.description || '',
      tags: asset.tags.join(', '),
    });
    setShowEditDialog(true);
  };

  // 打开预览
  const openPreview = (asset: Asset) => {
    setPreviewAsset(asset);
    setShowPreviewDialog(true);
  };

  // 复制链接
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  };

  // 下载文件
  const downloadFile = (asset: Asset) => {
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = asset.name;
    a.click();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">素材库</h1>
            <p className="text-sm text-gray-500 mt-1">管理图片、视频、音频等各类素材文件</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              新建文件夹
            </Button>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              上传素材
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Images className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">全部素材</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.images}</p>
                  <p className="text-xs text-gray-500">图片</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Video className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.videos}</p>
                  <p className="text-xs text-gray-500">视频</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Music className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.audio}</p>
                  <p className="text-xs text-gray-500">音频</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <HardDrive className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                  <p className="text-xs text-gray-500">已用空间</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主内容区 */}
        <div className="flex gap-6">
          {/* 左侧文件夹列表 */}
          <Card className="w-56 flex-shrink-0">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium">文件夹</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    !selectedFolder 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Images className="h-4 w-4" />
                  <span>全部素材</span>
                  <span className="ml-auto text-xs text-gray-500">{stats.total}</span>
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedFolder === folder.id 
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto text-xs text-gray-500">{folder.assetCount}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 右侧素材列表 */}
          <Card className="flex-1">
            <CardContent className="p-4">
              {/* 工具栏 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索素材名称或标签..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="image">图片</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                    <SelectItem value="audio">音频</SelectItem>
                    <SelectItem value="document">文档</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedAssets.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除 ({selectedAssets.length})
                  </Button>
                )}
              </div>

              {/* 素材展示 */}
              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  加载中...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="py-16 text-center">
                  <Images className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-4">暂无素材</p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    上传素材
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                /* 网格视图 */
                <div className="grid grid-cols-4 gap-4">
                  {filteredAssets.map(asset => {
                    const TypeIcon = getTypeIcon(asset.type);
                    const typeColor = getTypeColor(asset.type);
                    const isSelected = selectedAssets.includes(asset.id);
                    
                    return (
                      <div
                        key={asset.id}
                        className={cn(
                          'group relative border rounded-lg overflow-hidden cursor-pointer transition-all',
                          isSelected 
                            ? 'ring-2 ring-purple-500 border-purple-500' 
                            : 'hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                        onClick={() => toggleSelect(asset.id)}
                        onDoubleClick={() => openPreview(asset)}
                      >
                        {/* 缩略图 */}
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          {asset.thumbnail ? (
                            <img 
                              src={asset.thumbnail} 
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', typeColor)}>
                              <TypeIcon className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        
                        {/* 选中标记 */}
                        <div className={cn(
                          'absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                          isSelected 
                            ? 'bg-purple-500 border-purple-500' 
                            : 'bg-white/80 border-gray-300 group-hover:border-purple-400'
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="secondary" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => openPreview(asset)}>
                                <Images className="h-4 w-4 mr-2" />
                                预览
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadFile(asset)}>
                                <Download className="h-4 w-4 mr-2" />
                                下载
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyLink(asset.url)}>
                                <Copy className="h-4 w-4 mr-2" />
                                复制链接
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(asset)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => { setDeletingAsset(asset); setShowDeleteDialog(true); }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* 信息 */}
                        <div className="p-3 border-t">
                          <p className="text-sm font-medium truncate" title={asset.name}>{asset.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className={cn('text-xs', typeColor.split(' ')[0])}>
                              {asset.type === 'image' ? '图片' : 
                               asset.type === 'video' ? '视频' :
                               asset.type === 'audio' ? '音频' : '文档'}
                            </Badge>
                            <span className="text-xs text-gray-500">{formatFileSize(asset.size)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 列表视图 */
                <div className="border rounded-lg overflow-hidden">
                  {/* 表头 */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-500">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </div>
                    <div className="col-span-4">名称</div>
                    <div className="col-span-2">类型</div>
                    <div className="col-span-2">大小</div>
                    <div className="col-span-2">修改时间</div>
                    <div className="col-span-1 text-right">操作</div>
                  </div>
                  
                  {/* 数据行 */}
                  <div className="divide-y">
                    {filteredAssets.map(asset => {
                      const TypeIcon = getTypeIcon(asset.type);
                      const typeColor = getTypeColor(asset.type);
                      const isSelected = selectedAssets.includes(asset.id);
                      
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            'grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                            isSelected && 'bg-purple-50 dark:bg-purple-900/20'
                          )}
                        >
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(asset.id)}
                              className="rounded border-gray-300"
                            />
                          </div>
                          <div className="col-span-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                              {asset.thumbnail ? (
                                <img src={asset.thumbnail} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <TypeIcon className={cn('h-4 w-4', typeColor.split(' ')[0])} />
                              )}
                            </div>
                            <div>
                              <p className="font-medium truncate" title={asset.name}>{asset.name}</p>
                              {asset.tags.length > 0 && (
                                <p className="text-xs text-gray-500">{asset.tags.join(', ')}</p>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Badge variant="outline" className={cn('text-xs', typeColor.split(' ')[0])}>
                              {asset.type === 'image' ? '图片' : 
                               asset.type === 'video' ? '视频' :
                               asset.type === 'audio' ? '音频' : '文档'}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-sm text-gray-500">
                            {formatFileSize(asset.size)}
                          </div>
                          <div className="col-span-2 text-sm text-gray-500">
                            {formatDate(asset.updatedAt)}
                          </div>
                          <div className="col-span-1 flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openPreview(asset)}
                            >
                              <Images className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => downloadFile(asset)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyLink(asset.url)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  复制链接
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(asset)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => { setDeletingAsset(asset); setShowDeleteDialog(true); }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 上传对话框 */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>上传素材</DialogTitle>
              <DialogDescription>
                支持上传图片、视频、音频和文档文件
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">拖拽文件到此处，或点击选择文件</p>
                <p className="text-xs text-gray-400 mb-4">支持 JPG, PNG, GIF, MP4, MP3, PDF 等格式</p>
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="max-w-sm mx-auto"
                />
              </div>
              
              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">已选择 {uploadFiles.length} 个文件：</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                        <File className="h-4 w-4" />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                取消
              </Button>
              <Button onClick={handleUpload} disabled={uploadFiles.length === 0 || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    上传中...
                  </>
                ) : (
                  '上传'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 新建文件夹对话框 */}
        <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>新建文件夹</DialogTitle>
              <DialogDescription>
                创建新文件夹来组织您的素材
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="folderName">文件夹名称</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="请输入文件夹名称"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
                取消
              </Button>
              <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>编辑素材信息</DialogTitle>
              <DialogDescription>
                修改素材的名称、标签和描述信息
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editName">名称</Label>
                <Input
                  id="editName"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTags">标签（用逗号分隔）</Label>
                <Input
                  id="editTags"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="产品, 封面, 主图"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDesc">描述</Label>
                <Textarea
                  id="editDesc"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="素材描述信息"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                取消
              </Button>
              <Button onClick={handleEdit}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除素材「{deletingAsset?.name}」吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 预览对话框 */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>{previewAsset?.name}</DialogTitle>
              <DialogDescription>
                素材预览
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {previewAsset?.type === 'image' ? (
                <img 
                  src={previewAsset.url} 
                  alt={previewAsset.name}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className={cn('w-20 h-20 rounded-lg flex items-center justify-center', getTypeColor(previewAsset?.type || 'document'))}>
                    {previewAsset && (() => {
                      const TypeIcon = getTypeIcon(previewAsset.type);
                      return <TypeIcon className="h-10 w-10" />;
                    })()}
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">文件大小：</span>
                  <span>{previewAsset && formatFileSize(previewAsset.size)}</span>
                </div>
                <div>
                  <span className="text-gray-500">上传时间：</span>
                  <span>{previewAsset && formatDate(previewAsset.createdAt)}</span>
                </div>
                {previewAsset?.tags && previewAsset.tags.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-gray-500">标签：</span>
                    <span>{previewAsset.tags.join(', ')}</span>
                  </div>
                )}
                {previewAsset?.description && (
                  <div className="col-span-2">
                    <span className="text-gray-500">描述：</span>
                    <span>{previewAsset.description}</span>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                关闭
              </Button>
              <Button onClick={() => previewAsset && downloadFile(previewAsset)}>
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
