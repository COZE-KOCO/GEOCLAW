/**
 * 选择器执行结果记录 API
 * 
 * POST: 记录选择器执行结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database';

// 记录执行结果
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const {
      configId,
      platform,
      targetType,
      selector,
      success,
      found,
      filled,
      verified,
      executionTime,
      error,
      debugInfo,
    } = body;

    if (!configId || !platform || !targetType || !selector) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段',
      }, { status: 400 });
    }

    // 记录执行日志
    await supabase.from('selector_execution_logs').insert({
      configId,
      platform,
      targetType,
      selector,
      success: success ?? false,
      found: found ?? false,
      filled: filled ?? false,
      verified: verified ?? false,
      executionTime: executionTime ?? 0,
      error,
      debugInfo: debugInfo || {},
    });

    // 获取并更新配置统计
    const { data: configs } = await supabase
      .from('platform_selectors')
      .select('*')
      .eq('id', configId);
    
    if (configs && configs.length > 0) {
      const config = configs[0];
      const newTotalAttempts = config.totalAttempts + 1;
      const newSuccessfulAttempts = config.successfulAttempts + (success ? 1 : 0);
      const newSuccessRate = newTotalAttempts > 0 
        ? (newSuccessfulAttempts / newTotalAttempts * 100).toFixed(2)
        : '0';

      await supabase
        .from('platform_selectors')
        .update({
          totalAttempts: newTotalAttempts,
          successfulAttempts: newSuccessfulAttempts,
          successRate: newSuccessRate,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', configId);

      // 更新选择器配置中单个选择器的成功率
      const selectors = config.selectors as any;
      if (selectors && selectors[targetType]) {
        const selectorItems = selectors[targetType];
        const itemIndex = selectorItems.findIndex((item: any) => item.selector === selector);
        
        if (itemIndex >= 0) {
          const item = selectorItems[itemIndex];
          const newItemTotal = (item.totalAttempts || 0) + 1;
          const newItemSuccess = (item.successfulAttempts || 0) + (success ? 1 : 0);
          
          selectorItems[itemIndex] = {
            ...item,
            totalAttempts: newItemTotal,
            successfulAttempts: newItemSuccess,
            successRate: newItemTotal > 0 ? newItemSuccess / newItemTotal : 0,
            lastSuccess: success ? new Date().toISOString() : item.lastSuccess,
            lastFailure: !success ? new Date().toISOString() : item.lastFailure,
          };

          await supabase
            .from('platform_selectors')
            .update({
              selectors: selectors,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', configId);
        }
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[Selector Log API] 记录失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '记录失败',
    }, { status: 500 });
  }
}

// 获取执行日志
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('selector_execution_logs')
      .select('*');
    
    if (configId) {
      query = query.eq('configId', configId);
    } else if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Selector Log API] 查询错误:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[Selector Log API] 获取日志失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取日志失败',
    }, { status: 500 });
  }
}
