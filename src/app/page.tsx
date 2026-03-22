'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 自动跳转到Dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-500">正在跳转...</p>
        </div>
      </div>
    </AppLayout>
  );
}
