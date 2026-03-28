/**
 * 知识库管理服务
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface KnowledgeBase {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  tableName: string;
  documentCount: number;
  status: 'active' | 'processing' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface CreateKnowledgeBaseInput {
  businessId: string;
  name: string;
  description?: string;
}

/**
 * 获取商家的所有知识库
 */
export async function getKnowledgeBasesByBusiness(businessId: string): Promise<KnowledgeBase[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[Knowledge Base Store] Error fetching knowledge bases:', error);
    return [];
  }
  
  return (data || []).map(item => ({
    id: item.id,
    businessId: item.business_id,
    name: item.name,
    description: item.description,
    tableName: item.table_name,
    documentCount: item.document_count,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

/**
 * 根据 ID 获取知识库
 */
export async function getKnowledgeBaseById(id: string): Promise<KnowledgeBase | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
    description: data.description,
    tableName: data.table_name,
    documentCount: data.document_count,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 创建知识库
 */
export async function createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase | null> {
  const supabase = getSupabaseClient();
  
  const tableName = `kb_${Date.now()}`;
  
  const { data, error } = await supabase
    .from('knowledge_bases')
    .insert({
      business_id: input.businessId,
      name: input.name,
      description: input.description || null,
      table_name: tableName,
      document_count: 0,
      status: 'active',
    })
    .select()
    .single();
  
  if (error || !data) {
    console.error('[Knowledge Base Store] Error creating knowledge base:', error);
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
    description: data.description,
    tableName: data.table_name,
    documentCount: data.document_count,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 更新知识库
 */
export async function updateKnowledgeBase(
  id: string,
  updates: Partial<Pick<KnowledgeBase, 'name' | 'description'>>
): Promise<KnowledgeBase | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('knowledge_bases')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error || !data) {
    console.error('[Knowledge Base Store] Error updating knowledge base:', error);
    return null;
  }
  
  return {
    id: data.id,
    businessId: data.business_id,
    name: data.name,
    description: data.description,
    tableName: data.table_name,
    documentCount: data.document_count,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 删除知识库
 */
export async function deleteKnowledgeBase(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('knowledge_bases')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('[Knowledge Base Store] Error deleting knowledge base:', error);
    return false;
  }
  
  return true;
}
