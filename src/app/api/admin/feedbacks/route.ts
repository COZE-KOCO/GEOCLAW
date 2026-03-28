/**
 * Admin 意见管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getUserFeedbacks, replyUserFeedback, updateFeedbackStatus } from '@/lib/admin-store';

/**
 * 获取意见列表
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;

    const feedbacks = await getUserFeedbacks({ status, type });
    return NextResponse.json({ success: true, data: feedbacks });
  } catch (error) {
    console.error('[Admin Feedbacks] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取意见列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 回复意见或更新状态
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action, reply, status, priority } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少意见ID' },
        { status: 400 }
      );
    }

    if (action === 'reply' && reply) {
      const success = await replyUserFeedback(id, reply, admin.id);
      if (!success) {
        return NextResponse.json(
          { success: false, error: '回复失败' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (status || priority) {
      const success = await updateFeedbackStatus(id, status, priority);
      if (!success) {
        return NextResponse.json(
          { success: false, error: '更新状态失败' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin Feedbacks] Error:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
