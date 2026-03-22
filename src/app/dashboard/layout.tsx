import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '工作台 - GEO优化',
  description: 'GEO优化工具工作台，查看数据概览和关键指标',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
