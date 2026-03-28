import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProjectById } from '@/lib/project-store';
import { generateArticleSchema } from '@/lib/schema-generator';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Tag, ExternalLink } from 'lucide-react';
import { ContentActions } from '@/components/content-actions';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);
  
  if (!project) {
    return {
      title: '内容不存在'
    };
  }

  const keywords = project.keywords.join(', ');
  
  return {
    title: project.title,
    description: project.content.substring(0, 160),
    keywords: keywords,
    authors: project.author ? [{ name: project.author }] : undefined,
    openGraph: {
      title: project.title,
      description: project.content.substring(0, 160),
      type: 'article',
      publishedTime: project.createdAt.toISOString(),
      modifiedTime: project.updatedAt.toISOString(),
      authors: project.author ? [project.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.content.substring(0, 160),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ContentPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  
  if (!project) {
    notFound();
  }

  // 生成Schema.org结构化数据
  const articleSchema = generateArticleSchema({
    title: project.title,
    content: project.content,
    author: project.author,
    publishDate: project.createdAt.toISOString(),
    modifiedDate: project.updatedAt.toISOString(),
  });

  // 将内容按段落分割
  const paragraphs = project.content.split('\n\n').filter(p => p.trim());

  return (
    <>
      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema)
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* 导航 */}
        <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
                GEO优化平台
              </Link>
              <Link 
                href="/projects"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                查看所有项目
              </Link>
            </div>
          </div>
        </nav>

        {/* 主要内容 */}
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          {/* 标题区 */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {project.title}
            </h1>
            
            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              {project.author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{project.author}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={project.createdAt.toISOString()}>
                  {project.createdAt.toLocaleDateString('zh-CN')}
                </time>
              </div>
              <div className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                <span>GEO评分: {project.score.toFixed(1)}</span>
              </div>
            </div>

            {/* 关键词标签 */}
            {project.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </header>

          {/* 文章正文 */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            {paragraphs.map((paragraph, index) => {
              // 检测标题
              if (paragraph.startsWith('# ')) {
                return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{paragraph.substring(2)}</h1>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{paragraph.substring(3)}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={index} className="text-xl font-bold mt-4 mb-2">{paragraph.substring(4)}</h3>;
              }
              
              // 检测列表
              if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                const items = paragraph.split('\n').filter(item => item.trim());
                const isOrdered = items[0].match(/^\d+\./);
                
                return isOrdered ? (
                  <ol key={index} className="list-decimal list-inside space-y-2 my-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700 dark:text-gray-300">
                        {item.replace(/^\d+\.\s*/, '')}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul key={index} className="list-disc list-inside space-y-2 my-4">
                    {items.map((item, i) => (
                      <li key={i} className="text-gray-700 dark:text-gray-300">
                        {item.replace(/^-\s*/, '')}
                      </li>
                    ))}
                  </ul>
                );
              }
              
              // 普通段落
              return (
                <p key={index} className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* 引用来源 */}
          {project.references.length > 0 && (
            <section className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                参考来源
              </h2>
              <ul className="space-y-2">
                {project.references.map((ref, index) => (
                  <li key={index}>
                    <a 
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {ref}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 评分详情 */}
          <section className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              GEO优化评分详情（九维度）
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">问题导向</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.problemOriented.toFixed(2)}/2
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">AI识别友好</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.aiRecognition.toFixed(2)}/2
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">人性化表达</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.humanizedExpression.toFixed(2)}/1.5
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">内容质量</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.contentQuality.toFixed(2)}/1.5
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">信任权威</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.trustAuthority.toFixed(2)}/1
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">精准引用</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.preciseCitation.toFixed(2)}/0.5
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">结构化数据</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.structuredData.toFixed(2)}/0.5
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">多平台适配</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.multiPlatform.toFixed(2)}/0.5
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-600 dark:text-gray-400">SEO关键词</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.breakdown.seoKeywords.toFixed(2)}/0.5
                </div>
              </div>
            </div>
          </section>

          {/* 分享按钮 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
            <ContentActions projectId={project.id} title={project.title} />
          </div>
        </article>

        {/* 页脚 */}
        <footer className="border-t border-gray-200 dark:border-gray-700 py-8 mt-12">
          <div className="container mx-auto px-4 max-w-4xl text-center text-sm text-gray-600 dark:text-gray-400">
            <p>本文已优化GEO（生成式引擎优化），更容易被AI引擎引用</p>
            <p className="mt-2">
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                创建您自己的GEO优化内容 →
              </Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
