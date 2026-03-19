/**
 * 发布任务执行API
 * POST: 执行单个发布任务
 * GET: 检查任务是否可自动发布
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  executePublishTask, 
  checkTaskAutoPublishable,
  getPlatformPublishCapabilities,
} from '@/lib/publish-executor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const [checkResult, capabilities] = await Promise.all([
      checkTaskAutoPublishable(id),
      Promise.resolve(getPlatformPublishCapabilities()),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        canAutoPublish: checkResult.canAutoPublish,
        platforms: checkResult.platforms,
        capabilities,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '检查失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const results = await executePublishTask(id);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    return NextResponse.json({
      success: successCount > 0,
      data: {
        taskId: id,
        totalPlatforms: results.length,
        successCount,
        failedCount,
        results,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '执行失败' },
      { status: 500 }
    );
  }
}
