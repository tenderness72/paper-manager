'use client'

import { Paper } from '@/types'

interface PaperCardProps {
    paper: Paper
    onDelete: (id: number) => void
    onEdit: (paper: Paper) => void
}

export default function PaperCard({ paper, onDelete, onEdit }: PaperCardProps) {
    return (
        <div className="glass p-6 hover:shadow-2xl hover:scale-105 transform transition-all animate-fade-in relative group">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white line-clamp-2 flex-1 pr-8">
                    {paper.title}
                </h3>
                <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                    <button
                        onClick={() => onEdit(paper)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition-colors"
                        title="編集"
                    >
                        ✎
                    </button>
                    <button
                        onClick={() => onDelete(paper.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                        title="削除"
                    >
                        🗑
                    </button>
                </div>
            </div>

            {paper.authors && (
                <p className="text-sm text-gray-400 mb-2">
                    👤 {paper.authors}
                </p>
            )}

            {paper.journal && (
                <p className="text-sm text-purple-300 mb-2">
                    📚 {paper.journal}
                </p>
            )}

            {paper.year && (
                <p className="text-sm text-indigo-300 mb-3">
                    📅 {paper.year}
                </p>
            )}

            {paper.abstract && (
                <p className="text-sm text-gray-300 line-clamp-3 mb-4">
                    {paper.abstract}
                </p>
            )}

            <div className="flex gap-2 mt-4">
                {paper.pdfPath && (
                    <a
                        href={paper.pdfPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg text-center transition-all hover:shadow-lg"
                    >
                        📄 PDFを開く
                    </a>
                )}
            </div>

            <div className="mt-4 text-xs text-gray-500 flex justify-between items-center border-t border-gray-700/50 pt-3">
                <span>登録日: {new Date(paper.createdAt).toLocaleDateString('ja-JP')}</span>
            </div>
        </div>
    )
}
