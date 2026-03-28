/**
 * 发布记录 API
 * GET /api/publish-records - 查询发布记录列表
 * 注意：用户只能查询自己所属企业的发布记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getCurrentUser, validateBusinessOwnership } from '@/lib/user-auth';

interface PublishRecord {
  id: string;
  draft_id: string;
  account_id: string;
  platform: string;
  status: string;
  published_url: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
}

interface PublishRecordResponse {
  id: string;
  // 文章信息
  articleTitle: string;
  articleContent: string;
  // 平台信息
  platform: string;
  platformName: string;
  accountName: string;
  // 发布状态
  status: string;
  statusText: string;
  // 发布结果
  publishedUrl: string | null;
  publishedAt: string | null;
  error: string | null;
  // 时间
  createdAt: string;
}

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  toutiao: '今日头条',
  xiaohongshu: '小红书',
  weibo: '微博',
  douyin: '抖音',
  zhihu: '知乎',
  bilibili: 'B站',
  wechat: '微信公众号',
  baijiahao: '百家号',
  sohu: '搜狐号',
  netease: '网易号',
  ifeng: '凤凰号',
  qq: '企鹅号',
  csdn: 'CSDN',
  juejin: '掘金',
  segmentfault: 'SegmentFault',
  cnblogs: '博客园',
  oschina: '开源中国',
  toutiaohao: '头条号',
  quickso: '快传号',
  yidian: '一点资讯',
};

// 状态映射
const STATUS_MAP: Record<string, string> = {
  pending: '待发布',
  publishing: '发布中',
  success: '成功',
  failed: '失败',
  timeout: '超时',
  cancelled: '已取消',
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // 支持前端传递 businessId 参数，验证用户所有权
    const paramBusinessId = searchParams.get('businessId');
    let businessId: string;
    
    if (paramBusinessId) {
      // 验证用户是否有权访问该企业
      const hasAccess = await validateBusinessOwnership(user.id, paramBusinessId);
      if (!hasAccess) {
        return NextResponse.json({ error: '您没有权限访问该商家的数据' }, { status: 403 });
      }
      businessId = paramBusinessId;
    } else {
      // 没有传递 businessId，使用用户自己的 businessId
      if (!user.businessId) {
        return NextResponse.json({
          data: [],
          total: 0,
          page: 1,
          pageSize: 20,
        });
      }
      businessId = user.businessId;
    }
    
    const keyword = searchParams.get('keyword'); // 按文章标题筛选
    const platform = searchParams.get('platform'); // 按平台筛选
    const accountId = searchParams.get('accountId'); // 按账号筛选
    const planId = searchParams.get('planId'); // 按发布策略筛选
    const status = searchParams.get('status'); // 按状态筛选
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    
    // 获取该用户企业下的 draft IDs
    const { data: businessDrafts } = await supabase
      .from('content_drafts')
      .select('id')
      .eq('business_id', businessId);
    
    const businessDraftIds = new Set((businessDrafts || []).map(d => d.id));
    
    // 构建查询
    let query = supabase
      .from('publish_records')
      .select(`
        id,
        draft_id,
        account_id,
        platform,
        status,
        published_url,
        published_at,
        error,
        created_at
      `, { count: 'exact' });
    
    // 按 businessId 筛选（通过 draft 关联）
    if (businessDraftIds.size > 0) {
      query = query.in('draft_id', Array.from(businessDraftIds));
    } else {
      // 如果没有草稿，返回空结果
      return NextResponse.json({
        records: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
      });
    }
    
    // 按状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // 按平台筛选
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }
    
    // 按账号筛选
    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    // 排序和分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    const { data: records, error: recordsError, count } = await query;
    
    if (recordsError) {
      console.error('查询发布记录失败:', recordsError);
      return NextResponse.json({ error: '查询发布记录失败' }, { status: 500 });
    }
    
    if (!records || records.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        pageSize,
      });
    }
    
    // 获取关联的草稿信息
    const draftIds = [...new Set(records.map(r => r.draft_id))];
    const { data: drafts } = await supabase
      .from('content_drafts')
      .select('id, title, content')
      .in('id', draftIds);
    
    const draftMap = new Map((drafts || []).map(d => [d.id, d]));
    
    // 获取关联的账号信息
    const accountIds = [...new Set(records.map(r => r.account_id))];
    const { data: accounts } = await supabase
      .from('matrix_accounts')
      .select('id, display_name, platform')
      .in('id', accountIds);
    
    const accountMap = new Map((accounts || []).map(a => [a.id, a]));
    
    // 组装响应数据
    let response: PublishRecordResponse[] = records.map((record: PublishRecord) => {
      const draft = draftMap.get(record.draft_id);
      const account = accountMap.get(record.account_id);
      
      return {
        id: record.id,
        articleTitle: draft?.title || '未知文章',
        articleContent: draft?.content?.substring(0, 200) || '',
        platform: record.platform,
        platformName: PLATFORM_NAMES[record.platform] || record.platform,
        accountName: account?.display_name || '未知账号',
        status: record.status,
        statusText: STATUS_MAP[record.status] || record.status,
        publishedUrl: record.published_url,
        publishedAt: record.published_at,
        error: record.error,
        createdAt: record.created_at,
      };
    });
    
    // 如果有关键词筛选，在这里过滤
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      response = response.filter(r => 
        r.articleTitle.toLowerCase().includes(lowerKeyword)
      );
    }
    
    return NextResponse.json({
      data: response,
      total: count || response.length,
      page,
      pageSize,
    });
    
  } catch (error) {
    console.error('查询发布记录异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
