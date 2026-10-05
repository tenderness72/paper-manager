'use client'

import { useState, useEffect } from 'react'
import { requestJson } from '@/lib/clientApi'
import { Paper } from '@/types'
import AddPaperModal from '@/components/AddPaperModal'
import EditPaperModal from '@/components/EditPaperModal'
import PaperCard from '@/components/PaperCard'
import NotificationSettings from '@/components/NotificationSettings'

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const visiblePapers = papers.filter(p => [p.title, p.authors, p.journal, p.abstract].some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))

  // Edit logic
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)

  useEffect(() => {
    fetchPapers()
  }, [])

  const fetchPapers = async () => {
    try {
      const data = await requestJson('/api/papers')
      setErrorMessage('')
      setPapers(data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaperAdded = () => {
    fetchPapers()
    setIsModalOpen(false)
  }

  const handlePaperUpdated = () => {
    fetchPapers()
    setEditingPaper(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('この論文を削除しますか?')) return

    try {
      const result = await requestJson(`/api/papers/${id}`, { method: 'DELETE' })
      if (result.warning) alert(result.warning)
      fetchPapers()
    } catch (error) {
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Paper Manager
              </h1>
              <p className="text-gray-400 text-lg">論文を整理して、研究を加速させましょう</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              + 論文を追加
            </button>
          </div>

          <NotificationSettings />
        </header>

        {errorMessage && <div role="alert" className="text-red-400 mb-4">{errorMessage}<button onClick={fetchPapers} className="ml-4 underline">再試行</button></div>}
        <label className="block mb-6">論文検索（タイトル・著者・ジャーナル・要約）
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} className="block w-full p-3 mt-2 bg-gray-800 rounded-lg" />
        </label>
        {/* Papers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-20 text-gray-400">
              読み込み中...
            </div>
          ) : visiblePapers.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="glass p-12 inline-block">
                <p className="text-gray-400 text-lg mb-4">{query ? '検索結果がありません' : 'まだ論文が登録されていません'}</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg"
                >
                  最初の論文を追加
                </button>
              </div>
            </div>
          ) : (
            visiblePapers.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onDelete={handleDelete}
                onEdit={setEditingPaper}
              />
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddPaperModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePaperAdded}
        />
      )}

      {editingPaper && (
        <EditPaperModal
          paper={editingPaper}
          onClose={() => setEditingPaper(null)}
          onSuccess={handlePaperUpdated}
        />
      )}
    </div>
  )
}
