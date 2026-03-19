# GEO优化与内容创作的整合方案

## 一、核心关系

```
┌─────────────────────────────────────────────────────────────┐
│                    GEO优化理论体系                           │
│  (AI搜索引擎如何理解和引用内容)                               │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   GEO优化助手        │         │    内容创作          │
│   (评估维度)         │         │   (生成维度)         │
├─────────────────────┤         ├─────────────────────┤
│ • 问题导向 15%       │ ──────> │ • 目标问题设定       │
│ • AI识别度 15%       │ <────── │ • 蒸馏词分析         │
│ • 内容质量 15%       │ ──────> │ • 内容结构生成       │
│ • 信任度 15%         │ ──────> │ • E-E-A-T融入        │
│ • 结构化数据 15%     │ ──────> │ • Schema自动生成     │
│ • 多平台适配 15%     │ ──────> │ • 平台适配发布       │
│ • SEO关键词 10%      │ <────── │ • 关键词密度控制     │
└─────────────────────┘         └─────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
                  ┌─────────────────────┐
                  │   优化闭环           │
                  ├─────────────────────┤
                  │ 生成 → 评分 → 优化   │
                  │ → 再生成 → 再评分    │
                  └─────────────────────┘
```

## 二、具体整合方案

### 方案1：评分驱动的生成（推荐）

**流程**：
1. 用户输入目标问题
2. 系统分析蒸馏词（AI识别度维度）
3. LLM生成内容时，**自动嵌入GEO评分标准**
4. 生成完成后，**自动进行GEO评分**
5. 根据评分结果，提供优化建议
6. 用户可选择"一键优化"让LLM针对性改进

**代码示例**：
```typescript
// 内容生成时传入评分标准
const geoPrompt = `
请生成一篇GEO优化的文章，需满足以下标准：
1. 问题导向(15分)：开头直接回应用户问题
2. AI识别度(15分)：自然融入蒸馏词：${distillationWords}
3. 内容质量(15分)：结构清晰、信息增量明确
4. 信任度(15分)：包含数据来源、案例支撑
5. 结构化数据(15分)：包含FAQ、Schema标记
6. 多平台适配(15分)：适配知乎/小红书等平台
7. SEO关键词(10分)：关键词密度2-5%
`;
```

### 方案2：双向关联

**从内容创作到GEO评分**：
- 内容草稿 → 一键评分 → 看到改进点

**从GEO评分到内容优化**：
- 评分结果 → 一键优化 → LLM针对性改进

### 方案3：统一工作流

```
首页 → 内容创作工作台（整合版）
     ↓
     输入目标问题
     ↓
     蒸馏词分析
     ↓
     选择生成模式（文章/大纲）
     ↓
     LLM生成内容
     ↓
     自动GEO评分 ← 这一步是关键关联！
     ↓
     显示评分和改进建议
     ↓
     一键优化（LLM针对性改进低分项）
     ↓
     保存为项目/发布到矩阵号
```

## 三、需要修改的代码

### 1. 内容生成服务整合评分标准

文件：`src/lib/content-generation.ts`

```typescript
// 生成文章时，传入GEO评分标准
export async function generateArticle(
  request: ContentCreationRequest,
  distillation: DistillationResult,
  outline: string[],
  customHeaders?: Record<string, string>
): Promise<GeneratedContent> {
  // ... 现有代码 ...
  
  const systemPrompt = `
你是一个GEO内容专家，需要生成符合以下评分标准的内容：

【七大评分维度】
1. 问题导向(15%)：开头直接回应用户问题，提供明确答案
2. AI识别度(15%)：自然融入蒸馏词，让AI搜索引擎能识别
3. 内容质量(15%)：结构清晰，信息增量明确，避免废话
4. 信任度建设(15%)：数据来源、案例支撑、作者署名
5. 结构化数据(15%)：FAQ问答、Schema标记、表格数据
6. 多平台适配(15%)：适配知乎/小红书/公众号等平台
7. SEO关键词(10%)：关键词密度2-5%，长尾词分布

【必须融入的蒸馏词】
核心词：${distillation.keywords.filter(k => k.category === 'core').map(k => k.word)}
长尾词：${distillation.keywords.filter(k => k.category === 'longtail').map(k => k.word)}
问题词：${distillation.keywords.filter(k => k.category === 'question').map(k => k.word)}
`;

  // ... 
}
```

### 2. 内容创作后自动评分

文件：`src/app/api/content-creation/route.ts`

```typescript
// 生成完成后，调用GEO评分
import { calculateGEOScore, getGrade } from '@/lib/geo-scoring';

export async function POST(request: NextRequest) {
  // ... 生成内容的代码 ...
  
  if (action === 'create') {
    const result = await createContent(creationRequest, customHeaders);
    
    // 新增：自动进行GEO评分
    const geoScore = calculateGEOScore({
      title: result.generated.title,
      content: result.generated.content,
      keywords: result.generated.distillationWords,
      references: [],
      hasSchema: !!result.generated.schema,
      hasFAQ: result.generated.content.includes('## 常见问题') || 
              result.generated.content.includes('## FAQ'),
    });
    
    const geoGrade = getGrade(geoScore.total);
    
    // 返回内容 + GEO评分
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        geoScore: {
          total: geoScore.total,
          grade: geoGrade,
          breakdown: geoScore.breakdown,
          suggestions: geoScore.suggestions,
        },
      },
    });
  }
}
```

### 3. 前端展示评分

文件：`src/app/matrix/page.tsx`

```typescript
// 在生成结果区域显示GEO评分
{generatedContent?.geoScore && (
  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <span className="font-medium">GEO评分</span>
      <Badge className={geoGrade.color}>
        {generatedContent.geoScore.grade} - {generatedContent.geoScore.total}分
      </Badge>
    </div>
    <div className="space-y-2">
      {Object.entries(generatedContent.geoScore.breakdown).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <Progress value={value} className="flex-1" />
          <span className="text-sm w-12">{value}分</span>
        </div>
      ))}
    </div>
    {generatedContent.geoScore.suggestions.length > 0 && (
      <Button variant="outline" className="mt-3 w-full">
        <Wand2 className="h-4 w-4 mr-2" />
        一键优化低分项
      </Button>
    )}
  </div>
)}
```

## 四、数据模型关联

### 项目表关联内容草稿

```sql
-- geo_projects 表新增字段
ALTER TABLE geo_projects ADD COLUMN draft_id VARCHAR(36);
ALTER TABLE geo_projects ADD COLUMN geo_score JSONB;

-- 或者反过来，content_drafts 关联项目
ALTER TABLE content_drafts ADD COLUMN project_id VARCHAR(36);
ALTER TABLE content_drafts ADD COLUMN geo_score INTEGER;
```

## 五、用户流程

### 当前流程（割裂）
```
首页评分 → 发现问题 → 不知道怎么改 → 放弃
矩阵号 → 内容创作 → 不知道好不好 → 直接发布
```

### 整合后流程（闭环）
```
首页 → 进入内容创作工作台
     ↓
     输入目标问题
     ↓
     蒸馏词分析 + GEO评分指导
     ↓
     LLM生成内容（自动符合评分标准）
     ↓
     自动GEO评分
     ↓
     显示评分 + 改进建议
     ↓
     一键优化低分项
     ↓
     保存为项目 + 发布到矩阵号
     ↓
     监测数据反馈 → 调整策略
```

## 六、总结

| 维度 | GEO优化助手 | 内容创作 | 整合后 |
|------|------------|---------|--------|
| 作用 | 告诉你问题 | 帮你解决 | 边生成边优化 |
| 用户痛点 | 知道问题但不会改 | 不知道内容好不好 | 生成即优质 |
| 核心价值 | 评估标准 | 生产工具 | 标准+工具=闭环 |

**关键整合点**：
1. ✅ 蒸馏词 = GEO的"AI识别度"维度
2. ✅ 内容生成时嵌入评分标准
3. ✅ 生成后自动评分
4. ✅ 根据评分一键优化
5. ✅ 项目关联内容草稿
