import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    // 获取所有已公开的内容
    const { data: projects, error } = await supabase
      .from('geo_projects')
      .select('*')
      .eq('is_public', true)
      .order('published_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('获取公开内容失败:', error);
      return new NextResponse('获取内容失败', { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
    const siteName = 'GEO优化平台';
    const siteDescription = '基于GEO优化理论的智能内容优化工具，提供高质量、易于AI引擎引用的内容';

    // 生成RSS XML
    const rssItems = (projects || []).map((project: any) => {
      const pubDate = new Date(project.published_at || project.created_at).toUTCString();
      const contentPreview = project.content.substring(0, 500);
      
      return `
    <item>
      <title><![CDATA[${project.title}]]></title>
      <link>${baseUrl}/content/${project.id}</link>
      <guid isPermaLink="true">${baseUrl}/content/${project.id}</guid>
      <description><![CDATA[${contentPreview}...]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${project.author || 'GEO优化平台'}</author>
      ${(project.keywords || []).map((keyword: string) => `<category>${keyword}</category>`).join('\n      ')}
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${baseUrl}</link>
    <description>${siteDescription}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error) {
    console.error('生成RSS失败:', error);
    return new NextResponse('生成RSS失败', { status: 500 });
  }
}
