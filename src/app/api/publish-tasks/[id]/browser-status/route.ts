import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * PUT /api/publish-tasks/[id]/browser-status
 * 更新发布任务的浏览器发布状态（由桌面端调用）
 * 
 * 兼容说明：由于扣子内置数据库不支持 ALTER TABLE，
 * 本接口使用现有字段存储状态
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const client = getSupabaseClient();
    
    // 构建更新数据 - 使用现有字段
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    // 浏览器发布状态直接更新整体状态
    if (body.browserStatus) {
      updateData.status = body.browserStatus;
    }
    if (body.browserProgress !== undefined) {
      updateData.progress = body.browserProgress;
    }
    if (body.browserStartedAt) {
      updateData.started_at = body.browserStartedAt;
    }
    if (body.browserCompletedAt) {
      updateData.completed_at = body.browserCompletedAt;
    }
    if (body.browserResults) {
      updateData.results = body.browserResults;
    }

    // 更新任务
    const { error } = await client
      .from('publish_tasks')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: '更新失败' 
      }, { status: 500 });
    }

    // ========== 同步写入 publish_records 表 ==========
    // 将发布结果记录到 publish_records 表，供"发布的文章"页面查询
    if (body.browserResults && Array.isArray(body.browserResults) && body.browserResults.length > 0) {
      console.log(`[BrowserStatus] 开始同步 ${body.browserResults.length} 条发布记录到 publish_records 表`);
      
      // 获取任务的 draft_id
      const { data: task, error: taskError } = await client
        .from('publish_tasks')
        .select('draft_id')
        .eq('id', id)
        .single();
      
      if (taskError) {
        console.error('[BrowserStatus] 查询任务失败:', taskError);
      } else if (task?.draft_id) {
        const draftId = task.draft_id;
        
        for (const result of body.browserResults) {
          try {
            console.log(`[BrowserStatus] 处理发布结果: platform=${result.platform}, status=${result.status}, accountId=${result.accountId}`);
            
            // 检查是否已存在相同的记录（避免重复）
            const { data: existingRecord, error: queryError } = await client
              .from('publish_records')
              .select('id')
              .eq('draft_id', draftId)
              .eq('account_id', result.accountId)
              .eq('platform', result.platform)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (queryError) {
              console.error(`[BrowserStatus] 查询现有记录失败:`, queryError);
            }
            
            const recordData = {
              status: result.status || 'failed',
              published_url: result.publishedUrl || null,
              published_at: result.publishedAt || new Date().toISOString(),
              error: result.error || null,
            };
            
            if (existingRecord) {
              // 更新现有记录
              const { error: updateRecordError } = await client
                .from('publish_records')
                .update(recordData)
                .eq('id', existingRecord.id);
              
              if (updateRecordError) {
                console.error(`[BrowserStatus] 更新发布记录失败:`, updateRecordError);
              } else {
                console.log(`[BrowserStatus] ✅ 更新发布记录成功: ${result.platform} - ${result.status}`);
              }
            } else {
              // 插入新记录
              const { error: insertError } = await client
                .from('publish_records')
                .insert({
                  draft_id: draftId,
                  account_id: result.accountId,
                  platform: result.platform,
                  ...recordData,
                });
              
              if (insertError) {
                console.error(`[BrowserStatus] 新增发布记录失败:`, insertError);
              } else {
                console.log(`[BrowserStatus] ✅ 新增发布记录成功: ${result.platform} - ${result.status}`);
              }
            }
          } catch (recordError: any) {
            console.error(`[BrowserStatus] 写入发布记录异常:`, result, recordError);
            // 不中断流程，继续处理其他记录
          }
        }
        
        console.log(`[BrowserStatus] publish_records 同步完成`);
        
        // ========== 同步更新草稿发布状态 ==========
        // 如果有任何平台发布成功，则更新草稿状态为已发布
        const hasSuccess = body.browserResults.some((r: any) => r.status === 'success');
        if (hasSuccess && task?.draft_id) {
          const { error: draftUpdateError } = await client
            .from('content_drafts')
            .update({ 
              status: 'published',
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', task.draft_id);
          
          if (draftUpdateError) {
            console.error(`[BrowserStatus] 更新草稿状态失败:`, draftUpdateError);
          } else {
            console.log(`[BrowserStatus] ✅ 草稿状态已更新为已发布: draftId=${task.draft_id}`);
          }
        }
      } else {
        console.warn(`[BrowserStatus] 任务缺少 draft_id，无法写入 publish_records`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新浏览器发布状态失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: '更新失败' 
    }, { status: 500 });
  }
}
