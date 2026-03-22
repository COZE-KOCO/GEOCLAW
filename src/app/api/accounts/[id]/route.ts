/**
 * 账号详情 API
 * 
 * GET - 获取单个账号详情
 * DELETE - 删除账号
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountById, deleteAccount } from '@/lib/account-store';

/**
 * GET /api/accounts/[id]
 * 获取账号详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const account = await getAccountById(id);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    console.error('获取账号详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取账号详情失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounts/[id]
 * 删除账号
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const success = await deleteAccount(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除账号失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除账号失败:', error);
    return NextResponse.json(
      { success: false, error: '删除账号失败' },
      { status: 500 }
    );
  }
}
