'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/app-layout';
import { PublishTaskManager } from '@/components/publish-task-manager';
import { Calendar } from 'lucide-react';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';

export default function PublishTasksPage() {
  const { selectedBusiness } = useBusiness();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-purple-500" />
              自动发布
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              管理自动化发布任务和计划
            </p>
          </div>
          <BusinessSelector />
        </div>

        {/* 任务管理 */}
        {selectedBusiness ? (
          <PublishTaskManager businessId={selectedBusiness} />
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">请先选择企业/商家</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
