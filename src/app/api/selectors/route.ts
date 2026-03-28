/**
 * 平台选择器配置 API
 * 
 * GET: 获取配置（默认配置 + 用户自定义）
 * POST: 保存用户自定义配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database';
import { DEFAULT_PLATFORM_CONFIGS, mergeWithDefaults, PlatformSelectorConfig } from '@/lib/selector-defaults';

// 数据库字段到前端字段的映射
function mapToFrontend(dbRecord: any): PlatformSelectorConfig {
  return {
    id: dbRecord.id,
    platform: dbRecord.platform,
    platformName: dbRecord.platform_name,
    version: dbRecord.version,
    publishUrl: dbRecord.publish_url,
    selectorTypes: dbRecord.selector_types || [],
    selectors: dbRecord.selectors,
    settings: dbRecord.settings,
    prepareScript: dbRecord.prepare_script,
    totalAttempts: dbRecord.total_attempts || 0,
    successfulAttempts: dbRecord.successful_attempts || 0,
    successRate: dbRecord.success_rate || '0%',
    isActive: dbRecord.is_active ?? true,
    isDefault: dbRecord.is_default ?? true,
    notes: dbRecord.notes,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

// 前端字段到数据库字段的映射
function mapToDatabase(frontendData: Partial<PlatformSelectorConfig>): any {
  const dbData: any = {};
  
  if (frontendData.platform !== undefined) dbData.platform = frontendData.platform;
  if (frontendData.platformName !== undefined) dbData.platform_name = frontendData.platformName;
  if (frontendData.version !== undefined) dbData.version = frontendData.version;
  if (frontendData.publishUrl !== undefined) dbData.publish_url = frontendData.publishUrl;
  if (frontendData.selectorTypes !== undefined) dbData.selector_types = frontendData.selectorTypes;
  if (frontendData.selectors !== undefined) dbData.selectors = frontendData.selectors;
  if (frontendData.settings !== undefined) dbData.settings = frontendData.settings;
  if (frontendData.prepareScript !== undefined) dbData.prepare_script = frontendData.prepareScript;
  if (frontendData.totalAttempts !== undefined) dbData.total_attempts = frontendData.totalAttempts;
  if (frontendData.successfulAttempts !== undefined) dbData.successful_attempts = frontendData.successfulAttempts;
  if (frontendData.successRate !== undefined) dbData.success_rate = frontendData.successRate;
  if (frontendData.isActive !== undefined) dbData.is_active = frontendData.isActive;
  if (frontendData.isDefault !== undefined) dbData.is_default = frontendData.isDefault;
  if (frontendData.notes !== undefined) dbData.notes = frontendData.notes;
  
  return dbData;
}

// 获取配置（默认配置 + 用户自定义）
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    // 尝试从数据库获取用户自定义配置
    let query = supabase.from('platform_selectors').select('*');
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: userConfigs, error } = await query;

    if (error) {
      // 如果表不存在，直接返回默认配置
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
        console.log('[Selector API] 表不存在，返回默认配置');
        const configs = platform 
          ? DEFAULT_PLATFORM_CONFIGS.filter(c => c.platform === platform)
          : DEFAULT_PLATFORM_CONFIGS;
        return NextResponse.json({
          success: true,
          data: configs.map(c => ({ ...c, isDefault: true })),
          source: 'default',
        });
      }
      
      console.error('[Selector API] 查询错误:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // 合并默认配置和用户配置
    const mergedConfigs = mergeWithDefaults((userConfigs || []).map(mapToFrontend));

    return NextResponse.json({
      success: true,
      data: mergedConfigs,
      source: 'merged',
    });
  } catch (error: any) {
    console.error('[Selector API] 获取配置失败:', error);
    // 出错时返回默认配置
    return NextResponse.json({
      success: true,
      data: DEFAULT_PLATFORM_CONFIGS.map(c => ({ ...c, isDefault: true })),
      source: 'default',
    });
  }
}

// 保存用户自定义配置
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    // 验证必填字段
    if (!body.platform || !body.selectors) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段',
      }, { status: 400 });
    }

    // 映射到数据库字段
    const dbData = mapToDatabase({
      ...body,
      isDefault: false, // 用户保存的都是自定义配置
    });

    // 使用 upsert 保存或更新
    const { data, error } = await supabase
      .from('platform_selectors')
      .upsert({
        ...dbData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'platform',
      })
      .select()
      .single();

    if (error) {
      console.error('[Selector API] 保存错误:', error);
      // 如果表不存在
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({
          success: false,
          error: '数据库表未创建，请联系管理员',
        }, { status: 500 });
      }
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: mapToFrontend(data),
    });
  } catch (error: any) {
    console.error('[Selector API] 保存配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '保存失败',
    }, { status: 500 });
  }
}
