/**
 * 初始化/重置默认选择器配置 API
 * 
 * POST: 重置所有平台配置为默认值（删除用户自定义配置）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database';
import { DEFAULT_PLATFORM_CONFIGS } from '@/lib/selector-defaults';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 删除所有用户自定义配置
    const { error: deleteError } = await supabase
      .from('platform_selectors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

    if (deleteError) {
      // 表不存在也视为成功
      if (deleteError.code === '42P01' || deleteError.message?.includes('Could not find the table')) {
        return NextResponse.json({
          success: true,
          message: '已重置为默认配置',
          data: DEFAULT_PLATFORM_CONFIGS.map(c => ({ ...c, isDefault: true })),
        });
      }
      
      console.error('[Selector Init] 删除错误:', deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '已重置为默认配置',
      data: DEFAULT_PLATFORM_CONFIGS.map(c => ({ ...c, isDefault: true })),
    });
  } catch (error: any) {
    console.error('[Selector Init] 重置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '重置失败',
    }, { status: 500 });
  }
}
