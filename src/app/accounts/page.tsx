'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/app-layout';
import { AccountManager } from '@/components/account-manager';
import { AccountCategoryView } from '@/components/account-category-view';
import { AddAccountDialog } from '@/components/add-account-dialog';
import { Users, LayoutGrid, List } from 'lucide-react';
import { BusinessSelector } from '@/components/business-selector';
import { useBusiness } from '@/contexts/business-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformCategory, AIModel } from '@/config/platforms';

export default function AccountsPage() {
  const { selectedBusiness } = useBusiness();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<PlatformCategory | undefined>();
  const [defaultAiModel, setDefaultAiModel] = useState<AIModel | undefined>();
  const [defaultPlatform, setDefaultPlatform] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddAccount = (category: PlatformCategory, aiModel?: AIModel, platformId?: string) => {
    setDefaultCategory(category);
    setDefaultAiModel(aiModel);
    setDefaultPlatform(platformId);
    setShowAddDialog(true);
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-500" />
              账号管理
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              管理自媒体平台、GEO采集平台和官网账号
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BusinessSelector />
          </div>
        </div>

        {/* 账号管理 */}
        {selectedBusiness ? (
          <Tabs defaultValue="category" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="category">
                <LayoutGrid className="h-4 w-4 mr-1" />
                分类视图
              </TabsTrigger>
              <TabsTrigger value="traditional">
                <List className="h-4 w-4 mr-1" />
                传统视图
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="category">
              <AccountCategoryView
                key={refreshKey}
                businessId={selectedBusiness}
                onAddAccount={handleAddAccount}
              />
            </TabsContent>
            
            <TabsContent value="traditional">
              <AccountManager businessId={selectedBusiness} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">请先选择企业/商家</p>
            </CardContent>
          </Card>
        )}

        {/* 添加账号对话框 */}
        <AddAccountDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          businessId={selectedBusiness || ''}
          defaultCategory={defaultCategory}
          defaultAiModel={defaultAiModel}
          defaultPlatform={defaultPlatform}
          onSuccess={handleSuccess}
        />
      </div>
    </AppLayout>
  );
}
