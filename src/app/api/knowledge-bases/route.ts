/**
 * 知识库 API
 * 提供知识库列表查询功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getKnowledgeBasesByBusiness, 
  createKnowledgeBase,
  type CreateKnowledgeBaseInput
} from '@/lib/knowledge-base-store';

/**
 * 获取知识库列表
 * GET /api/knowledge-bases?businessId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json({ success: false, error: '缺少 businessId 参数' }, { status: 400 });
    }

    const bases = await getKnowledgeBasesByBusiness(businessId);

    return NextResponse.json({
      success: true,
      data: bases.map(base => ({
        id: base.id,
        name: base.name,
        description: base.description,
        tableName: base.tableName,
        documentCount: base.documentCount,
        status: base.status,
        createdAt: base.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Knowledge Bases API] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取知识库列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建知识库
 * POST /api/knowledge-bases
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, name, description } = body;

    if (!businessId || !name) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const input: CreateKnowledgeBaseInput = {
      businessId,
      name,
      description,
    };

    const newBase = await createKnowledgeBase(input);

    if (!newBase) {
      return NextResponse.json({ success: false, error: '创建知识库失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newBase.id,
        name: newBase.name,
        description: newBase.description,
        tableName: newBase.tableName,
        status: newBase.status,
      },
    });
  } catch (error) {
    console.error('[Knowledge Bases API] Error:', error);
    return NextResponse.json(
      { success: false, error: '创建知识库失败' },
      { status: 500 }
    );
  }
}
