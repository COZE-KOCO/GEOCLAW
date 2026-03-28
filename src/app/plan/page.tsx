'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { Package, Crown, Check, Zap, Sparkles, Clock, Users, Headphones, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserPackage } from '@/lib/admin-store';

interface PackageInfo {
  user: {
    id: string;
    name: string;
    email?: string;
    role: string;
  };
  currentPackage: UserPackage | null;
  isExpired: boolean;
  remainingDays: number;
  expiresAt: string | null;
  allPackages: UserPackage[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  dailyAiCreations: <Sparkles className="h-4 w-4" />,
  maxPlatforms: <Users className="h-4 w-4" />,
  geoAnalysis: <Check className="h-4 w-4" />,
  advancedGeoAnalysis: <Zap className="h-4 w-4" />,
  autoPublish: <ArrowRight className="h-4 w-4" />,
  teamCollaboration: <Users className="h-4 w-4" />,
  dedicatedSupport: <Headphones className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  dailyAiCreations: '每日AI创作',
  maxPlatforms: '平台绑定数量',
  geoAnalysis: '基础GEO分析',
  advancedGeoAnalysis: '高级GEO分析',
  autoPublish: '自动发布功能',
  teamCollaboration: '团队协作',
  dedicatedSupport: '专属客服',
};

// 已废弃的字段，不再显示
const deprecatedFeatures = ['maxArticlesPerMonth', 'maxKeywordsPerLibrary', 'priority'];

export default function PlanPage() {
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageInfo();
  }, []);

  const loadPackageInfo = async () => {
    try {
      const response = await fetch('/api/user/package');
      const data = await response.json();
      if (data.success) {
        setPackageInfo(data.data);
      }
    } catch (error) {
      console.error('加载套餐信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFeatureValue = (key: string, value: unknown): React.ReactNode => {
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-green-500 font-medium">已开通</span>
      ) : (
        <span className="text-slate-400">未开通</span>
      );
    }
    if (typeof value === 'number') {
      if (value === -1) {
        return <span className="text-blue-500 font-medium">无限制</span>;
      }
      return <span className="text-slate-700 font-medium">{value}次</span>;
    }
    return String(value);
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

  const currentPkg = packageInfo?.currentPackage;
  const allPackages = packageInfo?.allPackages || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Package className="h-5 w-5 text-white" />
              </div>
              我的套餐
            </h1>
            <p className="text-slate-500 mt-2 ml-13">管理您的订阅套餐和权益</p>
          </div>

          {/* 当前套餐卡片 */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 mb-8 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-700">当前套餐</CardTitle>
            </CardHeader>
            <CardContent>
              {currentPkg ? (
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-2xl border border-blue-100/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      currentPkg.code === 'enterprise' 
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30' 
                        : currentPkg.code === 'professional' 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/30'
                          : 'bg-gradient-to-br from-slate-100 to-slate-200 shadow-slate-300/50'
                    }`}>
                      <Crown className={`h-7 w-7 ${
                        currentPkg.code === 'enterprise' 
                          ? 'text-white' 
                          : currentPkg.code === 'professional' 
                            ? 'text-white'
                            : 'text-slate-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-800">{currentPkg.name}</h3>
                        {currentPkg.isRecommended && (
                          <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">
                            推荐
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{currentPkg.description || '基础功能，适合个人使用'}</p>
                      {packageInfo?.expiresAt && (
                        <div className="flex items-center gap-1.5 mt-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className={packageInfo.isExpired ? 'text-red-500' : 'text-slate-500'}>
                            {packageInfo.isExpired 
                              ? '已过期' 
                              : `剩余 ${packageInfo.remainingDays} 天`}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-400">
                            到期时间：{new Date(packageInfo.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-800">
                      ¥{currentPkg.price}
                      <span className="text-sm font-normal text-slate-400">
                        /{currentPkg.billingCycle === 'monthly' ? '月' : currentPkg.billingCycle === 'yearly' ? '年' : ''}
                      </span>
                    </div>
                    <Button className="mt-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25">
                      升级套餐
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Package className="h-7 w-7 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">暂无套餐</h3>
                      <p className="text-sm text-slate-500">请选择适合您的套餐</p>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    选择套餐
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 套餐权益详情 */}
          {currentPkg?.features && (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 mb-8">
              <CardHeader>
                <CardTitle className="text-lg text-slate-700">套餐权益</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(currentPkg.features)
                    .filter(([key]) => !deprecatedFeatures.includes(key))
                    .map(([key, value]) => (
                    <div key={key} className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                          {categoryIcons[key] || <Check className="h-4 w-4" />}
                        </div>
                        <span className="text-sm text-slate-600">{categoryLabels[key] || key}</span>
                      </div>
                      <div className="text-sm">
                        {renderFeatureValue(key, value)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 套餐对比 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">套餐对比</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {allPackages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1 ${
                  pkg.isRecommended ? 'ring-2 ring-blue-500/50' : ''
                } ${currentPkg?.id === pkg.id ? 'ring-2 ring-green-500/50' : ''}`}
              >
                {pkg.isRecommended && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-slate-800">{pkg.name}</CardTitle>
                    {pkg.isRecommended && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">
                        推荐
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-slate-800">¥{pkg.price}</span>
                    <span className="text-sm text-slate-400 ml-1">
                      /{pkg.billingCycle === 'monthly' ? '月' : pkg.billingCycle === 'yearly' ? '年' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{pkg.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {pkg.features.dailyAiCreations !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.dailyAiCreations > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">
                          每日AI创作 {pkg.features.dailyAiCreations === -1 ? '无限制' : `${pkg.features.dailyAiCreations}次`}
                        </span>
                      </li>
                    )}
                    {pkg.features.maxPlatforms !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.maxPlatforms > 0 ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">
                          平台绑定 {pkg.features.maxPlatforms === -1 ? '无限制' : `${pkg.features.maxPlatforms}个`}
                        </span>
                      </li>
                    )}
                    {pkg.features.geoAnalysis !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.geoAnalysis ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">基础GEO分析</span>
                      </li>
                    )}
                    {pkg.features.advancedGeoAnalysis !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.advancedGeoAnalysis ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">高级GEO分析</span>
                      </li>
                    )}
                    {pkg.features.autoPublish !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.autoPublish ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">自动发布功能</span>
                      </li>
                    )}
                    {pkg.features.teamCollaboration !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.teamCollaboration ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">团队协作</span>
                      </li>
                    )}
                    {pkg.features.dedicatedSupport !== undefined && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${pkg.features.dedicatedSupport ? 'text-green-500' : 'text-slate-300'}`} />
                        <span className="text-slate-600">专属客服</span>
                      </li>
                    )}
                  </ul>
                  <Button 
                    className={`w-full mt-5 ${
                      currentPkg?.id === pkg.id 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : pkg.isRecommended 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                          : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                    disabled={currentPkg?.id === pkg.id}
                  >
                    {currentPkg?.id === pkg.id ? '当前套餐' : '立即订阅'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
