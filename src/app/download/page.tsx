import { Metadata } from 'next';
import { DownloadPage } from './download-page';

export const metadata: Metadata = {
  title: '下载桌面版 - GEO优化工具平台',
  description: '下载GEO优化工具平台桌面版，享受更便捷的账号管理和自动发布功能',
};

export default function Download() {
  return <DownloadPage />;
}
