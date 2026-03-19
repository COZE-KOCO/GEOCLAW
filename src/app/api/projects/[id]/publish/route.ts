import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'isPublic字段必须为布尔值' },
        { status: 400 }
      );
    }

    // 更新项目的公开状态
    const { error } = await supabase
      .from('geo_projects')
      .update({ 
        is_public: isPublic,
        published_at: isPublic ? new Date().toISOString() : null
      })
      .eq('id', id);

    if (error) {
      console.error('更新发布状态失败:', error);
      return NextResponse.json(
        { error: '更新发布状态失败' },
        { status: 500 }
      );
    }

    // 如果发布，获取公开URL
    const publicUrl = isPublic 
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/content/${id}`
      : null;

    return NextResponse.json({
      success: true,
      isPublic,
      publicUrl,
      message: isPublic ? '内容已发布' : '内容已取消发布'
    });

  } catch (error) {
    console.error('处理发布请求失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
