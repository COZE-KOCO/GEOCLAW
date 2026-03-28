'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UserPermissions {
  contentCreation?: boolean;
  autoPublish?: boolean;
  keywordLibrary?: boolean;
  api?: boolean;
  geoAnalysis?: boolean;
  advancedGeoAnalysis?: boolean;
  teamCollaboration?: boolean;
  dedicatedSupport?: boolean;
}

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  businessId?: string; // 用户所属企业ID（可选，用户可能还未创建企业）
  role: 'user' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'pending';
  permissions: UserPermissions;
  packageId?: string;
  packageExpiresAt?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 不需要登录的路径
const PUBLIC_PATHS = [
  '/login',
  '/admin',
  '/admin/login',
];

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // 确保发送 cookie
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  // 初始加载用户信息
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // 检查路由权限
  useEffect(() => {
    if (loading) return;

    // 检查是否是公开路径
    const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));
    
    if (!user && !isPublicPath) {
      // 未登录且不是公开路径，跳转到登录页
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// 权限检查 Hook
export function usePermission() {
  const { user } = useUser();

  const hasPermission = useCallback(
    (permission: keyof UserPermissions): boolean => {
      return user?.permissions?.[permission] === true;
    },
    [user]
  );

  const hasRole = useCallback(
    (roles: ('user' | 'premium' | 'enterprise')[]): boolean => {
      return user ? roles.includes(user.role) : false;
    },
    [user]
  );

  const isPackageValid = useCallback((): boolean => {
    if (!user?.packageExpiresAt) return false;
    return new Date(user.packageExpiresAt) > new Date();
  }, [user]);

  return { hasPermission, hasRole, isPackageValid };
}
