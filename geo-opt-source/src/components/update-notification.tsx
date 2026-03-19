'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface UpdateInfo {
  available: boolean;
  currentVersion?: string;
  latestVersion?: string;
  releaseNotes?: any;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

type UpdateStatus = 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export function UpdateNotification() {
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>('checking');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // 检测Electron环境
  useEffect(() => {
    const checkElectron = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.isElectron();
        setIsElectron(result);
      }
    };
    checkElectron();
  }, []);

  // 检查更新
  const checkForUpdates = useCallback(async () => {
    if (!isElectron || !window.electronAPI) return;

    setStatus('checking');
    setError(null);

    try {
      const result = await window.electronAPI.checkForUpdates();
      setUpdateInfo(result);

      if (result.available) {
        setStatus('available');
        setShowDialog(true);
      } else if (result.error) {
        setStatus('error');
        setError(result.error);
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message);
    }
  }, [isElectron]);

  // 应用启动后检查更新
  useEffect(() => {
    if (isElectron) {
      // 延迟检查，避免影响启动
      const timer = setTimeout(checkForUpdates, 5000);
      return () => clearTimeout(timer);
    }
  }, [isElectron, checkForUpdates]);

  // 监听下载进度
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onUpdateProgress((p) => {
      setProgress(p);
    });

    return unsubscribe;
  }, [isElectron]);

  // 监听下载完成
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onUpdateDownloaded((info) => {
      setStatus('downloaded');
      setProgress(null);
    });

    return unsubscribe;
  }, [isElectron]);

  // 监听错误
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubscribe = window.electronAPI.onUpdateError((err) => {
      setStatus('error');
      setError(err);
    });

    return unsubscribe;
  }, [isElectron]);

  // 下载更新
  const handleDownload = async () => {
    if (!window.electronAPI) return;

    setStatus('downloading');
    setProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 });

    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success && result.error) {
        setStatus('error');
        setError(result.error);
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message);
    }
  };

  // 安装更新
  const handleInstall = () => {
    if (!window.electronAPI) return;
    window.electronAPI.installUpdate();
  };

  // 稍后提醒
  const handleLater = () => {
    setShowDialog(false);
  };

  if (!isElectron) return null;

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'available' && (
              <>
                <Download className="h-5 w-5 text-blue-500" />
                发现新版本
              </>
            )}
            {status === 'downloading' && (
              <>
                <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                正在下载更新
              </>
            )}
            {status === 'downloaded' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                更新已就绪
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                更新失败
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {status === 'available' && updateInfo && (
              <div className="space-y-2">
                <p>
                  发现新版本 <Badge>v{updateInfo.latestVersion}</Badge>
                </p>
                <p className="text-xs text-gray-500">
                  当前版本：v{updateInfo.currentVersion}
                </p>
              </div>
            )}
            {status === 'downloading' && progress && (
              <div className="space-y-2">
                <Progress value={progress.percent} className="h-2" />
                <p className="text-xs text-center text-gray-500">
                  {progress.percent.toFixed(1)}% · 
                  {(progress.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s
                </p>
              </div>
            )}
            {status === 'downloaded' && (
              <p>更新已下载完成，重启应用即可安装新版本。</p>
            )}
            {status === 'error' && (
              <p className="text-red-500">{error}</p>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {status === 'available' && (
            <>
              <Button variant="outline" onClick={handleLater}>
                稍后提醒
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                立即下载
              </Button>
            </>
          )}
          {status === 'downloading' && (
            <Button variant="outline" disabled>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              下载中...
            </Button>
          )}
          {status === 'downloaded' && (
            <>
              <Button variant="outline" onClick={handleLater}>
                稍后安装
              </Button>
              <Button onClick={handleInstall}>
                <RefreshCw className="h-4 w-4 mr-1" />
                重启并安装
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                关闭
              </Button>
              <Button onClick={checkForUpdates}>
                重试
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
