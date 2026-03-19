import { NextRequest, NextResponse } from 'next/server';
import {
  getAllPersonas,
  getPersonasByBusiness,
  getPersonaById,
  createPersona,
  updatePersona,
  deletePersona,
  generateWritingGuidance,
  TONE_OPTIONS,
  STYLE_OPTIONS,
  type CreatePersonaInput,
  type UpdatePersonaInput,
} from '@/lib/persona-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const businessId = searchParams.get('businessId');

  try {
    // 获取单个人设
    if (id) {
      const persona = await getPersonaById(id);
      return NextResponse.json({
        success: !!persona,
        data: persona,
      });
    }

    // 获取企业的所有人设
    if (businessId) {
      const personas = await getPersonasByBusiness(businessId);
      return NextResponse.json({
        success: true,
        data: {
          personas,
          toneOptions: TONE_OPTIONS,
          styleOptions: STYLE_OPTIONS,
        },
      });
    }

    // 获取所有人设
    const personas = await getAllPersonas();
    return NextResponse.json({
      success: true,
      data: {
        personas,
        toneOptions: TONE_OPTIONS,
        styleOptions: STYLE_OPTIONS,
      },
    });
  } catch (error) {
    console.error('获取人设失败:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create': {
        if (!data.businessId) {
          return NextResponse.json(
            { success: false, error: '请指定所属企业' },
            { status: 400 }
          );
        }
        const input: CreatePersonaInput = {
          businessId: data.businessId,
          name: data.name,
          expertise: data.expertise,
          tone: data.tone || 'professional',
          style: data.style || 'analytical',
          writingStyle: data.writingStyle,
          exampleContent: data.exampleContent,
        };
        const persona = await createPersona(input);
        return NextResponse.json({ success: true, data: persona });
      }

      case 'update': {
        const input: UpdatePersonaInput = {
          name: data.name,
          expertise: data.expertise,
          tone: data.tone,
          style: data.style,
          writingStyle: data.writingStyle,
          exampleContent: data.exampleContent,
        };
        const persona = await updatePersona(data.id, input);
        return NextResponse.json({ success: !!persona, data: persona });
      }

      case 'delete': {
        const success = await deletePersona(data.id);
        return NextResponse.json({ success });
      }

      case 'guidance': {
        // 获取基于人设的写作指导
        const guidance = await generateWritingGuidance(data.personaId);
        return NextResponse.json({ success: true, data: guidance });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('人设管理失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
