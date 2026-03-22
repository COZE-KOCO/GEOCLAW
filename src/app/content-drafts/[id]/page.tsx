'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Edit,
  Save,
  Eye,
  Trash2,
  Loader2,
  Calendar,
  Tag,
  Target,
  Globe,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentDraft {
  id: string;
  businessId: string;
  title: string;
  content: string;
  distillationWords: string[];
  outline?: any;
  seoScore: number;
  targetModel?: string;
  articleType?: string;
  status: 'draft' | 'ready' | 'published';
  createdAt: string;
  updatedAt: string;
}

export default function ContentDraftPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ContentDraftContent params={params} />
    </Suspense>
  );
}

function ContentDraftContent({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const isPreviewMode = searchParams.get('preview') === 'true';

  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(isEditMode);

  // 编辑表单状态
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    fetchDraft();
  }, [id]);

  const fetchDraft = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/content-drafts?id=${id}`);
      if (!response.ok) {
        throw new Error('获取文章失败');
      }
      const data = await response.json();
      setDraft(data.draft);
      setEditTitle(data.draft.title);
      setEditContent(data.draft.content);
      setEditTags(Array.isArray(data.draft.distillationWords) 
        ? data.draft.distillationWords.join(', ') 
        : data.draft.distillationWords || '');
    } catch (error) {
      console.error('获取文章失败:', error);
      toast.error('获取文章失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/content-drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          title: editTitle,
          content: editContent,
          distillationWords: editTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      toast.success('保存成功');
      setEditing(false);
      fetchDraft();
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/content-drafts?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      toast.success('文章已删除');
      router.push('/projects');
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    
    try {
      const response = await fetch('/api/content-drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          status: 'published',
        }),
      });

      if (!response.ok) {
        throw new Error('发布失败');
      }

      toast.success('文章已发布');
      fetchDraft();
    } catch (error) {
      console.error('发布失败:', error);
      toast.error('发布失败');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    );
  }

  if (!draft) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">文章不存在</p>
          <Link href="/projects">
            <Button variant="outline" className="mt-4">
              返回列表
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Button>
          </Link>
        </div>

        {/* 文章头部 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="文章标题"
                    className="text-xl font-bold"
                  />
                ) : (
                  <CardTitle className="text-2xl">{draft.title}</CardTitle>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(draft.createdAt)}
                  </span>
                  {draft.targetModel && (
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {draft.targetModel}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {draft.status === 'published' ? (
                      <Globe className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                    {draft.status === 'published' ? '已发布' : draft.status === 'ready' ? '待发布' : '草稿'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button onClick={() => setEditing(false)} variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      保存
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => setEditing(true)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </Button>
                    {draft.status !== 'published' && (
                      <Button onClick={handlePublish}>
                        <Globe className="h-4 w-4 mr-2" />
                        发布
                      </Button>
                    )}
                    <Button onClick={handleDelete} variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* SEO 评分 */}
        {draft.seoScore > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">SEO 评分</span>
                <Badge 
                  className={
                    draft.seoScore >= 80 ? 'bg-green-500' :
                    draft.seoScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }
                >
                  {draft.seoScore} 分
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 标签 */}
        {draft.distillationWords?.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              {editing ? (
                <div>
                  <Label className="text-sm text-gray-600 mb-2 block">蒸馏词（逗号分隔）</Label>
                  <Textarea
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="关键词1, 关键词2, 关键词3"
                    rows={2}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Tag className="h-4 w-4 text-gray-400 mr-1" />
                  {draft.distillationWords.map((word, index) => (
                    <Badge key={index} variant="secondary">
                      {word}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 文章内容 */}
        <Card>
          <CardContent className="py-6">
            {editing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="文章内容"
                className="min-h-[500px] font-mono"
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                {draft.content}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
