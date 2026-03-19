/**
 * 人设存储服务
 * 人设属于某个企业/商家，用于定义账号的内容调性
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface Persona {
  id: string;
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
  writingStyle?: string;
  exampleContent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePersonaInput {
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
  writingStyle?: string;
  exampleContent?: string;
}

export interface UpdatePersonaInput {
  name?: string;
  expertise?: string;
  tone?: string;
  style?: string;
  writingStyle?: string;
  exampleContent?: string;
}

// 预设语气风格
export const TONE_OPTIONS = [
  { id: 'professional', name: '专业严谨', description: '数据支撑，逻辑清晰' },
  { id: 'friendly', name: '亲切易懂', description: '接地气，贴近用户' },
  { id: 'academic', name: '学术规范', description: '引用规范，严谨客观' },
  { id: 'casual', name: '轻松活泼', description: '口语化，趣味性强' },
] as const;

// 预设写作风格
export const STYLE_OPTIONS = [
  { id: 'analytical', name: '分析型', description: '深度分析，逻辑推演' },
  { id: 'storytelling', name: '叙事型', description: '故事引导，情感共鸣' },
  { id: 'educational', name: '教学型', description: '步骤清晰，实操性强' },
  { id: 'opinionated', name: '观点型', description: '立场鲜明，观点独到' },
] as const;

/**
 * 获取企业的所有人设
 */
export async function getPersonasByBusiness(businessId: string): Promise<Persona[]> {
  const client = getSupabaseClient();
  
  const { data: personas, error } = await client
    .from('personas')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取企业人设失败:', error);
    return [];
  }

  return (personas || []).map(transformPersona);
}

/**
 * 获取所有人设
 */
export async function getAllPersonas(options?: {
  businessId?: string;
}): Promise<Persona[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('personas')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.businessId) {
    query = query.eq('business_id', options.businessId);
  }

  const { data: personas, error } = await query;

  if (error) {
    console.error('获取人设列表失败:', error);
    return [];
  }

  return (personas || []).map(transformPersona);
}

/**
 * 根据ID获取人设
 */
export async function getPersonaById(id: string): Promise<Persona | null> {
  const client = getSupabaseClient();
  
  const { data: persona, error } = await client
    .from('personas')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !persona) {
    console.error('获取人设详情失败:', error);
    return null;
  }

  return transformPersona(persona);
}

/**
 * 创建人设
 */
export async function createPersona(input: CreatePersonaInput): Promise<Persona> {
  const client = getSupabaseClient();
  
  const { data: persona, error } = await client
    .from('personas')
    .insert({
      business_id: input.businessId,
      name: input.name,
      expertise: input.expertise,
      tone: input.tone,
      style: input.style,
      writing_style: input.writingStyle,
      example_content: input.exampleContent,
    })
    .select()
    .single();

  if (error) {
    console.error('创建人设失败:', error);
    throw error;
  }

  return transformPersona(persona);
}

/**
 * 更新人设
 */
export async function updatePersona(id: string, input: UpdatePersonaInput): Promise<Persona | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.expertise !== undefined) updateData.expertise = input.expertise;
  if (input.tone !== undefined) updateData.tone = input.tone;
  if (input.style !== undefined) updateData.style = input.style;
  if (input.writingStyle !== undefined) updateData.writing_style = input.writingStyle;
  if (input.exampleContent !== undefined) updateData.example_content = input.exampleContent;

  const { data: persona, error } = await client
    .from('personas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新人设失败:', error);
    return null;
  }

  return transformPersona(persona);
}

/**
 * 删除人设
 */
export async function deletePersona(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('personas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除人设失败:', error);
    return false;
  }

  return true;
}

/**
 * 基于人设生成写作指导
 */
export async function generateWritingGuidance(personaId: string): Promise<{
  tone: string;
  style: string;
  expertise: string;
  suggestions: string[];
}> {
  const persona = await getPersonaById(personaId);
  
  if (!persona) {
    return {
      tone: 'professional',
      style: 'analytical',
      expertise: '',
      suggestions: [],
    };
  }

  const suggestions: string[] = [];
  
  // 根据语气提供建议
  const toneConfig = TONE_OPTIONS.find(t => t.id === persona.tone);
  if (toneConfig) {
    suggestions.push(`语气风格：${toneConfig.name} - ${toneConfig.description}`);
  }
  
  // 根据风格提供建议
  const styleConfig = STYLE_OPTIONS.find(s => s.id === persona.style);
  if (styleConfig) {
    suggestions.push(`写作风格：${styleConfig.name} - ${styleConfig.description}`);
  }

  return {
    tone: persona.tone,
    style: persona.style,
    expertise: persona.expertise,
    suggestions,
  };
}

// 转换函数
function transformPersona(dbPersona: any): Persona {
  return {
    id: dbPersona.id,
    businessId: dbPersona.business_id,
    name: dbPersona.name,
    expertise: dbPersona.expertise,
    tone: dbPersona.tone,
    style: dbPersona.style,
    writingStyle: dbPersona.writing_style,
    exampleContent: dbPersona.example_content,
    createdAt: new Date(dbPersona.created_at),
    updatedAt: new Date(dbPersona.updated_at),
  };
}
