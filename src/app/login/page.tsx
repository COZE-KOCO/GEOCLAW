'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Loader2, AlertCircle, Sparkles, Rocket, Target } from 'lucide-react';
import { useUser } from '@/contexts/user-context';

export default function UserLoginPage() {
  const router = useRouter();
  const { user, loading: userLoading, refreshUser } = useUser();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果用户已登录，重定向到 dashboard
  useEffect(() => {
    if (!userLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 确保发送和接收 cookie
        body: JSON.stringify({ account, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 刷新用户状态并跳转
        // 使用 setTimeout 确保 cookie 已被浏览器处理
        await refreshUser();
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 左侧装饰区域 - 仅在桌面端显示 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-purple-700/90" />
        
        {/* 装饰图形 */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl" />
        
        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <img 
              src="/logo.png" 
              alt="GEO" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold">GEO优化工具</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            让内容成为AI的<br />首选答案
          </h1>
          
          <p className="text-lg text-white/80 mb-10 leading-relaxed">
            专业的GEO优化平台，帮助您的内容在ChatGPT、DeepSeek等AI引擎中获得更高引用率
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">智能内容创作</p>
                <p className="text-sm text-white/60">AI驱动的高质量内容生成</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">一键多平台发布</p>
                <p className="text-sm text-white/60">覆盖主流自媒体平台</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">GEO效果追踪</p>
                <p className="text-sm text-white/60">实时监测AI引用效果</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 右侧登录区域 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src="/logo.png" 
              alt="GEO" 
              className="w-16 h-16 object-contain mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">GEO优化工具</h1>
            <p className="text-gray-500 mt-2">让内容成为AI的首选答案</p>
          </div>
          
          {/* 桌面端标题 */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h2>
            <p className="text-gray-500">请登录您的账号以继续</p>
          </div>

          {/* Login Form */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="account" className="text-gray-700">账号</Label>
                <Input
                  id="account"
                  type="text"
                  placeholder="请输入邮箱或手机号"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-white/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30 text-base font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    登录
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>还没有账号？<span className="text-blue-600 font-medium">请联系管理员开通</span></p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>© 2024 GEO优化工具. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
