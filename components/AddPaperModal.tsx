'use client'

import { useState } from 'react'
import { parseRISFile, risEntryToPaper } from '@/lib/risParser'

interface AddPaperModalProps {
    onClose: () => void
    onSuccess: () => void
}

export default function AddPaperModal({ onClose, onSuccess }: AddPaperModalProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'ris'>('manual')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Manual form state
    const [formData, setFormData] = useState({
        title: '',
        abstract: '',
        authors: '',
        journal: '',
        year: '',
    })

    // PDF upload state
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfPath, setPdfPath] = useState<string | null>(null)

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            // Upload PDF if exists
            let finalPdfPath = pdfPath
            if (pdfFile && !pdfPath) {
                const uploadFormData = new FormData()
                uploadFormData.append('file', pdfFile)
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                })
                const uploadData = await uploadRes.json()
                finalPdfPath = uploadData.url
            }

            // Create paper
            await fetch('/api/papers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    year: formData.year ? parseInt(formData.year) : null,
                    pdfPath: finalPdfPath,
                }),
            })

            onSuccess()
        } catch (error) {
            console.error('Failed to create paper:', error)
            alert('論文の追加に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRISUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsSubmitting(true)
        try {
            const content = await file.text()
            const entries = parseRISFile(content)
            const papers = entries.map(risEntryToPaper)

            // Upload PDF if exists
            let finalPdfPath = pdfPath
            if (pdfFile && !pdfPath) {
                const uploadFormData = new FormData()
                uploadFormData.append('file', pdfFile)
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData,
                })
                const uploadData = await uploadRes.json()
                finalPdfPath = uploadData.url
            }

            // Add PDF path to all papers if exists
            const papersWithPdf = papers.map(p => ({
                ...p,
                pdfPath: finalPdfPath,
            }))

            await fetch('/api/papers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(papersWithPdf),
            })

            onSuccess()
        } catch (error) {
            console.error('Failed to import RIS:', error)
            alert('RISファイルのインポートに失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setPdfFile(file)

        // Optionally upload immediately
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
            })
            const uploadData = await uploadRes.json()
            setPdfPath(uploadData.url)
        } catch (error) {
            console.error('Failed to upload PDF:', error)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        論文を追加
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-3xl"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'manual'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        手動入力
                    </button>
                    <button
                        onClick={() => setActiveTab('ris')}
                        className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'ris'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:text-white'
                            }`}
                    >
                        RISインポート
                    </button>
                </div>

                {/* Manual Input Form */}
                {activeTab === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                タイトル *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                要約
                            </label>
                            <textarea
                                rows={4}
                                value={formData.abstract}
                                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    著者
                                </label>
                                <input
                                    type="text"
                                    value={formData.authors}
                                    onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    年
                                </label>
                                <input
                                    type="number"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                ジャーナル
                            </label>
                            <input
                                type="text"
                                value={formData.journal}
                                onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                PDF
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {pdfPath && (
                                <p className="text-sm text-green-400 mt-2">✓ PDFアップロード完了</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg"
                        >
                            {isSubmitting ? '追加中...' : '論文を追加'}
                        </button>
                    </form>
                )}

                {/* RIS Import */}
                {activeTab === 'ris' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                RISファイル
                            </label>
                            <input
                                type="file"
                                accept=".ris"
                                onChange={handleRISUpload}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                PDF (オプション)
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            {pdfPath && (
                                <p className="text-sm text-green-400 mt-2">✓ PDFアップロード完了</p>
                            )}
                        </div>

                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-300">
                            <p className="font-semibold mb-2">使い方:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>RISファイルを選択してアップロード</li>
                                <li>必要に応じてPDFファイルも追加</li>
                                <li>自動的に論文情報が登録されます</li>
                            </ol>
                        </div>

                        {isSubmitting && (
                            <div className="text-center text-gray-300">
                                インポート中...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
