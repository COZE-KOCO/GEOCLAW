'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

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
  setSelectedBusiness: (id: string) => void;
  
  // 商家列表（仅活跃商家）
  businesses: Business[];
  setBusinesses: (businesses: Business[]) => void;
  
  // 加载状态
  loading: boolean;
  
  // 刷新商家列表
  refreshBusinesses: (includeInactive?: boolean) => Promise<Business[]>;
  
  // 根据ID获取商家信息
  getBusinessById: (id: string) => Business | undefined;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const STORAGE_KEY = 'selected_business_id';

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [selectedBusiness, setSelectedBusinessState] = useState<string>('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // 保存选中的商家到 localStorage 并更新状态
  const setSelectedBusiness = useCallback((id: string) => {
    setSelectedBusinessState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  // 加载商家列表
  const refreshBusinesses = useCallback(async (includeInactive = false) => {
    setLoading(true);
    try {
      // 默认只获取活跃商家，管理页面可传入 includeInactive=true 获取所有商家
      const statusParam = includeInactive ? '' : '&status=active';
      const response = await fetch(`/api/businesses?_t=${Date.now()}${statusParam}`);
      const data = await response.json();
      
      // API 返回格式: { businesses: [...] }
      const businessList = data.businesses || data.data || [];
      
      if (data.businesses || data.success) {
        // 如果不是包含停用商家的查询，更新全局状态
        if (!includeInactive) {
          setBusinesses(businessList);
          
          // 获取当前选中的商家ID（从localStorage读取最新值）
          const currentSelectedId = typeof window !== 'undefined' 
            ? localStorage.getItem(STORAGE_KEY) 
            : null;
          
          // 如果没有选中的商家，且有商家列表，自动选中第一个
          if (!currentSelectedId && businessList.length > 0) {
            setSelectedBusiness(businessList[0].id);
          }
          // 如果选中的商家不在活跃列表中，自动选择第一个活跃商家
          else if (currentSelectedId && !businessList.find((b: Business) => b.id === currentSelectedId)) {
            if (businessList.length > 0) {
              setSelectedBusiness(businessList[0].id);
            } else {
              setSelectedBusiness('');
            }
          }
          // 如果有选中的商家且在列表中，确保状态同步
          else if (currentSelectedId && businessList.find((b: Business) => b.id === currentSelectedId)) {
            setSelectedBusinessState(currentSelectedId);
          }
        }
        
        return businessList;
      }
      
      return [];
    } catch (error) {
      console.error('加载商家列表失败:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setSelectedBusiness]);

  // 初始化：从 localStorage 恢复选中的商家，然后加载商家列表
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // 从 localStorage 恢复选中的商家
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        setSelectedBusinessState(savedId);
      }
    }
    
    // 加载商家列表（仅活跃商家）
    refreshBusinesses();
  }, [refreshBusinesses]);

  // 根据 ID 获取商家信息
  const getBusinessById = useCallback((id: string) => {
    return businesses.find(b => b.id === id);
  }, [businesses]);

  return (
    <BusinessContext.Provider
      value={{
        selectedBusiness,
        setSelectedBusiness,
        businesses,
        setBusinesses,
        loading,
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
