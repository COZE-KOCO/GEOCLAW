'use client';

import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';
import { useState } from 'react';

interface ContentActionsProps {
  projectId: string;
  title: string;
}

export function ContentActions({ projectId, title }: ContentActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/content/${projectId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/content/${projectId}`;
    const text = `${title}\n${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url,
        });
      } catch {
        // 用户取消分享或分享失败，回退到复制
        navigator.clipboard.writeText(text);
      }
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="flex gap-4">
      <Button
        onClick={handleCopyLink}
        className="gap-2"
      >
        <Copy className="h-4 w-4" />
        {copied ? '已复制' : '复制链接'}
      </Button>
      <Button
        variant="outline"
        onClick={handleShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
        分享内容
      </Button>
    </div>
  );
}
