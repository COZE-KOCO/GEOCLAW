/**
 * 批量执行发布任务API
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchExecutePublishTasks } from '@/lib/publish-executor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskIds } = body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要执行的任务ID列表' },
        { status: 400 }
      );
    }
    
    const results = await batchExecutePublishTasks(taskIds);
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failedCount,
        results,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '批量执行失败' },
      { status: 500 }
    );
  }
}
