/**
 * Admin 通知管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { 
  getFeatureNotifications, 
  createFeatureNotification, 
  updateFeatureNotification,
  deleteFeatureNotification 
} from '@/lib/admin-store';

/**
 * 获取通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;

    const notifications = await getFeatureNotifications({ status, category });
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[Admin Notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取通知列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建通知
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    
    const notification = await createFeatureNotification({
      title: body.title,
      content: body.content,
      summary: body.summary,
      category: body.category || 'feature',
      icon: body.icon,
      link: body.link,
      publishAt: body.publishAt || new Date().toISOString(),
      expireAt: body.expireAt,
      targetRoles: body.targetRoles,
      status: body.status || 'draft',
      isPinned: body.isPinned || false,
      publishedBy: admin.id,
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: '创建通知失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error('[Admin Notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: '创建通知失败' },
      { status: 500 }
    );
  }
}

/**
 * 更新通知
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少通知ID' },
        { status: 400 }
      );
    }

    const success = await updateFeatureNotification(id, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '更新通知失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: '更新通知失败' },
      { status: 500 }
    );
  }
}

/**
 * 删除通知
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
        { success: false, error: '缺少通知ID' },
        { status: 400 }
      );
    }

    const success = await deleteFeatureNotification(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除通知失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: '删除通知失败' },
      { status: 500 }
    );
  }
}
