import { useId } from 'react'
export default function PdfInput({ file, onChange, disabled }: { file: File | null; onChange: (file: File) => void; disabled: boolean }) {
  const id = useId()
  function select(file?: File) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 50 * 1024 * 1024) { alert('50 MB 以下の PDF を選択してください'); return }
    onChange(file)
  }
  return <div className="p-4 border border-dashed border-gray-600 rounded-lg" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!disabled) select(e.dataTransfer.files[0]) }}>
    <label htmlFor={id}>PDF を選択、またはここにドロップ（50 MB 以下）</label>
    <input id={id} type="file" accept=".pdf,application/pdf" disabled={disabled} onChange={e => select(e.target.files?.[0])} />
    {file && <p className="text-green-400">{file.name}（保存時にアップロード）</p>}
  </div>
}
