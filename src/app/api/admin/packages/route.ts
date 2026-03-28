/**
 * Admin 套餐管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getUserPackages, upsertUserPackage, deleteUserPackage } from '@/lib/admin-store';

/**
 * 获取套餐列表
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const packages = await getUserPackages();
    return NextResponse.json({ success: true, data: packages });
  } catch (error) {
    console.error('[Admin Packages] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取套餐列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建或更新套餐
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const pkg = await upsertUserPackage(body);

    if (!pkg) {
      return NextResponse.json(
        { success: false, error: '保存套餐失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: pkg });
  } catch (error) {
    console.error('[Admin Packages] Error:', error);
    return NextResponse.json(
      { success: false, error: '保存套餐失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除套餐
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少套餐ID' },
        { status: 400 }
      );
    }

    const success = await deleteUserPackage(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除失败，可能该套餐正在被用户使用' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Packages] Error:', error);
    return NextResponse.json(
      { success: false, error: '删除套餐失败' },
      { status: 500 }
    );
  }
}
