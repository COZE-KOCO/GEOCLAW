import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range') || '14d';
  const businessId = searchParams.get('businessId');
  const projectId = searchParams.get('projectId');

  try {
    const client = getSupabaseClient();

    const daysMap: Record<string, number> = {
      '7d': 7,
      '14d': 14,
      '30d': 30,
    };
    const days = daysMap[range] || 14;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let citationsQuery = client
      .from('geo_citations')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    let exposureQuery = client
      .from('geo_exposure')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    let conversionsQuery = client
      .from('geo_conversions')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // 优先按企业筛选
    if (businessId) {
      citationsQuery = citationsQuery.eq('business_id', businessId);
      exposureQuery = exposureQuery.eq('business_id', businessId);
      conversionsQuery = conversionsQuery.eq('business_id', businessId);
    } else if (projectId) {
      citationsQuery = citationsQuery.eq('project_id', projectId);
      exposureQuery = exposureQuery.eq('project_id', projectId);
      conversionsQuery = conversionsQuery.eq('project_id', projectId);
    }

    const [citationsResult, exposureResult, conversionsResult] = await Promise.all([
      citationsQuery,
      exposureQuery,
      conversionsQuery,
    ]);

    const citations = citationsResult.data || [];
    const exposure = exposureResult.data || [];
    const conversions = conversionsResult.data || [];

    const totalExposure = exposure.reduce((sum: number, e: any) => sum + (e.ai_displays || 0), 0);
    const avgPosition = citations.length > 0
      ? citations.reduce((sum: number, c: any) => sum + (c.position || 0), 0) / citations.length
      : 0;
    const totalVisits = conversions.reduce((sum: number, c: any) => sum + (c.visits || 0), 0);
    const totalConversions = conversions.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);
    const conversionRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;

    const platformCount: Record<string, number> = {};
    citations.forEach((c: any) => {
      const platform = c.platform || '未知';
      platformCount[platform] = (platformCount[platform] || 0) + 1;
    });

    const queryCount: Record<string, number> = {};
    citations.forEach((c: any) => {
      const query = c.query || '未知';
      queryCount[query] = (queryCount[query] || 0) + 1;
    });

    const topQueries = Object.entries(queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return NextResponse.json({
      success: true,
      data: {
        citations: citations.map((c: any) => ({
          id: c.id,
          businessId: c.business_id,
          projectId: c.project_id,
          source: c.platform,
          query: c.query,
          position: c.position,
          timestamp: c.created_at,
          platform: c.platform,
        })),
        exposure: exposure.map((e: any) => ({
          id: e.id,
          businessId: e.business_id,
          projectId: e.project_id,
          date: new Date(e.date).toLocaleDateString('zh-CN'),
          impressions: e.impressions || 0,
          ai_displays: e.ai_displays || 0,
          click_rate: e.click_rate || 0,
        })),
        conversions: conversions.map((c: any) => ({
          id: c.id,
          businessId: c.business_id,
          projectId: c.project_id,
          date: new Date(c.date).toLocaleDateString('zh-CN'),
          visits: c.visits || 0,
          conversions: c.conversions || 0,
          rate: c.visits > 0 ? (c.conversions / c.visits) * 100 : 0,
        })),
        summary: {
          totalCitations: citations.length,
          totalExposure,
          avgPosition: parseFloat(avgPosition.toFixed(1)),
          conversionRate: parseFloat(conversionRate.toFixed(1)),
        },
        platformCount,
        topQueries,
      },
    });
  } catch (error) {
    console.error('获取监测数据失败:', error);
    return NextResponse.json({
      success: true,
      data: {
        citations: [],
        exposure: [],
        conversions: [],
        summary: {
          totalCitations: 0,
          totalExposure: 0,
          avgPosition: 0,
          conversionRate: 0,
        },
        platformCount: {},
        topQueries: [],
      },
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, data, businessId, projectId } = body;

  try {
    const client = getSupabaseClient();

    switch (action) {
      case 'recordCitation': {
        if (!businessId) {
          return NextResponse.json(
            { success: false, error: '请指定所属企业' },
            { status: 400 }
          );
        }
        const { data: record, error } = await client
          .from('geo_citations')
          .insert({
            business_id: businessId,
            project_id: projectId,
            platform: data.platform,
            query: data.query,
            position: data.position,
            cited: data.cited,
            sentiment: data.sentiment,
            date: data.date,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: record });
      }

      case 'recordExposure': {
        if (!businessId) {
          return NextResponse.json(
            { success: false, error: '请指定所属企业' },
            { status: 400 }
          );
        }
        const { data: record, error } = await client
          .from('geo_exposure')
          .insert({
            business_id: businessId,
            project_id: projectId,
            date: data.date,
            platform: data.platform,
            impressions: data.impressions,
            reach: data.reach,
            ai_displays: data.ai_displays,
            click_rate: data.click_rate,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: record });
      }

      case 'recordConversion': {
        if (!businessId) {
          return NextResponse.json(
            { success: false, error: '请指定所属企业' },
            { status: 400 }
          );
        }
        const { data: record, error } = await client
          .from('geo_conversions')
          .insert({
            business_id: businessId,
            project_id: projectId,
            date: data.date,
            platform: data.platform,
            visits: data.visits,
            clicks: data.clicks,
            leads: data.leads,
            conversions: data.conversions,
            revenue: data.revenue,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: record });
      }

      default:
        return NextResponse.json({ success: false, error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('记录监测数据失败:', error);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}
