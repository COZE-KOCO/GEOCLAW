'use client';

import { useState } from 'react';
import { Building2, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/contexts/business-context';
import { BusinessManager } from './business-manager';

interface BusinessSelectorProps {
  className?: string;
  placeholder?: string;
}

/**
 * 商家选择器组件
 * 使用全局 BusinessContext，所有页面的选择会自动同步
 */
export function BusinessSelector({ 
  className = 'w-[200px]',
  placeholder = '选择企业/商家'
}: BusinessSelectorProps) {
  const { 
    selectedBusiness, 
    setSelectedBusiness, 
    businesses, 
    loading 
  } = useBusiness();
  
  const [showManager, setShowManager] = useState(false);

  // 处理选择变化
  const handleValueChange = (value: string) => {
    if (value && value !== '_empty' && value !== '_manage') {
      setSelectedBusiness(value);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-slate-500" />
        <Select 
          value={selectedBusiness || ''} 
          onValueChange={handleValueChange}
          disabled={loading}
        >
          <SelectTrigger className={`${className} border-slate-200 dark:border-slate-700`}>
            <SelectValue placeholder={loading ? '加载中...' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {businesses.length > 0 ? (
              <>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </>
            ) : (
              <SelectItem value="_empty" disabled>
                暂无商家，请先创建
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* 管理按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setShowManager(true)}
        title="管理商家"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* 商家管理对话框 */}
      <BusinessManager open={showManager} onOpenChange={setShowManager} />
    </div>
  );
}
