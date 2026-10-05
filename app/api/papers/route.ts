import { withPaperMutation } from '@/lib/mutation'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, ApiError, assertSameOrigin, paperInput } from '@/lib/api'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim()
    const papers = await prisma.paper.findMany({
      where: q ? { OR: ['title', 'authors', 'journal', 'abstract'].map(field => ({ [field]: { contains: q } })) } : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(papers)
  } catch (error) { return apiError(error) }
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    return await withPaperMutation(async () => {
      const body = await request.json()
      if (Array.isArray(body)) {
        if (!body.length || body.length > 1000) throw new ApiError(400, 'RIS は 1〜1000 件でインポートしてください')
        const data = await Promise.all(body.map(async item => ({ ...await paperInput(item), title: item.title.trim() })))
        const result = await prisma.paper.createMany({ data })
        return NextResponse.json(result, { status: 201 })
      }
      const data = await paperInput(body)
      const paper = await prisma.paper.create({ data: { ...data, title: data.title! } })
      return NextResponse.json(paper, { status: 201 })
    })
  } catch (error) { return apiError(error) }
}
