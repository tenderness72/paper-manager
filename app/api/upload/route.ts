import { withPaperMutation } from '@/lib/mutation'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { apiError, ApiError, assertSameOrigin } from '@/lib/api'
import { pdfPrefix, pdfFilePath, preparePdfDir, removePdf } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request)
    let form: FormData
    try { form = await request.formData() } catch { throw new ApiError(400, 'アップロード形式が不正です') }
    const file = form.get('file')
    if (!(file instanceof File)) throw new ApiError(400, 'PDF ファイルを選択してください')
    if (file.size > 50 * 1024 * 1024) throw new ApiError(413, 'PDF は 50 MB 以下にしてください')
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!file.name.toLowerCase().endsWith('.pdf') || buffer.subarray(0, 5).toString() !== '%PDF-') throw new ApiError(400, 'PDF ファイルのみアップロードできます')
    await preparePdfDir()
    const url = `${pdfPrefix}${randomUUID()}.pdf`
    await writeFile(pdfFilePath(url), buffer, { flag: 'wx' })
    return NextResponse.json({ url, filename: file.name, size: file.size }, { status: 201 })
  } catch (error) { return apiError(error) }
}
// Release a staged upload on cancellation or an unsuccessful save. Shared PDFs stay intact.
export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request)
    return await withPaperMutation(async () => {
      const body = await request.json()
      if (!body || typeof body !== 'object') throw new ApiError(400, 'PDF パスが不正です')
      const { url } = body
      if (typeof url !== 'string') throw new ApiError(400, 'PDF パスが不正です')
      try { pdfFilePath(url) } catch { throw new ApiError(400, 'PDF パスが不正です') }
      if (await prisma.paper.count({ where: { pdfPath: url } })) throw new ApiError(409, 'この PDF は論文に使用されています')
      await removePdf(url)
      return NextResponse.json({ success: true })
    })
  } catch (error) { return apiError(error) }
}
