import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 只获取已公开的内容
    const { data: projects, error } = await supabase
      .from('geo_projects')
      .select('*')
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取公开内容失败:', error);
      return NextResponse.json(
        { error: '获取公开内容失败' },
        { status: 500 }
      );
    }

    // 获取总数
    const { count, error: countError } = await supabase
      .from('geo_projects')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    if (countError) {
      console.error('获取内容总数失败:', countError);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';

    const contents = (projects || []).map((project: any) => ({
      id: project.id,
      title: project.title,
      content: project.content,
      author: project.author,
      keywords: project.keywords || [],
      score: project.score || 0,
      publishedAt: project.published_at,
      updatedAt: project.updated_at,
      publicUrl: `${baseUrl}/content/${project.id}`,
    }));

    return NextResponse.json({
      success: true,
      contents,
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('获取公开内容失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
