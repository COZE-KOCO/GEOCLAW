import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '全自动创作发布 - GEO优化',
  description: '配置自动化创作计划，实现内容从生成到发布的全流程自动化',
};

export default function AutoPublishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
