/**
 * 创作计划 API
 * 
 * GET  - 获取创作计划列表
 * POST - 创建创作计划
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  type CreationPlan,
  type CreateCreationPlanInput,
  type PlanStatus,
  type PlanFrequency,
} from '@/lib/creation-plan-store';
import { 
  type GenerationConfig, 
  defaultGenerationConfig,
  validateGenerationConfig,
} from '@/lib/types/generation-config';

// 数据库记录转前端类型
function dbToPlan(record: any): CreationPlan {
  return {
    id: record.id,
    businessId: record.business_id,
    planName: record.plan_name,
    status: record.status as PlanStatus,
    frequency: record.frequency as PlanFrequency,
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

// 前端类型转数据库记录
function planToDb(input: CreateCreationPlanInput): any {
  return {
    business_id: input.businessId,
    plan_name: input.planName,
    status: 'active',
    frequency: input.frequency || 'daily',
    articles_per_run: input.articlesPerRun || 1,
    scheduled_time: input.scheduledTime || '09:00',
    scheduled_days: input.scheduledDays || [1, 2, 3, 4, 5],
    scheduled_dates: input.scheduledDates || [],
    content_config: input.contentConfig,
    publish_config: input.publishConfig,
    total_created: 0,
    total_published: 0,
    success_rate: '0',
    start_date: input.startDate || new Date().toISOString(),
    end_date: input.endDate,
    last_keyword_index: input.lastKeywordIndex || 0,
  };
}

/**
 * GET /api/creation-plans
 * 获取创作计划列表
 * 
 * Query params:
 * - businessId: 商家ID
 * - status: 状态过滤
 * - id: 获取单个计划
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const status = searchParams.get('status');
    const id = searchParams.get('id');
    
    const supabase = getSupabaseClient();
    
    // 获取单个计划
    if (id) {
      const { data, error } = await supabase
        .from('creation_plans')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return NextResponse.json(
          { success: false, error: '计划不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        data: dbToPlan(data) 
      });
    }
    
    // 获取计划列表
    let query = supabase
      .from('creation_plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (businessId) {
      query = query.eq('business_id', businessId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取创作计划失败:', error);
      return NextResponse.json(
        { success: false, error: '获取创作计划失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: (data || []).map(dbToPlan) 
    });
  } catch (error) {
    console.error('获取创作计划异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/creation-plans
 * 创建创作计划
 * 
 * Body: CreateCreationPlanInput
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[CreationPlans] 创建计划请求:', {
      businessId: body.businessId,
      planName: body.planName,
      frequency: body.frequency,
    });
    
    // 验证必填字段
    if (!body.businessId) {
      console.error('[CreationPlans] 缺少商家ID');
      return NextResponse.json(
        { success: false, error: '缺少商家ID' },
        { status: 400 }
      );
    }
    
    if (!body.planName) {
      console.error('[CreationPlans] 缺少计划名称');
      return NextResponse.json(
        { success: false, error: '缺少计划名称' },
        { status: 400 }
      );
    }
    
    // 验证内容配置
    const contentConfig: GenerationConfig = {
      ...defaultGenerationConfig,
      ...body.contentConfig,
    };
    
    const validation = validateGenerationConfig(contentConfig);
    if (!validation.valid) {
      console.error('[CreationPlans] 配置验证失败:', validation.errors);
      return NextResponse.json(
        { success: false, error: validation.errors.join('; ') },
        { status: 400 }
      );
    }
    
    // 构建输入
    const input: CreateCreationPlanInput = {
      businessId: body.businessId,
      planName: body.planName,
      frequency: body.frequency,
      articlesPerRun: body.articlesPerRun,
      scheduledTime: body.scheduledTime,
      scheduledDays: body.scheduledDays,
      scheduledDates: body.scheduledDates,
      contentConfig,
      publishConfig: body.publishConfig || {
        autoPublish: false,
        publishDelay: 5,
        targetPlatforms: [],
        publishStrategy: 'immediate',
        publishTimeSlots: [],
      },
      startDate: body.startDate,
      endDate: body.endDate,
    };
    
    const supabase = getSupabaseClient();
    const dbRecord = planToDb(input);
    console.log('[CreationPlans] 准备插入数据库:', {
      business_id: dbRecord.business_id,
      plan_name: dbRecord.plan_name,
    });
    
    // 插入数据库
    let insertResult = await supabase
      .from('creation_plans')
      .insert(dbRecord)
      .select()
      .single();
    
    let data = insertResult.data;
    let error = insertResult.error;
    
    // 如果插入失败，尝试不带 last_keyword_index 字段重试
    // 这是为了兼容数据库中没有该字段的情况
    if (error) {
      console.error('[CreationPlans] 首次插入失败:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      const { last_keyword_index, ...dbRecordWithoutKeywordIndex } = dbRecord;
      console.log('[CreationPlans] 尝试不带 last_keyword_index 重试...');
      
      const retryResult = await supabase
        .from('creation_plans')
        .insert(dbRecordWithoutKeywordIndex)
        .select()
        .single();
      
      if (!retryResult.error) {
        data = retryResult.data;
        error = null;
        console.log('[CreationPlans] 重试成功，已跳过 last_keyword_index 字段');
      } else {
        console.error('[CreationPlans] 重试也失败:', {
          message: retryResult.error.message,
          code: retryResult.error.code,
          details: retryResult.error.details,
          hint: retryResult.error.hint,
        });
      }
    }
    
    if (error) {
      console.error('[CreationPlans] 创建计划最终失败:', error);
      return NextResponse.json(
        { success: false, error: `创建失败: ${error.message || '数据库错误'}` },
        { status: 500 }
      );
    }
    
    console.log('[CreationPlans] 计划创建成功:', data?.id);
    
    return NextResponse.json({ 
      success: true, 
      data: dbToPlan(data) 
    });
  } catch (error) {
    console.error('[CreationPlans] 创建计划异常:', error);
    return NextResponse.json(
      { success: false, error: `服务器错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/creation-plans
 * 更新创作计划
 * 
 * Body: { id: string, ...updates }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少计划ID' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // 构建更新对象
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (updates.planName) dbUpdates.plan_name = updates.planName;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.frequency) dbUpdates.frequency = updates.frequency;
    if (updates.articlesPerRun !== undefined) dbUpdates.articles_per_run = updates.articlesPerRun;
    if (updates.scheduledTime) dbUpdates.scheduled_time = updates.scheduledTime;
    if (updates.scheduledDays) dbUpdates.scheduled_days = updates.scheduledDays;
    if (updates.scheduledDates) dbUpdates.scheduled_dates = updates.scheduledDates;
    if (updates.contentConfig) dbUpdates.content_config = updates.contentConfig;
    if (updates.publishConfig) dbUpdates.publish_config = updates.publishConfig;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
    if (updates.lastKeywordIndex !== undefined) dbUpdates.last_keyword_index = updates.lastKeywordIndex;
    
    let updateResult = await supabase
      .from('creation_plans')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    let data = updateResult.data;
    let error = updateResult.error;
    
    // 如果更新失败且包含 last_keyword_index，尝试不带该字段重试
    // 这是为了兼容数据库中没有该字段的情况
    if (error && 'last_keyword_index' in dbUpdates) {
      const { last_keyword_index, ...dbUpdatesWithoutKeywordIndex } = dbUpdates;
      const retryResult = await supabase
        .from('creation_plans')
        .update(dbUpdatesWithoutKeywordIndex)
        .eq('id', id)
        .select()
        .single();
      
      if (!retryResult.error) {
        data = retryResult.data;
        error = null;
        console.warn('last_keyword_index 字段不存在，已跳过该字段的更新');
      }
    }
    
    if (error) {
      console.error('更新创作计划失败:', error);
      return NextResponse.json(
        { success: false, error: '更新创作计划失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: dbToPlan(data) 
    });
  } catch (error) {
    console.error('更新创作计划异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/creation-plans
 * 删除创作计划
 * 
 * Query params:
 * - id: 计划ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少计划ID' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseClient();
    
    // 先删除关联的创作任务
    await supabase
      .from('creation_tasks')
      .delete()
      .eq('plan_id', id);
    
    // 再删除计划
    const { error } = await supabase
      .from('creation_plans')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('删除创作计划失败:', error);
      return NextResponse.json(
        { success: false, error: '删除创作计划失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除创作计划异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
