import { withPaperMutation } from '@/lib/mutation'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, ApiError, assertSameOrigin, paperId, paperInput } from '@/lib/api'
import { removePdf } from '@/lib/storage'

type Context = { params: Promise<{ id: string }> }
async function cleanupPdf(pdfPath: string | null) {
  if (!pdfPath || await prisma.paper.count({ where: { pdfPath } })) return
  await removePdf(pdfPath)
}
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    assertSameOrigin(request)
    return await withPaperMutation(async () => {
      const id = paperId((await params).id)
      const paper = await prisma.paper.delete({ where: { id } })
      try { await cleanupPdf(paper.pdfPath) }
      catch (error) {
        console.error('PDF cleanup failed:', error)
        return NextResponse.json({ success: true, warning: '論文は削除しましたが PDF の削除に失敗しました。保存先の権限を確認してください。' })
      }
      return NextResponse.json({ success: true })
    })
  } catch (error) { return apiError(error) }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    assertSameOrigin(request)
    return await withPaperMutation(async () => {
      const id = paperId((await params).id)
      const data = await paperInput(await request.json(), true)
      const result = await prisma.$transaction(async tx => {
        const previous = await tx.paper.findUnique({ where: { id } })
        if (!previous) throw new ApiError(404, '論文が見つかりません')
        const paper = await tx.paper.update({ where: { id }, data })
        return { previous, paper }
      })
      if (result.previous.pdfPath !== result.paper.pdfPath) {
        try { await cleanupPdf(result.previous.pdfPath) }
        catch (error) {
          console.error('Replaced PDF cleanup failed:', error)
          return NextResponse.json({ ...result.paper, warning: '論文は更新しましたが古い PDF の削除に失敗しました。保存先の権限を確認してください。' })
        }
      }
      return NextResponse.json(result.paper)
    })
  } catch (error) { return apiError(error) }
}
