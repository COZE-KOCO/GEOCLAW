/**
 * 用户端通知列表 API
 * 同步管理端发布的功能通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    // 构建查询 - 只获取已发布且未过期的通知
    let query = supabase
      .from('feature_notifications')
      .select('*')
      .eq('status', 'published')
      .or(`expire_at.is.null,expire_at.gt.${new Date().toISOString()}`)
      .order('is_pinned', { ascending: false })
      .order('publish_at', { ascending: false });
    
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[User Notifications] Query error:', error);
      return NextResponse.json(
        { success: false, error: '获取通知失败' },
        { status: 500 }
      );
    }
    
    const notifications = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      summary: item.summary,
      category: item.category,
      icon: item.icon,
      link: item.link,
      publishAt: item.publish_at,
      isPinned: item.is_pinned,
      viewCount: item.view_count,
    }));
    
    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('[User Notifications] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取通知失败' },
      { status: 500 }
    );
  }
}
