import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/geo-tasks - 创建分析任务
 * 
 * 创建后台分析任务，任务会在后台异步执行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      analysisType, 
      inputText, 
      competitors = [], 
      targetBrand, 
      industry,
      selectedPlatforms, 
      selectedQuestions 
    } = body;

    // 验证必填字段
    if (!analysisType || !inputText || !selectedPlatforms?.length || !selectedQuestions?.length) {
      return NextResponse.json(
        { success: false, error: '缺少必填参数' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 创建分析任务
    const { data: task, error } = await supabase
      .from('geo_analysis_tasks')
      .insert({
        analysis_type: analysisType,
        input_text: inputText,
        competitors,
        target_brand: targetBrand,
        industry,
        selected_platforms: selectedPlatforms,
        selected_questions: selectedQuestions,
        status: 'pending',
        progress: 0,
        total_questions: selectedQuestions.length,
        completed_questions: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('创建任务失败:', error);
      return NextResponse.json(
        { success: false, error: `创建任务失败: ${error.message}` },
        { status: 500 }
      );
    }

    // 触发后台分析
    triggerBackgroundAnalysis(task.id);

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        message: '任务已创建，正在后台执行分析',
      },
    });

  } catch (error) {
    console.error('创建分析任务失败:', error);
    return NextResponse.json(
      { success: false, error: '创建任务失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geo-tasks - 获取任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    let query = supabase
      .from('geo_analysis_tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('获取任务列表失败:', error);
      return NextResponse.json(
        { success: false, error: `获取任务列表失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks: tasks || [],
        total: count || 0,
      },
    });

  } catch (error) {
    console.error('获取任务列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 触发后台分析
 */
async function triggerBackgroundAnalysis(taskId: string) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:5000';
  
  fetch(`${baseUrl}/api/geo-tasks/${taskId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(err => {
    console.error('触发后台分析失败:', err);
  });
}
