/**
 * 用户端套餐信息 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/user-auth';
import { getUserPackages } from '@/lib/admin-store';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    // 获取所有套餐列表
    const allPackages = await getUserPackages();
    
    // 查找用户当前套餐
    const currentPackage = user.packageId 
      ? allPackages.find(pkg => pkg.id === user.packageId)
      : null;
    
    // 检查套餐是否过期
    const isExpired = user.packageExpiresAt 
      ? new Date(user.packageExpiresAt) < new Date()
      : true;

    // 计算剩余天数
    let remainingDays = 0;
    if (user.packageExpiresAt && !isExpired) {
      const diffTime = new Date(user.packageExpiresAt).getTime() - new Date().getTime();
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // 获取免费版套餐（如果没有套餐则默认为免费版）
    const freePackage = allPackages.find(pkg => pkg.code === 'free');
    
    // 实际生效的套餐
    const effectivePackage = isExpired ? freePackage : currentPackage;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        currentPackage: effectivePackage || null,
        isExpired,
        remainingDays,
        expiresAt: user.packageExpiresAt || null,
        allPackages: allPackages.filter(pkg => pkg.isActive),
      },
    });
  } catch (error) {
    console.error('[User Package] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取套餐信息失败' },
      { status: 500 }
    );
  }
}
