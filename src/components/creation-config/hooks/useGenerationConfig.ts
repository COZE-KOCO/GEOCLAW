'use client';

import { useState, useCallback } from 'react';
import type { GenerationConfig } from '@/lib/types/generation-config';
import { defaultGenerationConfig } from '@/lib/types/generation-config';
import type { ModuleId } from '../types';

/**
 * 创作配置管理 Hook
 * 
 * 提供配置状态管理和操作方法
 */
export function useGenerationConfig(initialConfig?: Partial<GenerationConfig>) {
  const [config, setConfig] = useState<GenerationConfig>({
    ...defaultGenerationConfig,
    ...initialConfig,
  });

  const [openModules, setOpenModules] = useState<ModuleId[]>(['basic', 'type']);

  // 更新单个配置项
  const updateConfig = useCallback(<K extends keyof GenerationConfig>(
    key: K,
    value: GenerationConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // 批量更新配置
  const updateConfigBatch = useCallback((updates: Partial<GenerationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // 重置配置
  const resetConfig = useCallback(() => {
    setConfig(defaultGenerationConfig);
  }, []);

  // 加载配置（如从规则加载）
  const loadConfig = useCallback((newConfig: Partial<GenerationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // 切换模块展开状态
  const toggleModule = useCallback((moduleId: ModuleId) => {
    setOpenModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  }, []);

  // 设置展开的模块
  const setOpenModulesList = useCallback((modules: ModuleId[]) => {
    setOpenModules(modules);
  }, []);

  // 展开所有模块
  const expandAllModules = useCallback(() => {
    setOpenModules([
      'basic', 'type', 'image', 'content', 'replace',
      'knowledge', 'format', 'structure', 'internal', 'external', 'fixed'
    ]);
  }, []);

  // 收起所有模块
  const collapseAllModules = useCallback(() => {
    setOpenModules([]);
  }, []);

  return {
    config,
    setConfig,
    openModules,
    setOpenModules: setOpenModulesList,
    updateConfig,
    updateConfigBatch,
    resetConfig,
    loadConfig,
    toggleModule,
    expandAllModules,
    collapseAllModules,
  };
}
