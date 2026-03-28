'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { User, Mail, Calendar, Shield, LogOut, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  permissions: Record<string, boolean>;
  packageId?: string;
  packageExpiresAt?: string;
}

interface PackageInfo {
  id: string;
  name: string;
  code: string;
  price: string;
  billingCycle: string;
  features: {
    dailyAiCreations?: number;
    maxPlatforms?: number;
    geoAnalysis?: boolean;
    advancedGeoAnalysis?: boolean;
    autoPublish?: boolean;
    teamCollaboration?: boolean;
    dedicatedSupport?: boolean;
  };
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userPackage, setUserPackage] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      // 获取用户信息
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      
      if (userData.success) {
        setUser(userData.user);
        
        // 获取套餐信息
        const pkgRes = await fetch('/api/user/package');
        const pkgData = await pkgRes.json();
        
        if (pkgData.success && pkgData.data.currentPackage) {
          setUserPackage(pkgData.data.currentPackage);
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        // 使用 window.location.href 强制刷新页面，确保 middleware 重新检查认证状态
        window.location.href = '/login';
      } else {
        console.error('退出失败:', await res.text());
      }
    } catch (error) {
      console.error('退出失败:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      user: '普通用户',
      premium: '高级会员',
      enterprise: '企业会员',
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex">
        <Sidebar />
        <main className="flex-1 ml-56 overflow-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <User className="h-5 w-5 text-white" />
              </div>
              账号信息
            </h1>
            <p className="text-slate-500 mt-2 ml-13">管理您的账号信息和安全设置</p>
          </div>

          {/* 基本信息 */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 mb-6 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <CardHeader>
              <CardTitle className="text-lg text-slate-700">基本信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/30">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{user?.name || '用户'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${
                      userPackage?.code === 'enterprise' 
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                        : userPackage?.code === 'professional' 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                    } border-0`}>
                      <Crown className="h-3 w-3 mr-1" />
                      {userPackage?.name || '免费版'}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {getRoleLabel(user?.role || 'user')}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {user?.email && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">邮箱</div>
                      <div className="text-sm text-slate-700">{user.email}</div>
                    </div>
                  </div>
                )}
                
                {user?.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">手机号</div>
                      <div className="text-sm text-slate-700">{user.phone}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">账号状态</div>
                    <div className="text-sm text-green-600 font-medium">
                      {user?.status === 'active' ? '正常' : user?.status === 'suspended' ? '已停用' : '待审核'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 套餐信息 */}
          {userPackage && (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 mb-6 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">套餐信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-xl border border-blue-100/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      userPackage.code === 'enterprise' 
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                        : userPackage.code === 'professional' 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                          : 'bg-gradient-to-br from-slate-100 to-slate-200'
                    }`}>
                      <Crown className={`h-6 w-6 ${
                        userPackage.code === 'enterprise' || userPackage.code === 'professional'
                          ? 'text-white' 
                          : 'text-slate-500'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{userPackage.name}</h4>
                      <p className="text-sm text-slate-500">¥{userPackage.price}/{userPackage.billingCycle === 'monthly' ? '月' : userPackage.billingCycle === 'yearly' ? '年' : '永久'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {user?.packageExpiresAt ? (
                      <>
                        <p className="text-sm text-slate-500">到期时间</p>
                        <p className="font-medium text-slate-700">{formatDate(user.packageExpiresAt)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">永久有效</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 套餐权益 */}
          {userPackage?.features && (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 mb-6 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">套餐权益</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">每日AI创作</div>
                    <div className="font-semibold text-slate-700">
                      {userPackage.features.dailyAiCreations === -1 ? '无限制' : `${userPackage.features.dailyAiCreations || 10}次`}
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">平台绑定</div>
                    <div className="font-semibold text-slate-700">
                      {userPackage.features.maxPlatforms === -1 ? '无限制' : `${userPackage.features.maxPlatforms || 3}个`}
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">基础GEO分析</div>
                    <div className={`font-semibold ${userPackage.features.geoAnalysis ? 'text-green-600' : 'text-slate-400'}`}>
                      {userPackage.features.geoAnalysis ? '已开通' : '未开通'}
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">高级GEO分析</div>
                    <div className={`font-semibold ${userPackage.features.advancedGeoAnalysis ? 'text-green-600' : 'text-slate-400'}`}>
                      {userPackage.features.advancedGeoAnalysis ? '已开通' : '未开通'}
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">自动发布</div>
                    <div className={`font-semibold ${userPackage.features.autoPublish ? 'text-green-600' : 'text-slate-400'}`}>
                      {userPackage.features.autoPublish ? '已开通' : '未开通'}
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                    <div className="text-xs text-slate-400 mb-1">团队协作</div>
                    <div className={`font-semibold ${userPackage.features.teamCollaboration ? 'text-green-600' : 'text-slate-400'}`}>
                      {userPackage.features.teamCollaboration ? '已开通' : '未开通'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800">退出登录</h3>
                  <p className="text-sm text-slate-500">退出当前账号</p>
                </div>
                <Button 
                  variant="outline" 
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
