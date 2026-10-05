import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ensurePdf } from './storage'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (origin && origin !== request.nextUrl.origin) throw new ApiError(403, '別のサイトからの変更リクエストは許可されていません')
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON が不正です' }, { status: 400 })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
    return NextResponse.json({ error: '論文が見つかりません' }, { status: 404 })
  console.error('API request failed:', error)
  return NextResponse.json({ error: '処理に失敗しました。もう一度お試しください。' }, { status: 500 })
}
export function paperId(value: string) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new ApiError(400, 'ID が不正です')
  return Number(value)
}
export async function paperInput(body: unknown, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, '論文情報が不正です')
  const input = body as Record<string, unknown>
  const data: { title?: string; abstract?: string | null; authors?: string | null; journal?: string | null; year?: number | null; pdfPath?: string | null } = {}
  if (!partial || 'title' in input) {
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 10000) throw new ApiError(400, 'タイトルを入力してください')
    data.title = input.title.trim()
  }
  for (const field of ['abstract', 'authors', 'journal'] as const) {
    if (field in input) {
      const value = input[field]
      if (value !== null && (typeof value !== 'string' || value.length > 100000)) throw new ApiError(400, `${field} が不正です`)
      data[field] = value as string | null
    }
  }
  if ('year' in input) {
    if (input.year !== null && (!Number.isInteger(input.year) || Number(input.year) < 1 || Number(input.year) > 9999)) throw new ApiError(400, '年は 1〜9999 の整数で入力してください')
    data.year = input.year as number | null
  }
  if ('pdfPath' in input) {
    if (input.pdfPath !== null) {
      if (typeof input.pdfPath !== 'string') throw new ApiError(400, 'PDF パスが不正です')
      try { await ensurePdf(input.pdfPath) } catch { throw new ApiError(400, 'PDF が見つかりません。再アップロードしてください') }
    }
    data.pdfPath = input.pdfPath as string | null
  }
  return data
}
