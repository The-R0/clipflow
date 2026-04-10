import React, { useEffect, useState } from 'react'
import { useClipflow, TYPE_COLOR } from '../hooks/useClipflow'
import { PromptFillModal } from '../components/PromptFillModal'

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

const CAT_ICONS: { id: string; label: string; shape: React.ReactNode }[] = [
  { id: 'all',    label: 'All',  shape: <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="3" cy="3" r="1.5" fill="currentColor"/><circle cx="9" cy="3" r="1.5" fill="currentColor"/><circle cx="3" cy="9" r="1.5" fill="currentColor"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg> },
  { id: 'text',   label: 'Text', shape: <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="2" width="10" height="1.5" rx="0.5" fill="currentColor"/><rect x="1" y="5.25" width="7" height="1.5" rx="0.5" fill="currentColor"/><rect x="1" y="8.5" width="8.5" height="1.5" rx="0.5" fill="currentColor"/></svg> },
  { id: 'link',   label: 'Link', shape: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M4 6h4M2.5 4.5 A2.5 2.5 0 0 1 4 9H3A3.5 3.5 0 0 0 3 3h1A2.5 2.5 0 0 1 2.5 4.5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/><path d="M9.5 7.5 A2.5 2.5 0 0 1 8 3h1A3.5 3.5 0 0 0 9 9H8A2.5 2.5 0 0 1 9.5 7.5z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg> },
  { id: 'code',   label: 'Code', shape: <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="4.5,3 1.5,6 4.5,9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7.5,3 10.5,6 7.5,9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: 'prompt', label: 'Prompt', shape: <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 7.2,4.5 11,4.5 8,6.8 9.2,10.5 6,8.2 2.8,10.5 4,6.8 1,4.5 4.8,4.5" fill="currentColor" opacity="0.9"/></svg> },
]

export function MonoTheme({ onSwitch }: { onSwitch: () => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex,
    isRecordingKey, setIsRecordingKey, activationKey, selectItem, hide,
    handleRecordKey, TogglePin, inputRef, isCommandMode,
    promptFill, setPromptFill,
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
    <div className="w-full h-full flex flex-col bg-black text-white relative"
         style={{ fontFamily: "'JetBrains Mono','Consolas','Courier New',monospace", border: '1px solid rgba(255,255,255,0.15)' }}>

      {/* Title bar */}
      <div className="flex items-center px-3 h-9 shrink-0 border-b border-white/10" style={drag}>
        <span className="text-[10px] tracking-[0.3em] text-white/30 mr-auto">CLIPFLOW</span>
        <button style={nd} onClick={onSwitch}
          className="text-[9px] text-white/20 hover:text-white/60 tracking-widest transition-colors mr-3">
          THEME
        </button>
        <span className="text-[9px] text-white/15 tracking-widest">{activationKey}</span>
      </div>

      {/* Search */}
      <div className="flex items-center px-3 h-9 shrink-0 border-b border-white/10" style={nd}>
        <span className="text-white/25 text-xs mr-2">{'>'}</span>
        {isRecordingKey ? (
          <span className="flex-1 text-[11px] text-white/50 animate-pulse">
            PRESS COMBO — ESC to cancel
          </span>
        ) : (
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleRecordKey}
            placeholder={isCommandMode ? 'COMMAND...' : 'SEARCH...'}
            className="flex-1 bg-transparent outline-none text-[11px] text-white placeholder:text-white/20"
          />
        )}
      </div>

      {/* Category tabs — abstract icons */}
      <div className="flex border-b border-white/10 shrink-0" style={nd}>
        {CAT_ICONS.map(c => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)}
            title={c.label}
            className={`flex-1 py-2 flex items-center justify-center transition-colors border-r border-white/10 last:border-r-0 ${
              activeCategory === c.id
                ? 'bg-white text-black'
                : 'text-white/25 hover:text-white/60'
            }`}>
            {c.shape}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={nd}>
        {filteredData.length === 0 && (
          <div className="py-8 text-center text-[10px] text-white/15 tracking-widest">NO RESULTS</div>
        )}
        {filteredData.map((item, i) => {
          const isActive = i === listIndex
          const isHovered = hoveredId === item.id
          return (
            <div key={item.id}
              onClick={() => selectItem(item)}
              onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
              onMouseLeave={() => setHoveredId(null)}
              className={`border-b border-white/[0.06] px-3 py-2 cursor-pointer transition-colors select-none ${
                isActive ? 'bg-white text-black' : 'hover:bg-white/[0.04]'
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[8px] tracking-widest border px-1 py-px shrink-0 ${
                  isActive ? 'border-black/20 text-black/50' : 'border-white/15 text-white/30'
                }`}>{item.type}</span>
                <span className="text-[11px] truncate">{item.preview}</span>
                {item.pinned && (
                  <span className={`ml-auto text-[10px] shrink-0 ${isActive ? 'text-black/40' : 'text-white/30'}`}>★</span>
                )}
              </div>
              {isHovered && item.details && (
                <pre className={`mt-1.5 text-[9px] whitespace-pre-wrap line-clamp-4 leading-relaxed ${
                  isActive ? 'text-black/50' : 'text-white/30'
                }`}>{item.details}</pre>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="h-7 border-t border-white/10 px-3 flex items-center gap-3 shrink-0 text-[8px] text-white/15 tracking-widest" style={nd}>
        <span>↵ PASTE</span>
        <span>HOVER EXPAND</span>
        <span>ESC HIDE</span>
      </div>

      {/* Prompt variable fill modal */}
      {promptFill && (
        <PromptFillModal
          item={promptFill}
          onDone={() => setPromptFill(null)}
          accentColor="#E879F9"
          bgColor="#0A0A0A"
          textColor="#F0F0F0"
          mutedColor="#999"
          borderColor="#333"
        />
      )}
    </div>
  )
}
