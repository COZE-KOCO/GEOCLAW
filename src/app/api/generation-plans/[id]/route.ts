/**
 * 单个生成计划 API
 * 
 * GET - 获取计划详情
 * DELETE - 删除计划
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/generation-plans/[id]
 * 获取计划详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('generation_plans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return NextResponse.json(
        { success: false, error: '计划不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      plan: data,
    });
  } catch (error) {
    console.error('获取计划失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/generation-plans/[id]
 * 删除计划
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('generation_plans')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { success: false, error: '删除失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('删除计划失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
