import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '自动发布 - GEO优化',
  description: '管理自动发布任务，调度内容到各平台',
};

export default function PublishTasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
