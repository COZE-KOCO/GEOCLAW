'use client';

import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Download, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

interface WebPublishGuideProps {
  className?: string;
}

/**
 * Web端发布配置引导组件
 * 
 * 提示用户下载桌面版以配置发布平台
 */
export function WebPublishGuide({ className }: WebPublishGuideProps) {
  const features = [
    '绑定发布平台账号（小红书、抖音、微信等）',
    '自动发布到多个平台',
    '定时发布任务调度',
    '账号状态实时监控',
  ];

  return (
    <div className={`p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-900 dark:text-amber-100">
            发布平台配置需要桌面版
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            在桌面版中绑定账号后，可在此处选择发布平台
          </p>

          {/* 功能列表 */}
          <div className="mt-3 space-y-1.5">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-4">
            <Link href="/download">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Download className="h-4 w-4 mr-1.5" />
                下载桌面版
              </Button>
            </Link>
            <a 
              href="https://help.coze.cn/geool/help" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                了解更多
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
