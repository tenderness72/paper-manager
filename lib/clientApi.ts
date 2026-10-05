export async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '処理に失敗しました')
  return data
}
export async function uploadPdf(file: File) {
  const body = new FormData()
  body.append('file', file)
  return (await requestJson('/api/upload', { method: 'POST', body })).url as string
}
export async function releaseUpload(url: string) {
  try { await requestJson('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }) }
  catch (error) { console.error('Staged PDF cleanup failed:', error) }
}
