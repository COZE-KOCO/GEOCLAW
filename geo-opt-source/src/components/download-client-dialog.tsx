'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface DownloadClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: string;
}

// 平台名称映射
const platformNames: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  wechat: '微信公众号',
  zhihu: '知乎',
  weibo: '微博',
  toutiao: '今日头条',
  bilibili: 'B站',
  baijiahao: '百家号',
};

export function DownloadClientDialog({ 
  open, 
  onOpenChange, 
  platform 
}: DownloadClientDialogProps) {
  const platformName = platform ? platformNames[platform] || platform : '';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </button>
        
        {/* 内容区域 */}
        <div className="pt-8 pb-6 px-6 text-center">
          {/* 标题 */}
          <DialogTitle className="text-xl font-bold text-center mb-2">
            请下载客户端
          </DialogTitle>
          
          {/* 说明文字 */}
          <DialogDescription className="text-center text-gray-500 mb-6">
            {platformName 
              ? `${platformName}暂不支持浏览器授权，请前往客户端操作。`
              : '账号绑定功能暂不支持浏览器操作，请前往客户端操作。'
            }
          </DialogDescription>
          
          {/* 下载选项 */}
          <div className="flex justify-center gap-6">
            {/* Windows 客户端 */}
            <Link
              href="/download"
              onClick={() => onOpenChange(false)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 5.5L10.5 4.5V11.5H3V5.5Z" fill="#0078D4"/>
                  <path d="M11.5 4.3L21 3V11.5H11.5V4.3Z" fill="#0078D4"/>
                  <path d="M3 12.5H10.5V19.5L3 18.5V12.5Z" fill="#0078D4"/>
                  <path d="M11.5 12.5H21V21L11.5 19.7V12.5Z" fill="#0078D4"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900">Windows</span>
            </Link>
            
            {/* Mac 客户端 */}
            <Link
              href="/download"
              onClick={() => onOpenChange(false)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900">Mac</span>
            </Link>
            
            {/* Linux 客户端 */}
            <Link
              href="/download"
              onClick={() => onOpenChange(false)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.2.458.344.288.576.447.918.667.245.15.397.267.48.4.083.133.1.266.1.4-.003.267-.133.533-.4.667-.267.133-.6.2-.933.2a2.44 2.44 0 01-.68-.066 3.08 3.08 0 01-.52-.2c-.16-.066-.32-.133-.48-.133-.16 0-.32.067-.48.133-.16.067-.32.133-.48.2-.16.066-.347.066-.52.066-.333 0-.666-.067-.933-.2-.267-.134-.4-.4-.4-.667 0-.133.017-.266.1-.4.083-.133.235-.25.48-.4.342-.22.574-.379.918-.667.467-.393.868-.458 1.2-.458z" fill="#FCC624"/>
                </svg>
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900">Linux</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
