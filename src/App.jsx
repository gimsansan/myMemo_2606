// ✅ 실무에서 자주 쓰는 패턴
import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import './App.css'
import EmojiPickerButton from './EmojiPickerButton'

const HASHTAG_RE = /(#[^\s#]+)/g
const COLOR_BLOCK_RE = /\{([#a-zA-Z0-9]+)\}([\s\S]*?)\{\/\}/g
const INLINE_MD_RE =
  /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\{[#a-zA-Z0-9]+\}[\s\S]*?\{\/\}|==[^=]+==)/g
const NAMED_COLORS = {
  red: '#c5221f',
  blue: '#1558b0',
  green: '#137333',
  orange: '#e37400',
  purple: '#7b1fa2',
  gray: '#666666',
  pink: '#d01884',
  yellow: '#b8860b',
}

function resolveTextColor(token) {
  if (token.startsWith('#')) {
    return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(token) ? token : null
  }
  return NAMED_COLORS[token.toLowerCase()] ?? null
}

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
      return (
        <strong key={`${keyPrefix}-b${i}`}>
          {renderInlineMarkdown(bold[1], `${keyPrefix}-b${i}`)}
        </strong>
      )
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
          onClick={e => e.stopPropagation()}
        >
          {renderInlineMarkdown(link[1], `${keyPrefix}-l${i}`)}
        </a>
      )
    }
    const color = part.match(/^\{([#a-zA-Z0-9]+)\}(.+)\{\/\}$/)
    if (color) {
      const cssColor = resolveTextColor(color[1])
      if (cssColor) {
        return (
          <span key={`${keyPrefix}-c${i}`} style={{ color: cssColor }}>
            {renderInlineMarkdown(color[2], `${keyPrefix}-c${i}`)}
          </span>
        )
      }
    }
    const highlight = part.match(/^==(.+)==$/)
    if (highlight) {
      return (
        <mark key={`${keyPrefix}-h${i}`} className="md-highlight">
          {renderInlineMarkdown(highlight[1], `${keyPrefix}-h${i}`)}
        </mark>
      )
    }
    return <span key={`${keyPrefix}-t${i}`}>{part}</span>
  })
}

function splitColorBlocks(text) {
  const chunks = []
  let lastIndex = 0
  for (const match of text.matchAll(COLOR_BLOCK_RE)) {
    if (match.index > lastIndex) {
      chunks.push({ type: 'plain', text: text.slice(lastIndex, match.index) })
    }
    chunks.push({ type: 'color', name: match[1], inner: match[2] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    chunks.push({ type: 'plain', text: text.slice(lastIndex) })
  }
  if (chunks.length === 0) chunks.push({ type: 'plain', text })
  return chunks
}

function renderMarkdownLines(text, baseKey) {
  if (!text) return null
  const lines = text.split('\n')

  return lines.map((line, lineIdx) => {
    const key = `${baseKey}-L${lineIdx}`
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

function renderMarkdownSegment(text, baseKey) {
  if (!text) return null

  return splitColorBlocks(text).flatMap((chunk, chunkIdx) => {
    const key = `${baseKey}-b${chunkIdx}`
    if (chunk.type === 'color') {
      const cssColor = resolveTextColor(chunk.name)
      if (!cssColor) {
        return renderMarkdownLines(`{${chunk.name}}${chunk.inner}{/}`, key) ?? []
      }
      return [
        <span key={key} style={{ color: cssColor }}>
          {renderMarkdownSegment(chunk.inner, `${key}-in`)}
        </span>,
      ]
    }
    return renderMarkdownLines(chunk.text, key) ?? []
  })
}

function renderHashtagParts(text, onTagClick, activeTag, keyPrefix) {
  return text.split(HASHTAG_RE).map((part, i) =>
    part.startsWith('#') && part.length > 1 ? (
      <span key={`${keyPrefix}-t${i}`} className="inline-tag">
        #
        <span
          role="button"
          tabIndex={0}
          className={`inline-tag-label${
            activeTag === part.slice(1).toLowerCase() ? ' inline-tag-label--active' : ''
          }`}
          onClick={e => {
            e.stopPropagation()
            onTagClick(part.slice(1))
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onTagClick(part.slice(1))
            }
          }}
        >
          {part.slice(1)}
        </span>
      </span>
    ) : part ? (
      <Fragment key={`${keyPrefix}-f${i}`}>
        {renderMarkdownSegment(part, `${keyPrefix}-${i}`)}
      </Fragment>
    ) : null
  )
}

function renderMemoText(text, onTagClick, activeTag) {
  return splitColorBlocks(text).flatMap((chunk, chunkIdx) => {
    if (chunk.type === 'color') {
      const cssColor = resolveTextColor(chunk.name)
      const inner = renderHashtagParts(chunk.inner, onTagClick, activeTag, `c${chunkIdx}`)
      if (!cssColor) {
        return renderHashtagParts(
          `{${chunk.name}}${chunk.inner}{/}`,
          onTagClick,
          activeTag,
          `cb${chunkIdx}`
        )
      }
      return [
        <span key={`mc${chunkIdx}`} style={{ color: cssColor }}>
          {inner}
        </span>,
      ]
    }
    return renderHashtagParts(chunk.text, onTagClick, activeTag, `p${chunkIdx}`)
  })
}

function autoResizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const MAX_MEMO_TAGS = 12
const DEFAULT_PAGE_SIZE = 5
const BACKUP_VERSION = 1
const UNDO_TOAST_DURATION = 5000
const LONG_PRESS_MS = 500
const ONBOARDING_KEY = 'flashMemoOnboardingDismissed'
const SAMPLE_MEMO_TEXT = `**Flash Memo**에 오신 것을 환영해요 👋

✓ 저장 (PC: Ctrl+Enter) · #태그 로 분류
**굵게** · ==강조== · {blue}색상{/} · [링크](https://)
.url 파일을 입력창에 드롭해도 됩니다

#예시 #시작`
const UI_THEMES = [
  { id: 'system', label: 'Auto' },
  { id: 'classic', label: 'Classic' },
  { id: 'neon', label: 'Neon' },
  { id: 'glass', label: 'Glass' },
]

const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024

function resolveSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'neon' : 'classic'
}

function resolveTheme(themeId) {
  if (themeId === 'system') return resolveSystemTheme()
  return UI_THEMES.some(t => t.id === themeId) ? themeId : 'classic'
}

function getFlashMemoStorageUsage() {
  let bytes = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key === 'flashMemos' || key.startsWith('flashMemo')) {
      bytes += (localStorage.getItem(key)?.length ?? 0) * 2
    }
  }
  return bytes
}

function formatStorageSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const THEME_META = {
  classic: { themeColor: '#f5f5f3' },
  neon: { themeColor: '#0a0a12' },
  glass: { themeColor: '#ecfdf5' },
}

function applyThemeMeta(themeId) {
  const meta = THEME_META[themeId] ?? THEME_META.classic
  let themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta')
    themeColorMeta.name = 'theme-color'
    document.head.appendChild(themeColorMeta)
  }
  themeColorMeta.content = meta.themeColor
}

function loadTrash() {
  try {
    const saved = localStorage.getItem('flashMemoTrash')
    const arr = saved ? JSON.parse(saved) : []
    if (!Array.isArray(arr)) return []
    return arr
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null
        const memo = normalizeMemo(item.memo ?? item, index)
        if (!memo) return null
        const deletedAt =
          typeof item.deletedAt === 'number' && Number.isFinite(item.deletedAt)
            ? item.deletedAt
            : Date.now()
        const trashId =
          typeof item.trashId === 'string' && item.trashId.trim()
            ? item.trashId
            : `${deletedAt}-${memo.id}`
        return { trashId, memo, deletedAt }
      })
      .filter(Boolean)
  } catch {
    localStorage.removeItem('flashMemoTrash')
    return []
  }
}

function trashPreview(text, max = 80) {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

function stripAllHashtags(text) {
  return text
    .replace(/#[^\s#]+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function collectTagsFromMemos(memos) {
  const tagLatest = new Map()
  for (const m of memos) {
    for (const t of extractTags(m.text)) {
      const prev = tagLatest.get(t)
      if (!prev || m.ts > prev) tagLatest.set(t, m.ts)
    }
  }
  return [...tagLatest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
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

const COLOR_CHIP_NAMES = Object.keys(NAMED_COLORS)

function insertDelimiterWrap(ref, value, setValue, open, close, placeholder = '') {
  const el = ref.current
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const inner = selected || placeholder
  const next = value.slice(0, start) + open + inner + close + value.slice(end)
  setValue(next)
  const selStart = start + open.length
  const selEnd = selStart + inner.length
  requestAnimationFrame(() => {
    el?.focus()
    el?.setSelectionRange(selStart, selEnd)
    autoResizeTextarea(el)
  })
}

function insertColorWrap(ref, value, setValue, colorName) {
  if (!NAMED_COLORS[colorName]) return
  insertDelimiterWrap(ref, value, setValue, `{${colorName}}`, '{/}')
}

function insertLinkWrap(ref, value, setValue) {
  const el = ref.current
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const label = selected.replace(/[\[\]]/g, '').trim() || '링크'
  const url = 'https://'
  const open = `[${label}](`
  const close = ')'
  const prefix = start > 0 && !/\s/.test(value[start - 1]) ? ' ' : ''
  const insert = `${prefix}${open}${url}${close}`
  const next = value.slice(0, start) + insert + value.slice(end)
  setValue(next)
  const urlStart = start + prefix.length + open.length
  const urlEnd = urlStart + url.length
  requestAnimationFrame(() => {
    el?.focus()
    el?.setSelectionRange(urlStart, urlEnd)
    autoResizeTextarea(el)
  })
}

function parseInternetShortcut(content) {
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^URL=(.+)$/i)
    if (!match) continue
    const url = match[1].trim()
    if (/^https?:\/\//i.test(url)) return url
  }
  return null
}

function linkLabelFromFileName(fileName) {
  const base = fileName.replace(/\.url$/i, '').trim()
  const label = base.replace(/[\[\]]/g, '').trim()
  return label || '링크'
}

function insertLinkAtCursor(ref, value, setValue, label, url) {
  const el = ref.current
  const safeLabel = label.replace(/[\[\]]/g, '').trim() || '링크'
  const snippet = `[${safeLabel}](${url})`
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  const prefix = start > 0 && !/\s/.test(value[start - 1]) ? ' ' : ''
  const insert = `${prefix}${snippet} `
  const next = value.slice(0, start) + insert + value.slice(end)
  setValue(next)
  const pos = start + insert.length
  requestAnimationFrame(() => {
    el?.focus()
    el?.setSelectionRange(pos, pos)
    autoResizeTextarea(el)
  })
}

async function parseUrlShortcutFile(file) {
  if (!/\.url$/i.test(file.name)) return null
  const content = await file.text()
  const url = parseInternetShortcut(content)
  if (!url) return null
  return { label: linkLabelFromFileName(file.name), url }
}

function handleDragOverShortcut(e) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

async function handleShortcutDrop(e, ref, value, setValue, onStatus) {
  e.preventDefault()
  e.stopPropagation()

  const files = [...(e.dataTransfer?.files ?? [])]
  const urlFile = files.find(file => /\.url$/i.test(file.name))

  if (urlFile) {
    try {
      const result = await parseUrlShortcutFile(urlFile)
      if (!result) {
        onStatus?.('invalid')
        return
      }
      insertLinkAtCursor(ref, value, setValue, result.label, result.url)
      onStatus?.('ok')
    } catch {
      onStatus?.('invalid')
    }
    return
  }

  if (files.some(file => /\.lnk$/i.test(file.name))) {
    onStatus?.('lnk')
    return
  }

  const uri = e.dataTransfer?.getData('text/uri-list')?.split('\n')[0]?.trim()
  if (uri && /^https?:\/\//i.test(uri)) {
    const host = uri.replace(/^https?:\/\//i, '').split('/')[0] || '링크'
    insertLinkAtCursor(ref, value, setValue, host, uri)
    onStatus?.('ok')
  }
}

function normalizeMemo(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const text = typeof raw.text === 'string' ? raw.text.trim() : ''
  if (!text) return null
  const id =
    typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : Date.now() + index
  const ts =
    typeof raw.ts === 'number' && Number.isFinite(raw.ts) ? raw.ts : id
  const memo = { id, text, ts }
  if (raw.pinned) memo.pinned = true
  if (typeof raw.tag === 'string' && raw.tag.trim()) memo.tag = raw.tag.trim()
  return memo
}

function parseBackupData(data) {
  const memosRaw = Array.isArray(data) ? data : data?.memos
  if (!Array.isArray(memosRaw)) {
    throw new Error('invalid backup format')
  }
  return memosRaw.map((memo, index) => normalizeMemo(memo, index)).filter(Boolean)
}

function exportMemosToFile(memos) {
  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    memos,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `flash-memo-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function timeAgo(ts, now = Date.now()) {
  const diff = Math.floor((now - ts) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function formatAbsoluteTime(ts) {
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RelativeTime({ ts, now, className = '', prefix = '' }) {
  const [showAbsolute, setShowAbsolute] = useState(false)
  const absolute = formatAbsoluteTime(ts)

  return (
    <span
      className={className}
      title={absolute}
      onClick={e => {
        e.stopPropagation()
        setShowAbsolute(v => !v)
      }}
    >
      {prefix}
      {showAbsolute ? absolute : timeAgo(ts, now)}
    </span>
  )
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirm-dialog-title' : undefined}
        aria-describedby="confirm-dialog-message"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h2>
        )}
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-btn confirm-dialog-btn--confirm${
              danger ? ' confirm-dialog-btn--danger' : ''
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [text, setText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState(null)
  const [pageSize, setPageSize] = useState(() => {
    const n = parseInt(localStorage.getItem('flashMemoPageSize'), 10)
    return n >= 1 && n <= 100 ? n : DEFAULT_PAGE_SIZE
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState(() => {
    const saved = localStorage.getItem('flashMemoSort')
    if (saved === 'oldest' || saved === 'pinned') return saved
    return 'newest'
  })
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [pendingPageDelete, setPendingPageDelete] = useState(false)
  const [toast, setToast] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [uiTheme, setUiTheme] = useState(() => {
    const saved = localStorage.getItem('flashMemoUiTheme')
    if (saved === 'system') return 'system'
    return UI_THEMES.some(t => t.id === saved) ? saved : 'classic'
  })
  const [memos, setMemos] = useState(() => {
    try {
      const saved = localStorage.getItem('flashMemos')
      return saved ? JSON.parse(saved) : []
    } catch {
      localStorage.removeItem('flashMemos')
      return []
    }
  })
  const [trash, setTrash] = useState(loadTrash)
  const [trashOpen, setTrashOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [formatHintOpen, setFormatHintOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) !== '1'
  )
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const textareaRef = useRef(null)
  const editTextareaRef = useRef(null)
  const editCardRef = useRef(null)
  const importInputRef = useRef(null)
  const toastTimerRef = useRef(null)
  const settingsRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const [timeTick, setTimeTick] = useState(() => Date.now())

  const clearToastTimer = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
  }

  const showToast = (message, { onUndo, duration } = {}) => {
    clearToastTimer()
    const ms = duration ?? (onUndo ? UNDO_TOAST_DURATION : 2000)
    setToast(onUndo ? { message, onUndo } : { message })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, ms)
  }

  const handleUndo = () => {
    if (!toast?.onUndo) return
    const restore = toast.onUndo
    clearToastTimer()
    setToast(null)
    restore()
    showToast('삭제를 되돌렸습니다')
  }

  useEffect(() => {
    const id = setInterval(() => setTimeTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // 앱 열리면 자동 포커스
  useEffect(() => {
    if (!editingId) textareaRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (editingId) editTextareaRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (!editingId) setEmojiPickerOpen(prev => (prev === 'edit' ? null : prev))
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
    localStorage.removeItem('flashMemoHiddenTags')
  }, [])

  useEffect(() => {
    if (uiTheme === 'system') return
    document.documentElement.setAttribute('data-theme', uiTheme)
    localStorage.setItem('flashMemoUiTheme', uiTheme)
    applyThemeMeta(uiTheme)
  }, [uiTheme])

  useEffect(() => {
    if (uiTheme !== 'system') return
    localStorage.setItem('flashMemoUiTheme', 'system')
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = resolveSystemTheme()
      document.documentElement.setAttribute('data-theme', resolved)
      applyThemeMeta(resolved)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [uiTheme])

  useEffect(() => {
    if (!pendingDeleteId) return
    const timer = setTimeout(() => setPendingDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [pendingDeleteId])

  useEffect(() => {
    if (!pendingPageDelete) return
    const timer = setTimeout(() => setPendingPageDelete(false), 3000)
    return () => clearTimeout(timer)
  }, [pendingPageDelete])

  useEffect(() => () => clearToastTimer(), [])

  useEffect(() => {
    if (actionMenuId == null) return
    const onKey = e => {
      if (e.key === 'Escape') setActionMenuId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [actionMenuId])

  useEffect(() => {
    if (!settingsOpen) return
    const handleOutside = e => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    const handleEscape = e => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [settingsOpen])

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

  useEffect(() => {
    localStorage.setItem('flashMemoTrash', JSON.stringify(trash))
  }, [trash])

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

  const commitDelete = (memosToDelete) => {
    if (memosToDelete.length === 0) return null

    const memosSnapshot = memos
    const trashSnapshot = trash
    const pageSnapshot = currentPage
    const ids = new Set(memosToDelete.map(m => m.id))

    if (editingId && ids.has(editingId)) {
      setEditingId(null)
      setEditText('')
    }

    const batchAt = Date.now()
    const newItems = memosToDelete.map((memo, i) => ({
      trashId: `${batchAt}-${memo.id}-${i}`,
      memo,
      deletedAt: batchAt,
    }))

    setPendingDeleteId(null)
    setTrash(prev => [...newItems, ...prev])
    setMemos(prev => prev.filter(m => !ids.has(m.id)))

    return () => {
      setMemos(memosSnapshot)
      setTrash(trashSnapshot)
      setCurrentPage(pageSnapshot)
    }
  }

  const restoreTrashItem = trashId => {
    const item = trash.find(t => t.trashId === trashId)
    if (!item) return
    setMemos(prev => [item.memo, ...prev])
    setTrash(prev => prev.filter(t => t.trashId !== trashId))
    showToast('메모를 복구했습니다')
  }

  const permanentDeleteTrashItem = trashId => {
    setTrash(prev => prev.filter(t => t.trashId !== trashId))
    showToast('메모를 영구 삭제했습니다')
  }

  const emptyTrash = () => {
    if (trash.length === 0) return
    setConfirmDialog({
      title: '휴지통 비우기',
      message: `휴지통 ${trash.length}개 메모를 영구 삭제할까요?`,
      confirmLabel: '비우기',
      danger: true,
      onConfirm: () => {
        setTrash([])
        showToast('휴지통을 비웠습니다')
        closeConfirm()
      },
    })
  }

  const sortedTrash = useMemo(
    () => [...trash].sort((a, b) => b.deletedAt - a.deletedAt),
    [trash]
  )

  const insertFavoriteTag = (ref, value, setValue, tag) => {
    const name = tag.replace(/^#/, '').trim()
    if (!name) return
    insertAtCursor(ref, value, setValue, `#${name} `)
  }

  const memoTags = useMemo(() => collectTagsFromMemos(memos), [memos])

  const displayMemoTags = useMemo(
    () => memoTags.slice(0, MAX_MEMO_TAGS),
    [memoTags]
  )

  const storageBytes = useMemo(
    () => getFlashMemoStorageUsage(),
    [memos, trash, settingsOpen]
  )

  const closeConfirm = () => setConfirmDialog(null)

  const copyMemoText = async memoText => {
    try {
      await navigator.clipboard.writeText(memoText)
      showToast('메모를 복사했습니다')
    } catch {
      showToast('복사에 실패했습니다')
    }
  }

  const dismissGuide = () => {
    setGuideOpen(false)
    localStorage.setItem(ONBOARDING_KEY, '1')
  }

  const addSampleMemo = () => {
    const sample = {
      id: Date.now(),
      text: SAMPLE_MEMO_TEXT,
      ts: Date.now(),
    }
    setMemos([sample])
    showToast('예시 메모를 추가했습니다')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const deleteAllTags = () => {
    if (memoTags.length === 0) return
    setConfirmDialog({
      title: '태그 전부 지우기',
      message: `모든 메모에서 #태그 ${memoTags.length}개를 삭제할까요?\n(메모 본문의 #태그 텍스트가 제거됩니다)`,
      confirmLabel: '지우기',
      danger: true,
      onConfirm: () => {
        setMemos(prev =>
          prev
            .map(m => {
              const text = stripAllHashtags(m.text)
              if (!text) return null
              const memo = { id: m.id, text, ts: m.ts }
              if (m.pinned) memo.pinned = true
              return memo
            })
            .filter(Boolean)
        )
        setTagFilter(null)
        setSearchQuery('')
        showToast('모든 태그를 삭제했습니다')
        closeConfirm()
      },
    })
  }

  const renderFormatToolbar = (ref, value, setValue) => (
    <div className="format-toolbar">
      <button
        type="button"
        className="format-btn format-btn--bold"
        aria-label="굵게"
        onMouseDown={e => e.preventDefault()}
        onClick={() => insertDelimiterWrap(ref, value, setValue, '**', '**', '텍스트')}
      >
        B
      </button>
      <button
        type="button"
        className="format-btn"
        aria-label="링크"
        onMouseDown={e => e.preventDefault()}
        onClick={() => insertLinkWrap(ref, value, setValue)}
      >
        링크
      </button>
      <button
        type="button"
        className="format-btn format-btn--highlight"
        aria-label="강조"
        onMouseDown={e => e.preventDefault()}
        onClick={() => insertDelimiterWrap(ref, value, setValue, '==', '==', '텍스트')}
      >
        강조
      </button>
    </div>
  )

  const renderColorShortcuts = (ref, value, setValue) => (
    <div className="favorite-tags-row color-shortcuts-row">
      <span className="favorite-tags-label">색상</span>
      <div className="favorite-tags">
        {COLOR_CHIP_NAMES.map(name => (
          <button
            key={name}
            type="button"
            className="color-chip"
            data-color-name={name}
            aria-label={`${name} 색상 적용`}
            title={name}
            onMouseDown={e => e.preventDefault()}
            onClick={() => insertColorWrap(ref, value, setValue, name)}
          >
            <span
              className="color-swatch"
              style={{ backgroundColor: NAMED_COLORS[name] }}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  )

  const renderMemoTagShortcuts = (ref, value, setValue) => {
    if (displayMemoTags.length === 0) return null
    return (
      <div className="favorite-tags-row">
        <span className="favorite-tags-label">태그</span>
        <div className="favorite-tags">
          {displayMemoTags.map(tag => (
            <button
              key={tag}
              type="button"
              className="favorite-tag-chip"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertFavoriteTag(ref, value, setValue, tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const togglePin = (id) => {
    setMemos(prev =>
      prev.map(m => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    )
  }

  const requestDelete = (id) => {
    if (pendingDeleteId === id) {
      const memo = memos.find(m => m.id === id)
      if (!memo) return
      const undo = commitDelete([memo])
      showToast('메모가 삭제되었습니다', { onUndo: undo })
      return
    }
    setPendingDeleteId(id)
    setPendingPageDelete(false)
    showToast('다시 누르면 삭제됩니다', { duration: 3000 })
  }

  const startEdit = (m) => {
    setActionMenuId(null)
    setEditingId(m.id)
    setEditText(m.text)
  }

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleCardTouchStart = m => {
    longPressTriggeredRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setActionMenuId(m.id)
      navigator.vibrate?.(12)
    }, LONG_PRESS_MS)
  }

  const handleCardTouchEnd = () => {
    clearLongPressTimer()
  }

  const handleCardTouchMove = () => {
    clearLongPressTimer()
  }

  const handleCardBodyClick = (m, e) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    if (e.target.closest('a, .inline-tag-label, button')) return
    startEdit(m)
  }

  const closeActionMenu = () => setActionMenuId(null)

  const handleActionMenuDelete = () => {
    const id = actionMenuId
    closeActionMenu()
    if (id != null) requestDelete(id)
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

  useEffect(() => {
    if (!editingId) return
    const handleOutside = e => {
      if (editCardRef.current?.contains(e.target)) return
      if (e.target.closest('.emoji-picker-popover')) return
      const trimmed = editText.trim()
      if (trimmed) saveEdit(editingId)
      else cancelEdit()
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [editingId, editText])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveMemo()
  }

  const notifyShortcutDrop = status => {
    if (status === 'ok') showToast('바로가기 링크를 추가했습니다')
    else if (status === 'invalid') showToast('.url 파일에서 주소를 찾지 못했습니다')
    else if (status === 'lnk') showToast('.lnk 바로가기는 지원하지 않습니다')
  }

  const handleMemoShortcutDrop = e => {
    handleShortcutDrop(e, textareaRef, text, setText, notifyShortcutDrop)
  }

  const handleEditShortcutDrop = e => {
    handleShortcutDrop(e, editTextareaRef, editText, setEditText, notifyShortcutDrop)
  }

  const q = searchQuery.trim().toLowerCase()

  const memoMatchesTag = m =>
    !tagFilter ||
    memoHasTag(m.text, tagFilter) ||
    (m.tag && m.tag.toLowerCase() === tagFilter)

  const memoMatchesSearch = m =>
    !q ||
    m.text.toLowerCase().includes(q) ||
    (m.tag && m.tag.toLowerCase().includes(q))

  const filteredMemos = memos.filter(m => memoMatchesTag(m) && memoMatchesSearch(m))

  const listMemos =
    sortOrder === 'pinned' ? filteredMemos.filter(m => m.pinned) : filteredMemos

  const sortedMemos = [...listMemos].sort((a, b) => {
    if (sortOrder === 'oldest') return a.ts - b.ts
    return b.ts - a.ts
  })

  const filterByTag = (tagName) => {
    setTagFilter(tagName.toLowerCase())
  }

  const clearFilters = () => {
    setTagFilter(null)
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const totalPages = Math.max(1, Math.ceil(sortedMemos.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pagedMemos = sortedMemos.slice(pageStart, pageStart + pageSize)

  const requestDeleteCurrentPage = () => {
    if (pagedMemos.length === 0) return

    if (pendingPageDelete) {
      const count = pagedMemos.length
      const undo = commitDelete(pagedMemos)
      const remainingCount = sortedMemos.length - count
      const newTotalPages = Math.max(1, Math.ceil(remainingCount / pageSize))
      setCurrentPage(prev => Math.min(prev, newTotalPages))
      setPendingPageDelete(false)
      showToast(`${count}개 메모가 삭제되었습니다`, { onUndo: undo })
      return
    }
    setPendingDeleteId(null)
    setPendingPageDelete(true)
    showToast(`다시 누르면 현재 페이지 ${pagedMemos.length}개가 삭제됩니다`, {
      duration: 3000,
    })
  }

  const handlePageSizeChange = (e) => {
    const n = parseInt(e.target.value, 10)
    if (Number.isNaN(n)) return
    setPageSize(Math.min(100, Math.max(1, n)))
  }

  const handleExport = () => {
    exportMemosToFile(memos)
    showToast('JSON 파일을 내보냈습니다')
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const raw = JSON.parse(await file.text())
      const imported = parseBackupData(raw)
      const message =
        memos.length > 0
          ? `기존 메모 ${memos.length}개를 지우고 ${imported.length}개로 덮어씁니다. 계속할까요?`
          : `${imported.length}개 메모를 가져올까요?`
      setConfirmDialog({
        title: '메모 가져오기',
        message,
        confirmLabel: '가져오기',
        danger: memos.length > 0,
        onConfirm: () => {
          setEditingId(null)
          setEditText('')
          setPendingDeleteId(null)
          setPendingPageDelete(false)
          setTagFilter(null)
          setSearchQuery('')
          setCurrentPage(1)
          setMemos(imported)
          showToast(`${imported.length}개 메모를 가져왔습니다`)
          closeConfirm()
        },
      })
    } catch {
      showToast('JSON 파일 형식이 올바르지 않습니다')
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>⚡ Flash Memo</h1>
        <div className="header-actions" ref={settingsRef}>
          <button
            type="button"
            className={`settings-btn${settingsOpen ? ' settings-btn--active' : ''}`}
            aria-label="설정"
            aria-expanded={settingsOpen}
            aria-haspopup="true"
            onClick={() => setSettingsOpen(prev => !prev)}
          >
            ⚙
          </button>
          {settingsOpen && (
            <div className="settings-panel" role="menu" aria-label="설정">
              <section className="settings-section">
                <p className="settings-section-label">테마</p>
                <div className="theme-toggle" role="group" aria-label="UI 스타일">
                  {UI_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      className={`theme-btn${
                        uiTheme === theme.id ? ' theme-btn--active' : ''
                      }`}
                      aria-pressed={uiTheme === theme.id}
                      onClick={() => setUiTheme(theme.id)}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </section>
              <section className="settings-section">
                <p className="settings-section-label">백업</p>
                <div className="settings-actions">
                  <button
                    type="button"
                    className="settings-action-btn"
                    aria-label="메모 JSON 내보내기"
                    onClick={handleExport}
                  >
                    내보내기
                  </button>
                  <button
                    type="button"
                    className="settings-action-btn"
                    aria-label="메모 JSON 가져오기"
                    onClick={handleImportClick}
                  >
                    가져오기
                  </button>
                  {trash.length > 0 && (
                    <button
                      type="button"
                      className={`settings-action-btn${
                        trashOpen ? ' settings-action-btn--active' : ''
                      }`}
                      aria-label="휴지통"
                      aria-expanded={trashOpen}
                      onClick={() => {
                        setTrashOpen(prev => !prev)
                        setSettingsOpen(false)
                      }}
                    >
                      휴지통 {trash.length}
                    </button>
                  )}
                </div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={handleImportFile}
                />
              </section>
              {memoTags.length > 0 && (
                <section className="settings-section">
                  <p className="settings-section-label">태그 목록</p>
                  <div className="settings-tag-list">
                    {memoTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        className={`settings-tag-chip${
                          tagFilter === tag ? ' settings-tag-chip--active' : ''
                        }`}
                        onClick={() => {
                          setTagFilter(tag)
                          setSettingsOpen(false)
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section className="settings-section">
                <p className="settings-section-label">태그 관리</p>
                <div className="settings-actions">
                  {memoTags.length > 0 ? (
                    <button
                      type="button"
                      className="settings-action-btn settings-action-btn--danger"
                      aria-label="모든 메모에서 태그 삭제"
                      onClick={deleteAllTags}
                    >
                      태그 전부 지우기 ({memoTags.length})
                    </button>
                  ) : (
                    <p className="settings-empty">등록된 태그가 없습니다</p>
                  )}
                </div>
              </section>
              <section className="settings-section">
                <p className="settings-section-label">저장 공간</p>
                <p
                  className={`settings-storage-info${
                    storageBytes >= STORAGE_BUDGET_BYTES * 0.85
                      ? ' settings-storage-info--warn'
                      : ''
                  }`}
                >
                  약 {formatStorageSize(storageBytes)} 사용 중
                  <span className="settings-storage-sub">
                    브라우저 한도 약 {formatStorageSize(STORAGE_BUDGET_BYTES)}
                  </span>
                </p>
              </section>
            </div>
          )}
        </div>
      </div>

      {trashOpen && trash.length > 0 && (
        <section className="trash-panel" aria-label="휴지통">
          <div className="trash-panel-header">
            <p className="section-label">휴지통 · {trash.length}개</p>
            <div className="trash-panel-actions">
              <button
                type="button"
                className="trash-empty-btn"
                onClick={emptyTrash}
              >
                비우기
              </button>
              <button
                type="button"
                className="trash-close-btn"
                aria-label="휴지통 닫기"
                onClick={() => setTrashOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
          <div className="trash-list">
            {sortedTrash.map(item => (
              <div key={item.trashId} className="trash-card">
                <p className="trash-card-text">{trashPreview(item.memo.text)}</p>
                <div className="trash-card-footer">
                  <RelativeTime
                    ts={item.deletedAt}
                    now={timeTick}
                    className="trash-card-time"
                    prefix="삭제 "
                  />
                  <div className="trash-card-actions">
                    <button
                      type="button"
                      className="trash-restore-btn"
                      onClick={() => restoreTrashItem(item.trashId)}
                    >
                      복구
                    </button>
                    <button
                      type="button"
                      className="trash-delete-btn"
                      onClick={() => permanentDeleteTrashItem(item.trashId)}
                    >
                      영구삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {guideOpen && (
        <section className="onboarding-card" aria-label="시작 안내">
          <div className="onboarding-card-body">
            <p>
              입력 후 <strong>✓ 저장</strong>을 누르세요 (PC:{' '}
              <strong>Ctrl+Enter</strong>). <strong>?</strong> 버튼에서 서식 안내를
              볼 수 있어요.
            </p>
            <p className="onboarding-card-sub">
              카드 탭 편집 · 길게 눌러 삭제 · ⚙ 설정에서 백업
            </p>
          </div>
          <button
            type="button"
            className="onboarding-dismiss"
            aria-label="안내 닫기"
            onClick={dismissGuide}
          >
            닫기
          </button>
        </section>
      )}

      <div
        className="input-area"
        onDragOver={handleDragOverShortcut}
        onDrop={handleMemoShortcutDrop}
      >
        <textarea
          ref={textareaRef}
          className="auto-grow-textarea"
          value={text}
          onChange={e => {
            setText(e.target.value)
            autoResizeTextarea(e.target)
          }}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOverShortcut}
          onDrop={handleMemoShortcutDrop}
          placeholder="지금 떠오른 생각을 적어보세요..."
        />
        {renderColorShortcuts(textareaRef, text, setText)}
        {renderMemoTagShortcuts(textareaRef, text, setText)}
        <div className="input-footer">
          <div className="input-footer-left">
            {renderFormatToolbar(textareaRef, text, setText)}
            <button
              type="button"
              className="hash-btn"
              aria-label="본문에 # 입력"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertAtCursor(textareaRef, text, setText, '#')}
            >
              #
            </button>
            <button
              type="button"
              className={`hint-btn${formatHintOpen ? ' hint-btn--active' : ''}`}
              aria-label="서식 안내"
              aria-expanded={formatHintOpen}
              onMouseDown={e => e.preventDefault()}
              onClick={() => setFormatHintOpen(prev => !prev)}
            >
              ?
            </button>
            <EmojiPickerButton
              textareaRef={textareaRef}
              setValue={setText}
              isOpen={emojiPickerOpen === 'input'}
              onToggle={() =>
                setEmojiPickerOpen(prev => (prev === 'input' ? null : 'input'))
              }
              onClose={() => setEmojiPickerOpen(null)}
            />
          </div>
          <button className="save-btn" onClick={saveMemo}>
            ✓ 저장
          </button>
        </div>
        <div
          className={`md-hint-panel${formatHintOpen ? ' md-hint-panel--open' : ''}`}
          aria-hidden={!formatHintOpen}
        >
          <p className="md-hint">
            **굵게** · [링크](https://) · {'{red}색{/}'} · ==강조== · .url
            드롭 · ✓ 저장 (PC: Ctrl+Enter)
          </p>
        </div>
      </div>

      {memos.length > 0 && (
        <div className="list-search-bar">
          <input
            className="search-input search-input--full"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="메모 검색..."
            aria-label="메모 검색"
          />
        </div>
      )}

      <div className="list-header">
        <p className="section-label">메모 목록</p>
        <div className="list-controls">
          {memos.length > 0 && (
            <>
              <select
                className="sort-select"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                aria-label="메모 정렬 및 필터"
              >
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="pinned">즐겨찾기</option>
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
            </>
          )}
          {pagedMemos.length > 0 && (
            <button
              type="button"
              className={`delete-page-btn${
                pendingPageDelete ? ' delete-page-btn--pending' : ''
              }`}
              aria-label="현재 페이지 메모 삭제"
              onClick={requestDeleteCurrentPage}
            >
              현 페이지 삭제
            </button>
          )}
        </div>
      </div>

      <div className="memo-list">
        {memos.length === 0 ? (
          <div className="empty-state-block">
            <p className="empty-state">아직 메모가 없어요</p>
            <button
              type="button"
              className="sample-memo-btn"
              onClick={addSampleMemo}
            >
              예시 추가
            </button>
          </div>
        ) : filteredMemos.length === 0 ? (
          <p className="empty-state">
            {tagFilter && q
              ? `태그 #${tagFilter}에서 검색 결과가 없어요`
              : tagFilter
                ? `태그 #${tagFilter} 메모가 없어요`
                : '검색 결과가 없어요'}
          </p>
        ) : sortedMemos.length === 0 ? (
          <p className="empty-state">즐겨찾기(⭐) 메모가 없어요</p>
        ) : (
          pagedMemos.map(m => (
            <div
              key={m.id}
              className={`memo-card${editingId === m.id ? ' memo-card--editing' : ''}${
                m.pinned ? ' memo-card--pinned' : ''
              }`}
            >
              {editingId === m.id ? (
                <div
                  ref={editCardRef}
                  className="memo-edit"
                  onDragOver={handleDragOverShortcut}
                  onDrop={handleEditShortcutDrop}
                >
                  <textarea
                    ref={editTextareaRef}
                    className="memo-edit-textarea auto-grow-textarea"
                    value={editText}
                    onChange={e => {
                      setEditText(e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onKeyDown={e => handleEditKeyDown(e, m.id)}
                    onDragOver={handleDragOverShortcut}
                    onDrop={handleEditShortcutDrop}
                  />
                  {renderColorShortcuts(editTextareaRef, editText, setEditText)}
                  {renderMemoTagShortcuts(editTextareaRef, editText, setEditText)}
                  <div className="memo-edit-footer">
                    <div className="memo-edit-toolbar">
                      {renderFormatToolbar(editTextareaRef, editText, setEditText)}
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
                      <EmojiPickerButton
                        textareaRef={editTextareaRef}
                        setValue={setEditText}
                        isOpen={emojiPickerOpen === 'edit'}
                        onToggle={() =>
                          setEmojiPickerOpen(prev => (prev === 'edit' ? null : 'edit'))
                        }
                        onClose={() => setEmojiPickerOpen(null)}
                      />
                    </div>
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
                  <p className="save-hint">저장 버튼 · Esc 취소 (PC: Ctrl+Enter)</p>
                </div>
              ) : (
                <div className="memo-card-view">
                  <button
                    type="button"
                    className={`pin-badge pin-btn${m.pinned ? ' pin-btn--active' : ''}`}
                    aria-label={m.pinned ? '고정 해제' : '상단 고정'}
                    onClick={e => {
                      e.stopPropagation()
                      togglePin(m.id)
                    }}
                  >
                    {m.pinned ? '⭐' : '☆'}
                  </button>
                  <div
                    className="memo-card-body"
                    onClick={e => handleCardBodyClick(m, e)}
                    onTouchStart={() => handleCardTouchStart(m)}
                    onTouchEnd={handleCardTouchEnd}
                    onTouchMove={handleCardTouchMove}
                    onTouchCancel={handleCardTouchEnd}
                    role="button"
                    tabIndex={0}
                    aria-label="메모 편집"
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        startEdit(m)
                      }
                    }}
                  >
                    <div className="memo-text">
                      {renderMemoText(m.text, filterByTag, tagFilter)}
                    </div>
                  </div>
                  <div className="memo-card-footer">
                    <RelativeTime ts={m.ts} now={timeTick} className="memo-time" />
                    <div className="memo-card-actions">
                      <button
                        type="button"
                        className="copy-btn"
                        aria-label="메모 복사"
                        onClick={e => {
                          e.stopPropagation()
                          copyMemoText(m.text)
                        }}
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        className="edit-btn"
                        aria-label="메모 편집"
                        onClick={e => {
                          e.stopPropagation()
                          startEdit(m)
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className={`delete-btn${
                          pendingDeleteId === m.id ? ' delete-btn--pending' : ''
                        }`}
                        aria-label="메모 삭제"
                        onClick={e => {
                          e.stopPropagation()
                          requestDelete(m.id)
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {actionMenuId != null && (
        <div
          className="memo-action-sheet"
          role="dialog"
          aria-label="메모 작업"
          onClick={closeActionMenu}
        >
          <div className="memo-action-sheet-panel" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="memo-action-sheet-btn memo-action-sheet-btn--delete"
              onClick={handleActionMenuDelete}
            >
              삭제
            </button>
            <button
              type="button"
              className="memo-action-sheet-btn"
              onClick={closeActionMenu}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast-message">{toast.message}</span>
          {toast.onUndo && (
            <button
              type="button"
              className="toast-undo-btn"
              onClick={handleUndo}
            >
              되돌리기
            </button>
          )}
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
