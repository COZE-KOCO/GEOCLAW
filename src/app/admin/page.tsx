'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    fetch('/api/admin/users')
      .then(res => {
        if (res.status === 401) {
          router.push('/admin/login');
        } else {
          router.push('/admin/dashboard');
        }
      })
      .catch(() => {
        router.push('/admin/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );
}
