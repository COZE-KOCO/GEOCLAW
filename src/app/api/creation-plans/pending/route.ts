/**
 * 待执行创作计划 API
 * 
 * GET - 获取当前时间点需要执行的创作计划
 * 
 * 供桌面端调度器调用，返回满足执行条件的活跃计划
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { type CreationPlan, type PlanStatus } from '@/lib/creation-plan-store';
import { type GenerationConfig } from '@/lib/types/generation-config';

// 数据库记录转前端类型
function dbToPlan(record: any): CreationPlan {
  return {
    id: record.id,
    businessId: record.business_id,
    planName: record.plan_name,
    status: record.status as PlanStatus,
    frequency: record.frequency,
    articlesPerRun: record.articles_per_run,
    scheduledTime: record.scheduled_time || '09:00',
    scheduledDays: record.scheduled_days || [],
    scheduledDates: record.scheduled_dates || [],
    contentConfig: record.content_config as GenerationConfig,
    publishConfig: record.publish_config,
    stats: {
      totalCreated: record.total_created || 0,
      totalPublished: record.total_published || 0,
      successRate: parseFloat(record.success_rate) || 0,
      lastRunAt: record.last_run_at,
      nextRunAt: record.next_run_at,
    },
    startDate: record.start_date,
    endDate: record.end_date,
    lastKeywordIndex: record.last_keyword_index || 0,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/**
 * GET /api/creation-plans/pending
 * 获取待执行的创作计划
 * 
 * 查询条件：
 * 1. 状态为 active
 * 2. 在有效期内（start_date <= now, end_date > now 或 end_date 为空）
 * 3. 符合频率和时间条件：
 *    - hourly: 每小时执行
 *    - daily: 每天在 scheduledTime 执行
 *    - weekly: 每周在 scheduledDays 的 scheduledTime 执行
 *    - monthly: 每月在 scheduledDates 的 scheduledTime 执行
 * 4. next_run_at 为空或已过期（避免重复执行）
 * 
 * Query params:
 * - businessId: 可选，过滤特定商家的计划
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    
    const supabase = getSupabaseClient();
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm
    const currentDay = now.getDay();
    const currentDate = now.getDate();
    
    // 查询活跃计划
    let query = supabase
      .from('creation_plans')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now.toISOString());
    
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    
    const { data: plans, error } = await query;
    
    if (error) {
      console.error('查询待执行计划失败:', error);
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 }
      );
    }
    
    // 过滤符合执行条件的计划
    const pendingPlans = (plans || []).filter(plan => {
      // 检查结束日期
      if (plan.end_date && new Date(plan.end_date) < now) {
        return false;
      }
      
      // 检查 next_run_at，避免重复执行
      // 如果 next_run_at 存在且大于当前时间，说明还没到执行时间
      if (plan.next_run_at && new Date(plan.next_run_at) > now) {
        return false;
      }
      
      // 检查上次执行时间（防止同一分钟内重复执行）
      if (plan.last_run_at) {
        const lastRun = new Date(plan.last_run_at);
        const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
        if (minutesSinceLastRun < 1) {
          return false; // 1分钟内已执行过
        }
      }
      
      const { frequency, scheduled_time, scheduled_days, scheduled_dates } = plan;
      
      switch (frequency) {
        case 'hourly':
          // 每小时执行，检查分钟是否为0
          return now.getMinutes() < 5; // 每小时的前5分钟内可执行
          
        case 'daily':
          // 每天执行，检查时间匹配
          return scheduled_time === currentTime;
          
        case 'weekly':
          // 每周执行，检查星期几和时间
          const days = scheduled_days || [];
          return days.includes(currentDay) && scheduled_time === currentTime;
          
        case 'monthly':
          // 每月执行，检查日期和时间
          const dates = scheduled_dates || [];
          return dates.includes(currentDate) && scheduled_time === currentTime;
          
        default:
          return false;
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      plans: pendingPlans.map(dbToPlan),
      meta: {
        currentTime,
        currentDay,
        currentDate,
        totalActive: plans?.length || 0,
        totalPending: pendingPlans.length,
      }
    });
  } catch (error) {
    console.error('获取待执行计划异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
