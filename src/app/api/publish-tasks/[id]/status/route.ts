/**
 * 发布任务状态更新 API
 * 
 * PUT - 更新任务状态和结果
 * 供桌面端调度器调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 写入结果追踪
interface WriteResult {
  platform: string;
  success: boolean;
  error?: string;
}

/**
 * PUT /api/publish-tasks/[id]/status
 * 更新发布任务状态
 * 
 * Body:
 * - status: 任务状态 (running | completed | failed | cancelled)
 * - results: 发布结果数组
 * - error: 错误信息（可选）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const { status, results, error } = body;
    
    console.log(`[PublishTaskStatus] 收到状态更新请求: taskId=${id}, status=${status}, results=${JSON.stringify(results)}`);
    
    const client = getSupabaseClient();
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (status) {
      updateData.status = status;
      
      // 根据状态设置时间戳
      if (status === 'running') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    
    if (results) {
      updateData.results = results;
      
      // 统计成功/失败数量
      const successCount = results.filter((r: any) => r.status === 'success').length;
      const failCount = results.filter((r: any) => r.status === 'failed').length;
      
      if (successCount > 0) {
        updateData.published_platforms = successCount;
      }
      if (failCount > 0) {
        updateData.failed_platforms = failCount;
      }
    }
    
    if (error) {
      updateData.error = error;
    }
    
    const { data: task, error: updateError } = await client
      .from('publish_tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[PublishTaskStatus] 更新任务状态失败:', updateError);
      return NextResponse.json(
        { success: false, error: '更新任务状态失败' },
        { status: 500 }
      );
    }
    
    console.log(`[PublishTaskStatus] 任务状态更新成功: taskId=${id}, task=${JSON.stringify(task)}`);
    
    // ========== 同步写入 publish_records 表 ==========
    // 将发布结果记录到 publish_records 表，供"发布的文章"页面查询
    const writeResults: WriteResult[] = [];
    
    if (results && Array.isArray(results) && task) {
      const draftId = task.draft_id;
      
      if (draftId) {
        console.log(`[PublishTaskStatus] 开始同步 ${results.length} 条发布记录到 publish_records 表, draftId=${draftId}`);
        
        for (const result of results) {
          try {
            console.log(`[PublishTaskStatus] 处理发布结果: platform=${result.platform}, status=${result.status}, accountId=${result.accountId}, publishedUrl=${result.publishedUrl}, error=${result.error}`);
            
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
              console.error(`[PublishTaskStatus] 查询现有记录失败:`, queryError);
            }
            
            const recordData = {
              status: result.status || 'failed',
              published_url: result.publishedUrl || null,
              published_at: result.publishedAt || new Date().toISOString(),
              error: result.error || null,
            };
            
            console.log(`[PublishTaskStatus] 准备写入数据: existingRecord=${!!existingRecord}, data=${JSON.stringify(recordData)}`);
            
            if (existingRecord) {
              // 更新现有记录
              const { error: updateRecordError } = await client
                .from('publish_records')
                .update(recordData)
                .eq('id', existingRecord.id);
              
              if (updateRecordError) {
                console.error(`[PublishTaskStatus] 更新发布记录失败:`, updateRecordError);
                writeResults.push({ platform: result.platform, success: false, error: updateRecordError.message });
              } else {
                console.log(`[PublishTaskStatus] ✅ 更新发布记录成功: ${result.platform} - ${result.status}`);
                writeResults.push({ platform: result.platform, success: true });
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
                console.error(`[PublishTaskStatus] 新增发布记录失败:`, insertError);
                writeResults.push({ platform: result.platform, success: false, error: insertError.message });
              } else {
                console.log(`[PublishTaskStatus] ✅ 新增发布记录成功: ${result.platform} - ${result.status}`);
                writeResults.push({ platform: result.platform, success: true });
              }
            }
          } catch (recordError: any) {
            console.error(`[PublishTaskStatus] 写入发布记录异常:`, result, recordError);
            writeResults.push({ platform: result.platform, success: false, error: recordError.message });
            // 不中断流程，继续处理其他记录
          }
        }
        
        console.log(`[PublishTaskStatus] publish_records 写入结果汇总: ${JSON.stringify(writeResults)}`);
        
        // ========== 同步更新草稿发布状态 ==========
        // 如果有任何平台发布成功，则更新草稿状态为已发布
        const hasSuccess = writeResults.some(r => r.success);
        if (hasSuccess) {
          const { error: draftUpdateError } = await client
            .from('content_drafts')
            .update({ 
              status: 'published',
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', draftId);
          
          if (draftUpdateError) {
            console.error(`[PublishTaskStatus] 更新草稿状态失败:`, draftUpdateError);
          } else {
            console.log(`[PublishTaskStatus] ✅ 草稿状态已更新为已发布: draftId=${draftId}`);
          }
        }
      } else {
        console.warn(`[PublishTaskStatus] 任务缺少 draft_id，无法写入 publish_records`);
      }
    } else {
      console.log(`[PublishTaskStatus] 跳过 publish_records 写入: results=${!!results}, isArray=${Array.isArray(results)}, task=${!!task}`);
    }
    
    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        results: task.results,
        updatedAt: task.updated_at,
      },
      publishRecordsWrite: writeResults,
    });
  } catch (error) {
    console.error('更新任务状态异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
