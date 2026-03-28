'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Package,
  MessageSquare,
  Bell,
  LogOut,
  Search,
  Loader2,
  Check,
  Edit,
  Trash2,
  Plus,
  Send,
  Eye,
  Pin,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserAccount, UserPackage, UserFeedback, FeatureNotification } from '@/lib/admin-store';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // 用户管理
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'user' as 'user' | 'premium' | 'enterprise',
    status: 'active' as 'active' | 'suspended' | 'pending',
    packageId: '',
  });
  const [subscriptionMonths, setSubscriptionMonths] = useState<number>(1);
  const [newUserSubscriptionMonths, setNewUserSubscriptionMonths] = useState<number>(1);
  
  // 套餐管理
  const [packages, setPackages] = useState<UserPackage[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Partial<UserPackage>>({});
  
  // 意见管理
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackReply, setFeedbackReply] = useState('');
  
  // 通知管理
  const [notifications, setNotifications] = useState<FeatureNotification[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<string>('all');
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Partial<FeatureNotification>>({});
  
  // 统计数据
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingFeedbacks: 0,
    publishedNotifications: 0,
  });

  // 检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      loadData();
    } catch {
      router.push('/admin/login');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadUsers(),
      loadPackages(),
      loadFeedbacks(),
      loadNotifications(),
    ]);
    setLoading(false);
  };

  // 计算套餐到期时间
  const calculateExpiryDate = (months: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  };

  // 根据套餐自动填充权限（与套餐权限保持一致）
  const getPackagePermissions = (packageId: string | undefined) => {
    if (!packageId) {
      return {
        geoAnalysis: false,
        advancedGeoAnalysis: false,
        autoPublish: false,
        teamCollaboration: false,
        dedicatedSupport: false,
      };
    }
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return undefined;
    
    return {
      geoAnalysis: pkg.features.geoAnalysis ?? true,
      advancedGeoAnalysis: pkg.features.advancedGeoAnalysis ?? false,
      autoPublish: pkg.features.autoPublish ?? false,
      teamCollaboration: pkg.features.teamCollaboration ?? false,
      dedicatedSupport: pkg.features.dedicatedSupport ?? false,
    };
  };

  // ========== 用户管理 ==========

  const loadUsers = async () => {
    const params = new URLSearchParams();
    if (userFilter !== 'all') {
      params.set('status', userFilter);
    }
    if (userSearch) {
      params.set('search', userSearch);
    }
    
    const response = await fetch(`/api/admin/users?${params}`);
    const data = await response.json();
    if (data.success) {
      setUsers(data.data);
      setStats(prev => ({
        ...prev,
        totalUsers: data.data.length,
        activeUsers: data.data.filter((u: UserAccount) => u.status === 'active').length,
      }));
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.password) {
      toast.error('请填写姓名和密码');
      return;
    }
    if (!newUser.email && !newUser.phone) {
      toast.error('请填写邮箱或手机号');
      return;
    }
    
    // 如果选择了套餐，计算到期时间
    const packageExpiresAt = newUser.packageId 
      ? calculateExpiryDate(newUserSubscriptionMonths) 
      : undefined;
    
    // 根据套餐自动填充权限
    const permissions = getPackagePermissions(newUser.packageId);
    
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newUser,
        packageExpiresAt,
        permissions,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('用户创建成功');
      setShowAddUserDialog(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'user',
        status: 'active',
        packageId: '',
      });
      setNewUserSubscriptionMonths(1);
      loadUsers();
    } else {
      toast.error(data.error || '创建失败');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    const response = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedUser.id,
        status: selectedUser.status,
        role: selectedUser.role,
        permissions: selectedUser.permissions,
        packageId: selectedUser.packageId,
        packageExpiresAt: selectedUser.packageExpiresAt,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('用户更新成功');
      setShowUserDialog(false);
      loadUsers();
    } else {
      toast.error(data.error || '更新失败');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return;
    
    const response = await fetch(`/api/admin/users?id=${id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('用户删除成功');
      loadUsers();
    } else {
      toast.error(data.error || '删除失败');
    }
  };

  // ========== 套餐管理 ==========

  const loadPackages = async () => {
    const response = await fetch('/api/admin/packages');
    const data = await response.json();
    if (data.success) {
      setPackages(data.data);
    }
  };

  const handleInitPackages = async () => {
    const response = await fetch('/api/admin/packages/init', {
      method: 'POST',
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success(data.message);
      loadPackages();
    } else {
      toast.error(data.error || '初始化失败');
    }
  };

  const handleSavePackage = async () => {
    if (!editingPackage.name || !editingPackage.code) {
      toast.error('请填写套餐名称和代码');
      return;
    }
    
    const response = await fetch('/api/admin/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPackage),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('套餐保存成功');
      setShowPackageDialog(false);
      setEditingPackage({});
      loadPackages();
    } else {
      toast.error(data.error || '保存失败');
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!confirm(`确定要删除套餐「${name}」吗？此操作不可恢复。`)) return;
    
    const response = await fetch(`/api/admin/packages?id=${id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('套餐删除成功');
      loadPackages();
    } else {
      toast.error(data.error || '删除失败');
    }
  };

  // ========== 意见管理 ==========

  const loadFeedbacks = async () => {
    const params = new URLSearchParams();
    if (feedbackFilter !== 'all') {
      params.set('status', feedbackFilter);
    }
    
    const response = await fetch(`/api/admin/feedbacks?${params}`);
    const data = await response.json();
    if (data.success) {
      setFeedbacks(data.data);
      setStats(prev => ({
        ...prev,
        pendingFeedbacks: data.data.filter((f: UserFeedback) => f.status === 'pending').length,
      }));
    }
  };

  const handleReplyFeedback = async () => {
    if (!selectedFeedback || !feedbackReply.trim()) {
      toast.error('请输入回复内容');
      return;
    }
    
    const response = await fetch('/api/admin/feedbacks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedFeedback.id,
        action: 'reply',
        reply: feedbackReply,
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('回复成功');
      setShowFeedbackDialog(false);
      setFeedbackReply('');
      loadFeedbacks();
    } else {
      toast.error(data.error || '回复失败');
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, status: UserFeedback['status']) => {
    const response = await fetch('/api/admin/feedbacks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('状态更新成功');
      loadFeedbacks();
    } else {
      toast.error(data.error || '更新失败');
    }
  };

  // ========== 通知管理 ==========

  const loadNotifications = async () => {
    const params = new URLSearchParams();
    if (notificationFilter !== 'all') {
      params.set('status', notificationFilter);
    }
    
    const response = await fetch(`/api/admin/notifications?${params}`);
    const data = await response.json();
    if (data.success) {
      setNotifications(data.data);
      setStats(prev => ({
        ...prev,
        publishedNotifications: data.data.filter((n: FeatureNotification) => n.status === 'published').length,
      }));
    }
  };

  const handleSaveNotification = async () => {
    if (!editingNotification.title || !editingNotification.content) {
      toast.error('请填写标题和内容');
      return;
    }
    
    const response = await fetch('/api/admin/notifications', {
      method: editingNotification.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingNotification),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('通知保存成功');
      setShowNotificationDialog(false);
      setEditingNotification({});
      loadNotifications();
    } else {
      toast.error(data.error || '保存失败');
    }
  };

  const handlePublishNotification = async (id: string) => {
    const response = await fetch('/api/admin/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'published' }),
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('发布成功');
      loadNotifications();
    } else {
      toast.error(data.error || '发布失败');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('确定要删除这条通知吗？')) return;
    
    const response = await fetch(`/api/admin/notifications?id=${id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('删除成功');
      loadNotifications();
    } else {
      toast.error(data.error || '删除失败');
    }
  };

  // ========== 退出登录 ==========

  const handleLogout = async () => {
    document.cookie = 'admin_token=; path=/; max-age=0';
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900">
      {/* 顶部导航 */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">GEO优化工具</h1>
              <p className="text-xs text-gray-500">管理后台</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">总用户数</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">活跃用户</p>
                  <p className="text-3xl font-bold">{stats.activeUsers}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">待处理意见</p>
                  <p className="text-3xl font-bold">{stats.pendingFeedbacks}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">已发布通知</p>
                  <p className="text-3xl font-bold">{stats.publishedNotifications}</p>
                </div>
                <Bell className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 功能标签页 */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4">
              <Users className="h-4 w-4 mr-2" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4">
              <Package className="h-4 w-4 mr-2" />
              套餐管理
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4">
              <MessageSquare className="h-4 w-4 mr-2" />
              意见收集
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg px-4">
              <Bell className="h-4 w-4 mr-2" />
              通知发布
            </TabsTrigger>
          </TabsList>

          {/* 用户管理 */}
          <TabsContent value="users">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>用户列表</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowAddUserDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      添加用户
                    </Button>
                    <Select value={userFilter} onValueChange={(v) => { setUserFilter(v); loadUsers(); }}>
                      <SelectTrigger className="w-32 bg-white/80 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="active">活跃</SelectItem>
                        <SelectItem value="suspended">已停用</SelectItem>
                        <SelectItem value="pending">待审核</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="搜索用户..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                        className="pl-9 w-64 bg-white border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                        <th className="pb-3 font-medium">用户</th>
                        <th className="pb-3 font-medium">状态</th>
                        <th className="pb-3 font-medium">角色</th>
                        <th className="pb-3 font-medium">套餐</th>
                        <th className="pb-3 font-medium">权限</th>
                        <th className="pb-3 font-medium">文章数</th>
                        <th className="pb-3 font-medium">注册时间</th>
                        <th className="pb-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {users.map((user) => {
                        const pkg = packages.find(p => p.id === user.packageId);
                        return (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="py-3">
                              <div>
                                <p className="font-medium">{user.name || '-'}</p>
                                <p className="text-sm text-slate-400">{user.email || user.phone || '-'}</p>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge variant={
                                user.status === 'active' ? 'default' :
                                user.status === 'suspended' ? 'destructive' :
                                'secondary'
                              }>
                                {user.status === 'active' ? '活跃' :
                                 user.status === 'suspended' ? '已停用' : '待审核'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline">
                                {user.role === 'user' ? '普通用户' :
                                 user.role === 'premium' ? '高级会员' : '企业会员'}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm">
                              {pkg ? (
                                <div>
                                  <p>{pkg.name}</p>
                                  {user.packageExpiresAt && (
                                    <p className="text-slate-400">
                                      到期：{new Date(user.packageExpiresAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {user.permissions?.geoAnalysis && (
                                  <Badge variant="secondary" className="text-xs">基础分析</Badge>
                                )}
                                {user.permissions?.advancedGeoAnalysis && (
                                  <Badge variant="secondary" className="text-xs">高级分析</Badge>
                                )}
                                {user.permissions?.autoPublish && (
                                  <Badge variant="secondary" className="text-xs">自动发布</Badge>
                                )}
                                {user.permissions?.teamCollaboration && (
                                  <Badge variant="secondary" className="text-xs">团队协作</Badge>
                                )}
                                {user.permissions?.dedicatedSupport && (
                                  <Badge variant="secondary" className="text-xs">专属客服</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-sm">{user.totalArticleCount}</td>
                            <td className="py-3 text-sm text-slate-400">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            暂无用户数据，点击上方"添加用户"按钮创建
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 套餐管理 */}
          <TabsContent value="packages">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>套餐列表</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleInitPackages}
                    >
                      初始化默认套餐
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingPackage({ code: '', name: '', price: '0', billingCycle: 'monthly', features: {}, isActive: true });
                        setShowPackageDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新增套餐
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className={cn(
                      "bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all",
                      pkg.isRecommended && "ring-2 ring-blue-500 bg-gradient-to-br from-blue-50/80 to-purple-50/80"
                    )}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{pkg.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPackage(pkg);
                                setShowPackageDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {pkg.isRecommended && (
                          <Badge className="w-fit bg-blue-500">推荐</Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">¥{pkg.price}</span>
                            <span className="text-sm text-slate-400">
                              /{pkg.billingCycle === 'monthly' ? '月' : pkg.billingCycle === 'yearly' ? '年' : '永久'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">{pkg.description || '-'}</p>
                          <div className="pt-2 space-y-1 text-sm">
                            <p>每日AI创作：{pkg.features.dailyAiCreations === -1 ? '无限制' : pkg.features.dailyAiCreations || 10}次</p>
                            <p>平台绑定：{pkg.features.maxPlatforms === -1 ? '无限制' : pkg.features.maxPlatforms || 3}个</p>
                            <p>基础GEO分析：{pkg.features.geoAnalysis ? '✓' : '✗'}</p>
                            <p>高级GEO分析：{pkg.features.advancedGeoAnalysis ? '✓' : '✗'}</p>
                            <p>自动发布：{pkg.features.autoPublish ? '✓' : '✗'}</p>
                            <p>团队协作：{pkg.features.teamCollaboration ? '✓' : '✗'}</p>
                            <p>专属客服：{pkg.features.dedicatedSupport ? '✓' : '✗'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {packages.length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      暂无套餐数据，点击上方按钮新增
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 意见收集 */}
          <TabsContent value="feedbacks">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>用户意见</CardTitle>
                  <Select value={feedbackFilter} onValueChange={(v) => { setFeedbackFilter(v); loadFeedbacks(); }}>
                    <SelectTrigger className="w-32 bg-white/80 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="processing">处理中</SelectItem>
                      <SelectItem value="resolved">已解决</SelectItem>
                      <SelectItem value="closed">已关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <Card key={feedback.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={
                                feedback.type === 'bug' ? 'destructive' :
                                feedback.type === 'feature' ? 'default' :
                                'secondary'
                              }>
                                {feedback.type === 'bug' ? 'Bug' :
                                 feedback.type === 'feature' ? '功能建议' :
                                 feedback.type === 'improvement' ? '改进建议' : '其他'}
                              </Badge>
                              <Badge variant={
                                feedback.status === 'pending' ? 'secondary' :
                                feedback.status === 'resolved' ? 'default' :
                                'outline'
                              }>
                                {feedback.status === 'pending' ? '待处理' :
                                 feedback.status === 'processing' ? '处理中' :
                                 feedback.status === 'resolved' ? '已解决' : '已关闭'}
                              </Badge>
                            </div>
                            <h4 className="font-medium mb-1">{feedback.title}</h4>
                            <p className="text-sm text-slate-400 line-clamp-2">{feedback.content}</p>
                            {feedback.adminReply && (
                              <div className="mt-3 p-3 bg-gray-100/80 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">管理员回复：</p>
                                <p className="text-sm">{feedback.adminReply}</p>
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(feedback.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(feedback);
                                setShowFeedbackDialog(true);
                              }}
                            >
                              回复
                            </Button>
                            {feedback.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateFeedbackStatus(feedback.id, 'processing')}
                              >
                                处理
                              </Button>
                            )}
                            {feedback.status === 'processing' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateFeedbackStatus(feedback.id, 'resolved')}
                              >
                                完成
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {feedbacks.length === 0 && (
                    <div className="py-8 text-center text-slate-400">
                      暂无意见数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通知发布 */}
          <TabsContent value="notifications">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>功能通知</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={notificationFilter} onValueChange={(v) => { setNotificationFilter(v); loadNotifications(); }}>
                      <SelectTrigger className="w-32 bg-white/80 border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="draft">草稿</SelectItem>
                        <SelectItem value="published">已发布</SelectItem>
                        <SelectItem value="archived">已归档</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        setEditingNotification({
                          title: '',
                          content: '',
                          category: 'feature',
                          status: 'draft',
                          isPinned: false,
                          publishAt: new Date().toISOString(),
                        });
                        setShowNotificationDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      新建通知
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card key={notification.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {notification.isPinned && (
                                <Pin className="h-4 w-4 text-blue-500" />
                              )}
                              <Badge variant={
                                notification.category === 'feature' ? 'default' :
                                notification.category === 'update' ? 'secondary' :
                                notification.category === 'fix' ? 'destructive' :
                                'outline'
                              }>
                                {notification.category === 'feature' ? '新功能' :
                                 notification.category === 'update' ? '更新' :
                                 notification.category === 'fix' ? '修复' : '公告'}
                              </Badge>
                              <Badge variant={
                                notification.status === 'published' ? 'default' :
                                notification.status === 'draft' ? 'secondary' :
                                'outline'
                              }>
                                {notification.status === 'published' ? '已发布' :
                                 notification.status === 'draft' ? '草稿' : '已归档'}
                              </Badge>
                            </div>
                            <h4 className="font-medium mb-1">{notification.title}</h4>
                            <p className="text-sm text-slate-400 line-clamp-2">{notification.summary || notification.content}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {notification.viewCount} 次浏览
                              </span>
                              <span>
                                发布时间：{new Date(notification.publishAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {notification.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePublishNotification(notification.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                发布
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingNotification(notification);
                                setShowNotificationDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {notifications.length === 0 && (
                    <div className="py-8 text-center text-slate-400">
                      暂无通知数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* 添加用户对话框 */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>添加用户</DialogTitle>
            <DialogDescription>创建新的用户账号</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="请输入姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="请输入邮箱（邮箱或手机号至少填一项）"
              />
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="请输入手机号（邮箱或手机号至少填一项）"
              />
            </div>
            <div className="space-y-2">
              <Label>密码 *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="请输入密码"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v as typeof newUser.role })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="premium">高级会员</SelectItem>
                    <SelectItem value="enterprise">企业会员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={newUser.status}
                  onValueChange={(v) => setNewUser({ ...newUser, status: v as typeof newUser.status })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="suspended">已停用</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>套餐</Label>
              <Select
                value={newUser.packageId || '__none__'}
                onValueChange={(v) => setNewUser({ ...newUser, packageId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="bg-white/80 border-gray-200">
                  <SelectValue placeholder="选择套餐" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无套餐</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} (¥{pkg.price}/{pkg.billingCycle === 'monthly' ? '月' : pkg.billingCycle === 'yearly' ? '年' : '永久'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUser.packageId && (
              <div className="space-y-2">
                <Label>订购月数</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={newUserSubscriptionMonths}
                    onChange={(e) => setNewUserSubscriptionMonths(parseInt(e.target.value) || 1)}
                    className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500 w-24"
                  />
                  <span className="text-sm text-slate-500">个月</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewUserSubscriptionMonths(12)}
                  >
                    1年
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>取消</Button>
            <Button onClick={handleAddUser}>创建用户</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>
              修改用户状态、角色、套餐和权限
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v as UserAccount['status'] })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">活跃</SelectItem>
                    <SelectItem value="suspended">已停用</SelectItem>
                    <SelectItem value="pending">待审核</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(v) => setSelectedUser({ ...selectedUser, role: v as UserAccount['role'] })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户</SelectItem>
                    <SelectItem value="premium">高级会员</SelectItem>
                    <SelectItem value="enterprise">企业会员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>套餐</Label>
                <Select
                  value={selectedUser.packageId || '__none__'}
                  onValueChange={(v) => {
                    const packageId = v === '__none__' ? undefined : v;
                    const permissions = getPackagePermissions(packageId);
                    setSelectedUser({ 
                      ...selectedUser, 
                      packageId,
                      permissions: permissions || selectedUser.permissions,
                      // 选择套餐时自动计算到期时间
                      packageExpiresAt: packageId ? calculateExpiryDate(subscriptionMonths) : undefined,
                    });
                  }}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue placeholder="选择套餐" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无套餐</SelectItem>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - ¥{pkg.price}/{pkg.billingCycle === 'monthly' ? '月' : pkg.billingCycle === 'yearly' ? '年' : '永久'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser.packageId && (
                <div className="space-y-2">
                  <Label>订购月数</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={subscriptionMonths}
                      onChange={(e) => {
                        const months = parseInt(e.target.value) || 1;
                        setSubscriptionMonths(months);
                        setSelectedUser({ 
                          ...selectedUser, 
                          packageExpiresAt: calculateExpiryDate(months) 
                        });
                      }}
                      className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500 w-24"
                    />
                    <span className="text-sm text-slate-500">个月</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubscriptionMonths(12);
                        setSelectedUser({ 
                          ...selectedUser, 
                          packageExpiresAt: calculateExpiryDate(12) 
                        });
                      }}
                    >
                      1年
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>套餐到期时间</Label>
                <Input
                  type="date"
                  value={selectedUser.packageExpiresAt?.split('T')[0] || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, packageExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
                {selectedUser.packageExpiresAt && (
                  <p className="text-xs text-slate-400">
                    到期时间将自动根据订购月数计算
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>功能权限</Label>
                <div className="space-y-2 p-3 bg-gray-100/80 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">基础GEO分析</span>
                    <Switch
                      checked={selectedUser.permissions?.geoAnalysis ?? false}
                      onCheckedChange={(v) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, geoAnalysis: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">高级GEO分析</span>
                    <Switch
                      checked={selectedUser.permissions?.advancedGeoAnalysis ?? false}
                      onCheckedChange={(v) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, advancedGeoAnalysis: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">自动发布功能</span>
                    <Switch
                      checked={selectedUser.permissions?.autoPublish ?? false}
                      onCheckedChange={(v) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, autoPublish: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">团队协作</span>
                    <Switch
                      checked={selectedUser.permissions?.teamCollaboration ?? false}
                      onCheckedChange={(v) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, teamCollaboration: v }
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">专属客服</span>
                    <Switch
                      checked={selectedUser.permissions?.dedicatedSupport ?? false}
                      onCheckedChange={(v) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, dedicatedSupport: v }
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>取消</Button>
            <Button onClick={handleUpdateUser}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 套餐编辑对话框 */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editingPackage.id ? '编辑套餐' : '新增套餐'}</DialogTitle>
            <DialogDescription>
              配置套餐名称、价格、功能限制等
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>套餐名称</Label>
              <Input
                value={editingPackage.name || ''}
                onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label>套餐代码（唯一标识）</Label>
              <Input
                value={editingPackage.code || ''}
                onChange={(e) => setEditingPackage({ ...editingPackage, code: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={!!editingPackage.id}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>价格</Label>
                <Input
                  type="number"
                  value={editingPackage.price || '0'}
                  onChange={(e) => setEditingPackage({ ...editingPackage, price: e.target.value })}
                  className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label>计费周期</Label>
                <Select
                  value={editingPackage.billingCycle || 'monthly'}
                  onValueChange={(v) => setEditingPackage({ ...editingPackage, billingCycle: v as UserPackage['billingCycle'] })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">月付</SelectItem>
                    <SelectItem value="yearly">年付</SelectItem>
                    <SelectItem value="lifetime">永久</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={editingPackage.description || ''}
                onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPackage.isActive ?? true}
                  onCheckedChange={(v) => setEditingPackage({ ...editingPackage, isActive: v })}
                />
                <Label className="text-sm">启用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingPackage.isRecommended ?? false}
                  onCheckedChange={(v) => setEditingPackage({ ...editingPackage, isRecommended: v })}
                />
                <Label className="text-sm">推荐</Label>
              </div>
            </div>
            
            {/* 功能权限设置 */}
            <div className="border-t border-slate-600 pt-4 mt-4">
              <h4 className="font-medium mb-3">功能权限</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">每日AI创作次数</Label>
                  <Input
                    type="number"
                    placeholder="-1表示无限制"
                    value={editingPackage.features?.dailyAiCreations ?? 10}
                    onChange={(e) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, dailyAiCreations: parseInt(e.target.value) || -1 }
                    })}
                    className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">平台绑定数量</Label>
                  <Input
                    type="number"
                    placeholder="-1表示无限制"
                    value={editingPackage.features?.maxPlatforms ?? 3}
                    onChange={(e) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, maxPlatforms: parseInt(e.target.value) || -1 }
                    })}
                    className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPackage.features?.geoAnalysis ?? true}
                    onCheckedChange={(v) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, geoAnalysis: v }
                    })}
                  />
                  <Label className="text-sm">基础GEO分析</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPackage.features?.advancedGeoAnalysis ?? false}
                    onCheckedChange={(v) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, advancedGeoAnalysis: v }
                    })}
                  />
                  <Label className="text-sm">高级GEO分析</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPackage.features?.autoPublish ?? false}
                    onCheckedChange={(v) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, autoPublish: v }
                    })}
                  />
                  <Label className="text-sm">自动发布</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPackage.features?.teamCollaboration ?? false}
                    onCheckedChange={(v) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, teamCollaboration: v }
                    })}
                  />
                  <Label className="text-sm">团队协作</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPackage.features?.dedicatedSupport ?? false}
                    onCheckedChange={(v) => setEditingPackage({
                      ...editingPackage,
                      features: { ...editingPackage.features, dedicatedSupport: v }
                    })}
                  />
                  <Label className="text-sm">专属客服</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>取消</Button>
            <Button onClick={handleSavePackage}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 意见回复对话框 */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>回复意见</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100/80 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">原意见：</p>
                <p className="text-sm">{selectedFeedback.content}</p>
              </div>
              <div className="space-y-2">
                <Label>回复内容</Label>
                <Textarea
                  value={feedbackReply}
                  onChange={(e) => setFeedbackReply(e.target.value)}
                  className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  rows={4}
                  placeholder="请输入回复内容..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>取消</Button>
            <Button onClick={handleReplyFeedback}>发送回复</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 通知编辑对话框 */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{editingNotification.id ? '编辑通知' : '新建通知'}</DialogTitle>
            <DialogDescription>
              创建或编辑系统通知，向用户推送功能更新和公告
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={editingNotification.title || ''}
                onChange={(e) => setEditingNotification({ ...editingNotification, title: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                value={editingNotification.content || ''}
                onChange={(e) => setEditingNotification({ ...editingNotification, content: e.target.value })}
                className="bg-white/80 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={editingNotification.category || 'feature'}
                  onValueChange={(v) => setEditingNotification({ ...editingNotification, category: v as FeatureNotification['category'] })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feature">新功能</SelectItem>
                    <SelectItem value="update">更新</SelectItem>
                    <SelectItem value="fix">修复</SelectItem>
                    <SelectItem value="announcement">公告</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={editingNotification.status || 'draft'}
                  onValueChange={(v) => setEditingNotification({ ...editingNotification, status: v as FeatureNotification['status'] })}
                >
                  <SelectTrigger className="bg-white/80 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">发布</SelectItem>
                    <SelectItem value="archived">归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editingNotification.isPinned ?? false}
                onCheckedChange={(v) => setEditingNotification({ ...editingNotification, isPinned: v })}
              />
              <Label className="text-sm">置顶显示</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>取消</Button>
            <Button onClick={handleSaveNotification}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
