'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Store, 
  Briefcase, 
  Building,
  Users,
  Power,
  PowerOff,
  Plus,
  Loader2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/contexts/business-context';
import { toast } from 'sonner';

interface BusinessManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BusinessItem {
  id: string;
  name: string;
  type: 'store' | 'brand' | 'company' | 'chain';
  industry?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
}

const businessTypeLabels: Record<string, { label: string; icon: typeof Store }> = {
  store: { label: '门店', icon: Store },
  brand: { label: '品牌', icon: Briefcase },
  company: { label: '企业', icon: Building },
  chain: { label: '连锁', icon: Users },
};

// 行业选项
const industryOptions = [
  { value: '餐饮', label: '餐饮' },
  { value: '零售', label: '零售' },
  { value: '教育', label: '教育' },
  { value: '医疗', label: '医疗' },
  { value: '美容', label: '美容' },
  { value: '健身', label: '健身' },
  { value: '旅游', label: '旅游' },
  { value: '金融', label: '金融' },
  { value: '房地产', label: '房地产' },
  { value: '互联网', label: '互联网' },
  { value: '其他', label: '其他' },
];

export function BusinessManager({ open, onOpenChange }: BusinessManagerProps) {
  const { 
    businesses, 
    selectedBusiness, 
    setSelectedBusiness, 
    refreshBusinesses,
    loading 
  } = useBusiness();

  // 所有商家（包括停用的）
  const [allBusinesses, setAllBusinesses] = useState<BusinessItem[]>([]);
  const [editBusiness, setEditBusiness] = useState<BusinessItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'store' as 'store' | 'brand' | 'company' | 'chain',
    industry: '',
    city: '',
  });
  const [actionConfirm, setActionConfirm] = useState<{ id: string; action: 'delete' | 'deactivate' } | null>(null);
  
  // 新增商家状态
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'store' as 'store' | 'brand' | 'company' | 'chain',
    industry: '',
    city: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  // 加载所有商家（包括停用的）
  useEffect(() => {
    if (open) {
      fetchAllBusinesses();
      // 重置状态
      setShowCreateForm(false);
      setEditBusiness(null);
      setActionConfirm(null);
    }
  }, [open]);

  const fetchAllBusinesses = async () => {
    try {
      const response = await fetch('/api/businesses?_t=' + Date.now());
      const data = await response.json();
      setAllBusinesses(data.businesses || []);
    } catch (error) {
      console.error('加载商家列表失败:', error);
    }
  };

  // 创建新商家
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error('请输入商家名称');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          industry: createForm.industry,
          city: createForm.city,
          description: createForm.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchAllBusinesses();
        await refreshBusinesses();
        
        // 自动选中新创建的商家
        if (data.business?.id) {
          setSelectedBusiness(data.business.id);
        }
        
        // 重置表单
        setCreateForm({
          name: '',
          type: 'store',
          industry: '',
          city: '',
          description: '',
        });
        setShowCreateForm(false);
        toast.success('商家创建成功');
      } else {
        const data = await res.json();
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建商家失败:', error);
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  // 开始编辑
  const handleStartEdit = (business: BusinessItem) => {
    setEditBusiness(business);
    setEditForm({
      name: business.name,
      type: business.type,
      industry: business.industry || '',
      city: business.address || '',
    });
    setActionConfirm(null);
    setShowCreateForm(false);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editBusiness || !editForm.name.trim()) return;

    try {
      const res = await fetch('/api/businesses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editBusiness.id,
          name: editForm.name,
          type: editForm.type,
          industry: editForm.industry,
          city: editForm.city,
        }),
      });

      if (res.ok) {
        await fetchAllBusinesses();
        await refreshBusinesses();
        setEditBusiness(null);
        toast.success('商家信息已更新');
      } else {
        toast.error('更新失败');
      }
    } catch (error) {
      console.error('更新商家失败:', error);
      toast.error('更新失败');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditBusiness(null);
    setEditForm({ name: '', type: 'store', industry: '', city: '' });
  };

  // 切换状态（启用/停用）
  const handleToggleStatus = async (business: BusinessItem) => {
    const action = business.status === 'active' ? 'deactivate' : 'activate';
    
    try {
      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: business.id,
          action: action,
        }),
      });

      if (res.ok) {
        await fetchAllBusinesses();
        await refreshBusinesses();
        setActionConfirm(null);
        toast.success(action === 'activate' ? '商家已启用' : '商家已停用');
        
        // 如果停用的是当前选中的商家，需要切换
        if (action === 'deactivate' && selectedBusiness === business.id) {
          const activeBusinesses = allBusinesses.filter(b => b.id !== business.id && b.status === 'active');
          if (activeBusinesses.length > 0) {
            setSelectedBusiness(activeBusinesses[0].id);
          } else {
            setSelectedBusiness('');
          }
        }
      } else {
        const data = await res.json();
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('切换商家状态失败:', error);
      toast.error('操作失败');
    }
  };

  // 删除商家
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/businesses?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        await fetchAllBusinesses();
        await refreshBusinesses();
        
        // 如果删除的是当前选中的商家，切换到其他商家
        if (selectedBusiness === id) {
          const remaining = allBusinesses.filter(b => b.id !== id);
          if (remaining.length > 0) {
            setSelectedBusiness(remaining[0].id);
          } else {
            setSelectedBusiness('');
          }
        }
        
        setActionConfirm(null);
        toast.success(`商家已删除${data.deletedCounts ? `（关联数据已清理）` : ''}`);
      } else {
        const data = await res.json();
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除商家失败:', error);
      toast.error('删除失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            商家管理
          </DialogTitle>
          <DialogDescription>
            管理您的企业、品牌和门店。停用后商家在内容管理中不可选，删除将同时删除关联内容。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 新增商家按钮 */}
          {!showCreateForm && !editBusiness && (
            <Button 
              className="w-full mb-4" 
              variant="outline"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              新增商家
            </Button>
          )}

          {/* 新增商家表单 */}
          {showCreateForm && (
            <div className="mb-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-3">
              <h4 className="font-medium text-sm">新增商家</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">商家名称 *</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="输入商家名称"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">商家类型</Label>
                    <Select 
                      value={createForm.type} 
                      onValueChange={(v: any) => setCreateForm(prev => ({ ...prev, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="store">门店</SelectItem>
                        <SelectItem value="brand">品牌</SelectItem>
                        <SelectItem value="company">企业</SelectItem>
                        <SelectItem value="chain">连锁</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">行业</Label>
                    <Select 
                      value={createForm.industry} 
                      onValueChange={(v) => setCreateForm(prev => ({ ...prev, industry: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择行业" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">城市</Label>
                    <Input
                      value={createForm.city}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="输入城市"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({
                        name: '',
                        type: 'store',
                        industry: '',
                        city: '',
                        description: '',
                      });
                    }}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={handleCreate} disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    创建
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 商家列表 */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : allBusinesses.length === 0 && !showCreateForm ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无商家</p>
              <p className="text-sm mt-1">点击上方按钮创建您的第一个商家</p>
            </div>
          ) : allBusinesses.length === 0 && showCreateForm ? null : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {allBusinesses.map((business) => {
                const TypeIcon = businessTypeLabels[business.type]?.icon || Store;
                const isSelected = selectedBusiness === business.id;
                const isEditing = editBusiness?.id === business.id;
                const isInactive = business.status === 'inactive';
                const confirmAction = actionConfirm?.id === business.id ? actionConfirm.action : null;

                return (
                  <div
                    key={business.id}
                    className={`group relative flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isInactive 
                        ? 'bg-muted/30 opacity-60' 
                        : isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {isEditing ? (
                      // 编辑模式
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="商家名称"
                            className="flex-1"
                          />
                          <Select 
                            value={editForm.type} 
                            onValueChange={(v: any) => setEditForm(prev => ({ ...prev, type: v }))}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="store">门店</SelectItem>
                              <SelectItem value="brand">品牌</SelectItem>
                              <SelectItem value="company">企业</SelectItem>
                              <SelectItem value="chain">连锁</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={editForm.industry}
                            onChange={(e) => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
                            placeholder="行业"
                            className="flex-1"
                          />
                          <Input
                            value={editForm.city}
                            onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="城市"
                            className="flex-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            取消
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                            保存
                          </Button>
                        </div>
                      </div>
                    ) : confirmAction === 'delete' ? (
                      // 删除确认模式
                      <div className="flex-1">
                        <p className="text-sm text-destructive mb-2">
                          确定要删除「{business.name}」吗？将同时删除该商家的所有关联内容（账号、人设、内容草稿等），此操作不可恢复。
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setActionConfirm(null)}>
                            取消
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(business.id)}>
                            确认删除
                          </Button>
                        </div>
                      </div>
                    ) : confirmAction === 'deactivate' ? (
                      // 停用确认模式
                      <div className="flex-1">
                        <p className="text-sm text-orange-600 mb-2">
                          确定要停用「{business.name}」吗？停用后该商家在内容管理中不可选，但数据会保留。
                        </p>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setActionConfirm(null)}>
                            取消
                          </Button>
                          <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => handleToggleStatus(business)}>
                            确认停用
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 正常显示模式
                      <>
                        <button
                          className={`flex-1 flex items-center gap-3 text-left ${isInactive ? 'cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (!isInactive) {
                              setSelectedBusiness(business.id);
                            }
                          }}
                          disabled={isInactive}
                        >
                          <div className={`p-2 rounded-md ${
                            isInactive 
                              ? 'bg-muted' 
                              : isSelected 
                                ? 'bg-primary/10' 
                                : 'bg-muted'
                          }`}>
                            <TypeIcon className={`h-4 w-4 ${
                              isInactive 
                                ? 'text-muted-foreground' 
                                : isSelected 
                                  ? 'text-primary' 
                                  : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium truncate ${isInactive ? 'text-muted-foreground' : ''}`}>
                                {business.name}
                              </span>
                              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                {businessTypeLabels[business.type]?.label || business.type}
                              </span>
                              {isInactive && (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                  已停用
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {[business.industry, business.address].filter(Boolean).join(' · ') || '未设置'}
                            </div>
                          </div>
                          {isSelected && !isInactive && (
                            <div className="text-xs text-primary font-medium">
                              当前选中
                            </div>
                          )}
                        </button>

                        {/* 操作菜单 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(business)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {business.status === 'active' ? (
                              <DropdownMenuItem 
                                className="text-orange-600 focus:text-orange-600"
                                onClick={() => setActionConfirm({ id: business.id, action: 'deactivate' })}
                              >
                                <PowerOff className="h-4 w-4 mr-2" />
                                停用商家
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-green-600 focus:text-green-600"
                                onClick={() => handleToggleStatus(business)}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                启用商家
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => setActionConfirm({ id: business.id, action: 'delete' })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除商家
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p>• 停用：商家在内容管理中不可选，数据保留</p>
          <p>• 删除：永久删除商家及所有关联内容</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
