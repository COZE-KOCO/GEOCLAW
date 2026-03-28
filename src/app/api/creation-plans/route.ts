/**
 * 查询最近的待执行创作计划 API
 * 供桌面端调度器智能调度使用
 * 
 * GET - 返回最近一个需要执行的计划及其预计执行时间
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 获取中国时区的当前时间
 */
function getChinaTime(): Date {
  const now = new Date();
  // 转换为中国时区 (UTC+8)
  const chinaTime = new Date(now.toLocaleString('en-US', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }));
  return chinaTime;
}

/**
 * 计算计划的下次执行时间（使用中国时区）
 * 考虑宽限期：如果计划刚创建（30分钟内）且时间刚过，仍应今天执行
 */
function calculateNextExecutionTime(plan: {
  frequency: string;
  scheduled_time: string | null;
  scheduled_days: number[] | null;
  scheduled_dates: number[] | null;
  next_run_at: string | null;
  start_date?: string | null;
  created_at?: string | null;
}): Date {
  const now = new Date();
  
  // 如果有 next_run_at 且在未来，直接使用
  if (plan.next_run_at) {
    const nextRun = new Date(plan.next_run_at);
    if (nextRun > now) {
      return nextRun;
    }
  }
  
  // 获取中国时区的当前时间信息
  const chinaTime = getChinaTime();
  const currentDay = chinaTime.getDay(); // 0-6, 0是周日
  const currentDate = chinaTime.getDate();
  
  // 检查计划是否刚创建（宽限期：30分钟）
  const createdAt = plan.created_at ? new Date(plan.created_at) : null;
  const isNewlyCreated = createdAt && (now.getTime() - createdAt.getTime()) < 30 * 60 * 1000;
  
  // 根据 frequency 计算下次执行时间
  const scheduledTime = plan.scheduled_time || '09:00';
  const [hour, minute] = scheduledTime.split(':').map(Number);
  
  // 在中国时区计算今天的执行时间
  let nextExecution = new Date(chinaTime);
  nextExecution.setHours(hour, minute, 0, 0);
  
  // 检查是否在 scheduled_days 内（对于 daily 类型也要检查）
  const scheduledDays = plan.scheduled_days || [];
  const shouldCheckDays = scheduledDays.length > 0;
  const isTodayValid = !shouldCheckDays || scheduledDays.includes(currentDay);
  
  // 检查是否到了执行时间
  const isTimePassed = nextExecution <= chinaTime;
  
  // 宽限期：如果计划刚创建且今天在执行日内且时间已过，仍应今天执行
  if (isNewlyCreated && isTodayValid && isTimePassed) {
    console.log(`[EarliestPlan] 计划刚创建，宽限期内仍应今天执行: ${scheduledTime}`);
    return nextExecution;  // 返回今天的执行时间
  }
  
  // 如果时间已过，或者今天不是执行日，需要找下一个执行时间
  if (isTimePassed || !isTodayValid) {
    // 从明天开始找下一个执行日
    let daysToAdd = 1;
    
    if (shouldCheckDays) {
      // 找到下一个匹配的星期几
      for (let i = 1; i <= 7; i++) {
        const checkDay = new Date(chinaTime);
        checkDay.setDate(checkDay.getDate() + i);
        if (scheduledDays.includes(checkDay.getDay())) {
          daysToAdd = i;
          break;
        }
      }
    }
    
    nextExecution.setDate(nextExecution.getDate() + daysToAdd);
  }
  
  // 对于 monthly 类型，需要检查日期
  if (plan.frequency === 'monthly') {
    const scheduledDates = plan.scheduled_dates || [];
    if (scheduledDates.length > 0 && !scheduledDates.includes(currentDate)) {
      // 找下一个匹配的日期
      // 简化处理：推到下个月
      nextExecution.setMonth(nextExecution.getMonth() + 1);
    }
  }
  
  return nextExecution;
}

/**
 * GET /api/creation-plans/earliest
 * 获取最近一个待执行计划
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    
    // 获取中国时区信息用于日志
    const chinaTime = getChinaTime();
    console.log('[EarliestPlan] 查询时间:', {
      serverTime: now.toISOString(),
      chinaTime: chinaTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      chinaDay: chinaTime.getDay(),
    });
    
    // 查询所有活跃且已开始的计划
    const { data: plans, error } = await supabase
      .from('creation_plans')
      .select(`
        id,
        plan_name,
        frequency,
        scheduled_time,
        scheduled_days,
        scheduled_dates,
        next_run_at,
        last_run_at,
        start_date,
        status,
        end_date,
        created_at
      `)
      .eq('status', 'active');
    
    if (error) {
      console.error('[EarliestPlan] 查询失败:', error);
      return NextResponse.json(
        { success: false, error: '查询失败' },
        { status: 500 }
      );
    }
    
    console.log(`[EarliestPlan] 查询到 ${plans?.length || 0} 个活跃计划`);
    
    if (!plans || plans.length === 0) {
      return NextResponse.json({ 
        success: true, 
        plan: null,
        message: '没有活跃的创作计划' 
      });
    }
    
    // 过滤已开始且未过期的计划，并计算下次执行时间
    const candidatePlans = plans
      .filter(plan => {
        // 检查是否已开始
        if (plan.start_date && new Date(plan.start_date) > now) {
          console.log(`[EarliestPlan] 计划 ${plan.plan_name} 尚未开始: ${plan.start_date}`);
          return false;
        }
        // 过滤已过期的计划
        if (plan.end_date && new Date(plan.end_date) < now) {
          console.log(`[EarliestPlan] 计划 ${plan.plan_name} 已过期: ${plan.end_date}`);
          return false;
        }
        return true;
      })
      .map(plan => {
        const nextExecutionTime = calculateNextExecutionTime(plan);
        console.log(`[EarliestPlan] 计划 ${plan.plan_name} 下次执行: ${nextExecutionTime.toLocaleString('zh-CN')}, scheduledDays: ${JSON.stringify(plan.scheduled_days)}`);
        return {
          ...plan,
          nextExecutionTime,
        };
      })
      .sort((a, b) => a.nextExecutionTime.getTime() - b.nextExecutionTime.getTime());
    
    if (candidatePlans.length === 0) {
      return NextResponse.json({ 
        success: true, 
        plan: null,
        message: '没有待执行的计划' 
      });
    }
    
    // 返回最近的一个计划
    const earliest = candidatePlans[0];
    
    console.log(`[EarliestPlan] 最早执行计划: ${earliest.plan_name}, 时间: ${earliest.nextExecutionTime.toLocaleString('zh-CN')}`);
    
    return NextResponse.json({
      success: true,
      plan: {
        id: earliest.id,
        planName: earliest.plan_name,
        frequency: earliest.frequency,
        scheduledTime: earliest.scheduled_time,
        scheduledDays: earliest.scheduled_days,
        nextExecutionTime: earliest.nextExecutionTime.toISOString(),
        nextRunAt: earliest.next_run_at,
      },
      totalPending: candidatePlans.length,
    });
  } catch (error) {
    console.error('[EarliestPlan] 查询异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
