'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileQuestion, 
  GitCompare, 
  BookOpen, 
  Briefcase, 
  LineChart,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { getAllTemplates, type ContentTemplate } from '@/lib/content-templates';

interface TemplateSelectorProps {
  onSelectTemplate: (template: ContentTemplate) => void;
}

const templateIcons = {
  qna: FileQuestion,
  comparison: GitCompare,
  guide: BookOpen,
  case: Briefcase,
  report: LineChart,
};

const templateColors = {
  qna: 'border-blue-300 hover:border-blue-500',
  comparison: 'border-green-300 hover:border-green-500',
  guide: 'border-purple-300 hover:border-purple-500',
  case: 'border-amber-300 hover:border-amber-500',
  report: 'border-cyan-300 hover:border-cyan-500',
};

export function TemplateSelector({ onSelectTemplate }: TemplateSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const templates = getAllTemplates();

  const handleUseTemplate = (template: ContentTemplate) => {
    onSelectTemplate(template);
  };

  const handleCopyExample = (template: ContentTemplate) => {
    const fullExample = `${template.example.title}\n\n${template.example.content}`;
    navigator.clipboard.writeText(fullExample);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileQuestion className="h-4 w-4" />
          选择模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">选择内容模板</DialogTitle>
          <DialogDescription>
            基于阿里云GEO优化指南的"爆款公式"，选择适合您的内容类型
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* 模板概览 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {templates.map((template) => {
              const Icon = templateIcons[template.type];
              const isSelected = selectedType === template.type;
              
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    templateColors[template.type]
                  } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedType(template.type)}
                >
                  <CardContent className="pt-4 text-center">
                    <Icon className={`h-8 w-8 mx-auto mb-2 ${
                      isSelected ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <div className="font-medium text-sm">{template.name.replace('模板', '')}</div>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {template.aiReferenceRate}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 选中模板详情 */}
          {selectedType && (() => {
            const template = templates.find(t => t.type === selectedType);
            if (!template) return null;
            
            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      AI引用率 {template.aiReferenceRate}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="structure">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="structure">结构说明</TabsTrigger>
                      <TabsTrigger value="example">示例内容</TabsTrigger>
                      <TabsTrigger value="tips">优化技巧</TabsTrigger>
                    </TabsList>

                    <TabsContent value="structure" className="mt-4">
                      <div className="space-y-3">
                        {template.structure.map((section, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              section.required 
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' 
                                : 'bg-gray-50 border-gray-200 dark:bg-gray-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium flex items-center gap-2">
                                {section.required && (
                                  <span className="text-red-500">*</span>
                                )}
                                {section.title}
                              </div>
                              <span className="text-xs text-gray-500">
                                {section.wordCount.min}-{section.wordCount.max}字
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {section.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {section.elements.map((element, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {element}
                                </Badge>
                              ))}
                            </div>
                            {section.example && (
                              <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs text-gray-500">
                                示例：{section.example}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="example" className="mt-4">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleCopyExample(template)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          复制
                        </Button>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <h4 className="font-bold text-lg mb-3">
                            {template.example.title}
                          </h4>
                          <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                            {template.example.content}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="tips" className="mt-4">
                      <div className="space-y-2">
                        {template.tips.map((tip, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{tip}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h5 className="font-semibold mb-2">适用场景</h5>
                        <div className="flex flex-wrap gap-2">
                          {template.bestFor.map((use, index) => (
                            <Badge key={index} variant="outline">
                              {use}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3 mt-6">
                    <Button
                      className="flex-1"
                      onClick={() => handleUseTemplate(template)}
                    >
                      使用此模板
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCopyExample(template)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      复制示例
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 未选择时的提示 */}
          {!selectedType && (
            <div className="text-center py-8 text-gray-500">
              <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>点击上方卡片查看模板详情</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
