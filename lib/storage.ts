import path from 'node:path'
import { mkdir, access, unlink } from 'node:fs/promises'

export const dataDir = path.resolve(process.env.PAPER_MANAGER_DATA_DIR || '.data')
export const pdfDir = path.join(dataDir, 'uploads', 'pdfs')
export const pdfPrefix = '/uploads/pdfs/'

export function pdfFilePath(url: string) {
  if (!url.startsWith(pdfPrefix)) throw new Error('Invalid PDF path')
  const name = url.slice(pdfPrefix.length)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/i.test(name)) throw new Error('Invalid PDF filename')
  return path.join(pdfDir, name)
}
export async function ensurePdf(url: string) {
  await access(pdfFilePath(url))
}
export async function removePdf(url: string) {
  try { await unlink(pdfFilePath(url)) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
}
export async function preparePdfDir() { await mkdir(pdfDir, { recursive: true }) }
