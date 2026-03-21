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
 * Body: { plans: LocalPlan[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plans } = body as { plans: LocalPlan[] };
    
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要迁移的计划' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    const results: { id: string; status: 'success' | 'skipped' | 'error'; error?: string }[] = [];
    
    for (const plan of plans) {
      try {
        // 检查是否已存在
        const { data: existing } = await supabase
          .from('creation_plans')
          .select('id')
          .eq('id', plan.id)
          .single();
        
        if (existing) {
          results.push({ id: plan.id, status: 'skipped' });
          continue;
        }
        
        // 插入到数据库
        const { error } = await supabase
          .from('creation_plans')
          .insert({
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
            updated_at: plan.updatedAt,
          });
        
        if (error) {
          console.error(`迁移计划 ${plan.id} 失败:`, error);
          results.push({ id: plan.id, status: 'error', error: error.message });
        } else {
          results.push({ id: plan.id, status: 'success' });
        }
      } catch (e) {
        console.error(`迁移计划 ${plan.id} 异常:`, e);
        results.push({ id: plan.id, status: 'error', error: String(e) });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return NextResponse.json({
      success: true,
      message: `迁移完成：成功 ${successCount}，跳过 ${skippedCount}，失败 ${errorCount}`,
      results,
      summary: {
        total: plans.length,
        success: successCount,
        skipped: skippedCount,
        error: errorCount,
      },
    });
  } catch (error) {
    console.error('数据迁移异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
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
