'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  FileText,
  ImagePlus,
  ImageUp,
  Video,
  Tag,
  FolderTree,
  Hash,
  MapPin,
  Eye,
  User,
  Link,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  MousePointer2,
  Target,
  BookOpen,
  FolderPlus,
  Clock,
  MessageSquare,
  Copyright,
  Droplet,
  Sparkles,
  Heart,
  ArrowRight,
  Check,
  FileEdit,
  Subtitles,
  Search,
  Link2,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SelectorTypeDefinition,
  SelectorInputType,
  getSelectorTypeByKey,
  SELECTOR_CATEGORIES,
  SELECTOR_TYPE_REGISTRY,
  createCustomSelectorType,
} from '@/lib/selector-types';
import {
  SelectorItem,
  PlatformSelectorConfig,
} from '@/lib/selector-defaults';

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI?: {
      isElectron: () => Promise<boolean>;
      startSelectorPicker: (url: string) => Promise<{ success: boolean; error?: string }>;
      stopSelectorPicker: () => Promise<{ success: boolean }>;
      onSelectorPicked: (callback: (data: {
        elementInfo: {
          tagName: string;
          id?: string;
          name?: string;
          className?: string;
          type?: string;
          placeholder?: string;
          text?: string;
        };
        selectors: Array<{
          selector: string;
          type: string;
          priority: number;
          description: string;
          uniqueness: number;
          validation: {
            isValid: boolean;
            count: number;
            uniqueness: number;
          };
        }>;
        timestamp: number;
      }) => void) => () => void;
      onSelectorPickerCancelled: (callback: () => void) => () => void;
      // 其他 API 方法（为了类型兼容）
      setBusinessId: (businessId: string) => Promise<boolean>;
      getSavedAccounts: (businessId?: string) => Promise<Record<string, any[]>>;
      platformLogin: (platform: string, businessId?: string) => Promise<any>;
      removeAccount: (platform: string, accountId: string) => Promise<boolean>;
      openAccountBackend: (accountId: string) => Promise<{ success: boolean; error?: string }>;
      onAccountUpdated: (callback: (account: any) => void) => () => void;
      getSchedulerStatus: () => Promise<any>;
      onTaskStarted: (callback: (data: any) => void) => () => void;
      onTaskCompleted: (callback: (data: any) => void) => () => void;
      onTaskFailed: (callback: (data: any) => void) => () => void;
      onSchedulerStatus: (callback: (data: any) => void) => () => void;
      executeTaskImmediately: (taskId: string) => Promise<{ success: boolean; error?: string }>;
      triggerSchedulerCheck: () => Promise<{ success: boolean }>;
      checkForUpdates: () => Promise<any>;
      onUpdateProgress: (callback: (p: any) => void) => () => void;
      onUpdateDownloaded: (callback: (info: any) => void) => () => void;
      onUpdateError: (callback: (err: string) => void) => () => void;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => void;
    };
  }
}

// 图标映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  FileText,
  ImagePlus,
  ImageUp,
  Video,
  Tag,
  FolderTree,
  Hash,
  MapPin,
  Eye,
  User,
  Link,
  Send,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  BookOpen,
  FolderPlus,
  Clock,
  MessageSquare,
  Copyright,
  Droplet,
  Sparkles,
  Heart,
  ArrowRight,
  Check,
  FileEdit,
  Subtitles,
  Search,
  Link2,
  Wand2,
  MousePointer2,
};

/**
 * 可排序的选择器项组件
 */
interface SortableSelectorItemProps {
  item: SelectorItem;
  index: number;
  inputType?: SelectorInputType;
  onRemove: () => void;
  onToggleEnabled: () => void;
  onUpdate: (item: SelectorItem) => void;
}

function SortableSelectorItem({
  item,
  index,
  inputType,
  onRemove,
  onToggleEnabled,
  onUpdate,
}: SortableSelectorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.selector });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border bg-background group',
        isDragging && 'opacity-50 shadow-lg',
        !item.isEnabled && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      {inputType === 'triggered-upload' ? (
        <Badge 
          variant={index === 0 ? 'default' : 'secondary'} 
          className="shrink-0"
        >
          {index === 0 ? '触发器' : `上传#${index}`}
        </Badge>
      ) : (
        <Badge variant="outline" className="shrink-0">
          #{item.priority}
        </Badge>
      )}
      
      <div className="flex-1 min-w-0">
        <Input
          value={item.selector}
          onChange={(e) => onUpdate({ ...item, selector: e.target.value })}
          className="font-mono text-sm h-8"
          placeholder="输入选择器..."
        />
      </div>
      
      <Input
        value={item.description}
        onChange={(e) => onUpdate({ ...item, description: e.target.value })}
        className="w-32 h-8 text-sm"
        placeholder="描述"
      />
      
      <div className="flex items-center gap-1 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={item.successRate >= 0.9 ? 'default' : item.successRate >= 0.7 ? 'secondary' : 'destructive'}>
                {(item.successRate * 100).toFixed(0)}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              成功率: {(item.successRate * 100).toFixed(1)}% ({item.successfulAttempts}/{item.totalAttempts})
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggleEnabled}
        >
          {item.isEnabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

/**
 * 可排序的选择器类型卡片组件
 */
interface SortableSelectorTypeCardProps {
  type: SelectorTypeDefinition;
  items: SelectorItem[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddItem: () => void;
  onUpdateItems: (items: SelectorItem[]) => void;
  onStartVisualPicker: () => void;
  isElectron?: boolean;
  isPickerActive?: boolean;
  onRemove?: () => void;
}

function SortableSelectorTypeCard({
  type,
  items,
  isExpanded,
  onToggleExpand,
  onAddItem,
  onUpdateItems,
  onStartVisualPicker,
  isElectron,
  isPickerActive,
  onRemove,
}: SortableSelectorTypeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = ICON_MAP[type.icon || 'Settings'] || Settings;
  const enabledCount = items.filter(i => i.isEnabled).length;
  const isConfigured = enabledCount > 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.selector === active.id);
      const newIndex = items.findIndex((i) => i.selector === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex).map((item: SelectorItem, idx: number) => ({
        ...item,
        priority: idx + 1,
      }));
      onUpdateItems(newItems);
    }
  };

  const handleRemoveItem = (selector: string) => {
    onUpdateItems(
      items
        .filter((i) => i.selector !== selector)
        .map((item, idx) => ({ ...item, priority: idx + 1 }))
    );
  };

  const handleToggleEnabled = (selector: string) => {
    onUpdateItems(
      items.map((i) => (i.selector === selector ? { ...i, isEnabled: !i.isEnabled } : i))
    );
  };

  const handleUpdateItem = (updatedItem: SelectorItem) => {
    onUpdateItems(
      items.map((i) => (i.selector === updatedItem.selector ? updatedItem : i))
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card 
        ref={setNodeRef}
        style={style}
        className={cn(
          'transition-all',
          type.required && !isConfigured && 'border-destructive/50 bg-destructive/5',
          isDragging && 'opacity-50 shadow-lg z-50'
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 拖拽手柄 */}
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                
                <div className={cn(
                  'p-2 rounded-lg',
                  isConfigured ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {type.name}
                    {type.required && (
                      <Badge variant="outline" className="text-xs">必填</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">{type.description}</CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <Badge variant="secondary">
                    已配置 {enabledCount} 个
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    未配置
                  </Badge>
                )}
                
                {onRemove && !type.required && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </Button>
                )}
                
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {type.required && !isConfigured && (
              <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>此选择器为必填项，请配置至少一个选择器</span>
              </div>
            )}
            
            {type.inputType === 'triggered-upload' && (
              <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>触发式上传：第1个选择器为触发按钮，后续为上传元素（按优先级排序）</span>
              </div>
            )}
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.selector)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <SortableSelectorItem
                      key={`selector-${index}-${item.selector}`}
                      item={item}
                      index={index}
                      inputType={type.inputType}
                      onRemove={() => handleRemoveItem(item.selector)}
                      onToggleEnabled={() => handleToggleEnabled(item.selector)}
                      onUpdate={handleUpdateItem}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={onAddItem}>
                <Plus className="h-4 w-4 mr-1" />
                添加选择器
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onStartVisualPicker}
                      className={isElectron ? "text-primary border-primary/50 hover:bg-primary/10" : ""}
                    >
                      {isPickerActive ? (
                        <>
                          <Target className="h-4 w-4 mr-1 animate-pulse" />
                          选择中...
                        </>
                      ) : (
                        <>
                          <MousePointer2 className="h-4 w-4 mr-1" />
                          可视化选择
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">点击元素选择选择器</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 按住 <kbd className="px-1 bg-muted rounded">Shift</kbd> 点击可正常导航（用于跨页面场景）
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * 平台选择器配置面板
 */
interface SelectorConfigPanelProps {
  config: PlatformSelectorConfig;
  selectorTypes: SelectorTypeDefinition[];
  onUpdateConfig: (config: PlatformSelectorConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onTest: () => void;
  isSaving?: boolean;
  isTesting?: boolean;
}

export function SelectorConfigPanel({
  config,
  selectorTypes,
  onUpdateConfig,
  onSave,
  onReset,
  onTest,
  isSaving,
  isTesting,
}: SelectorConfigPanelProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showVisualPicker, setShowVisualPicker] = useState(false);
  const [currentPickerType, setCurrentPickerType] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<any>(null);
  const [availableSelectors, setAvailableSelectors] = useState<any[]>([]);
  const [showSelectorDialog, setShowSelectorDialog] = useState(false);
  
  // 添加选择器类型对话框状态
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeKey, setCustomTypeKey] = useState('');
  const [customTypeCategory, setCustomTypeCategory] = useState<string>('metadata');
  const [customTypeRequired, setCustomTypeRequired] = useState(false);

  // 检测是否在 Electron 环境
  useEffect(() => {
    const checkElectron = async () => {
      const result = await window.electronAPI?.isElectron?.() ?? false;
      setIsElectron(result);
    };
    checkElectron();
  }, []);

  // 监听选择器选中事件
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubPicked = window.electronAPI.onSelectorPicked((data) => {
      console.log('[SelectorConfig] Element picked:', data);
      setSelectedElementInfo(data.elementInfo);
      setAvailableSelectors(data.selectors);
      setShowSelectorDialog(true);
      setIsPickerActive(false);
    });

    const unsubCancelled = window.electronAPI.onSelectorPickerCancelled(() => {
      console.log('[SelectorConfig] Picker cancelled');
      setIsPickerActive(false);
    });

    return () => {
      unsubPicked();
      unsubCancelled();
    };
  }, [isElectron]);

  const toggleExpand = (key: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddItem = (typeKey: string) => {
    const currentItems = config.selectors[typeKey] || [];
    const newItem: SelectorItem = {
      selector: '',
      priority: currentItems.length + 1,
      description: '',
      successRate: 0.5,
      totalAttempts: 0,
      successfulAttempts: 0,
      isEnabled: true,
    };
    
    onUpdateConfig({
      ...config,
      selectors: {
        ...config.selectors,
        [typeKey]: [...currentItems, newItem],
      },
    });
  };

  const handleUpdateItems = (typeKey: string, items: SelectorItem[]) => {
    onUpdateConfig({
      ...config,
      selectors: {
        ...config.selectors,
        [typeKey]: items,
      },
    });
  };

  const handleStartVisualPicker = async (typeKey: string) => {
    setCurrentPickerType(typeKey);

    // Electron 环境：使用原生可视化选择
    if (isElectron && window.electronAPI && config.publishUrl) {
      setIsPickerActive(true);
      const result = await window.electronAPI.startSelectorPicker(config.publishUrl);
      if (!result.success) {
        console.error('[SelectorConfig] Failed to start picker:', result.error);
        setIsPickerActive(false);
      }
    } else {
      // Web 环境：显示提示对话框
      setShowVisualPicker(true);
    }
  };

  const handleSelectSelector = (selector: any) => {
    if (!currentPickerType) return;
    
    const type = getSelectorTypeByKey(currentPickerType);
    const currentItems = config.selectors[currentPickerType] || [];
    const newItem: SelectorItem = {
      selector: selector.selector,
      priority: currentItems.length + 1,
      description: selector.description || type?.name || '',
      successRate: selector.validation?.uniqueness || 0.5,
      totalAttempts: 0,
      successfulAttempts: 0,
      isEnabled: true,
    };
    
    onUpdateConfig({
      ...config,
      selectors: {
        ...config.selectors,
        [currentPickerType]: [...currentItems, newItem],
      },
    });
    
    setShowSelectorDialog(false);
    setSelectedElementInfo(null);
    setAvailableSelectors([]);
    setCurrentPickerType(null);
  };

  const handleVisualPickerSelect = (selector: string) => {
    if (!currentPickerType) return;
    
    const type = getSelectorTypeByKey(currentPickerType);
    const currentItems = config.selectors[currentPickerType] || [];
    const newItem: SelectorItem = {
      selector,
      priority: currentItems.length + 1,
      description: type?.name || '',
      successRate: 0.5,
      totalAttempts: 0,
      successfulAttempts: 0,
      isEnabled: true,
    };
    
    onUpdateConfig({
      ...config,
      selectors: {
        ...config.selectors,
        [currentPickerType]: [...currentItems, newItem],
      },
    });
    
    setShowVisualPicker(false);
    setCurrentPickerType(null);
  };

  // 获取可添加的选择器类型（排除已添加的）
  const availableTypesToAdd = React.useMemo(() => {
    const existingKeys = new Set(selectorTypes.map(t => t.key));
    return SELECTOR_TYPE_REGISTRY.filter(t => !existingKeys.has(t.key));
  }, [selectorTypes]);

  // 从注册表添加选择器类型
  const handleAddTypeFromRegistry = (typeKey: string) => {
    const type = getSelectorTypeByKey(typeKey);
    if (!type) return;
    
    onUpdateConfig({
      ...config,
      selectorTypes: [...config.selectorTypes, typeKey],
      selectors: {
        ...config.selectors,
        [typeKey]: [],
      },
    });
    
    // 展开新添加的类型
    setExpandedTypes(prev => new Set([...prev, typeKey]));
    setShowAddTypeDialog(false);
  };

  // 添加自定义选择器类型
  const handleAddCustomType = () => {
    if (!customTypeName.trim() || !customTypeKey.trim()) return;
    
    // 生成唯一的 key
    const finalKey = customTypeKey.trim().replace(/\s+/g, '_').toLowerCase();
    
    // 检查 key 是否已存在
    if (selectorTypes.some(t => t.key === finalKey)) {
      return; // key 已存在
    }
    
    const customType = createCustomSelectorType(finalKey, customTypeName.trim(), {
      description: `自定义选择器: ${customTypeName}`,
      required: customTypeRequired,
      category: customTypeCategory as any,
      inputType: 'text',
      multiple: true,
    });
    
    // 更新配置
    onUpdateConfig({
      ...config,
      selectorTypes: [...config.selectorTypes, finalKey],
      selectors: {
        ...config.selectors,
        [finalKey]: [],
      },
    });
    
    // 展开新添加的类型
    setExpandedTypes(prev => new Set([...prev, finalKey]));
    
    // 重置表单
    setCustomTypeName('');
    setCustomTypeKey('');
    setCustomTypeCategory('metadata');
    setCustomTypeRequired(false);
    setShowAddTypeDialog(false);
  };

  // 处理选择器类型卡片拖拽排序
  const handleTypeDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = config.selectorTypes.indexOf(active.id as string);
      const newIndex = config.selectorTypes.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSelectorTypes = arrayMove(config.selectorTypes, oldIndex, newIndex);
        onUpdateConfig({
          ...config,
          selectorTypes: newSelectorTypes,
        });
      }
    }
  };

  // 移除选择器类型
  const handleRemoveType = (typeKey: string) => {
    const newSelectorTypes = config.selectorTypes.filter(t => t !== typeKey);
    const newSelectors = { ...config.selectors };
    delete newSelectors[typeKey];
    
    onUpdateConfig({
      ...config,
      selectorTypes: newSelectorTypes,
      selectors: newSelectors,
    });
    
    // 从展开列表中移除
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.delete(typeKey);
      return next;
    });
  };

  // 按配置中的 selectorTypes 顺序获取类型定义
  const orderedTypes = React.useMemo(() => {
    return config.selectorTypes
      .map(key => selectorTypes.find(t => t.key === key))
      .filter((type): type is SelectorTypeDefinition => type !== undefined);
  }, [config.selectorTypes, selectorTypes]);

  // 按分类分组（用于显示分类标题）
  const groupedTypes = React.useMemo(() => {
    const groups: Record<string, SelectorTypeDefinition[]> = {};
    for (const type of orderedTypes) {
      const category = type.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(type);
    }
    return groups;
  }, [orderedTypes]);

  // 计算配置完成度
  const stats = React.useMemo(() => {
    const required = selectorTypes.filter(t => t.required);
    const configured = required.filter(t => {
      const items = config.selectors[t.key];
      return items && items.some((i: SelectorItem) => i.isEnabled);
    });
    return {
      total: selectorTypes.length,
      configured: Object.values(config.selectors).filter(
        (items: SelectorItem[]) => items && items.some((i: SelectorItem) => i.isEnabled)
      ).length,
      required: required.length,
      requiredConfigured: configured.length,
    };
  }, [selectorTypes, config.selectors]);

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-muted-foreground">配置完成度</p>
            <p className="text-2xl font-bold">
              {stats.requiredConfigured}/{stats.required}
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-sm text-muted-foreground">总选择器数</p>
            <p className="text-2xl font-bold">{stats.configured}/{stats.total}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={isSaving}>
            <RefreshCw className="h-4 w-4 mr-1" />
            重置为默认
          </Button>
          <Button variant="outline" size="sm" onClick={onTest} disabled={isTesting}>
            {isTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            测试配置
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            保存配置
          </Button>
        </div>
      </div>

      {/* 选择器类型配置 - 支持拖拽排序 */}
      <DndContext
        sensors={useSensors(
          useSensor(PointerSensor),
          useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
          })
        )}
        collisionDetection={closestCenter}
        onDragEnd={handleTypeDragEnd}
      >
        <SortableContext
          items={config.selectorTypes}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedTypes.map((type) => (
              <SortableSelectorTypeCard
                key={type.key}
                type={type}
                items={config.selectors[type.key] || []}
                isExpanded={expandedTypes.has(type.key)}
                onToggleExpand={() => toggleExpand(type.key)}
                onAddItem={() => handleAddItem(type.key)}
                onUpdateItems={(items) => handleUpdateItems(type.key, items)}
                onStartVisualPicker={() => handleStartVisualPicker(type.key)}
                isElectron={isElectron}
                isPickerActive={isPickerActive}
                onRemove={!type.required ? () => handleRemoveType(type.key) : undefined}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 添加选择器类型按钮 */}
      <div className="flex justify-center pt-2">
        <Button 
          variant="outline" 
          onClick={() => setShowAddTypeDialog(true)}
          className="w-full max-w-md"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          添加选择器类型
        </Button>
      </div>

      {/* 选择器选择对话框（Electron 环境点击元素后显示） */}
      <Dialog open={showSelectorDialog} onOpenChange={setShowSelectorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择选择器</DialogTitle>
            <DialogDescription>
              从生成的选择器中选择一个使用，优先选择唯一性高的选择器
            </DialogDescription>
          </DialogHeader>
          
          {selectedElementInfo && (
            <div className="p-3 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">元素:</span>
                <Badge variant="outline">{selectedElementInfo.tagName.toLowerCase()}</Badge>
                {selectedElementInfo.id && (
                  <code className="text-xs bg-background px-1 rounded">#{selectedElementInfo.id}</code>
                )}
                {selectedElementInfo.className && (
                  <code className="text-xs bg-background px-1 rounded truncate max-w-[200px]">
                    .{selectedElementInfo.className.split(/\s+/)[0]}
                  </code>
                )}
              </div>
              {selectedElementInfo.placeholder && (
                <div className="text-xs text-muted-foreground mt-1">
                  placeholder: "{selectedElementInfo.placeholder}"
                </div>
              )}
              {selectedElementInfo.text && (
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  文本: "{selectedElementInfo.text.substring(0, 50)}..."
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {availableSelectors.map((selector, index) => (
              <div
                key={`available-${index}-${selector.selector}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-primary hover:bg-primary/5',
                  selector.validation?.isValid && selector.validation.count === 1
                    ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
                    : selector.validation?.isValid
                    ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20'
                    : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'
                )}
                onClick={() => handleSelectSelector(selector)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">#{index + 1}</Badge>
                    <code className="text-sm font-mono truncate">{selector.selector}</code>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{selector.description}</span>
                    <span>•</span>
                    <span>{selector.type}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {selector.validation?.isValid ? (
                    selector.validation.count === 1 ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        唯一
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {selector.validation.count} 个匹配
                      </Badge>
                    )
                  ) : (
                    <Badge variant="destructive">无效</Badge>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {(selector.uniqueness * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
            
            {availableSelectors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                没有可用的选择器
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSelectorDialog(false);
                setSelectedElementInfo(null);
                setAvailableSelectors([]);
              }}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Web 环境提示对话框 */}
      <Dialog open={showVisualPicker} onOpenChange={setShowVisualPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>可视化选择器</DialogTitle>
            <DialogDescription>
              可视化选择功能仅在桌面客户端中可用
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center py-6">
            <ExternalLink className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              请下载并安装桌面客户端以使用可视化选择功能
            </p>
            <p className="text-xs text-muted-foreground">
              安装后，您可以点击页面元素自动生成选择器
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisualPicker(false)}>
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加选择器类型对话框 */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>添加选择器类型</DialogTitle>
            <DialogDescription>
              从预设类型中选择或自定义创建新的选择器类型
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* 预设选择器类型 */}
            {availableTypesToAdd.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">预设选择器类型</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableTypesToAdd.map((type) => {
                    const Icon = ICON_MAP[type.icon || 'Settings'] || Settings;
                    return (
                      <div
                        key={type.key}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                        onClick={() => handleAddTypeFromRegistry(type.key)}
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{type.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {type.description}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 自定义选择器类型 */}
            <div>
              <h4 className="text-sm font-medium mb-2">自定义选择器类型</h4>
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">名称 *</label>
                    <Input
                      value={customTypeName}
                      onChange={(e) => setCustomTypeName(e.target.value)}
                      placeholder="如：商品链接"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">标识 *</label>
                    <Input
                      value={customTypeKey}
                      onChange={(e) => setCustomTypeKey(e.target.value)}
                      placeholder="如：productLink"
                      className="h-9 font-mono"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">分类</label>
                    <Select value={customTypeCategory} onValueChange={setCustomTypeCategory}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content">内容相关</SelectItem>
                        <SelectItem value="media">媒体相关</SelectItem>
                        <SelectItem value="metadata">元数据</SelectItem>
                        <SelectItem value="action">操作按钮</SelectItem>
                        <SelectItem value="verification">验证相关</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">必填</label>
                    <div className="flex items-center h-9">
                      <Button
                        type="button"
                        variant={customTypeRequired ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCustomTypeRequired(!customTypeRequired)}
                      >
                        {customTypeRequired ? '是' : '否'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomTypeName('');
                      setCustomTypeKey('');
                      setCustomTypeCategory('metadata');
                      setCustomTypeRequired(false);
                    }}
                  >
                    重置
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddCustomType}
                    disabled={!customTypeName.trim() || !customTypeKey.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加自定义类型
                  </Button>
                </div>
              </div>
            </div>

            {availableTypesToAdd.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                所有预设类型已添加，您可以创建自定义类型
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTypeDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SelectorConfigPanel;
