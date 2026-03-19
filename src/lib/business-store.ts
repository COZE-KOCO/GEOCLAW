/**
 * 企业/商家/品牌管理服务
 * GEO优化的核心服务对象
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export type BusinessType = 'store' | 'brand' | 'company' | 'chain';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  industry: string;
  subIndustry?: string;
  description?: string;
  logo?: string;
  website?: string;
  
  // 本地商家信息
  address?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  businessHours?: {
    weekdays: { open: string; close: string };
    weekend: { open: string; close: string };
  };
  
  // 品牌信息
  brandKeywords: string[];
  targetKeywords: string[];
  competitorKeywords: string[];
  
  // 联系人
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  status: 'active' | 'inactive' | 'pending';
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessInput {
  name: string;
  type: BusinessType;
  industry: string;
  subIndustry?: string;
  description?: string;
  logo?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  businessHours?: Business['businessHours'];
  brandKeywords?: string[];
  targetKeywords?: string[];
  competitorKeywords?: string[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  type?: BusinessType;
  industry?: string;
  subIndustry?: string;
  description?: string;
  logo?: string;
  website?: string;
  address?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  businessHours?: Business['businessHours'];
  brandKeywords?: string[];
  targetKeywords?: string[];
  competitorKeywords?: string[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: 'active' | 'inactive' | 'pending';
}

/**
 * 获取所有企业
 */
export async function getAllBusinesses(options?: {
  type?: BusinessType;
  industry?: string;
  city?: string;
  status?: string;
}): Promise<Business[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }
  if (options?.industry) {
    query = query.eq('industry', options.industry);
  }
  if (options?.city) {
    query = query.eq('city', options.city);
  }
  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data: businesses, error } = await query;

  if (error) {
    console.error('获取企业列表失败:', error);
    return [];
  }

  return (businesses || []).map(transformBusiness);
}

/**
 * 根据ID获取企业
 */
export async function getBusinessById(id: string): Promise<Business | null> {
  const client = getSupabaseClient();
  
  const { data: business, error } = await client
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !business) {
    console.error('获取企业详情失败:', error);
    return null;
  }

  return transformBusiness(business);
}

/**
 * 创建企业
 */
export async function createBusiness(input: CreateBusinessInput): Promise<Business> {
  const client = getSupabaseClient();
  
  const { data: business, error } = await client
    .from('businesses')
    .insert({
      name: input.name,
      type: input.type,
      industry: input.industry || '',
      sub_industry: input.subIndustry,
      description: input.description,
      logo: input.logo,
      website: input.website,
      address: input.address,
      city: input.city,
      district: input.district,
      latitude: input.latitude,
      longitude: input.longitude,
      phone: input.phone,
      business_hours: input.businessHours,
      brand_keywords: input.brandKeywords || [],
      target_keywords: input.targetKeywords || [],
    })
    .select()
    .single();

  if (error) {
    console.error('创建企业失败:', error);
    throw error;
  }

  return transformBusiness(business);
}

/**
 * 更新企业
 */
export async function updateBusiness(id: string, input: UpdateBusinessInput): Promise<Business | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.industry !== undefined) updateData.industry = input.industry;
  if (input.subIndustry !== undefined) updateData.sub_industry = input.subIndustry;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.logo !== undefined) updateData.logo = input.logo;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.district !== undefined) updateData.district = input.district;
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.businessHours !== undefined) updateData.business_hours = input.businessHours;
  if (input.brandKeywords !== undefined) updateData.brand_keywords = input.brandKeywords;
  if (input.targetKeywords !== undefined) updateData.target_keywords = input.targetKeywords;
  if (input.status !== undefined) updateData.status = input.status;

  const { data: business, error } = await client
    .from('businesses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新企业失败:', error);
    return null;
  }

  return transformBusiness(business);
}

/**
 * 删除企业（级联删除关联数据）
 */
export async function deleteBusiness(id: string): Promise<{ success: boolean; deletedCounts?: Record<string, number> }> {
  const client = getSupabaseClient();
  
  try {
    // 统计要删除的关联数据
    const deletedCounts: Record<string, number> = {};
    
    // 1. 删除矩阵账号
    const { count: accountsCount } = await client
      .from('matrix_accounts')
      .delete()
      .eq('business_id', id);
    if (accountsCount) deletedCounts.accounts = accountsCount;
    
    // 2. 删除人设
    const { count: personasCount } = await client
      .from('personas')
      .delete()
      .eq('business_id', id);
    if (personasCount) deletedCounts.personas = personasCount;
    
    // 3. 删除内容草稿
    const { count: draftsCount } = await client
      .from('content_drafts')
      .delete()
      .eq('business_id', id);
    if (draftsCount) deletedCounts.drafts = draftsCount;
    
    // 4. 删除发布计划
    const { count: plansCount } = await client
      .from('publish_plans')
      .delete()
      .eq('business_id', id);
    if (plansCount) deletedCounts.plans = plansCount;
    
    // 5. 删除发布任务
    const { count: tasksCount } = await client
      .from('publish_tasks')
      .delete()
      .eq('business_id', id);
    if (tasksCount) deletedCounts.tasks = tasksCount;
    
    // 6. 删除GEO项目
    const { count: projectsCount } = await client
      .from('geo_projects')
      .delete()
      .eq('business_id', id);
    if (projectsCount) deletedCounts.projects = projectsCount;
    
    // 7. 删除GEO分析任务
    const { count: analysisCount } = await client
      .from('geo_analysis_tasks')
      .delete()
      .eq('business_id', id);
    if (analysisCount) deletedCounts.analysisTasks = analysisCount;
    
    // 8. 最后删除商家本身
    const { error } = await client
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除企业失败:', error);
      return { success: false };
    }

    return { success: true, deletedCounts };
  } catch (error) {
    console.error('删除企业失败:', error);
    return { success: false };
  }
}

/**
 * 停用企业
 */
export async function deactivateBusiness(id: string): Promise<Business | null> {
  return updateBusiness(id, { status: 'inactive' });
}

/**
 * 启用企业
 */
export async function activateBusiness(id: string): Promise<Business | null> {
  return updateBusiness(id, { status: 'active' });
}

/**
 * 获取企业统计概览
 */
export async function getBusinessStats(businessId: string): Promise<{
  totalProjects: number;
  totalAccounts: number;
  totalPersonas: number;
  totalCitations: number;
  totalExposure: number;
  avgPosition: number;
}> {
  const client = getSupabaseClient();
  
  const [projectsResult, accountsResult, personasResult, citationsResult, exposureResult] = await Promise.all([
    client.from('geo_projects').select('id', { count: 'exact' }).eq('business_id', businessId),
    client.from('matrix_accounts').select('id', { count: 'exact' }).eq('business_id', businessId),
    client.from('personas').select('id', { count: 'exact' }).eq('business_id', businessId),
    client.from('geo_citations').select('position').eq('business_id', businessId),
    client.from('geo_exposure').select('ai_displays').eq('business_id', businessId),
  ]);

  const citations = citationsResult.data || [];
  const exposure = exposureResult.data || [];

  const totalExposure = exposure.reduce((sum: number, e: any) => sum + (e.ai_displays || 0), 0);
  const avgPosition = citations.length > 0
    ? citations.reduce((sum: number, c: any) => sum + (c.position || 0), 0) / citations.length
    : 0;

  return {
    totalProjects: projectsResult.count || 0,
    totalAccounts: accountsResult.count || 0,
    totalPersonas: personasResult.count || 0,
    totalCitations: citations.length,
    totalExposure,
    avgPosition: parseFloat(avgPosition.toFixed(1)),
  };
}

/**
 * 行业分类参考（用户可自由填写，不限于以下选项）
 */
export const industryCategories = [
  { category: '制造业', examples: ['机械制造', '电子制造', '化工', '纺织', '食品加工'] },
  { category: '服务业', examples: ['餐饮', '零售', '物流', '家政', '维修服务'] },
  { category: '医疗健康', examples: ['医院', '诊所', '药店', '康复中心', '医疗器械'] },
  { category: '教育培训', examples: ['K12教育', '职业培训', '语言培训', '在线教育'] },
  { category: '科技互联网', examples: ['软件开发', '人工智能', '电子商务', 'SaaS服务'] },
  { category: '金融', examples: ['银行', '保险', '证券', '投资', '支付'] },
  { category: '房地产', examples: ['开发商', '中介', '物业管理', '装修'] },
  { category: '文化娱乐', examples: ['传媒', '影视', '游戏', '旅游'] },
];

/**
 * 转换数据库记录为前端格式
 */
function transformBusiness(dbRecord: any): Business {
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    type: dbRecord.type,
    industry: dbRecord.industry,
    subIndustry: dbRecord.sub_industry,
    description: dbRecord.description,
    logo: dbRecord.logo,
    website: dbRecord.website,
    address: dbRecord.address,
    city: dbRecord.city,
    district: dbRecord.district,
    latitude: dbRecord.latitude ? parseFloat(dbRecord.latitude) : undefined,
    longitude: dbRecord.longitude ? parseFloat(dbRecord.longitude) : undefined,
    phone: dbRecord.phone,
    businessHours: dbRecord.business_hours,
    brandKeywords: dbRecord.brand_keywords || [],
    targetKeywords: dbRecord.target_keywords || [],
    competitorKeywords: dbRecord.competitor_keywords || [],
    contactName: dbRecord.contact_name,
    contactPhone: dbRecord.contact_phone,
    contactEmail: dbRecord.contact_email,
    status: dbRecord.status,
    verifiedAt: dbRecord.verified_at ? new Date(dbRecord.verified_at) : undefined,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at),
  };
}
