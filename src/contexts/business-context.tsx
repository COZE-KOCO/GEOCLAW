'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useUser } from './user-context';

const SELECTED_BUSINESS_KEY = 'selected_business_id';

interface Business {
  id: string;
  name: string;
  type: 'store' | 'brand' | 'company' | 'chain';
  industry?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
}

interface BusinessContextType {
  // 当前选中的商家
  selectedBusiness: string;
  
  // 设置选中的商家（支持切换）
  setSelectedBusiness: (id: string) => void;
  
  // 商家列表（仅当前用户所属商家）
  businesses: Business[];
  
  // 设置商家列表
  setBusinesses: (businesses: Business[]) => void;
  
  // 当前商家详情
  currentBusiness: Business | null;
  
  // 加载状态
  loading: boolean;
  
  // 是否需要创建商家
  needsCreateBusiness: boolean;
  
  // 刷新商家信息
  refreshBusiness: () => Promise<void>;
  
  // 刷新商家列表（兼容旧接口）
  refreshBusinesses: (includeInactive?: boolean) => Promise<Business[]>;
  
  // 根据ID获取商家信息
  getBusinessById: (id: string) => Business | undefined;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsCreateBusiness, setNeedsCreateBusiness] = useState(false);
  const initializedRef = useRef(false);

  // selectedBusiness 使用当前商家的 ID
  const selectedBusiness = currentBusiness?.id || '';

  // 加载用户的商家信息
  const refreshBusiness = useCallback(async () => {
    if (!user?.id) {
      setBusinesses([]);
      setCurrentBusiness(null);
      setNeedsCreateBusiness(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 获取用户的商家列表（基于 owner_id）
      const response = await fetch(`/api/businesses?_t=${Date.now()}`);
      const data = await response.json();
      
      if (data.needsCreateBusiness) {
        // 用户没有商家，需要创建
        setBusinesses([]);
        setCurrentBusiness(null);
        setNeedsCreateBusiness(true);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(SELECTED_BUSINESS_KEY);
        }
      } else if (data.businesses && data.businesses.length > 0) {
        const businessList: Business[] = data.businesses.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          industry: b.industry,
          address: b.address,
          status: b.status,
        }));
        setBusinesses(businessList);
        setNeedsCreateBusiness(false);
        
        // 优先读取 localStorage 中保存的商家ID
        const savedBusinessId = typeof window !== 'undefined' 
          ? localStorage.getItem(SELECTED_BUSINESS_KEY) 
          : null;
        const savedBusiness = savedBusinessId 
          ? businessList.find(b => b.id === savedBusinessId)
          : null;
        
        if (savedBusiness) {
          // 使用保存的商家
          setCurrentBusiness(savedBusiness);
        } else {
          // 使用第一个商家作为默认
          setCurrentBusiness(businessList[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem(SELECTED_BUSINESS_KEY, businessList[0].id);
          }
        }
      } else {
        setBusinesses([]);
        setCurrentBusiness(null);
        setNeedsCreateBusiness(true);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(SELECTED_BUSINESS_KEY);
        }
      }
    } catch (error) {
      console.error('加载商家信息失败:', error);
      setBusinesses([]);
      setCurrentBusiness(null);
      setNeedsCreateBusiness(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 初始化：当用户信息加载完成后，加载商家信息
  useEffect(() => {
    if (initializedRef.current) return;
    
    // 等待用户信息加载完成
    if (userLoading) return;
    
    initializedRef.current = true;
    refreshBusiness();
  }, [userLoading, refreshBusiness]);

  // 当用户 ID 变化时，重新加载商家信息
  useEffect(() => {
    if (!userLoading && user?.id) {
      refreshBusiness();
    }
  }, [user?.id, userLoading, refreshBusiness]);

  // 根据 ID 获取商家信息
  const getBusinessById = useCallback((id: string) => {
    return businesses.find(b => b.id === id);
  }, [businesses]);

  // 设置选中的商家（支持切换）
  const setSelectedBusiness = useCallback((id: string) => {
    const business = businesses.find(b => b.id === id);
    if (business) {
      setCurrentBusiness(business);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SELECTED_BUSINESS_KEY, id);
      }
    }
  }, [businesses]);

  // refreshBusinesses 已弃用 - 使用 refreshBusiness 替代
  const refreshBusinesses = useCallback(async (_includeInactive = false) => {
    await refreshBusiness();
    return businesses;
  }, [refreshBusiness, businesses]);

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness,
        businesses,
        setBusinesses,
        currentBusiness,
        loading,
        needsCreateBusiness,
        refreshBusiness,
        refreshBusinesses,
        getBusinessById,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
