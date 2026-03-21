/**
 * 关键词库管理服务
 * 支持商家隔离，使用 Supabase 存储
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface KeywordLibrary {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  keywords: string[];
  keywordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKeywordLibraryInput {
  businessId: string;
  name: string;
  description?: string;
  keywords?: string[];
}

export interface UpdateKeywordLibraryInput {
  name?: string;
  description?: string;
  keywords?: string[];
}

// ==================== 数据库操作 ====================

/**
 * 获取商家的所有关键词库
 */
export async function getKeywordLibrariesByBusiness(businessId: string): Promise<KeywordLibrary[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('keyword_libraries')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取关键词库失败:', error);
    return [];
  }

  return data.map(mapDbToKeywordLibrary);
}

/**
 * 根据ID获取关键词库
 */
export async function getKeywordLibraryById(id: string): Promise<KeywordLibrary | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('keyword_libraries')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToKeywordLibrary(data);
}

/**
 * 创建关键词库
 */
export async function createKeywordLibrary(input: CreateKeywordLibraryInput): Promise<KeywordLibrary | null> {
  const client = getSupabaseClient();
  const keywords = input.keywords || [];
  
  const { data, error } = await client
    .from('keyword_libraries')
    .insert({
      business_id: input.businessId,
      name: input.name,
      description: input.description,
      keywords: keywords,
      keyword_count: keywords.length,
    })
    .select()
    .single();

  if (error) {
    console.error('创建关键词库失败:', error);
    return null;
  }

  return mapDbToKeywordLibrary(data);
}

/**
 * 更新关键词库
 */
export async function updateKeywordLibrary(id: string, input: UpdateKeywordLibraryInput): Promise<KeywordLibrary | null> {
  const client = getSupabaseClient();
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.keywords !== undefined) {
    updateData.keywords = input.keywords;
    updateData.keyword_count = input.keywords.length;
  }

  const { data, error } = await client
    .from('keyword_libraries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新关键词库失败:', error);
    return null;
  }

  return mapDbToKeywordLibrary(data);
}

/**
 * 添加关键词到库
 */
export async function addKeywordsToLibrary(libraryId: string, keywords: string[]): Promise<KeywordLibrary | null> {
  const library = await getKeywordLibraryById(libraryId);
  if (!library) return null;

  const newKeywords = [...new Set([...library.keywords, ...keywords])];
  return updateKeywordLibrary(libraryId, { keywords: newKeywords });
}

/**
 * 从库中删除关键词
 */
export async function removeKeywordFromLibrary(libraryId: string, keyword: string): Promise<KeywordLibrary | null> {
  const library = await getKeywordLibraryById(libraryId);
  if (!library) return null;

  const newKeywords = library.keywords.filter(k => k !== keyword);
  return updateKeywordLibrary(libraryId, { keywords: newKeywords });
}

/**
 * 删除关键词库
 */
export async function deleteKeywordLibrary(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('keyword_libraries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除关键词库失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取关键词库统计
 */
export async function getKeywordLibraryStats(businessId: string): Promise<{
  totalLibraries: number;
  totalKeywords: number;
}> {
  const libraries = await getKeywordLibrariesByBusiness(businessId);
  return {
    totalLibraries: libraries.length,
    totalKeywords: libraries.reduce((sum, lib) => sum + lib.keywords.length, 0),
  };
}

// ==================== 映射函数 ====================

function mapDbToKeywordLibrary(dbRecord: Record<string, unknown>): KeywordLibrary {
  return {
    id: dbRecord.id as string,
    businessId: dbRecord.business_id as string,
    name: dbRecord.name as string,
    description: dbRecord.description as string | undefined,
    keywords: (dbRecord.keywords as string[]) || [],
    keywordCount: (dbRecord.keyword_count as number) || 0,
    createdAt: new Date(dbRecord.created_at as string),
    updatedAt: new Date(dbRecord.updated_at as string),
  };
}

// ==================== 兼容性函数（保持向后兼容） ====================

// 内存中的关键词库数据（用于本地开发/降级）
let keywordLibraries: KeywordLibrary[] = [];

/**
 * 获取所有关键词库（兼容旧接口）
 * @deprecated 请使用 getKeywordLibrariesByBusiness
 */
export function getKeywordLibraries(): KeywordLibrary[] {
  return keywordLibraries;
}

/**
 * 获取单个关键词库（兼容旧接口）
 * @deprecated 请使用 getKeywordLibraryById
 */
export function getKeywordLibrary(id: string): KeywordLibrary | undefined {
  return keywordLibraries.find(lib => lib.id === id);
}

/**
 * 创建新的关键词库（兼容旧接口 - 本地存储）
 * @deprecated 请使用 createKeywordLibrary with businessId
 */
export function createKeywordLibraryLocal(name: string): KeywordLibrary {
  const newLibrary: KeywordLibrary = {
    id: `kl-${Date.now()}`,
    businessId: '',
    name,
    keywords: [],
    keywordCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  keywordLibraries.push(newLibrary);
  return newLibrary;
}

/**
 * 添加关键词到库（兼容旧接口 - 本地存储）
 * @deprecated 请使用 addKeywordsToLibrary
 */
export function addKeywordsToLibraryLocal(libraryId: string, keywords: string[]): KeywordLibrary | undefined {
  const library = keywordLibraries.find(lib => lib.id === libraryId);
  if (library) {
    library.keywords = [...new Set([...library.keywords, ...keywords])];
    library.keywordCount = library.keywords.length;
  }
  return library;
}

/**
 * 从库中删除关键词（兼容旧接口 - 本地存储）
 * @deprecated 请使用 removeKeywordFromLibrary
 */
export function removeKeywordFromLibraryLocal(libraryId: string, keyword: string): KeywordLibrary | undefined {
  const library = keywordLibraries.find(lib => lib.id === libraryId);
  if (library) {
    library.keywords = library.keywords.filter(k => k !== keyword);
    library.keywordCount = library.keywords.length;
  }
  return library;
}

/**
 * 删除关键词库（兼容旧接口 - 本地存储）
 * @deprecated 请使用 deleteKeywordLibrary
 */
export function deleteKeywordLibraryLocal(id: string): boolean {
  const index = keywordLibraries.findIndex(lib => lib.id === id);
  if (index > -1) {
    keywordLibraries.splice(index, 1);
    return true;
  }
  return false;
}
