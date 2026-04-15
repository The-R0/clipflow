import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Star, Pin, Search, Type, Link, Code2, Sparkles, LayoutGrid, Zap, ChevronRight, Image, X } from 'lucide-react'
import { useClipflow, TYPE_COLOR } from '../hooks/useClipflow'
import { PromptFillModal } from '../components/PromptFillModal'
import { TogglePin } from '../../wailsjs/go/main/App'

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

type Scheme = { bg: string; surface: string; surfaceHover: string; border: string; text: string; textSecondary: string; textDisabled: string; accent: string; accentBg: string }

const DARK: Scheme = {
  bg: 'rgba(28,28,30,0.92)', surface: 'rgba(255,255,255,0.06)', surfaceHover: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.82)', textSecondary: 'rgba(255,255,255,0.48)',
  textDisabled: 'rgba(255,255,255,0.28)', accent: '#6EA8FE', accentBg: 'rgba(110,168,254,0.14)',
}
const LIGHT: Scheme = {
  bg: 'rgba(246,246,246,0.92)', surface: 'rgba(0,0,0,0.04)', surfaceHover: 'rgba(0,0,0,0.07)',
  border: 'rgba(0,0,0,0.09)', text: 'rgba(0,0,0,0.82)', textSecondary: 'rgba(0,0,0,0.48)',
  textDisabled: 'rgba(0,0,0,0.28)', accent: '#0A84FF', accentBg: 'rgba(10,132,255,0.10)',
}

const CATS = [
  { id: 'all', label: '全部', Icon: LayoutGrid },
  { id: 'text', label: '文本', Icon: Type },
  { id: 'link', label: '链接', Icon: Link },
  { id: 'code', label: '代码', Icon: Code2 },
  { id: 'prompt', label: 'Prompt', Icon: Sparkles },
  { id: 'pinned', label: '收藏', Icon: Star },
]
const TYPE_ICON: Record<string, React.ElementType> = {
  TEXT: Type, LINK: Link, CODE: Code2, IMG: Image, CMD: Zap, ACTION: Zap, PROMPT: Sparkles,
}

export function FluidTheme({ onSwitch }: { onSwitch: () => void }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('fluid-dark') !== 'false')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const c = isDark ? DARK : LIGHT
  const toggleDark = () => { const n = !isDark; setIsDark(n); localStorage.setItem('fluid-dark', String(n)) }

  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex,
    isRecordingKey, activationKey, selectItem, hide,
    handleRecordKey, inputRef, isCommandMode,
    promptFill, setPromptFill,
    DeleteItem,
  } = useClipflow()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      const len = filteredData.length || 1
      if (e.key === 'Escape') { hide(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setListIndex(p => (p + 1) % len) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setListIndex(p => (p - 1 + len) % len) }
      if (e.key === 'Enter') { e.preventDefault(); filteredData[listIndex] && selectItem(filteredData[listIndex]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, filteredData, listIndex])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 6 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="w-full h-full flex flex-col overflow-hidden"
      style={{
        fontFamily: "'Microsoft YaHei','Inter','Segoe UI Variable',system-ui,sans-serif",
        background: c.bg,
        borderRadius: 8,
        boxShadow: 'none',
        ...nd,
      }}>

      {/* Title bar */}
      <div className="flex items-center h-8 px-3 shrink-0 select-none" style={{ ...drag, borderBottom: `1px solid ${c.border}` }}>
        <span className="text-[11px] font-medium flex-1" style={{ color: c.text }}>Clipflow</span>
        <div className="flex items-center gap-0.5" style={nd}>
          <button onClick={toggleDark} className="w-6 h-6 rounded flex items-center justify-center transition-colors"
            style={{ color: c.textSecondary }} title={isDark ? '浅色' : '深色'}>
            {isDark
              ? <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12A4 4 0 1 0 8 4a4 4 0 0 0 0 8zm0 1.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11z"/></svg>
              : <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M7 2a5 5 0 0 0 4.33 7.47A5 5 0 1 1 7 2z"/></svg>
            }
          </button>
          <button onClick={onSwitch} className="w-6 h-6 rounded flex items-center justify-center text-[10px]"
            style={{ color: c.textDisabled }} title="切换主题">⊞</button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-2 pb-0 shrink-0" style={nd}>
        <div className="flex items-center gap-2 h-7 px-2.5 rounded-lg"
             style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <Search size={12} style={{ color: c.textDisabled, flexShrink: 0 }} />
          {isRecordingKey ? (
            <span className="flex-1 text-[11px] animate-pulse" style={{ color: c.accent }}>按下快捷键… Esc 取消</span>
          ) : (
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={handleRecordKey}
              placeholder={isCommandMode ? '输入指令…' : '搜索剪贴板…'}
              className="flex-1 bg-transparent outline-none text-[11.5px]"
              style={{ color: c.text, caretColor: c.accent }}
              spellCheck={false} autoComplete="off" />
          )}
          {search && (
            <button onClick={() => setSearch('')} style={{ color: c.textDisabled }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 5.293 10.146 1.147a.5.5 0 0 1 .707.707L6.707 6l4.146 4.146a.5.5 0 0 1-.707.707L6 6.707l-4.146 4.146a.5.5 0 0 1-.707-.707L5.293 6 1.147 1.854A.5.5 0 0 1 1.854 1.147L6 5.293z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category icons */}
      <div className="flex gap-1 px-3 mt-2 shrink-0" style={nd}>
        {CATS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveCategory(id)} title={label}
            className="w-8 h-7 flex items-center justify-center rounded-md transition-all"
            style={activeCategory === id ? {
              background: c.accentBg, color: c.accent, border: `1px solid ${c.border}`,
            } : { color: c.textSecondary, border: '1px solid transparent' }}>
            <Icon size={13} strokeWidth={activeCategory === id ? 2.2 : 1.6} />
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto mt-1.5 px-1.5 pb-1.5 scrollbar-hover" style={nd}>
        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: c.textDisabled }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span className="text-[10px]">{isCommandMode ? '未知指令' : '无内容'}</span>
          </div>
        )}
        {filteredData.map((item, i) => {
          const isActive = i === listIndex
          const isHovered = hoveredId === item.id
          const isExpanded = isHovered || isActive
          const color = TYPE_COLOR[item.type] ?? '#888'
          const Icon = TYPE_ICON[item.type] || ChevronRight
          return (
            <div key={item.id}
              onClick={() => selectItem(item)}
              onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
              onMouseLeave={() => setHoveredId(null)}
              className="px-3 py-2 rounded-lg cursor-pointer transition-all select-none mb-0.5"
              style={{
                background: isActive ? c.accentBg : isHovered ? c.surfaceHover : 'transparent',
                border: `1px solid ${isActive ? c.accent : 'transparent'}`,
              }}>
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={12} strokeWidth={1.8} style={{ color: isActive ? c.accent : c.textSecondary, flexShrink: 0 }} />
                <span className="flex-1 text-[12px] truncate" style={{ color: c.text }}>{item.preview}</span>
                {item.createdAt && (
                  <span className="text-[9px] tabular-nums shrink-0" style={{ color: c.textDisabled }}>{item.createdAt}</span>
                )}
                {(item.pinned || isHovered) && (
                  <button onClick={e => { e.stopPropagation(); TogglePin(item.id) }}
                    className="shrink-0" style={{ color: item.pinned ? '#FACC15' : c.textDisabled }}>
                    <Star size={10} fill={item.pinned ? "currentColor" : "none"} strokeWidth={item.pinned ? 0 : 1.8} />
                  </button>
                )}
                {isHovered && (
                  <button onClick={e => { e.stopPropagation(); DeleteItem(item.id) }}
                    className="shrink-0" style={{ color: c.textDisabled }}>
                    <X size={10} strokeWidth={1.8} />
                  </button>
                )}
              </div>
              <div style={{
                maxHeight: isExpanded && item.details ? 60 : 0,
                overflow: 'hidden', transition: 'max-height 150ms ease',
                opacity: isExpanded && item.details ? 1 : 0,
              }}>
                <div className="mt-1 ml-4 text-[10px] leading-relaxed line-clamp-3"
                     style={{ color: c.textSecondary, fontFamily: item.type === 'CODE' ? "'Cascadia Code','Consolas',monospace" : 'inherit' }}>
                  {item.type === 'TEXT' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(item.content.trim()) ? (
                    <div className="flex items-center gap-2">
                      <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: item.content.trim(), border: `1px solid ${c.border}`, flexShrink: 0 }} />
                      <span>{item.content.trim()}</span>
                    </div>
                  ) : item.details}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="h-5 px-3 flex items-center justify-between shrink-0 select-none"
           style={{ borderTop: `1px solid ${c.border}`, ...nd }}>
        <div className="flex items-center gap-2">
          {[['↵', '粘贴'], ['Esc', '隐藏']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-0.5 text-[8px]" style={{ color: c.textDisabled }}>
              <kbd className="px-0.5 rounded text-[7px]"
                   style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
        <span className="text-[8px]" style={{ color: c.textDisabled }}>{activationKey}</span>
      </div>

      {/* Prompt fill modal */}
      {promptFill && (
        <PromptFillModal item={promptFill} onDone={() => setPromptFill(null)}
          accentColor={c.accent} bgColor={isDark ? '#1C1C1E' : '#F2F2F7'}
          textColor={c.text} mutedColor={c.textSecondary} borderColor={c.border} />
      )}
    </motion.div>
  )
}
