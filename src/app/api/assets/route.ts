import { NextRequest, NextResponse } from 'next/server';
import { getFoldersByBusiness } from '@/lib/asset-store';

/**
 * GET /api/assets/folders
 * 获取商家的文件夹列表
 * Query params:
 * - businessId: 商家ID（必填）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const folders = await getFoldersByBusiness(businessId);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('获取文件夹列表失败:', error);
    return NextResponse.json({ error: '获取文件夹列表失败' }, { status: 500 });
  }
}
