import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'
import { useClipflow, TYPE_COLOR } from '../hooks/useClipflow'

const CAT_ICONS = [
  { id: 'all',    label: 'All',    shape: <svg width="13" height="13" viewBox="0 0 12 12"><circle cx="3" cy="3" r="1.4" fill="currentColor"/><circle cx="9" cy="3" r="1.4" fill="currentColor"/><circle cx="3" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/></svg> },
  { id: 'text',   label: 'Text',   shape: <svg width="13" height="13" viewBox="0 0 12 12"><rect x="1" y="2" width="10" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="5.25" width="6.5" height="1.5" rx="0.75" fill="currentColor"/><rect x="1" y="8.5" width="8" height="1.5" rx="0.75" fill="currentColor"/></svg> },
  { id: 'link',   label: 'Link',   shape: <svg width="13" height="13" viewBox="0 0 12 12"><circle cx="3.5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><circle cx="8.5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><line x1="5.7" y1="6" x2="6.3" y2="6" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: 'code',   label: 'Code',   shape: <svg width="13" height="13" viewBox="0 0 12 12"><polyline points="4.5,3 1.5,6 4.5,9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7.5,3 10.5,6 7.5,9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'prompt', label: 'Prompt', shape: <svg width="13" height="13" viewBox="0 0 12 12"><polygon points="6,1 7.2,4.5 11,4.5 8,6.8 9.2,10.5 6,8.2 2.8,10.5 4,6.8 1,4.5 4.8,4.5" fill="currentColor"/></svg> },
]

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

export function FluidTheme({ onSwitch }: { onSwitch: () => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex,
    isRecordingKey, activationKey, selectItem, hide,
    handleRecordKey, TogglePin, inputRef, isCommandMode,
  } = useClipflow()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      const len = filteredData.length || 1
      if (e.key === 'Escape')    { hide(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setListIndex(p => (p + 1) % len) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setListIndex(p => (p - 1 + len) % len) }
      if (e.key === 'Enter')     { e.preventDefault(); filteredData[listIndex] && selectItem(filteredData[listIndex]) }
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
      className="w-full h-full flex flex-col"
      style={{
        fontFamily: "'Segoe UI Variable','Segoe UI',system-ui,sans-serif",
        background: 'linear-gradient(160deg, rgba(14,14,24,0.98) 0%, rgba(20,14,36,0.98) 100%)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
        overflow: 'hidden',
        ...nd,
      }}>

      {/* Drag bar */}
      <div className="h-8 flex items-center justify-between px-4 shrink-0" style={drag}>
        <span className="text-[10px] text-white/20 tracking-[0.2em] font-medium">CLIPFLOW</span>
        <button style={nd} onClick={onSwitch}
          className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/25 transition-colors" />
      </div>

      {/* Search bar */}
      <div className="px-3 shrink-0" style={nd}>
        <div className="flex items-center gap-2 rounded-lg px-3 h-9"
             style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-white/25 text-sm">⌕</span>
          {isRecordingKey ? (
            <span className="flex-1 text-[11px] text-cyan-400/70 animate-pulse">Press combo — Esc to cancel</span>
          ) : (
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={handleRecordKey}
              placeholder={isCommandMode ? 'Command mode...' : 'Search...'}
              className="flex-1 bg-transparent outline-none text-[12px] text-white/80 placeholder:text-white/20" />
          )}
        </div>
      </div>

      {/* Category icons */}
      <div className="flex gap-1 px-3 mt-2.5 shrink-0" style={nd}>
        {CAT_ICONS.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)}
            title={c.label}
            className={`w-8 h-7 flex items-center justify-center rounded-md transition-all ${
              activeCategory === c.id ? 'text-white' : 'text-white/25 hover:text-white/55'
            }`}
            style={activeCategory === c.id ? {
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.15)',
            } : { border: '1px solid transparent' }}>
            {c.shape}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto mt-2 px-2 pb-2 space-y-1 scrollbar-none" style={nd}>
        <AnimatePresence initial={false}>
          {filteredData.map((item, i) => {
            const isActive = i === listIndex
            const color = TYPE_COLOR[item.type] ?? '#888'
            const isHovered = hoveredId === item.id
            return (
              <motion.div key={item.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                onClick={() => selectItem(item)}
                onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
                onMouseLeave={() => setHoveredId(null)}
                className="px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.025)',
                  border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                  boxShadow: isActive ? '0 2px 16px rgba(0,0,0,0.3)' : 'none',
                }}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-[3px] h-3.5 rounded-full shrink-0" style={{ background: color, opacity: 0.8 }} />
                  <span className="text-[12px] text-white/80 truncate">{item.preview}</span>
                  {item.pinned && (
                    <Star size={8} className="ml-auto shrink-0 fill-amber-400 text-amber-400" />
                  )}
                </div>
                <div className="mt-0.5 ml-[11px] flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: color + 'AA' }}>
                    {item.type}
                  </span>
                </div>
                {isHovered && item.details && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 ml-[11px] text-[10px] text-white/30 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                    {item.details}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        {filteredData.length === 0 && (
          <div className="py-10 text-center text-[11px] text-white/15">Nothing here</div>
        )}
      </div>

      {/* Footer */}
      <div className="h-8 border-t px-4 flex items-center justify-between shrink-0 text-[9px] text-white/18"
           style={{ borderColor: 'rgba(255,255,255,0.05)', ...nd }}>
        <span>↵ paste · esc hide</span>
        <span>{activationKey}</span>
      </div>
    </motion.div>
  )
}
