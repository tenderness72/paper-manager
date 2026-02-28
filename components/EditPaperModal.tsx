'use client'

import { useState } from 'react'
import { Paper } from '@/types'

interface EditPaperModalProps {
    paper: Paper
    onClose: () => void
    onSuccess: () => void
}

export default function EditPaperModal({ paper, onClose, onSuccess }: EditPaperModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors || '',
        journal: paper.journal || '',
        year: paper.year?.toString() || '',
    })

    // PDF upload state
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfPath, setPdfPath] = useState<string | null>(paper.pdfPath || null)

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setPdfFile(file)

        // Immediately upload file
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await fetch(`/api/papers/${paper.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    year: formData.year ? parseInt(formData.year) : null,
                    pdfPath: pdfPath,
                }),
            })

            onSuccess()
        } catch (error) {
            console.error('Failed to update paper:', error)
            alert('論文の更新に失敗しました')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        論文を編集
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-3xl"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            <p className="text-sm text-green-400 mt-2">
                                {pdfFile ? '✓ 新しいPDFをアップロード完了' : '✓ PDFが登録されています'}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-lg"
                    >
                        {isSubmitting ? '更新中...' : '変更を保存'}
                    </button>
                </form>
            </div>
        </div>
    )
}
