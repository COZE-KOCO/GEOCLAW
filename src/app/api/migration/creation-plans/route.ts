/**
 * 创作计划数据迁移 API
 * 将 localStorage 中的计划数据迁移到数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { type GenerationConfig, defaultGenerationConfig } from '@/lib/types/generation-config';

interface LocalPlan {
  id: string;
  businessId: string;
  planName: string;
  status: string;
  frequency: string;
  articlesPerRun: number;
  scheduledTime: string;
  scheduledDays: number[];
  scheduledDates: number[];
  contentConfig: GenerationConfig;
  publishConfig: {
    autoPublish: boolean;
    publishDelay: number;
    targetPlatforms: Array<{ platform: string; accountId: string; accountName?: string }>;
    publishStrategy: string;
    publishTimeSlots: string[];
  };
  stats: {
    totalCreated: number;
    totalPublished: number;
    successRate: number;
    lastRunAt?: string;
    nextRunAt?: string;
  };
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/migration/creation-plans
 * 迁移 localStorage 中的计划到数据库
 * 
 * Body: { plans: LocalPlan[], force?: boolean }
 * force: 强制更新已存在的计划
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plans, force } = body as { plans: LocalPlan[]; force?: boolean };
    
    console.log('[Migration] 收到迁移请求:', {
      planCount: plans?.length,
      planIds: plans?.map(p => p.id),
      force,
    });
    
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      console.log('[Migration] 没有需要迁移的计划');
      return NextResponse.json(
        { success: false, error: '没有需要迁移的计划' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    const results: { id: string; status: 'success' | 'skipped' | 'updated' | 'error'; error?: string }[] = [];
    
    for (const plan of plans) {
      try {
        console.log(`[Migration] 处理计划 ${plan.id}: ${plan.planName}`);
        
        // 检查是否已存在
        const { data: existing, error: checkError } = await supabase
          .from('creation_plans')
          .select('id')
          .eq('id', plan.id)
          .single();
        
        if (existing && !force) {
          console.log(`[Migration] 计划 ${plan.id} 已存在，跳过`);
          results.push({ id: plan.id, status: 'skipped' });
          continue;
        }
        
        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 是"没有找到记录"的错误，这是正常的
          console.error(`[Migration] 检查计划 ${plan.id} 是否存在时出错:`, checkError);
        }
        
        const planData = {
          id: plan.id,
          business_id: plan.businessId,
          plan_name: plan.planName,
          status: plan.status,
          frequency: plan.frequency,
          articles_per_run: plan.articlesPerRun,
          scheduled_time: plan.scheduledTime,
          scheduled_days: plan.scheduledDays,
          scheduled_dates: plan.scheduledDates,
          content_config: plan.contentConfig,
          publish_config: plan.publishConfig,
          total_created: plan.stats.totalCreated,
          total_published: plan.stats.totalPublished,
          success_rate: plan.stats.successRate.toString(),
          last_run_at: plan.stats.lastRunAt,
          next_run_at: plan.stats.nextRunAt,
          start_date: plan.startDate,
          end_date: plan.endDate,
          created_at: plan.createdAt,
          updated_at: new Date().toISOString(),
          last_keyword_index: 0,
        };
        
        let error;
        
        if (existing && force) {
          // 强制模式：更新已存在的计划
          console.log(`[Migration] 强制更新计划 ${plan.id}`);
          const result = await supabase
            .from('creation_plans')
            .update(planData)
            .eq('id', plan.id);
          error = result.error;
        } else {
          // 插入新计划
          const result = await supabase
            .from('creation_plans')
            .insert(planData);
          error = result.error;
        }
        
        if (error) {
          console.error(`[Migration] 迁移计划 ${plan.id} 失败:`, {
            message: error.message,
            code: error.code,
            details: error.details,
          });
          results.push({ id: plan.id, status: 'error', error: error.message });
        } else {
          console.log(`[Migration] 计划 ${plan.id} 迁移成功`);
          results.push({ id: plan.id, status: existing ? 'updated' : 'success' });
        }
      } catch (e) {
        console.error(`[Migration] 迁移计划 ${plan.id} 异常:`, e);
        results.push({ id: plan.id, status: 'error', error: String(e) });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const updatedCount = results.filter(r => r.status === 'updated').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`[Migration] 迁移完成: 成功=${successCount}, 更新=${updatedCount}, 跳过=${skippedCount}, 失败=${errorCount}`);
    
    return NextResponse.json({
      success: true,
      message: `迁移完成：成功 ${successCount}，更新 ${updatedCount}，跳过 ${skippedCount}，失败 ${errorCount}`,
      results,
      summary: {
        total: plans.length,
        success: successCount + updatedCount,
        skipped: skippedCount,
        error: errorCount,
      },
    });
  } catch (error) {
    console.error('[Migration] 数据迁移异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migration/creation-plans
 * 检查迁移状态
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('creation_plans')
      .select('id', { count: 'exact' });
    
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    
    const { count, error } = await query;
    
    if (error) {
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      databaseCount: count || 0,
      message: count && count > 0 
        ? '数据库中已有计划数据' 
        : '数据库中暂无计划数据，可以从 localStorage 迁移',
    });
  } catch (error) {
    console.error('检查迁移状态异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
