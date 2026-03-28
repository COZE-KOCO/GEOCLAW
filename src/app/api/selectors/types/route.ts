/**
 * 选择器类型 API
 * 
 * GET: 获取选择器类型定义列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  SELECTOR_TYPE_REGISTRY, 
  getPlatformSelectorTypes,
  PLATFORM_SELECTOR_TYPES,
  SELECTOR_CATEGORIES,
} from '@/lib/selector-types';

// 获取选择器类型定义
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const category = searchParams.get('category');

    // 获取平台特定的选择器类型
    if (platform) {
      const platformTypes = getPlatformSelectorTypes(platform);
      return NextResponse.json({
        success: true,
        data: platformTypes,
        platform,
      });
    }

    // 获取特定分类的选择器类型
    if (category) {
      const categoryTypes = SELECTOR_TYPE_REGISTRY.filter(t => t.category === category);
      return NextResponse.json({
        success: true,
        data: categoryTypes,
        category,
      });
    }

    // 返回所有选择器类型和分类
    return NextResponse.json({
      success: true,
      data: {
        types: SELECTOR_TYPE_REGISTRY,
        categories: SELECTOR_CATEGORIES,
        platforms: PLATFORM_SELECTOR_TYPES,
      },
    });
  } catch (error: any) {
    console.error('[Selector Types API] 获取失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取失败',
    }, { status: 500 });
  }
}
