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

/**
 * 时间窗口匹配函数
 * 使用时间窗口（前后N分钟）代替精确匹配，避免因调度器检查时机导致错过执行
 * 
 * @param scheduledTime 计划执行时间 (HH:mm)
 * @param currentTime 当前时间 (HH:mm)
 * @param windowMinutes 时间窗口大小（分钟），默认5分钟
 */
function isTimeMatch(scheduledTime: string, currentTime: string, windowMinutes: number = 5): boolean {
  const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
  const [currHour, currMin] = currentTime.split(':').map(Number);
  
  // 转换为分钟数便于计算
  const schedMinutes = schedHour * 60 + schedMin;
  const currMinutes = currHour * 60 + currMin;
  
  // 计算时间差
  const dayMinutes = 24 * 60;
  const diff = Math.abs(schedMinutes - currMinutes);
  
  // 处理跨午夜情况（如 23:55 和 00:05）
  const circularDiff = Math.min(diff, dayMinutes - diff);
  
  return circularDiff <= windowMinutes;
}

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
    
    // 使用中国时区 (UTC+8) 获取当前时间
    // 用户输入的 scheduledTime 是中国时间，所以比较时也要用中国时间
    const chinaTimeString = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const chinaTime = new Date(chinaTimeString);
    const currentTime = chinaTime.toTimeString().slice(0, 5); // HH:mm (中国时区)
    const currentDay = chinaTime.getDay(); // 星期几 (中国时区)
    const currentDate = chinaTime.getDate(); // 日期 (中国时区)
    
    console.log('[PendingPlans] 查询待执行计划:', {
      currentTime,
      currentDay,
      currentDate,
      businessId,
      serverTime: now.toTimeString().slice(0, 5),
    });
    
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
      console.error('[PendingPlans] 查询失败:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      return NextResponse.json(
        { success: false, error: `查询失败: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`[PendingPlans] 查询到 ${plans?.length || 0} 个活跃计划`);
    
    // 过滤符合执行条件的计划
    const pendingPlans = (plans || []).filter(plan => {
      // 检查结束日期
      if (plan.end_date && new Date(plan.end_date) < now) {
        console.log(`[PendingPlans] 计划 ${plan.id} 已过期，跳过`);
        return false;
      }
      
      // 检查 next_run_at，避免重复执行
      // 如果 next_run_at 存在且大于当前时间，说明还没到执行时间
      if (plan.next_run_at && new Date(plan.next_run_at) > now) {
        console.log(`[PendingPlans] 计划 ${plan.id} 下次执行时间未到 (${plan.next_run_at})，跳过`);
        return false;
      }
      
      // 检查计划是否刚创建（宽限期：30分钟）
      // 刚创建的计划即使时间刚过也应该执行
      const createdAt = plan.created_at ? new Date(plan.created_at) : null;
      const minutesSinceCreated = createdAt ? Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60)) : null;
      const isNewlyCreated = createdAt && minutesSinceCreated !== null && minutesSinceCreated < 30;
      
      console.log(`[PendingPlans] 计划 ${plan.id} (${plan.plan_name}): scheduledTime=${plan.scheduled_time}, createdAt=${plan.created_at}, minutesSinceCreated=${minutesSinceCreated}, isNewlyCreated=${isNewlyCreated}`);
      
      // 检查上次执行时间（防止时间窗口内重复执行）
      // 注意：时间窗口为 5 分钟，所以防重复检查也要 5 分钟
      if (plan.last_run_at) {
        const lastRun = new Date(plan.last_run_at);
        const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60);
        if (minutesSinceLastRun < 5) {
          console.log(`[PendingPlans] 计划 ${plan.id} 5分钟内已执行过，跳过`);
          return false; // 5分钟内已执行过（与时间窗口匹配）
        }
      }
      
      const { frequency, scheduled_time, scheduled_days, scheduled_dates } = plan;
      let shouldExecute = false;
      
      // 解析计划执行时间
      const [schedHour, schedMin] = (scheduled_time || '09:00').split(':').map(Number);
      const schedMinutes = schedHour * 60 + schedMin;  // 转换为分钟数
      const [currHour, currMin] = currentTime.split(':').map(Number);
      const currMinutes = currHour * 60 + currMin;
      
      // 计算时间差（当前时间 - 计划时间）
      const timeDiff = currMinutes - schedMinutes;
      
      console.log(`[PendingPlans] 计划 ${plan.id} timeDiff=${timeDiff}, currMinutes=${currMinutes}, schedMinutes=${schedMinutes}`);
      
      switch (frequency) {
        case 'hourly':
          // 每小时执行，检查分钟是否为0
          shouldExecute = now.getMinutes() < 5; // 每小时的前5分钟内可执行
          break;
          
        case 'daily':
          // 每天执行，使用时间窗口匹配（避免精确匹配导致错过）
          // 宽限期：刚创建的计划（30分钟内），只要时间已过就执行
          if (isNewlyCreated && timeDiff >= 0) {
            console.log(`[PendingPlans] 计划 ${plan.id} daily 刚创建，宽限期内执行 (时间差: ${timeDiff}分钟)`);
            shouldExecute = true;
          } else {
            shouldExecute = isTimeMatch(scheduled_time, currentTime);
          }
          break;
          
        case 'weekly':
          // 每周执行，检查星期几和时间窗口
          const days = scheduled_days || [];
          const isTodayValid = days.includes(currentDay);
          
          // 宽限期：刚创建的计划，今天在执行日内，且时间已过
          if (isNewlyCreated && isTodayValid && timeDiff >= 0) {
            console.log(`[PendingPlans] 计划 ${plan.id} weekly 刚创建，宽限期内执行 (时间差: ${timeDiff}分钟)`);
            shouldExecute = true;
          } else {
            shouldExecute = isTodayValid && isTimeMatch(scheduled_time, currentTime);
          }
          console.log(`[PendingPlans] 计划 ${plan.id} weekly 检查: days=${JSON.stringify(days)}, currentDay=${currentDay}, timeMatch=${isTimeMatch(scheduled_time, currentTime)}`);
          break;
          
        case 'monthly':
          // 每月执行，检查日期和时间窗口
          const dates = scheduled_dates || [];
          const isTodayDate = dates.includes(currentDate);
          
          // 宽限期：刚创建的计划，今天在执行日内，且时间已过
          if (isNewlyCreated && isTodayDate && timeDiff >= 0) {
            console.log(`[PendingPlans] 计划 ${plan.id} monthly 刚创建，宽限期内执行 (时间差: ${timeDiff}分钟)`);
            shouldExecute = true;
          } else {
            shouldExecute = isTodayDate && isTimeMatch(scheduled_time, currentTime);
          }
          break;
          
        default:
          shouldExecute = false;
      }
      
      if (shouldExecute) {
        console.log(`[PendingPlans] 计划 ${plan.id} (${plan.plan_name}) 满足执行条件`);
      }
      
      return shouldExecute;
    });
    
    console.log(`[PendingPlans] 最终待执行计划数: ${pendingPlans.length}`);
    
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
    console.error('[PendingPlans] 获取待执行计划异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
