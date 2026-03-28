/**
 * 单个平台选择器配置 API
 * 
 * GET: 获取指定平台配置
 * PUT: 更新用户配置
 * DELETE: 删除用户配置（恢复默认）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database';
import { DEFAULT_PLATFORM_CONFIGS, PlatformSelectorConfig } from '@/lib/selector-defaults';

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

// 获取指定平台的配置
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  
  try {
    // 先获取默认配置
    const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
    if (!defaultConfig) {
      return NextResponse.json({
        success: false,
        error: `未找到平台 ${platform} 的配置`,
      }, { status: 404 });
    }

    const supabase = getSupabaseClient();
    
    // 尝试获取用户自定义配置
    const { data: userConfig, error } = await supabase
      .from('platform_selectors')
      .select('*')
      .eq('platform', platform)
      .single();

    if (error) {
      // 表不存在或没有用户配置，返回默认配置
      if (error.code === '42P01' || error.message?.includes('Could not find the table') || error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: { ...defaultConfig, isDefault: true },
          source: 'default',
        });
      }
      
      console.error('[Selector API] 查询错误:', error);
      return NextResponse.json({
        success: true,
        data: { ...defaultConfig, isDefault: true },
        source: 'default',
      });
    }

    // 返回用户配置（标记为非默认）
    return NextResponse.json({
      success: true,
      data: mapToFrontend(userConfig),
      source: 'user',
    });
  } catch (error: any) {
    console.error('[Selector API] 获取配置失败:', error);
    const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
    if (defaultConfig) {
      return NextResponse.json({
        success: true,
        data: { ...defaultConfig, isDefault: true },
        source: 'default',
      });
    }
    return NextResponse.json({
      success: false,
      error: error.message || '获取配置失败',
    }, { status: 500 });
  }
}

// 更新用户配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const body = await request.json();
    const supabase = getSupabaseClient();

    // 获取默认配置作为基础
    const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
    
    // 准备更新数据
    const updateData: any = {
      platform,
      updated_at: new Date().toISOString(),
      is_default: false, // 用户修改后标记为非默认
    };

    // 只更新提供的字段
    if (body.selectorTypes !== undefined) updateData.selector_types = body.selectorTypes;
    if (body.selectors !== undefined) updateData.selectors = body.selectors;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.prepareScript !== undefined) updateData.prepare_script = body.prepareScript;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    // 如果有默认配置，填充必填字段
    if (defaultConfig) {
      if (!updateData.platform_name) updateData.platform_name = defaultConfig.platformName;
      if (!updateData.publish_url) updateData.publish_url = defaultConfig.publishUrl;
      if (!updateData.version) updateData.version = defaultConfig.version;
    }

    // 使用 upsert 保存
    const { data, error } = await supabase
      .from('platform_selectors')
      .upsert(updateData, { onConflict: 'platform' })
      .select()
      .single();

    if (error) {
      console.error('[Selector API] 更新错误:', error);
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
        return NextResponse.json({
          success: false,
          error: '数据库表未创建，无法保存配置',
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
    console.error('[Selector API] 更新配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '更新失败',
    }, { status: 500 });
  }
}

// 删除用户配置（恢复默认）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const supabase = getSupabaseClient();

    // 删除用户自定义配置
    const { error } = await supabase
      .from('platform_selectors')
      .delete()
      .eq('platform', platform);

    if (error) {
      console.error('[Selector API] 删除错误:', error);
      // 表不存在也视为成功（本来就没有自定义配置）
      if (error.code === '42P01' || error.message?.includes('Could not find the table')) {
        const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
        return NextResponse.json({
          success: true,
          data: defaultConfig ? { ...defaultConfig, isDefault: true } : null,
          message: '已恢复为默认配置',
        });
      }
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    // 返回默认配置
    const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
    return NextResponse.json({
      success: true,
      data: defaultConfig ? { ...defaultConfig, isDefault: true } : null,
      message: '已恢复为默认配置',
    });
  } catch (error: any) {
    console.error('[Selector API] 删除配置失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '删除失败',
    }, { status: 500 });
  }
}
