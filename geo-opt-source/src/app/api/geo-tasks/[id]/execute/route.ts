import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { LLMClient, Config, SearchClient, HeaderUtils } from 'coze-coding-dev-sdk';
import { SUPPORTED_PLATFORMS } from '@/lib/geo-analysis-service';

/**
 * POST /api/geo-tasks/[id]/execute - 执行分析任务
 * 
 * 后台执行分析任务，每个问题在每个平台生成一个分析结果
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  
  try {
    // 获取任务信息
    const { data: task, error: taskError } = await supabase
      .from('geo_analysis_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 检查任务状态
    if (task.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: '任务已完成',
        data: task,
      });
    }

    if (task.status === 'processing') {
      return NextResponse.json({
        success: true,
        message: '任务正在执行中',
        data: { status: 'processing', progress: task.progress },
      });
    }

    // 更新任务状态为处理中
    await supabase
      .from('geo_analysis_tasks')
      .update({ 
        status: 'processing', 
        started_at: new Date().toISOString() 
      })
      .eq('id', id);

    const questions = task.selected_questions || [];
    const platforms = task.selected_platforms || [];
    const results: any[] = [];
    const config = new Config();

    // 逐个问题执行分析
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionText = question.question || question;
      
      try {
        // 对每个选中的平台执行分析
        for (const platformId of platforms) {
          const platform = SUPPORTED_PLATFORMS.find(p => p.id === platformId);
          
          try {
            // 1. 为每个平台创建独立的搜索客户端
            const searchClient = new SearchClient(config);
            
            // 2. 根据平台策略使用不同的搜索配置
            const searchStrategy = platform?.searchStrategy;
            let searchResponse;
            
            // 不同平台使用不同的搜索策略
            if (platformId === 'deepseek') {
              // DeepSeek：添加"推荐""评测"等关键词，偏向客观分析
              const enhancedQuery = `${questionText} 推荐 评测`;
              searchResponse = await searchClient.advancedSearch(enhancedQuery, {
                count: 12,
                needSummary: true,
                timeRange: '1m',
              });
            } else if (platformId === 'kimi') {
              // Kimi：添加"最新""新闻"等关键词，偏向时效性内容
              const enhancedQuery = `${questionText} 最新 资讯`;
              searchResponse = await searchClient.advancedSearch(enhancedQuery, {
                count: 12,
                needSummary: true,
                timeRange: '1w',
              });
            } else {
              // 豆包：使用原问题搜索，综合全网
              searchResponse = await searchClient.webSearch(questionText, 12, true);
            }
            
            // 3. 提取搜索结果作为引用资料
            const references = (searchResponse.web_items || []).map(item => ({
              title: item.title || '',
              url: item.url || '',
              source: item.site_name || '',
              snippet: item.snippet || '',
              summary: item.summary || '',
            }));
            
            // 4. 格式化搜索结果作为AI上下文
            const searchContext = references.map((ref, idx) => 
              `[${idx + 1}] ${ref.title}\n来源: ${ref.source}\n摘要: ${ref.snippet}\n链接: ${ref.url}`
            ).join('\n\n');
            
            // 5. 让AI基于搜索结果回答
            const llmClient = new LLMClient(config, {});
            
            const messages = [
              { 
                role: 'system' as const, 
                content: `你是一个专业的AI助手。请基于提供的搜索结果回答用户问题。

回答要求：
1. 综合搜索结果中的信息，给出客观、详细的回答
2. 在回答中引用具体来源时，使用 [1]、[2] 等标注对应搜索结果编号
3. 如果问题涉及品牌或产品，请提及具体品牌名称
4. 回答要有条理，分点说明

搜索结果：
${searchContext}` 
              },
              { role: 'user' as const, content: questionText },
            ];

            const response = await llmClient.invoke(messages, { 
              model: platform?.model,
              temperature: platform?.temperature || 0.7
            });
            
            const answer = response.content;
            
            // 6. 提取回答中的洞察信息
            const extractedData = extractAnswerInsights(answer, task.target_brand);
            
            // 7. 判断是否引用了目标品牌
            const citedBrand = task.target_brand && answer.includes(task.target_brand) 
              ? task.target_brand 
              : null;
            
            results.push({
              id: `${i}-${platformId}`,
              question: questionText,
              category: question.category || '相关问题',
              platform: platformId,
              platformName: platform?.name,
              platformIcon: platform?.icon,
              cited: references.length > 0,
              citedBrand: citedBrand,
              // 主要引用（第一个搜索结果）
              title: references[0]?.title || null,
              url: references[0]?.url || null,
              mediaSource: references[0]?.source || null,
              // 所有引用资料（真实搜索结果）
              references: references,
              // 回答洞察
              keyPoints: extractedData.keyPoints,
              mentionedBrands: extractedData.mentionedBrands,
              confidence: extractedData.confidence,
              rawResponse: answer,
              contentDescription: searchResponse.summary || extractedData.summary,
              visibility: extractedData.confidence,
              sentiment: extractedData.sentiment,
            });
            
          } catch (platformError) {
            console.error(`平台 ${platformId} 分析失败:`, platformError);
            results.push({
              id: `${i}-${platformId}`,
              question: questionText,
              category: question.category || '相关问题',
              platform: platformId,
              platformName: platform?.name,
              platformIcon: platform?.icon,
              cited: false,
              error: '分析失败: ' + (platformError instanceof Error ? platformError.message : String(platformError)),
            });
          }
        }

        // 更新进度
        const progress = Math.round(((i + 1) / questions.length) * 100);
        await supabase
          .from('geo_analysis_tasks')
          .update({ 
            progress, 
            completed_questions: i + 1,
            results: results,
          })
          .eq('id', id);

      } catch (questionError) {
        console.error(`问题 ${i} 分析失败:`, questionError);
      }
    }

    // 更新任务为完成状态
    await supabase
      .from('geo_analysis_tasks')
      .update({ 
        status: 'completed', 
        progress: 100,
        completed_questions: questions.length,
        results: results,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        status: 'completed',
        resultsCount: results.length,
      },
    });

  } catch (error) {
    console.error('执行分析任务失败:', error);
    
    // 更新任务为失败状态
    await supabase
      .from('geo_analysis_tasks')
      .update({ 
        status: 'failed', 
        error: error instanceof Error ? error.message : '未知错误',
      })
      .eq('id', id);

    return NextResponse.json(
      { success: false, error: '执行分析任务失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geo-tasks/[id]/execute - 获取任务执行状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = getSupabaseClient();

    const { data: task, error } = await supabase
      .from('geo_analysis_tasks')
      .select('id, status, progress, total_questions, completed_questions, error, started_at, completed_at')
      .eq('id', id)
      .single();

    if (error) {
      console.error('获取任务状态失败:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: '任务不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: `获取任务状态失败: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });

  } catch (error) {
    console.error('获取任务状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 从AI回答中提取所有信息（标题、URL、媒体、品牌等）
 */
function extractAllFromResponse(response: string, targetBrand?: string): {
  title: string | null;
  url: string | null;
  mediaSource: string | null;
  citedBrands: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
} {
  // 提取标题
  let title: string | null = null;
  
  // 尝试多种标题格式
  const titlePatterns = [
    /(?:标题|名称|品牌|店铺|产品名)[:：]\s*(.+?)(?:\n|$)/,
    /["「『【]([^"」』】]{2,50})["」』】]/,
    /^#{1,3}\s*(.+?)(?:\n|$)/m,
    /^\*\*(.+?)\*\*/m,
  ];
  
  for (const pattern of titlePatterns) {
    const match = response.match(pattern);
    if (match) {
      title = match[1].trim();
      break;
    }
  }
  
  // 如果没找到标题，尝试从第一行提取
  if (!title) {
    const firstLine = response.split('\n')[0];
    if (firstLine.length > 5 && firstLine.length < 100) {
      title = firstLine.replace(/^[#\-\*]+\s*/, '').trim();
    }
  }

  // 提取URL
  let url: string | null = null;
  const urlPatterns = [
    /(?:链接|URL|网址|参考)[:：]?\s*(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/i,
    /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g,
  ];
  
  for (const pattern of urlPatterns) {
    const match = response.match(pattern);
    if (match) {
      url = typeof match[1] === 'string' ? match[1] : match[0];
      break;
    }
  }

  // 提取媒体来源
  let mediaSource: string | null = null;
  const mediaPatterns = [
    { pattern: /Apple\s*Maps|苹果地图/gi, name: 'Apple Maps', icon: '🍎' },
    { pattern: /Google\s*Maps|谷歌地图/gi, name: 'Google Maps', icon: '🗺️' },
    { pattern: /高德地图|高德/gi, name: '高德地图', icon: '📍' },
    { pattern: /百度地图/gi, name: '百度地图', icon: '🗺️' },
    { pattern: /携程|Ctrip/gi, name: '携程', icon: '✈️' },
    { pattern: /知乎/gi, name: '知乎', icon: '📘' },
    { pattern: /小红书/gi, name: '小红书', icon: '📕' },
    { pattern: /大众点评/gi, name: '大众点评', icon: '⭐' },
    { pattern: /美团/gi, name: '美团', icon: '🛵' },
    { pattern: /百度百科/gi, name: '百度百科', icon: '📚' },
    { pattern: /维基百科/gi, name: '维基百科', icon: '📖' },
    { pattern: /微信公众号/gi, name: '微信公众号', icon: '💚' },
    { pattern: /微博/gi, name: '微博', icon: '🔴' },
    { pattern: /抖音/gi, name: '抖音', icon: '🎵' },
    { pattern: /B站|哔哩哔哩/gi, name: 'B站', icon: '📺' },
  ];
  
  for (const { pattern, name } of mediaPatterns) {
    if (pattern.test(response)) {
      mediaSource = name;
      break;
    }
  }

  // 提取引用的品牌
  const citedBrands: string[] = [];
  if (targetBrand && response.includes(targetBrand)) {
    citedBrands.push(targetBrand);
  }
  
  // 分析情感倾向
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  const positiveWords = ['优秀', '出色', '推荐', '优势', '领先', '创新', '优质', '好评', '信赖', '值得', '很好', '不错'];
  const negativeWords = ['问题', '缺点', '不足', '争议', '投诉', '差评', '风险', '质疑', '一般', '较差'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (response.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (response.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount + 1) sentiment = 'positive';
  else if (negativeCount > positiveCount + 1) sentiment = 'negative';
  
  // 计算置信度
  let confidence = 60;
  if (title) confidence += 10;
  if (url) confidence += 15;
  if (mediaSource) confidence += 10;
  if (citedBrands.length > 0) confidence += 10;
  if (response.length > 300) confidence += 5;
  confidence = Math.min(confidence, 95);

  return {
    title,
    url,
    mediaSource,
    citedBrands,
    sentiment,
    confidence,
  };
}

/**
 * 从AI回答中提取标题
 */
function extractTitle(response: string): string | null {
  // 尝试匹配常见标题格式
  const titleMatch = response.match(/(?:标题|名称|品牌)[:：]\s*(.+?)(?:\n|$)/);
  if (titleMatch) return titleMatch[1].trim();
  
  // 尝试匹配引号中的内容作为标题
  const quoteMatch = response.match(/["「『]([^"」』]+)["」』]/);
  if (quoteMatch) return quoteMatch[1].trim();
  
  return null;
}

/**
 * 从AI回答中提取URL
 */
function extractUrl(response: string): string | null {
  const urlMatch = response.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * 从AI回答中提取洞察（要点、品牌、置信度）
 */
function extractAnswerInsights(response: string, targetBrand?: string): {
  mainPoint: string | null;
  keyPoints: string[];
  mentionedBrands: string[];
  confidence: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
} {
  // 1. 提取【回答要点】
  const keyPoints: string[] = [];
  const pointsMatch = response.match(/【回答要点】([\s\S]*?)(?=【|$)/);
  if (pointsMatch) {
    const pointsText = pointsMatch[1];
    const lines = pointsText.split('\n');
    for (const line of lines) {
      const point = line.replace(/^[-•*]\s*/, '').trim();
      if (point && point.length > 2) {
        keyPoints.push(point);
      }
    }
  }
  
  // 2. 提取【提及品牌】
  const mentionedBrands: string[] = [];
  const brandsMatch = response.match(/【提及品牌】([\s\S]*?)(?=【|$)/);
  if (brandsMatch) {
    const brandsText = brandsMatch[1].trim();
    const brands = brandsText.split(/[,，、]/).map(b => b.trim()).filter(b => b.length > 0);
    mentionedBrands.push(...brands);
  }
  
  // 确保目标品牌在列表中
  if (targetBrand && !mentionedBrands.includes(targetBrand) && response.includes(targetBrand)) {
    mentionedBrands.unshift(targetBrand);
  }
  
  // 3. 提取【回答置信度】
  let confidence = '中';
  const confidenceMatch = response.match(/【回答置信度】\s*(高|中|低)/);
  if (confidenceMatch) {
    confidence = confidenceMatch[1];
  }
  
  // 4. 提取主要观点（第一个要点或第一段）
  let mainPoint: string | null = null;
  if (keyPoints.length > 0) {
    mainPoint = keyPoints[0];
  } else {
    // 从回答开头提取第一段作为主要观点
    const firstParagraph = response.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length > 10) {
      mainPoint = firstParagraph.substring(0, 100).replace(/[#*]/g, '').trim();
    }
  }
  
  // 5. 分析情感倾向
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  const positiveWords = ['优秀', '出色', '推荐', '优势', '领先', '创新', '优质', '好评', '信赖', '值得', '很好', '不错', '强大', '领先', '首选'];
  const negativeWords = ['问题', '缺点', '不足', '争议', '投诉', '差评', '风险', '质疑', '一般', '较差', '缺乏', '短板'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const matches = response.match(new RegExp(word, 'g'));
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const matches = response.match(new RegExp(word, 'g'));
    if (matches) negativeCount += matches.length;
  });
  
  if (positiveCount > negativeCount + 2) sentiment = 'positive';
  else if (negativeCount > positiveCount + 2) sentiment = 'negative';
  
  // 6. 生成摘要
  const summary = keyPoints.length > 0 
    ? keyPoints.slice(0, 3).join('；')
    : response.substring(0, 200).replace(/[#*【】]/g, '').trim();

  return {
    mainPoint,
    keyPoints,
    mentionedBrands,
    confidence,
    sentiment,
    summary,
  };
}
