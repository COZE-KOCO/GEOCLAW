'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/app-layout';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  Eye,
  MoreVertical,
  Plus,
  Calendar,
  Target,
  BarChart3,
  FileText,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Copy,
  ExternalLink,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { GEOProject } from '@/lib/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<GEOProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'draft'>('all');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<GEOProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (projectId: string, currentStatus: boolean) => {
    setPublishingId(projectId);
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        // 更新本地状态
        setProjects(projects.map(p => 
          p.id === projectId 
            ? { ...p, isPublic: !currentStatus, publishedAt: data.isPublic ? new Date() : undefined }
            : p
        ));
      }
    } catch (error) {
      console.error('发布失败:', error);
    } finally {
      setPublishingId(null);
    }
  };

  const handleCopyLink = (projectId: string) => {
    const url = `${window.location.origin}/content/${projectId}`;
    navigator.clipboard.writeText(url);
    toast.success('链接已复制到剪贴板');
  };

  const handleDeleteClick = (project: GEOProject) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        // 从本地状态中移除项目
        setProjects(projects.filter(p => p.id !== projectToDelete.id));
        setDeleteDialogOpen(false);
        toast.success('项目已删除', {
          description: `「${projectToDelete.title}」已被永久删除`,
        });
        setProjectToDelete(null);
      } else {
        toast.error('删除失败', {
          description: data.error || '请稍后重试',
        });
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败', {
        description: '网络错误，请稍后重试',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.status === filter);

  const getStatusBadge = (status: GEOProject['status']) => {
    const config = {
      active: { label: '运行中', color: 'bg-green-500', icon: Play },
      paused: { label: '已暂停', color: 'bg-yellow-500', icon: Pause },
      completed: { label: '已完成', color: 'bg-blue-500', icon: CheckCircle2 },
      draft: { label: '草稿', color: 'bg-gray-500', icon: Clock }
    };
    const { label, color, icon: Icon } = config[status];
    return (
      <Badge className={`${color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    avgScore: projects.length > 0 
      ? (projects.reduce((sum, p) => sum + p.score, 0) / projects.length).toFixed(1)
      : 0,
    totalCitations: projects.reduce((sum, p) => sum + p.monitoring.summary.totalCitations, 0),
    published: projects.filter(p => p.isPublic).length
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              内容管理
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              管理和监测所有GEO优化项目
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/matrix">
              <Button className="bg-purple-500 hover:bg-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                新建内容
              </Button>
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">总项目数</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">已发布</p>
                  <p className="text-3xl font-bold text-green-600">{stats.published}</p>
                </div>
                <Globe className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">运行中</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <Play className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">平均评分</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.avgScore}</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">总引用次数</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalCitations}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            全部
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size="sm"
          >
            运行中
          </Button>
          <Button
            variant={filter === 'paused' ? 'default' : 'outline'}
            onClick={() => setFilter('paused')}
            size="sm"
          >
            已暂停
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            size="sm"
          >
            已完成
          </Button>
        </div>

        {/* 项目列表 */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>项目列表</CardTitle>
            <CardDescription>
              共 {filteredProjects.length} 个项目
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无项目</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>项目名称</TableHead>
                    <TableHead>评分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发布</TableHead>
                    <TableHead>引用次数</TableHead>
                    <TableHead>曝光量</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {project.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {project.author && `作者: ${project.author}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold ${getGradeColor(project.grade)}`}>
                            {project.score.toFixed(1)}
                          </span>
                          <Badge variant="outline">{project.grade}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {project.isPublic ? (
                            <>
                              <Badge className="bg-green-500 text-white gap-1">
                                <Globe className="h-3 w-3" />
                                已发布
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(project.id)}
                                title="复制链接"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Link
                                href={`/content/${project.id}`}
                                target="_blank"
                              >
                                <Button variant="ghost" size="sm" title="查看公开页面">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            </>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              未发布
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-medium">
                            {project.monitoring.summary.totalCitations}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">
                            {project.monitoring.summary.totalExposure.toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleTogglePublish(project.id, project.isPublic)}>
                              {project.isPublic ? (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  取消发布
                                </>
                              ) : (
                                <>
                                  <Globe className="h-4 w-4 mr-2" />
                                  发布内容
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/monitoring/${project.id}`} className="flex items-center w-full">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                查看监测数据
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Link href={`/?edit=${project.id}`} className="flex items-center w-full">
                                <FileText className="h-4 w-4 mr-2" />
                                编辑项目
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                              onClick={() => handleDeleteClick(project)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除项目
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 删除确认对话框 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除项目「{projectToDelete?.title}」吗？此操作无法撤销，项目数据将被永久删除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
