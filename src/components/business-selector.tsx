'use client';

import { useState } from 'react';
import { Building2, Settings, Plus } from 'lucide-react';
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
    } else if (value === '_manage') {
      setShowManager(true);
    }
  };

  // 获取当前选中的商家名称
  const selectedBusinessName = businesses.find(b => b.id === selectedBusiness)?.name;

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={selectedBusiness || undefined} 
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger className={`${className} border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800`}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <SelectValue placeholder={loading ? '加载中...' : placeholder}>
              {selectedBusinessName || placeholder}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="min-w-[200px]">
          {businesses.length > 0 ? (
            <>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  <div className="flex items-center gap-2">
                    <span>{business.name}</span>
                    {business.status === 'inactive' && (
                      <span className="text-xs text-slate-400">(已停用)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              <div className="border-t my-1" />
              <SelectItem value="_manage" className="text-purple-600 font-medium">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>新增/管理商家</span>
                </div>
              </SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="_empty" disabled>
                <span className="text-slate-400">暂无商家</span>
              </SelectItem>
              <div className="border-t my-1" />
              <SelectItem value="_manage" className="text-purple-600 font-medium">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>创建商家</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {/* 商家管理对话框 */}
      <BusinessManager open={showManager} onOpenChange={setShowManager} />
    </div>
  );
}
