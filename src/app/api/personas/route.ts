import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// ==================== 类型定义 ====================

export interface Persona {
  id: string;
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
  writingStyle?: string;
  exampleContent?: string;
  createdAt: string;
  updatedAt: string;
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

// ==================== API 路由 ====================

/**
 * GET /api/personas
 * 获取人设列表或单个人设
 * Query params:
 * - id: 人设ID（可选，获取单个）
 * - businessId: 商家ID（必填）
 */
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');

    // 获取单个人设
    if (id) {
      const { data, error } = await client
        .from('personas')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: '人设不存在' }, { status: 404 });
      }

      return NextResponse.json({ persona: mapDbPersona(data) });
    }

    // 获取人设列表
    if (!businessId) {
      return NextResponse.json({ error: '缺少商家ID' }, { status: 400 });
    }

    const { data, error } = await client
      .from('personas')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取人设列表失败:', error);
      return NextResponse.json({ error: '获取人设列表失败' }, { status: 500 });
    }

    return NextResponse.json({ personas: data.map(mapDbPersona) });
  } catch (error) {
    console.error('获取人设数据失败:', error);
    return NextResponse.json({ error: '获取人设数据失败' }, { status: 500 });
  }
}

/**
 * POST /api/personas
 * 创建人设
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    if (!body.businessId || !body.name || !body.expertise || !body.tone || !body.style) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }

    const { data, error } = await client
      .from('personas')
      .insert({
        business_id: body.businessId,
        name: body.name,
        expertise: body.expertise,
        tone: body.tone,
        style: body.style,
        writing_style: body.writingStyle || null,
        example_content: body.exampleContent || null,
      })
      .select()
      .single();

    if (error) {
      console.error('创建人设失败:', error);
      return NextResponse.json({ error: '创建人设失败' }, { status: 500 });
    }

    return NextResponse.json({ persona: mapDbPersona(data) }, { status: 201 });
  } catch (error) {
    console.error('创建人设失败:', error);
    return NextResponse.json({ error: '创建人设失败' }, { status: 500 });
  }
}

/**
 * PUT /api/personas
 * 更新人设
 */
export async function PUT(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少人设ID' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name) updateData.name = data.name;
    if (data.expertise) updateData.expertise = data.expertise;
    if (data.tone) updateData.tone = data.tone;
    if (data.style) updateData.style = data.style;
    if (data.writingStyle !== undefined) updateData.writing_style = data.writingStyle;
    if (data.exampleContent !== undefined) updateData.example_content = data.exampleContent;

    const { data: result, error } = await client
      .from('personas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !result) {
      return NextResponse.json({ error: '更新人设失败' }, { status: 500 });
    }

    return NextResponse.json({ persona: mapDbPersona(result) });
  } catch (error) {
    console.error('更新人设失败:', error);
    return NextResponse.json({ error: '更新人设失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/personas
 * 删除人设
 */
export async function DELETE(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少人设ID' }, { status: 400 });
    }

    const { error } = await client
      .from('personas')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: '删除人设失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除人设失败:', error);
    return NextResponse.json({ error: '删除人设失败' }, { status: 500 });
  }
}

// ==================== 辅助函数 ====================

function mapDbPersona(db: any): Persona {
  return {
    id: db.id,
    businessId: db.business_id,
    name: db.name,
    expertise: db.expertise,
    tone: db.tone,
    style: db.style,
    writingStyle: db.writing_style,
    exampleContent: db.example_content,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}
