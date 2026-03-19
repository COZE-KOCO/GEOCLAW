'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface UploadResult {
  platform: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  version: string;
  message: string;
}

export function ClientUploader() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState('1.0.0');

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);

    try {
      const res = await fetch('/api/upload-desktop-client', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  const platformNames: Record<string, string> = {
    darwin: 'macOS',
    win32: 'Windows',
    linux: 'Linux',
  };

  const envVarNames: Record<string, string> = {
    darwin: 'DESKTOP_DOWNLOAD_URL_MAC',
    win32: 'DESKTOP_DOWNLOAD_URL_WIN',
    linux: 'DESKTOP_DOWNLOAD_URL_LINUX',
  };

  return (
    <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          上传桌面端安装包
        </CardTitle>
        <CardDescription>
          上传 .exe / .dmg / .AppImage 文件，自动识别平台
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 版本号输入 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">版本号：</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="px-3 py-1 border rounded text-sm w-24"
            placeholder="1.0.0"
          />
        </div>

        {/* 上传区域 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>上传中...</span>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                点击选择安装包文件
              </p>
              <p className="text-xs text-gray-400 mt-1">
                支持 .exe / .dmg / .AppImage
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".exe,.dmg,.AppImage,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 上传成功 */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">
                上传成功！{platformNames[result.platform]} 安装包已保存
              </span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">文件名</p>
                <p className="text-sm font-mono">{result.fileName}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-1">下载 URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded flex-1 break-all">
                    {result.downloadUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(result.downloadUrl)}
                  >
                    复制
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-2">配置环境变量</p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 font-mono text-xs">
                  <p>
                    <span className="text-blue-600 dark:text-blue-400">
                      {envVarNames[result.platform]}
                    </span>
                    {' = '}
                    <span className="text-gray-600 dark:text-gray-400">{'{刚才复制的URL}'}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  在扣子平台「环境变量」中添加后重新部署
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
