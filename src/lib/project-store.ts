/**
 * 项目数据存储服务
 * 使用Supabase数据库存储
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import type { GEOProject, MonitoringData, TimeSeriesData, CitationRecord, ExposureRecord, ConversionRecord, AIPlatform } from './types';

/**
 * 获取所有项目
 */
export async function getAllProjects(): Promise<GEOProject[]> {
  const client = getSupabaseClient();
  
  const { data: projects, error } = await client
    .from('geo_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取项目列表失败:', error);
    return [];
  }

  // 为每个项目获取监测数据摘要
  const projectsWithMonitoring = await Promise.all(
    projects.map(async (project: any) => {
      const monitoring = await getProjectMonitoring(project.id);
      return transformProject(project, monitoring);
    })
  );

  return projectsWithMonitoring;
}

/**
 * 根据ID获取项目
 */
export async function getProjectById(id: string): Promise<GEOProject | undefined> {
  const client = getSupabaseClient();
  
  const { data: project, error } = await client
    .from('geo_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !project) {
    console.error('获取项目详情失败:', error);
    return undefined;
  }

  const monitoring = await getProjectMonitoring(id);
  return transformProject(project, monitoring);
}

/**
 * 创建新项目
 */
export async function createProject(
  data: Omit<GEOProject, 'id' | 'createdAt' | 'updatedAt' | 'monitoring'>
): Promise<GEOProject> {
  const client = getSupabaseClient();
  
  const { data: project, error } = await client
    .from('geo_projects')
    .insert({
      title: data.title,
      content: data.content,
      author: data.author,
      keywords: data.keywords,
      references: data.references,
      score: data.score,
      grade: data.grade,
      breakdown: data.breakdown,
      status: data.status,
    })
    .select()
    .single();

  if (error) {
    console.error('创建项目失败:', error);
    throw error;
  }

  return transformProject(project, {
    aiCitations: [],
    exposure: [],
    conversions: [],
    summary: {
      totalCitations: 0,
      totalExposure: 0,
      totalConversions: 0,
      avgCitationRate: 0,
      platforms: []
    }
  });
}

/**
 * 更新项目
 */
export async function updateProject(
  id: string, 
  data: Partial<GEOProject>
): Promise<GEOProject | undefined> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.author !== undefined) updateData.author = data.author;
  if (data.keywords !== undefined) updateData.keywords = data.keywords;
  if (data.references !== undefined) updateData.references = data.references;
  if (data.score !== undefined) updateData.score = data.score;
  if (data.grade !== undefined) updateData.grade = data.grade;
  if (data.breakdown !== undefined) updateData.breakdown = data.breakdown;
  if (data.status !== undefined) updateData.status = data.status;

  const { data: project, error } = await client
    .from('geo_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新项目失败:', error);
    return undefined;
  }

  const monitoring = await getProjectMonitoring(id);
  return transformProject(project, monitoring);
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 先删除关联的监测数据
  await client.from('geo_citations').delete().eq('project_id', id);
  await client.from('geo_exposure').delete().eq('project_id', id);
  await client.from('geo_conversions').delete().eq('project_id', id);
  
  // 再删除项目
  const { error } = await client
    .from('geo_projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除项目失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取项目的监测数据
 */
async function getProjectMonitoring(projectId: string): Promise<MonitoringData> {
  const client = getSupabaseClient();
  
  // 获取引用数据
  const { data: citations } = await client
    .from('geo_citations')
    .select('*')
    .eq('project_id', projectId);

  // 获取曝光数据
  const { data: exposures } = await client
    .from('geo_exposure')
    .select('*')
    .eq('project_id', projectId);

  // 获取转化数据
  const { data: conversions } = await client
    .from('geo_conversions')
    .select('*')
    .eq('project_id', projectId);

  // 转换数据格式
  const aiCitations: CitationRecord[] = (citations || []).map((c: any) => ({
    date: c.date,
    platform: c.platform as AIPlatform,
    query: c.query,
    position: c.position,
    cited: c.cited,
    sentiment: c.sentiment as 'positive' | 'neutral' | 'negative'
  }));

  const exposure: ExposureRecord[] = (exposures || []).map((e: any) => ({
    date: e.date,
    platform: e.platform as AIPlatform,
    impressions: e.impressions,
    reach: e.reach
  }));

  const conversionData: ConversionRecord[] = (conversions || []).map((c: any) => ({
    date: c.date,
    source: c.platform as AIPlatform,
    clicks: c.clicks,
    leads: c.leads,
    conversions: c.conversions
  }));

  // 计算统计数据
  const totalCitations = aiCitations.filter(c => c.cited).length;
  const totalExposure = exposure.reduce((sum, e) => sum + e.impressions, 0);
  const totalConversions = conversionData.reduce((sum, c) => sum + c.conversions, 0);
  const avgCitationRate = aiCitations.length > 0 
    ? (aiCitations.filter(c => c.cited).length / aiCitations.length) * 100 
    : 0;

  // 按平台统计
  const platforms = ['ChatGPT', 'DeepSeek', '豆包', 'Claude', 'Gemini', 'Perplexity', 'Kimi', '文心一言', '其他'] as AIPlatform[];
  const platformStats = platforms.map(platform => {
    const platformCitations = aiCitations.filter(c => c.platform === platform && c.cited).length;
    const platformExposure = exposure
      .filter(e => e.platform === platform)
      .reduce((sum, e) => sum + e.impressions, 0);
    const platformConversions = conversionData
      .filter(c => c.source === platform)
      .reduce((sum, c) => sum + c.conversions, 0);
    const platformClicks = conversionData
      .filter(c => c.source === platform)
      .reduce((sum, c) => sum + c.clicks, 0);

    return {
      platform,
      citations: platformCitations,
      exposure: platformExposure,
      conversionRate: platformClicks > 0 ? (platformConversions / platformClicks) * 100 : 0
    };
  });

  return {
    aiCitations,
    exposure,
    conversions: conversionData,
    summary: {
      totalCitations,
      totalExposure,
      totalConversions,
      avgCitationRate,
      platforms: platformStats
    }
  };
}

/**
 * 获取时间序列数据
 */
export async function getTimeSeriesData(projectId: string): Promise<TimeSeriesData[]> {
  const client = getSupabaseClient();
  
  // 获取引用数据
  const { data: citations } = await client
    .from('geo_citations')
    .select('date, cited')
    .eq('project_id', projectId);

  // 获取曝光数据
  const { data: exposures } = await client
    .from('geo_exposure')
    .select('date, impressions')
    .eq('project_id', projectId);

  // 获取转化数据
  const { data: conversions } = await client
    .from('geo_conversions')
    .select('date, conversions')
    .eq('project_id', projectId);

  // 聚合数据
  const dataMap = new Map<string, TimeSeriesData>();

  (citations || []).forEach((citation: any) => {
    const existing = dataMap.get(citation.date) || {
      date: citation.date,
      citations: 0,
      exposure: 0,
      conversions: 0
    };
    if (citation.cited) existing.citations++;
    dataMap.set(citation.date, existing);
  });

  (exposures || []).forEach((exp: any) => {
    const existing = dataMap.get(exp.date) || {
      date: exp.date,
      citations: 0,
      exposure: 0,
      conversions: 0
    };
    existing.exposure += exp.impressions;
    dataMap.set(exp.date, existing);
  });

  (conversions || []).forEach((conv: any) => {
    const existing = dataMap.get(conv.date) || {
      date: conv.date,
      citations: 0,
      exposure: 0,
      conversions: 0
    };
    existing.conversions += conv.conversions;
    dataMap.set(conv.date, existing);
  });

  return Array.from(dataMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * 转换数据库记录为GEOProject类型
 */
function transformProject(dbProject: any, monitoring: MonitoringData): GEOProject {
  return {
    id: dbProject.id,
    title: dbProject.title,
    content: dbProject.content,
    author: dbProject.author,
    keywords: dbProject.keywords || [],
    references: dbProject.references || [],
    score: dbProject.score / 10, // 将整数转换为浮点数
    grade: dbProject.grade,
    breakdown: dbProject.breakdown,
    status: dbProject.status,
    isPublic: dbProject.is_public || false,
    publishedAt: dbProject.published_at ? new Date(dbProject.published_at) : undefined,
    createdAt: new Date(dbProject.created_at),
    updatedAt: new Date(dbProject.updated_at),
    monitoring
  };
}
