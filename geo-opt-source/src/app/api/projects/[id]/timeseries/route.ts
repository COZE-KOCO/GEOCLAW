import { NextRequest, NextResponse } from 'next/server';
import { getTimeSeriesData } from '@/lib/project-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getTimeSeriesData(id);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取时间序列数据失败:', error);
    return NextResponse.json(
      { success: false, error: '获取时间序列数据失败' },
      { status: 500 }
    );
  }
}
