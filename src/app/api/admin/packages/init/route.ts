/**
 * 初始化默认套餐 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 默认套餐配置
const DEFAULT_PACKAGES = [
  {
    name: '免费版',
    code: 'free',
    description: '完全免费，体验基础功能',
    price: '0',
    original_price: '0',
    billing_cycle: 'monthly',
    features: {
      dailyAiCreations: 10,
      maxArticlesPerMonth: 30,
      maxKeywordsPerLibrary: 50,
      geoAnalysis: true,
      advancedGeoAnalysis: false,
      maxPlatforms: 3,
      autoPublish: false,
      teamCollaboration: false,
      dedicatedSupport: false,
      priority: false,
    },
    sort_order: 1,
    is_active: true,
    is_recommended: false,
  },
  {
    name: '专业版',
    code: 'pro',
    description: '适合个人创作者和小型团队',
    price: '99',
    original_price: '199',
    billing_cycle: 'monthly',
    features: {
      dailyAiCreations: -1, // 无限制
      maxArticlesPerMonth: -1,
      maxKeywordsPerLibrary: 500,
      geoAnalysis: true,
      advancedGeoAnalysis: true,
      maxPlatforms: 10,
      autoPublish: true,
      teamCollaboration: false,
      dedicatedSupport: false,
      priority: true,
    },
    sort_order: 2,
    is_active: true,
    is_recommended: true, // 推荐套餐
  },
  {
    name: '企业版',
    code: 'enterprise',
    description: '适合企业和大型团队，提供全方位服务',
    price: '399',
    original_price: '599',
    billing_cycle: 'monthly',
    features: {
      dailyAiCreations: -1,
      maxArticlesPerMonth: -1,
      maxKeywordsPerLibrary: -1,
      geoAnalysis: true,
      advancedGeoAnalysis: true,
      maxPlatforms: -1, // 无限制
      autoPublish: true,
      teamCollaboration: true,
      dedicatedSupport: true,
      priority: true,
    },
    sort_order: 3,
    is_active: true,
    is_recommended: false,
  },
];

/**
 * 初始化默认套餐
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const results = [];

    for (const pkg of DEFAULT_PACKAGES) {
      const { data, error } = await supabase
        .from('user_packages')
        .upsert(pkg, { onConflict: 'code' })
        .select()
        .single();

      if (error) {
        console.error(`[Init Packages] Failed to upsert ${pkg.code}:`, error);
        results.push({ code: pkg.code, success: false, error: error.message });
      } else {
        results.push({ code: pkg.code, success: true, data });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `成功初始化 ${successCount}/${DEFAULT_PACKAGES.length} 个套餐`,
      results,
    });
  } catch (error) {
    console.error('[Init Packages] Error:', error);
    return NextResponse.json(
      { success: false, error: '初始化套餐失败' },
      { status: 500 }
    );
  }
}
