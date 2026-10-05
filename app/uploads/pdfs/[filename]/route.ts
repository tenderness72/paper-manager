import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { pdfFilePath, pdfPrefix } from '@/lib/storage'
export const dynamic = 'force-dynamic'
export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params
    let filepath: string
    try { filepath = pdfFilePath(pdfPrefix + filename) }
    catch { return NextResponse.json({ error: '不正なファイル名です' }, { status: 400 }) }
    const bytes = await readFile(filepath)
    return new NextResponse(bytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'PDF が見つかりません' }, { status: 404 })
    console.error('PDF read failed:', error)
    return NextResponse.json({ error: 'PDF を開けませんでした' }, { status: 500 })
  }
}
