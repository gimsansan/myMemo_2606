import { useEffect, useRef } from 'react'
import 'emoji-picker-element'

function resizeTextarea(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function EmojiPickerButton({ textareaRef, setValue, isOpen, onToggle, onClose }) {
  const wrapRef = useRef(null)
  const pickerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const picker = pickerRef.current
    if (!picker) return

    const onEmoji = e => {
      const el = textareaRef.current
      const value = el?.value ?? ''
      const emoji = e.detail.unicode
      const start = el?.selectionStart ?? value.length
      const end = el?.selectionEnd ?? value.length
      const next = value.slice(0, start) + emoji + value.slice(end)
      setValue(next)
      const pos = start + emoji.length
      requestAnimationFrame(() => {
        el?.focus()
        el?.setSelectionRange(pos, pos)
        resizeTextarea(el)
      })
    }

    picker.addEventListener('emoji-click', onEmoji)
    return () => picker.removeEventListener('emoji-click', onEmoji)
  }, [isOpen, textareaRef, setValue])

  useEffect(() => {
    if (!isOpen) return
    const handleOutside = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose()
    }
    const handleEscape = e => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <div className="emoji-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`emoji-btn${isOpen ? ' emoji-btn--active' : ''}`}
        aria-label="이모지"
        aria-expanded={isOpen}
        onMouseDown={e => e.preventDefault()}
        onClick={onToggle}
      >
        😀
      </button>
      {isOpen && (
        <div className="emoji-picker-popover">
          <emoji-picker ref={pickerRef} class="emoji-picker-panel" />
        </div>
      )}
    </div>
  )
}
