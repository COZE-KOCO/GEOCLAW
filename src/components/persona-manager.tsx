'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Network,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// 人设类型定义
interface Persona {
  id: string;
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
  writingStyle?: string;
  exampleContent?: string;
  createdAt: string;
  updatedAt: string;
}

interface PersonaManagerProps {
  businessId: string;
}

// 语气风格选项
const toneOptions = [
  { value: 'professional', label: '专业严谨' },
  { value: 'friendly', label: '亲切友好' },
  { value: 'humorous', label: '幽默风趣' },
  { value: 'neutral', label: '中性客观' },
  { value: 'passionate', label: '热情洋溢' },
];

// 写作风格选项
const styleOptions = [
  { value: 'formal', label: '正式' },
  { value: 'casual', label: '轻松' },
  { value: 'storytelling', label: '故事化' },
  { value: 'educational', label: '教育性' },
  { value: 'news', label: '新闻式' },
];

export function PersonaManager({ businessId }: PersonaManagerProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    expertise: '',
    tone: 'neutral',
    style: 'casual',
    writingStyle: '',
    exampleContent: '',
  });

  // 加载人设列表
  useEffect(() => {
    if (businessId) {
      loadPersonas();
    }
  }, [businessId]);

  const loadPersonas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/personas?businessId=${businessId}`);
      if (!response.ok) {
        throw new Error('获取人设失败');
      }
      const data = await response.json();
      setPersonas(data.personas || []);
    } catch (error) {
      console.error('加载人设失败:', error);
      toast.error('加载人设失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      expertise: '',
      tone: 'neutral',
      style: 'casual',
      writingStyle: '',
      exampleContent: '',
    });
  };

  // 创建人设
  const handleCreate = async () => {
    if (!formData.name || !formData.expertise) {
      toast.error('请填写人设名称和专业领域');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error('创建失败');
      }

      toast.success('人设创建成功');
      setShowCreateDialog(false);
      resetForm();
      loadPersonas();
    } catch (error) {
      console.error('创建人设失败:', error);
      toast.error('创建人设失败');
    } finally {
      setSaving(false);
    }
  };

  // 编辑人设
  const handleEdit = async () => {
    if (!selectedPersona || !formData.name || !formData.expertise) {
      toast.error('请填写人设名称和专业领域');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPersona.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      toast.success('人设更新成功');
      setShowEditDialog(false);
      setSelectedPersona(null);
      resetForm();
      loadPersonas();
    } catch (error) {
      console.error('更新人设失败:', error);
      toast.error('更新人设失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除人设
  const handleDelete = async () => {
    if (!selectedPersona) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/personas?id=${selectedPersona.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      toast.success('人设删除成功');
      setShowDeleteDialog(false);
      setSelectedPersona(null);
      loadPersonas();
    } catch (error) {
      console.error('删除人设失败:', error);
      toast.error('删除人设失败');
    } finally {
      setSaving(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (persona: Persona) => {
    setSelectedPersona(persona);
    setFormData({
      name: persona.name,
      expertise: persona.expertise,
      tone: persona.tone,
      style: persona.style,
      writingStyle: persona.writingStyle || '',
      exampleContent: persona.exampleContent || '',
    });
    setShowEditDialog(true);
  };

  // 打开删除对话框
  const openDeleteDialog = (persona: Persona) => {
    setSelectedPersona(persona);
    setShowDeleteDialog(true);
  };

  // 获取语气标签
  const getToneLabel = (value: string) => {
    return toneOptions.find(t => t.value === value)?.label || value;
  };

  // 获取风格标签
  const getStyleLabel = (value: string) => {
    return styleOptions.find(s => s.value === value)?.label || value;
  };

  // 表单对话框内容
  const FormDialog = ({ isEdit }: { isEdit: boolean }) => (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{isEdit ? '编辑人设' : '创建人设'}</DialogTitle>
        <DialogDescription>
          配置内容创作人设，保持账号风格一致
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">人设名称 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例如：科技评论员"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expertise">专业领域 *</Label>
          <Input
            id="expertise"
            value={formData.expertise}
            onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
            placeholder="例如：人工智能、科技产品评测"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>语气风格</Label>
            <Select
              value={formData.tone}
              onValueChange={(value) => setFormData({ ...formData, tone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>写作风格</Label>
            <Select
              value={formData.style}
              onValueChange={(value) => setFormData({ ...formData, style: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="writingStyle">写作特点</Label>
          <Textarea
            id="writingStyle"
            value={formData.writingStyle}
            onChange={(e) => setFormData({ ...formData, writingStyle: e.target.value })}
            placeholder="描述写作特点，如：善于用比喻、喜欢引用数据..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exampleContent">示例内容</Label>
          <Textarea
            id="exampleContent"
            value={formData.exampleContent}
            onChange={(e) => setFormData({ ...formData, exampleContent: e.target.value })}
            placeholder="提供一段示例内容，帮助AI更好地理解风格..."
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            isEdit ? setShowEditDialog(false) : setShowCreateDialog(false);
            resetForm();
          }}
        >
          取消
        </Button>
        <Button onClick={isEdit ? handleEdit : handleCreate} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>人设管理</CardTitle>
              <CardDescription>为不同账号配置专属人设，保持内容风格一致</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建人设
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personas.length > 0 ? (
                personas.map((persona) => (
                  <Card key={persona.id} className="bg-slate-50 dark:bg-slate-700/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {persona.name[0]}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(persona)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(persona)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold mb-1">{persona.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{persona.expertise}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">语气风格</span>
                          <Badge variant="outline">{getToneLabel(persona.tone)}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">写作风格</span>
                          <Badge variant="outline">{getStyleLabel(persona.style)}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无人设，创建人设以保持账号风格一致</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <FormDialog isEdit={false} />
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <FormDialog isEdit={true} />
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除人设「{selectedPersona?.name}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
