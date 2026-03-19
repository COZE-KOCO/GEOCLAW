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
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('获取公开内容失败:', error);
      return new NextResponse('获取内容失败', { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';

    // 静态页面
    const staticPages = [
      { loc: baseUrl, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/projects`, changefreq: 'daily', priority: '0.8' },
    ];

    // 动态内容页面
    const contentPages = (projects || []).map((project: any) => {
      const lastmod = new Date(project.updated_at).toISOString().split('T')[0];
      return `  <url>
    <loc>${baseUrl}/content/${project.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    }).join('\n');

    // 静态页面XML
    const staticPagesXml = staticPages.map(page => `  <url>
    <loc>${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPagesXml}
${contentPages}
</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error) {
    console.error('生成Sitemap失败:', error);
    return new NextResponse('生成Sitemap失败', { status: 500 });
  }
}
