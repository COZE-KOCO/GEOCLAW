'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar } from '@/components/sidebar';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (feedback.trim()) {
      setSubmitted(true);
      setFeedback('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              提意见
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              我们非常重视您的反馈，帮助我们改进产品
            </p>
          </div>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-white">提交反馈</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">感谢您的反馈！</h3>
                  <p className="text-slate-500 dark:text-slate-400">我们会认真阅读并持续改进</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="请告诉我们您的建议或遇到的问题..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={6}
                    className="border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSubmit}
                      disabled={!feedback.trim()}
                      className="bg-purple-500 hover:bg-purple-600 gap-2"
                    >
                      <Send className="h-4 w-4" />
                      提交反馈
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 常见问题 */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 dark:text-white">常见问题</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">Q: 如何升级套餐？</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">A: 进入"我的套餐"页面，选择合适的套餐进行订阅。</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">Q: 支持哪些发布平台？</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">A: 目前支持微信公众号、知乎、微博、B站等主流平台。</p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-800 dark:text-white">Q: GEO评分是如何计算的？</h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">A: 基于内容质量、关键词覆盖、结构化数据等多维度综合评估。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
