'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSearch,
  Loader2,
} from 'lucide-react';

interface AuditIssue {
  type: 'sensitive' | 'advertising' | 'quality' | 'format' | 'legal';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  position?: { start: number; end: number };
  suggestion?: string;
}

interface AuditResult {
  passed: boolean;
  score: number;
  issues: AuditIssue[];
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface ContentAuditProps {
  content: string;
  industry?: string;
  platform?: string;
  onAuditComplete?: (result: AuditResult) => void;
}

export function ContentAudit({
  content,
  industry,
  platform,
  onAuditComplete,
}: ContentAuditProps) {
  const [selectedIndustry, setSelectedIndustry] = useState(industry || undefined);
  const [selectedPlatform, setSelectedPlatform] = useState(platform || undefined);
  const [auditing, setAuditing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [open, setOpen] = useState(false);

  const industries = ['医疗健康', '金融理财', '教育培训', '食品保健', '电子商务', '智能制造'];
  const platforms = ['知乎', '小红书', '微信公众号', '今日头条', '百家号', '微博'];

  const runAudit = async () => {
    if (!content) return;

    setAuditing(true);
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          industry: selectedIndustry,
          platform: selectedPlatform,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data.audit);
        onAuditComplete?.(data.data.audit);
      }
    } catch (error) {
      console.error('审核失败:', error);
    } finally {
      setAuditing(false);
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge className="bg-green-500">低风险</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">中风险</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">高风险</Badge>;
      case 'critical':
        return <Badge className="bg-red-500">极高风险</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sensitive: '敏感词',
      advertising: '虚假宣传',
      quality: '内容质量',
      format: '格式规范',
      legal: '合规风险',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          内容审核
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            内容合规审核
          </DialogTitle>
          <DialogDescription>
            检测敏感词、虚假宣传、内容质量等问题
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* 选项 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <span className="text-sm text-gray-500 mb-1 block">行业</span>
              <Select value={selectedIndustry || ''} onValueChange={setSelectedIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="选择行业（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <span className="text-sm text-gray-500 mb-1 block">平台</span>
              <Select value={selectedPlatform || ''} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="选择平台（可选）" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(plat => (
                    <SelectItem key={plat} value={plat}>{plat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 审核按钮 */}
          <Button
            onClick={runAudit}
            disabled={!content || auditing}
            className="w-full"
          >
            {auditing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                审核中...
              </>
            ) : (
              <>
                <FileSearch className="h-4 w-4 mr-2" />
                开始审核
              </>
            )}
          </Button>

          {/* 审核结果 */}
          {result && (
            <div className="space-y-4">
              {/* 评分卡 */}
              <Card className={result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <span className="text-lg font-semibold">
                          {result.passed ? '审核通过' : '审核未通过'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        安全评分: {result.score}/100
                      </p>
                    </div>
                    <div className="text-right">
                      {getRiskBadge(result.riskLevel)}
                      <Progress 
                        value={result.score} 
                        className={`w-24 h-2 mt-2 ${
                          result.score >= 80 ? 'bg-green-100' :
                          result.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 问题列表 */}
              {result.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">检测到的问题 ({result.issues.length})</h4>
                  {result.issues.map((issue, index) => (
                    <Alert
                      key={index}
                      className={
                        issue.severity === 'critical' ? 'border-red-200 bg-red-50' :
                        issue.severity === 'error' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      }
                    >
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getTypeLabel(issue.type)}</span>
                            <Badge variant="outline">{issue.severity}</Badge>
                          </div>
                          <p className="text-sm mt-1">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-sm text-gray-600 mt-1">
                              💡 {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}

              {/* 建议 */}
              {result.suggestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">优化建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1">
                      {result.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
