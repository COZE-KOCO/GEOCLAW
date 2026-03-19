import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPublishRecords,
  getPublishRecordsByDraft,
  getPublishRecordsByAccount,
  getPublishRecordById,
  createPublishRecord,
  batchCreatePublishRecords,
  updatePublishRecord,
  markPublishSuccess,
  markPublishFailed,
  getPublishStats,
  type CreatePublishInput,
  type UpdatePublishInput,
} from '@/lib/publish-store';
import { MultiPlatformPublisher, platformConfigs, type Platform } from '@/lib/multi-platform';

const publisher = new MultiPlatformPublisher();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const draftId = searchParams.get('draftId');
  const accountId = searchParams.get('accountId');
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit');
  const stats = searchParams.get('stats');
  const title = searchParams.get('title');
  const content = searchParams.get('content');

  try {
    // 获取平台配置和推荐
    if (title && content) {
      const platforms = Object.entries(platformConfigs).map(([id, config]) => ({
        id,
        name: config.name,
        icon: config.icon,
        category: config.category,
        maxTitleLength: config.maxTitleLength,
        maxContentLength: config.maxContentLength,
        supportsImage: config.supportsImage,
        supportsVideo: config.supportsVideo,
      }));

      const { recommendPlatforms } = await import('@/lib/multi-platform');
      const recommendations = recommendPlatforms({ title, content });

      return NextResponse.json({
        success: true,
        data: {
          platforms,
          recommendations,
        },
      });
    }

    // 获取发布统计
    if (stats === 'true') {
      const statsData = await getPublishStats({
        accountId: accountId || undefined,
        draftId: draftId || undefined,
      });
      return NextResponse.json({ success: true, data: statsData });
    }

    // 获取单条发布记录
    if (id) {
      const record = await getPublishRecordById(id);
      return NextResponse.json({ success: !!record, data: record });
    }

    // 获取草稿的发布记录
    if (draftId) {
      const records = await getPublishRecordsByDraft(draftId);
      return NextResponse.json({ success: true, data: records });
    }

    // 获取账号的发布记录
    if (accountId) {
      const records = await getPublishRecordsByAccount(accountId, {
        limit: limit ? parseInt(limit) : undefined,
      });
      return NextResponse.json({ success: true, data: records });
    }

    // 获取所有发布记录
    const records = await getAllPublishRecords({
      platform: platform || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('获取发布历史失败:', error);
    return NextResponse.json(
      { success: false, error: '获取发布历史失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        const input: CreatePublishInput = {
          draftId: data.draftId,
          accountId: data.accountId,
          platform: data.platform,
        };
        const record = await createPublishRecord(input);
        return NextResponse.json({ success: true, data: record });
      }

      case 'createBatch': {
        const inputs: CreatePublishInput[] = data.records.map((r: any) => ({
          draftId: r.draftId,
          accountId: r.accountId,
          platform: r.platform,
        }));
        const records = await batchCreatePublishRecords(inputs);
        return NextResponse.json({ success: true, data: records });
      }

      case 'update': {
        const input: UpdatePublishInput = {
          status: data.status,
          publishedUrl: data.publishedUrl,
          publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
          error: data.error,
        };
        const record = await updatePublishRecord(data.id, input);
        return NextResponse.json({ success: !!record, data: record });
      }

      case 'markSuccess': {
        const record = await markPublishSuccess(data.id, data.publishedUrl);
        return NextResponse.json({ success: !!record, data: record });
      }

      case 'markFailed': {
        const record = await markPublishFailed(data.id, data.error);
        return NextResponse.json({ success: !!record, data: record });
      }

      case 'publish': {
        const { draftId, accountId, platform, title, content, tags, images } = data;

        const results = await publisher.publishToMultiplePlatforms(
          {
            title,
            content,
            tags,
            images,
          },
          [platform as Platform]
        );

        const result = results[0];

        if (result.status === 'success' && draftId && accountId) {
          await createPublishRecord({
            draftId,
            accountId,
            platform,
          });
        }

        return NextResponse.json({
          success: result.status === 'success',
          data: result,
        });
      }

      case 'batchPublish': {
        const { draftId, accounts, title, content, tags, images } = data;

        const platforms = accounts.map((a: any) => a.platform as Platform);

        const results = await publisher.publishToMultiplePlatforms(
          {
            title,
            content,
            tags,
            images,
          },
          platforms
        );

        // 批量创建发布记录
        if (draftId) {
          const publishInputs: CreatePublishInput[] = accounts.map((a: any) => ({
            draftId,
            accountId: a.id,
            platform: a.platform,
          }));
          await batchCreatePublishRecords(publishInputs);
        }

        return NextResponse.json({
          success: true,
          data: {
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            results,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('发布操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
