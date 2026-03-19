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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Code, 
  Copy, 
  CheckCircle2,
  FileJson,
} from 'lucide-react';
import { 
  generateArticleSchema, 
  generateFAQSchema, 
  generateProductSchema,
  generateHowToSchema,
  generateLocalBusinessSchema,
} from '@/lib/schema-generator';

interface SchemaGeneratorProps {
  defaultTitle?: string;
  defaultContent?: string;
  defaultAuthor?: string;
  onSchemaGenerated?: (schema: string) => void;
}

type SchemaType = 'article' | 'faq' | 'product' | 'howto' | 'localbusiness';

export function SchemaGenerator({ 
  defaultTitle = '',
  defaultContent = '',
  defaultAuthor = '',
  onSchemaGenerated,
}: SchemaGeneratorProps) {
  const [schemaType, setSchemaType] = useState<SchemaType>('article');
  const [copied, setCopied] = useState(false);
  
  // Article字段
  const [title, setTitle] = useState(defaultTitle);
  const [author, setAuthor] = useState(defaultAuthor);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  
  // FAQ字段
  const [faqs, setFaqs] = useState([{ question: '', answer: '' }]);
  
  // Product字段
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  
  // HowTo字段
  const [howToName, setHowToName] = useState('');
  const [howToDesc, setHowToDesc] = useState('');
  const [howToSteps, setHowToSteps] = useState([{ name: '', text: '' }]);
  
  // LocalBusiness字段
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  const addFAQ = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const updateFAQ = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
  };

  const addStep = () => {
    setHowToSteps([...howToSteps, { name: '', text: '' }]);
  };

  const updateStep = (index: number, field: 'name' | 'text', value: string) => {
    const newSteps = [...howToSteps];
    newSteps[index][field] = value;
    setHowToSteps(newSteps);
  };

  const generateSchema = () => {
    let schema: object;

    switch (schemaType) {
      case 'article':
        schema = generateArticleSchema({
          title,
          content: defaultContent,
          author,
          publishDate,
        });
        break;

      case 'faq':
        schema = generateFAQSchema(faqs.filter(f => f.question && f.answer));
        break;

      case 'product':
        schema = generateProductSchema({
          name: productName,
          description: productDesc,
          price: productPrice ? parseFloat(productPrice) : undefined,
        });
        break;

      case 'howto':
        schema = generateHowToSchema({
          name: howToName,
          description: howToDesc,
          steps: howToSteps.filter(s => s.name && s.text),
        });
        break;

      case 'localbusiness':
        schema = generateLocalBusinessSchema({
          name: businessName,
          address: businessAddress,
          telephone: businessPhone,
        });
        break;

      default:
        schema = {};
    }

    return JSON.stringify(schema, null, 2);
  };

  const handleCopy = () => {
    const schema = generateSchema();
    navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    const schema = generateSchema();
    onSchemaGenerated?.(schema);
  };

  const renderForm = () => {
    switch (schemaType) {
      case 'article':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>文章标题</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入文章标题"
              />
            </div>
            <div className="space-y-2">
              <Label>作者</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="作者名称"
              />
            </div>
            <div className="space-y-2">
              <Label>发布日期</Label>
              <Input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>常见问题</Label>
              <Button variant="outline" size="sm" onClick={addFAQ}>
                添加问题
              </Button>
            </div>
            {faqs.map((faq, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <Input
                  value={faq.question}
                  onChange={(e) => updateFAQ(index, 'question', e.target.value)}
                  placeholder="问题"
                />
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateFAQ(index, 'answer', e.target.value)}
                  placeholder="答案"
                  rows={2}
                />
              </div>
            ))}
          </div>
        );

      case 'product':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>产品名称</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="产品名称"
              />
            </div>
            <div className="space-y-2">
              <Label>产品描述</Label>
              <Textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="产品详细描述"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>价格（元）</Label>
              <Input
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="价格"
              />
            </div>
          </div>
        );

      case 'howto':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>指南名称</Label>
              <Input
                value={howToName}
                onChange={(e) => setHowToName(e.target.value)}
                placeholder="如：激光切割机操作指南"
              />
            </div>
            <div className="space-y-2">
              <Label>简介</Label>
              <Textarea
                value={howToDesc}
                onChange={(e) => setHowToDesc(e.target.value)}
                placeholder="简要说明"
                rows={2}
              />
            </div>
            <div className="flex justify-between items-center">
              <Label>操作步骤</Label>
              <Button variant="outline" size="sm" onClick={addStep}>
                添加步骤
              </Button>
            </div>
            {howToSteps.map((step, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">步骤 {index + 1}</Badge>
                  <Input
                    value={step.name}
                    onChange={(e) => updateStep(index, 'name', e.target.value)}
                    placeholder="步骤名称"
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={step.text}
                  onChange={(e) => updateStep(index, 'text', e.target.value)}
                  placeholder="详细说明"
                  rows={2}
                />
              </div>
            ))}
          </div>
        );

      case 'localbusiness':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>商家名称</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="企业或店铺名称"
              />
            </div>
            <div className="space-y-2">
              <Label>地址</Label>
              <Input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="详细地址"
              />
            </div>
            <div className="space-y-2">
              <Label>联系电话</Label>
              <Input
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="联系电话"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Code className="h-4 w-4" />
          生成Schema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Schema.org 结构化数据生成器
          </DialogTitle>
          <DialogDescription>
            生成符合Schema.org规范的结构化数据，提升AI识别率
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左侧：表单 */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'article' as SchemaType, label: '文章' },
                { type: 'faq' as SchemaType, label: 'FAQ' },
                { type: 'product' as SchemaType, label: '产品' },
                { type: 'howto' as SchemaType, label: '指南' },
                { type: 'localbusiness' as SchemaType, label: '商家' },
              ].map(({ type, label }) => (
                <Badge
                  key={type}
                  variant={schemaType === type ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSchemaType(type)}
                >
                  {label}
                </Badge>
              ))}
            </div>

            {renderForm()}
          </div>

          {/* 右侧：预览 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>生成的Schema (JSON-LD)</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </>
                )}
              </Button>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs">{generateSchema()}</pre>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">使用说明</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>1. 填写表单生成Schema</li>
                <li>2. 复制生成的JSON-LD代码</li>
                <li>3. 粘贴到HTML的&lt;head&gt;标签中</li>
                <li>4. 或添加到页面的script标签中</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            复制代码
          </Button>
          {onSchemaGenerated && (
            <Button onClick={handleInsert}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              应用到内容
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
