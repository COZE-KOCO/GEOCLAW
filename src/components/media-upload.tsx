'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Trash2,
  Loader2,
  Plus,
  FileImage,
} from 'lucide-react';

export interface MediaFile {
  key: string;
  url: string;
  type: 'image' | 'video';
  filename: string;
  size: number;
  mimeType: string;
}

interface MediaUploadProps {
  value?: MediaFile[];
  onChange?: (files: MediaFile[]) => void;
  maxFiles?: number;
  accept?: 'image' | 'video' | 'all';
  folder?: string;
  disabled?: boolean;
}

export function MediaUpload({
  value = [],
  onChange,
  maxFiles = 10,
  accept = 'all',
  folder = 'content-media',
  disabled = false,
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = {
    image: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
    video: 'video/mp4,video/webm,video/ogg,video/quicktime',
    all: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime',
  };

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - value.length;

    if (fileArray.length > remainingSlots) {
      alert(`最多还能上传 ${remainingSlots} 个文件`);
      fileArray.splice(remainingSlots);
    }

    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedFiles: MediaFile[] = [];
    const totalFiles = fileArray.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = fileArray[i];

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            uploadedFiles.push(result.data);
          }
        } else {
          const error = await response.json();
          console.error('上传失败:', error.error);
          alert(error.error || '上传失败');
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        console.error('上传失败:', error);
      }
    }

    setIsUploading(false);
    setUploadProgress(0);

    if (uploadedFiles.length > 0 && onChange) {
      onChange([...value, ...uploadedFiles]);
    }
  }, [value, maxFiles, folder, disabled, onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = async (index: number) => {
    const file = value[index];

    // 可选：从存储中删除文件
    try {
      await fetch(`/api/media?key=${encodeURIComponent(file.key)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('删除文件失败:', error);
    }

    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange?.(newFiles);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes[accept]}
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />

        <div className="text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-sm text-gray-500 mb-2">上传中...</p>
              <Progress value={uploadProgress} className="w-48 mx-auto h-2" />
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-1">
                拖拽文件到此处或点击上传
              </p>
              <p className="text-xs text-gray-400">
                {accept === 'image' && '支持 JPG, PNG, GIF, WebP, SVG，单文件最大 10MB'}
                {accept === 'video' && '支持 MP4, WebM, OGG, MOV，单文件最大 100MB'}
                {accept === 'all' && '支持图片(10MB)和视频(100MB)，最多 ' + maxFiles + ' 个文件'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* 已上传文件列表 */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {value.map((file, index) => (
            <Card key={file.key} className="relative group overflow-hidden">
              <CardContent className="p-2">
                {/* 预览 */}
                <div
                  className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden cursor-pointer"
                  onClick={() => setPreviewUrl(file.url)}
                >
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="mt-2">
                  <p className="text-xs font-medium truncate" title={file.filename}>
                    {file.filename}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="outline" className="text-xs">
                      {file.type === 'image' ? '图片' : '视频'}
                    </Badge>
                    <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                  </div>
                </div>

                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 预览对话框 */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>媒体预览</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="relative">
              {previewUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video
                  src={previewUrl}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="预览"
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 简化版本：单图上传
interface SingleImageUploadProps {
  value?: MediaFile | null;
  onChange?: (file: MediaFile | null) => void;
  folder?: string;
  disabled?: boolean;
}

export function SingleImageUpload({
  value,
  onChange,
  folder = 'content-media',
  disabled = false,
}: SingleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onChange?.(result.data);
        }
      } else {
        const error = await response.json();
        alert(error.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange?.(null);
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleUpload}
        disabled={disabled}
      />

      {value ? (
        <div className="relative group">
          <img
            src={value.url}
            alt={value.filename}
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={`w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-primary hover:bg-primary/5'
          }`}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          ) : (
            <div className="text-center">
              <Plus className="h-8 w-8 mx-auto mb-1 text-gray-400" />
              <p className="text-xs text-gray-500">上传图片</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
