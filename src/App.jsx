// ✅ 실무에서 자주 쓰는 패턴
import { useState, useEffect, useRef, Fragment } from 'react'
import './App.css'

const HASHTAG_RE = /(#[^\s#]+)/g
const INLINE_MD_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g
const CHECKLIST_RE = /^- \[( |x|X)\] (.*)$/

function extractTags(text) {
  const tags = []
  const re = /#[^\s#]+/g
  let match
  while ((match = re.exec(text)) !== null) {
    tags.push(match[0].slice(1).toLowerCase())
  }
  return tags
}

function memoHasTag(text, tagName) {
  const t = tagName.toLowerCase()
  return extractTags(text).includes(t)
}

function renderInlineMarkdown(text, keyPrefix) {
  const parts = text.split(INLINE_MD_RE).filter(p => p !== '')
  if (parts.length === 0) return text

  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/)
    if (bold) {
      return <strong key={`${keyPrefix}-b${i}`}>{bold[1]}</strong>
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const href = link[2].trim()
      if (!/^https?:\/\//i.test(href)) {
        return <span key={`${keyPrefix}-l${i}`}>{part}</span>
      }
      return (
        <a
          key={`${keyPrefix}-l${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link[1]}
        </a>
      )
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>
  })
}

function renderMarkdownSegment(text, baseKey) {
  if (!text) return null
  const lines = text.split('\n')

  return lines.map((line, lineIdx) => {
    const key = `${baseKey}-L${lineIdx}`
    const check = line.match(CHECKLIST_RE)
    if (check) {
      const checked = check[1].toLowerCase() === 'x'
      return (
        <div key={key} className="md-check-item">
          <span className="md-check-box" aria-hidden>
            {checked ? '☑' : '☐'}
          </span>
          <span className="md-check-text">
            {renderInlineMarkdown(check[2], key)}
          </span>
        </div>
      )
    }
    if (line === '') {
      return <div key={key} className="md-line md-line--empty" />
    }
    return (
      <div key={key} className="md-line">
        {renderInlineMarkdown(line, key)}
      </div>
    )
  })
}

function renderMemoText(text, onTagClick, activeTag) {
  return text.split(HASHTAG_RE).map((part, i) =>
    part.startsWith('#') && part.length > 1 ? (
      <span key={i} className="inline-tag">
        #
        <span
          role="button"
          tabIndex={0}
          className={`inline-tag-label${
            activeTag === part.slice(1).toLowerCase() ? ' inline-tag-label--active' : ''
          }`}
          onClick={() => onTagClick(part.slice(1))}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTagClick(part.slice(1))
            }
          }}
        >
          {part.slice(1)}
        </span>
      </span>
    ) : part ? (
      <Fragment key={i}>{renderMarkdownSegment(part, `p${i}`)}</Fragment>
    ) : null
  )
}

function autoResizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const MAX_FAVORITE_TAGS = 12

function loadFavoriteTags() {
  try {
    const saved = localStorage.getItem('flashMemoFavoriteTags')
    const arr = saved ? JSON.parse(saved) : []
    return Array.isArray(arr)
      ? arr.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean)
      : []
  } catch {
    return []
  }
}

function insertAtCursor(ref, value, setValue, char) {
  const el = ref.current
  if (!el) {
    setValue(value + char)
    return
  }
  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  const next = value.slice(0, start) + char + value.slice(end)
  setValue(next)
  const pos = start + char.length
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(pos, pos)
  })
}

function App() {
  const [text, setText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState(null)
  const [pageSize, setPageSize] = useState(() => {
    const n = parseInt(localStorage.getItem('flashMemoPageSize'), 10)
    return n >= 1 && n <= 100 ? n : 10
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('flashMemoSort')
    return saved === 'oldest' ? 'oldest' : 'newest'
  })
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [toast, setToast] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [favoriteTags, setFavoriteTags] = useState(loadFavoriteTags)
  const [addingTag, setAddingTag] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [memos, setMemos] = useState(() => {
    try {
      const saved = localStorage.getItem('flashMemos')
      return saved ? JSON.parse(saved) : []
    } catch {
      localStorage.removeItem('flashMemos')
      return []
    }
  })
  const textareaRef = useRef(null)
  const editTextareaRef = useRef(null)

  // 앱 열리면 자동 포커스
  useEffect(() => {
    if (!editingId) textareaRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (editingId) editTextareaRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, tagFilter, pageSize, sortOrder])

  useEffect(() => {
    localStorage.setItem('flashMemoPageSize', String(pageSize))
  }, [pageSize])

  useEffect(() => {
    localStorage.setItem('flashMemoSort', sortOrder)
  }, [sortOrder])

  useEffect(() => {
    localStorage.setItem('flashMemoFavoriteTags', JSON.stringify(favoriteTags))
  }, [favoriteTags])

  useEffect(() => {
    if (!pendingDeleteId) return
    const timer = setTimeout(() => {
      setPendingDeleteId(null)
      setToast(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [pendingDeleteId])

  useEffect(() => {
    autoResizeTextarea(textareaRef.current)
  }, [text])

  useEffect(() => {
    autoResizeTextarea(editTextareaRef.current)
  }, [editText, editingId])

  // memos 바뀔 때마다 localStorage 저장
  useEffect(() => {
    localStorage.setItem('flashMemos', JSON.stringify(memos))
  }, [memos])

  const saveMemo = () => {
    if (!text.trim()) return
    const newMemo = {
      id: Date.now(),
      text: text.trim(),
      ts: Date.now(),
    }
    setMemos(prev => [newMemo, ...prev])
    setText('')
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        autoResizeTextarea(textareaRef.current)
      }
      textareaRef.current?.focus()
    })
  }

  const deleteMemo = (id) => {
    if (editingId === id) setEditingId(null)
    setMemos(prev => prev.filter(m => m.id !== id))
    setPendingDeleteId(null)
    setToast(null)
  }

  const insertFavoriteTag = (ref, value, setValue, tag) => {
    const name = tag.replace(/^#/, '').trim()
    if (!name) return
    insertAtCursor(ref, value, setValue, `#${name} `)
  }

  const addFavoriteTag = () => {
    const name = newTagInput.replace(/^#/, '').trim()
    if (!name) return
    if (favoriteTags.length >= MAX_FAVORITE_TAGS) {
      setToast(`즐겨찾기 태그는 최대 ${MAX_FAVORITE_TAGS}개입니다`)
      setTimeout(() => setToast(null), 2000)
      return
    }
    if (favoriteTags.some(t => t.toLowerCase() === name.toLowerCase())) {
      setNewTagInput('')
      setAddingTag(false)
      return
    }
    setFavoriteTags(prev => [...prev, name])
    setNewTagInput('')
    setAddingTag(false)
  }

  const removeFavoriteTag = (tag) => {
    setFavoriteTags(prev => prev.filter(t => t !== tag))
  }

  const renderFavoriteTags = (ref, value, setValue) => (
    <div className="favorite-tags-row">
      <span className="favorite-tags-label">즐겨찾기</span>
      <div className="favorite-tags">
        {favoriteTags.map(tag => (
          <span key={tag} className="favorite-tag-item">
            <button
              type="button"
              className="favorite-tag-chip"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertFavoriteTag(ref, value, setValue, tag)}
            >
              #{tag}
            </button>
            <button
              type="button"
              className="favorite-tag-remove"
              aria-label={`${tag} 즐겨찾기 삭제`}
              onClick={() => removeFavoriteTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        {addingTag ? (
          <input
            className="favorite-tag-input"
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') addFavoriteTag()
              if (e.key === 'Escape') {
                setAddingTag(false)
                setNewTagInput('')
              }
            }}
            placeholder="태그명"
            aria-label="즐겨찾기 태그 추가"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="favorite-tag-add"
            aria-label="즐겨찾기 태그 추가"
            onClick={() => setAddingTag(true)}
          >
            +
          </button>
        )}
      </div>
    </div>
  )

  const togglePin = (id) => {
    setMemos(prev =>
      prev.map(m => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    )
  }

  const requestDelete = (id) => {
    if (pendingDeleteId === id) {
      deleteMemo(id)
      setToast('메모가 삭제되었습니다')
      setTimeout(() => setToast(null), 2000)
      return
    }
    setPendingDeleteId(id)
    setToast('다시 누르면 삭제됩니다')
  }

  const startEdit = (m) => {
    setEditingId(m.id)
    setEditText(m.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = (id) => {
    if (!editText.trim()) return
    setMemos(prev =>
      prev.map(m =>
        m.id === id ? { ...m, text: editText.trim() } : m
      )
    )
    cancelEdit()
  }

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Escape') cancelEdit()
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit(id)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveMemo()
  }

  const q = searchQuery.trim().toLowerCase()
  const filteredMemos = tagFilter
    ? memos.filter(
        m =>
          memoHasTag(m.text, tagFilter) ||
          (m.tag && m.tag.toLowerCase() === tagFilter)
      )
    : q
      ? memos.filter(
          m =>
            m.text.toLowerCase().includes(q) ||
            (m.tag && m.tag.toLowerCase().includes(q))
        )
      : memos

  const sortedMemos = [...filteredMemos].sort((a, b) => {
    const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
    if (pinDiff !== 0) return pinDiff
    return sortOrder === 'newest' ? b.ts - a.ts : a.ts - b.ts
  })

  const filterByTag = (tagName) => {
    setTagFilter(tagName.toLowerCase())
    setSearchQuery(tagName)
  }

  const clearFilters = () => {
    setTagFilter(null)
    setSearchQuery('')
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setTagFilter(null)
  }

  const totalPages = Math.max(1, Math.ceil(sortedMemos.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pagedMemos = sortedMemos.slice(pageStart, pageStart + pageSize)

  const handlePageSizeChange = (e) => {
    const n = parseInt(e.target.value, 10)
    if (Number.isNaN(n)) return
    setPageSize(Math.min(100, Math.max(1, n)))
  }

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return `${Math.floor(diff / 86400)}일 전`
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>⚡ Flash Memo</h1>
        
        </div>
        {memos.length > 0 && (
          <input
            className="search-input"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="검색"
            aria-label="메모 검색"
          />
        )}
      </div>

      {tagFilter && (
        <div className="tag-filter-bar">
          <span className="tag-filter-label">
            태그 <span className="tag-filter-name">#{tagFilter}</span>
          </span>
          <button type="button" className="tag-filter-clear" onClick={clearFilters}>
            필터 해제
          </button>
        </div>
      )}

      <div className="input-area">
        <textarea
          ref={textareaRef}
          className="auto-grow-textarea"
          value={text}
          onChange={e => {
            setText(e.target.value)
            autoResizeTextarea(e.target)
          }}
          onKeyDown={handleKeyDown}
          placeholder="지금 떠오른 생각을 적어보세요..."
        />
        {renderFavoriteTags(textareaRef, text, setText)}
        <div className="input-footer">
          <button
            type="button"
            className="hash-btn"
            aria-label="본문에 # 입력"
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertAtCursor(textareaRef, text, setText, '#')}
          >
            #
          </button>
          <button className="save-btn" onClick={saveMemo}>
            ✓ 저장
          </button>
        </div>
        <p className="md-hint">
          **굵게** · [링크](https://) · - [ ] 할일 · Ctrl+Enter 저장
        </p>
      </div>

      <div className="list-header">
        <p className="section-label">메모 목록</p>
        {memos.length > 0 && (
          <div className="list-controls">
            <select
              className="sort-select"
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              aria-label="메모 정렬"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
            <label className="page-size-control">
              <span className="page-size-label">표시</span>
              <input
                type="number"
                className="page-size-input"
                min={1}
                max={100}
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="페이지당 메모 개수"
              />
              <span className="page-size-label">개</span>
            </label>
          </div>
        )}
      </div>

      <div className="memo-list">
        {memos.length === 0 ? (
          <p className="empty-state">아직 메모가 없어요</p>
        ) : filteredMemos.length === 0 ? (
          <p className="empty-state">
            {tagFilter ? `태그 #${tagFilter} 메모가 없어요` : '검색 결과가 없어요'}
          </p>
        ) : (
          pagedMemos.map(m => (
            <div
              key={m.id}
              className={`memo-card${editingId === m.id ? ' memo-card--editing' : ''}${
                m.pinned ? ' memo-card--pinned' : ''
              }`}
            >
              {editingId === m.id ? (
                <div className="memo-edit">
                  <textarea
                    ref={editTextareaRef}
                    className="memo-edit-textarea auto-grow-textarea"
                    value={editText}
                    onChange={e => {
                      setEditText(e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onKeyDown={e => handleEditKeyDown(e, m.id)}
                  />
                  {renderFavoriteTags(editTextareaRef, editText, setEditText)}
                  <div className="memo-edit-footer">
                    <button
                      type="button"
                      className="hash-btn"
                      aria-label="본문에 # 입력"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() =>
                        insertAtCursor(editTextareaRef, editText, setEditText, '#')
                      }
                    >
                      #
                    </button>
                    <div className="memo-edit-actions">
                      <button
                        type="button"
                        className="edit-cancel-btn"
                        onClick={cancelEdit}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="edit-save-btn"
                        onClick={() => saveEdit(m.id)}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  <p className="save-hint">Ctrl+Enter 저장 · Esc 취소</p>
                </div>
              ) : (
                <>
                  <div className="memo-text">
                    {renderMemoText(m.text, filterByTag, tagFilter)}
                  </div>
                  <div className="memo-meta">
                    <div className="memo-left">
                      <span className="memo-time">{timeAgo(m.ts)}</span>
                    </div>
                    <div className="memo-actions">
                      <button
                        type="button"
                        className={`pin-btn${m.pinned ? ' pin-btn--active' : ''}`}
                        aria-label={m.pinned ? '고정 해제' : '상단 고정'}
                        onClick={() => togglePin(m.id)}
                      >
                        {m.pinned ? '⭐' : '☆'}
                      </button>
                      <button
                        type="button"
                        className="edit-btn"
                        aria-label="메모 편집"
                        onClick={() => startEdit(m)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className={`delete-btn${
                          pendingDeleteId === m.id ? ' delete-btn--pending' : ''
                        }`}
                        aria-label="메모 삭제"
                        onClick={() => requestDelete(m.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {sortedMemos.length > 0 && totalPages > 1 && (
        <nav className="pagination" aria-label="메모 목록 페이지">
          <button
            type="button"
            className="page-btn"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage(safePage - 1)}
          >
            이전
          </button>
          <span className="page-info">
            {safePage} / {totalPages}
            <span className="page-count">
              ({pageStart + 1}–{Math.min(pageStart + pageSize, sortedMemos.length)} /{' '}
              {sortedMemos.length})
            </span>
          </span>
          <button
            type="button"
            className="page-btn"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
          >
            다음
          </button>
        </nav>
      )}
    </div>
  )
}

export default App
