import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Star } from 'lucide-react'
import { useClipflow, CATS, TYPE_COLOR } from '../hooks/useClipflow'

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

type Scheme = { bg: string; surface: string; border: string; text: string; muted: string; hover: string }

const DARK: Scheme = {
  bg:      '#0F0F0F',
  surface: '#181818',
  border:  '#272727',
  text:    '#F0F0F0',
  muted:   '#6B6B6B',
  hover:   '#1F1F1F',
}
const LIGHT: Scheme = {
  bg:      '#FAFAFA',
  surface: '#F0F0F0',
  border:  '#E2E2E2',
  text:    '#111111',
  muted:   '#999999',
  hover:   '#EBEBEB',
}

const TYPE_LABEL: Record<string, string> = {
  TEXT: 'Text', LINK: 'Link', CODE: 'Code', IMG: 'Image', CMD: 'Cmd', ACTION: 'Action',
}

export function CrispTheme({ onSwitch }: { onSwitch: () => void }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('cf-dark') !== 'false')
  const c = isDark ? DARK : LIGHT

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('cf-dark', String(next))
  }

  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex, expandedIndex, setExpandedIndex,
    isRecordingKey, setIsRecordingKey, activationKey, selectItem, hide,
    handleRecordKey, TogglePin, inputRef, isCommandMode,
  } = useClipflow()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      const len = filteredData.length || 1
      if (e.key === 'Escape')     { hide(); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setListIndex(p => (p + 1) % len); setExpandedIndex(null) }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setListIndex(p => (p - 1 + len) % len); setExpandedIndex(null) }
      if (e.key === 'ArrowRight') { e.preventDefault(); setExpandedIndex(listIndex) }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); setExpandedIndex(null) }
      if (e.key === 'Enter')      { e.preventDefault(); filteredData[listIndex] && selectItem(filteredData[listIndex]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, filteredData, listIndex])

  if (!isOpen) return null

  return (
    <div className="w-full h-full flex flex-col"
         style={{
           fontFamily: "'Segoe UI Variable','Segoe UI',system-ui,sans-serif",
           background: c.bg, color: c.text,
           border: `1px solid ${c.border}`,
           transition: 'background 0.2s, color 0.2s',
         }}>

      {/* Header / Search */}
      <div className="flex items-center gap-2 px-3 h-11 shrink-0"
           style={{ borderBottom: `1px solid ${c.border}`, ...drag }}>
        <div className="flex-1 flex items-center" style={nd}>
          {isRecordingKey ? (
            <span className="text-[12px] animate-pulse" style={{ color: TYPE_COLOR.CMD }}>
              Press combo — Esc to cancel
            </span>
          ) : (
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleRecordKey}
              placeholder={isCommandMode ? 'Command...' : 'Search clipboard...'}
              className="w-full bg-transparent outline-none text-[13px]"
              style={{ color: c.text }}
            />
          )}
        </div>
        <button onClick={toggleDark} style={nd}
          className="p-1 rounded transition-opacity opacity-40 hover:opacity-100"
          title="Toggle dark/light mode">
          {isDark
            ? <Sun size={13} strokeWidth={2} style={{ color: c.muted }} />
            : <Moon size={13} strokeWidth={2} style={{ color: c.muted }} />
          }
        </button>
        <button onClick={onSwitch}
          style={{ ...nd, color: c.muted }}
          className="text-[10px] transition-opacity opacity-30 hover:opacity-80"
          title="Switch theme">⊞</button>
      </div>

      {/* Category tabs */}
      <div className="flex px-3 gap-0 h-9 items-center shrink-0"
           style={{ borderBottom: `1px solid ${c.border}`, ...nd }}>
        {CATS.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className="px-3 h-full text-[12px] relative transition-colors"
            style={{ color: activeCategory === cat.id ? c.text : c.muted }}>
            {cat.label}
            {activeCategory === cat.id && (
              <motion.div layoutId="crisp-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: c.text }} />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={nd}>
        {filteredData.length === 0 && (
          <div className="py-10 text-center text-[12px]" style={{ color: c.muted }}>
            {isCommandMode ? 'Unknown command' : 'No results'}
          </div>
        )}
        <AnimatePresence initial={false}>
          {filteredData.map((item, i) => {
            const isActive = i === listIndex
            const dot = TYPE_COLOR[item.type] ?? '#888'
            return (
              <motion.div key={item.id}
                layout
                onClick={() => selectItem(item)}
                className="px-3 py-2.5 cursor-pointer select-none transition-colors"
                style={{
                  background: isActive ? c.surface : 'transparent',
                  borderBottom: `1px solid ${c.border}`,
                }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <span className="text-[13px] truncate font-medium">{item.preview}</span>
                  {item.pinned && (
                    <Star size={10} className="ml-auto shrink-0" style={{ color: '#FBBF24', fill: '#FBBF24' }} />
                  )}
                </div>
                <div className="mt-0.5 pl-4 flex items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: c.muted }}>
                    {TYPE_LABEL[item.type] ?? item.type}
                  </span>
                </div>
                {expandedIndex === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pl-4 text-[11px] whitespace-pre-wrap line-clamp-4 leading-relaxed"
                    style={{ color: c.muted }}>
                    {item.details}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="h-8 px-3 flex items-center justify-between shrink-0"
           style={{ borderTop: `1px solid ${c.border}`, ...nd }}>
        <span className="text-[10px]" style={{ color: c.muted }}>
          ↵ paste · → expand · esc hide
        </span>
        <span className="text-[10px]" style={{ color: c.muted }}>{activationKey}</span>
      </div>
    </div>
  )
}
