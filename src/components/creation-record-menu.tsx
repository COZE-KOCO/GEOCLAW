'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  ListChecks,
  FileText, 
  ChevronDown,
  Clock,
  FolderOpen
} from 'lucide-react';

interface CreationRecordMenuProps {
  variant?: 'outline' | 'ghost' | 'default';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  businessId?: string;
}

export function CreationRecordMenu({ 
  variant = 'outline', 
  size = 'sm',
  className = '',
  businessId
}: CreationRecordMenuProps) {
  const router = useRouter();

  const handlePlansClick = () => {
    // 跳转到生成计划页面
    router.push('/matrix/generation-plans');
  };

  const handleArticlesClick = () => {
    // 跳转到文章列表页面
    router.push('/projects');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Clock className="h-4 w-4 mr-1" />
          创作记录
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={handlePlansClick} className="cursor-pointer">
          <ListChecks className="h-4 w-4 mr-2 text-purple-500" />
          <span>生成计划</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleArticlesClick} className="cursor-pointer">
          <FolderOpen className="h-4 w-4 mr-2 text-blue-500" />
          <span>文章列表</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
