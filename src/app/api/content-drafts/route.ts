/**
 * 同步草稿发布状态 API
 * 用于修复历史数据：将已成功发布的草稿状态更新为 published
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser } from '@/lib/user-auth';

/**
 * POST /api/content-drafts/sync-published-status
 * 同步草稿的发布状态
 * 
 * 逻辑：
 * 1. 查询所有 status != 'published' 的草稿
 * 2. 检查是否有对应的 publish_records 且 status = 'success'
 * 3. 如果有，更新草稿状态为 'published'
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json({ error: '缺少 businessId 参数' }, { status: 400 });
    }

    console.log(`[SyncPublishedStatus] 开始同步商家 ${businessId} 的草稿发布状态...`);

    // 1. 获取该商家所有未标记为已发布的草稿
    const { data: drafts, error: draftsError } = await supabase
      .from('content_drafts')
      .select('id, title, status')
      .eq('business_id', businessId)
      .neq('status', 'published');

    if (draftsError) {
      console.error('[SyncPublishedStatus] 查询草稿失败:', draftsError);
      return NextResponse.json({ error: '查询草稿失败' }, { status: 500 });
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '没有需要同步的草稿',
        updated: 0 
      });
    }

    console.log(`[SyncPublishedStatus] 找到 ${drafts.length} 个未标记为已发布的草稿`);

    // 2. 获取这些草稿对应的发布记录
    const draftIds = drafts.map(d => d.id);
    const { data: publishRecords, error: recordsError } = await supabase
      .from('publish_records')
      .select('draft_id, status')
      .in('draft_id', draftIds)
      .eq('status', 'success');

    if (recordsError) {
      console.error('[SyncPublishedStatus] 查询发布记录失败:', recordsError);
      return NextResponse.json({ error: '查询发布记录失败' }, { status: 500 });
    }

    if (!publishRecords || publishRecords.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '没有已成功发布的草稿需要更新',
        updated: 0 
      });
    }

    // 3. 找出需要更新的草稿 ID（有成功发布记录但状态未更新）
    const successfulDraftIds = [...new Set(publishRecords.map(r => r.draft_id))];
    
    console.log(`[SyncPublishedStatus] 找到 ${successfulDraftIds.length} 个已成功发布但状态未更新的草稿`);

    if (successfulDraftIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: '没有需要更新的草稿',
        updated: 0 
      });
    }

    // 4. 批量更新草稿状态
    const { error: updateError } = await supabase
      .from('content_drafts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', successfulDraftIds);

    if (updateError) {
      console.error('[SyncPublishedStatus] 更新草稿状态失败:', updateError);
      return NextResponse.json({ error: '更新草稿状态失败' }, { status: 500 });
    }

    console.log(`[SyncPublishedStatus] ✅ 成功更新 ${successfulDraftIds.length} 个草稿的发布状态`);

    return NextResponse.json({
      success: true,
      message: `成功同步 ${successfulDraftIds.length} 个草稿的发布状态`,
      updated: successfulDraftIds.length,
      draftIds: successfulDraftIds,
    });
  } catch (error) {
    console.error('[SyncPublishedStatus] 同步失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
