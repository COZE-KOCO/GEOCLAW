/**
 * 发布任务执行 API
 * 
 * POST - 通过 API 方式发布内容（用于支持 API 发布的平台）
 * 供桌面端调度器调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/publish-tasks/[id]/publish
 * 执行发布任务
 * 
 * Body:
 * - platform: 目标平台
 * - accountId: 账号ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { platform, accountId } = body;
    
    const client = getSupabaseClient();
    
    // 获取任务详情
    const { data: task, error: taskError } = await client
      .from('publish_tasks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }
    
    // 获取账号信息
    const { data: account, error: accountError } = await client
      .from('matrix_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    
    // 根据平台调用对应的 API 发布逻辑
    // 目前大多数平台不支持 API 发布，返回 pending 状态
    // 未来可以添加支持 API 发布的平台（如微信公众号等）
    
    const supportedApiPlatforms = ['wechat']; // 支持 API 发布的平台列表
    
    if (!supportedApiPlatforms.includes(platform)) {
      return NextResponse.json({
        success: false,
        result: {
          platform,
          accountId,
          accountName: account.display_name,
          status: 'failed',
          error: '该平台不支持 API 发布，请使用自动发布功能',
        },
      });
    }
    
    // TODO: 实现具体平台的 API 发布逻辑
    // 例如微信公众号可以通过 API 发布文章
    
    // 更新任务状态
    await client
      .from('publish_tasks')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    
    // 模拟发布过程
    // 实际实现需要调用各平台的 API
    
    return NextResponse.json({
      success: false,
      result: {
        platform,
        accountId,
        accountName: account.display_name,
        status: 'failed',
        error: 'API 发布功能尚未实现',
      },
    });
  } catch (error) {
    console.error('发布任务执行异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
