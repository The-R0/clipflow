import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Circle, Star, Type, Link2, Code2, Image as ImageIcon, Zap, Sparkles } from 'lucide-react'
import { useClipflow, TYPE_COLOR } from '../hooks/useClipflow'
import { PromptFillModal } from '../components/PromptFillModal'
import { WindowSetSize } from '../../wailsjs/runtime/runtime'

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

const CATEGORIES = [
  { id: 'all',    icon: Circle,     label: 'All',    color: 'text-[#E0E0E0]' },
  { id: 'pinned', icon: Star,       label: 'Pinned', color: 'text-[#E0E0E0]' },
  { id: 'text',   icon: Type,       label: 'Text',   color: 'text-[#8C857B]' },
  { id: 'link',   icon: Link2,      label: 'Link',   color: 'text-[#5C7080]' },
  { id: 'code',   icon: Code2,      label: 'Code',   color: 'text-[#8F5C5C]' },
  { id: 'prompt', icon: Sparkles,   label: 'Prompt', color: 'text-[#E879F9]' },
]

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  TEXT:   { icon: Type,      color: 'text-[#8C857B]' },
  LINK:   { icon: Link2,     color: 'text-[#5C7080]' },
  CODE:   { icon: Code2,     color: 'text-[#8F5C5C]' },
  IMG:    { icon: ImageIcon, color: 'text-[#8F835C]' },
  CMD:    { icon: Zap,       color: 'text-[#00E5FF]' },
  ACTION: { icon: Sparkles,  color: 'text-[#F59E0B]' },
  PROMPT: { icon: Sparkles,  color: 'text-[#E879F9]' },
}

const isHexColor = (s: string) => /^#([0-9A-F]{3}){1,2}$/i.test(s.trim())
const parseJSON = (s: string) => {
  try { const o = JSON.parse(s); return typeof o === 'object' && o !== null ? JSON.stringify(o, null, 2) : null }
  catch { return null }
}

export function ClassicTheme({ onSwitch }: { onSwitch: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex,
    isRecordingKey, activationKey, selectItem, hide,
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
      if (e.key === 'Tab')       { e.preventDefault(); setIsSidebarOpen(p => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, filteredData, listIndex])

  if (!isOpen) return null

  const ActiveIcon = CATEGORIES.find(c => c.id === activeCategory)?.icon || Circle

  const renderDetails = (item: typeof filteredData[0]) => {
    const hex = isHexColor(item.content)
    if (hex) return (
      <div className="flex items-center gap-3 p-2">
        <div className="w-10 h-10 rounded shadow-inner border border-[#333]" style={{ backgroundColor: item.content }} />
        <span className="font-mono text-sm text-[#E0E0E0]">{item.content.toUpperCase()}</span>
      </div>
    )
    const json = parseJSON(item.content)
    if (json) return (
      <pre className="p-2.5 rounded border border-[#333] bg-[#0A0A0A] text-[#A0A0A0] font-mono text-[10px] overflow-x-auto">
        <code dangerouslySetInnerHTML={{
          __html: json.replace(/"(.*?)":/g, '<span class="text-[#5C7080]">"$1"</span>:')
                     .replace(/: "(.*?)"/g, ': <span class="text-[#8F835C]">"$1"</span>')
        }} />
      </pre>
    )
    return (
      <div className="p-2.5 rounded border border-[#333] bg-[#0A0A0A] text-[#A0A0A0] font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
        {item.details}
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col relative"
         style={{ background: 'rgba(28,28,28,0.95)', border: '1px solid #333', backdropFilter: 'blur(20px)' }}>

      {/* Header */}
      <div className="flex items-center px-3 h-11 border-b border-[#333] shrink-0 bg-[#1A1A1A]" style={drag}>
        <button style={nd} onClick={() => setIsSidebarOpen(p => !p)}
          className={`p-1.5 rounded-md transition-colors mr-2 ${isSidebarOpen ? 'bg-white/10 text-white' : 'text-[#888] hover:text-[#E0E0E0] hover:bg-white/5'}`}>
          <Menu size={16} strokeWidth={2.5} />
        </button>
        {!isSidebarOpen && !isCommandMode && (
          <span className="flex items-center justify-center text-[#555] mr-2">
            <ActiveIcon size={14} strokeWidth={2.5} />
          </span>
        )}
        <span className={`font-mono text-sm mr-2 ${isCommandMode ? 'text-[#00E5FF]' : 'text-[#555]'}`}>{'>'}</span>
        {isRecordingKey ? (
          <span style={nd} className="flex-1 text-[#00E5FF] text-[13px] font-mono animate-pulse">
            Listening... (Esc to cancel)
          </span>
        ) : (
          <input ref={inputRef} style={nd} value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={handleRecordKey}
            placeholder={isCommandMode ? '指令...' : '搜索...'}
            className="flex-1 bg-transparent outline-none text-[#E0E0E0] text-[13px] placeholder:text-[#555]" />
        )}
        <button style={nd} onClick={onSwitch}
          className="text-[9px] text-[#555] hover:text-[#aaa] ml-2 tracking-widest">THEME</button>
      </div>

      {/* Body: Sidebar + List */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 48, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="border-r border-[#333] bg-[#141414] flex flex-col items-center py-3 gap-2.5 shrink-0 overflow-hidden"
              style={nd}>
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.id
                const Icon = cat.icon
                return (
                  <div key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); inputRef.current?.focus() }}
                    title={cat.label}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                      isActive ? `bg-white/10 shadow-sm ${cat.color}` : 'text-[#555] hover:text-[#888] hover:bg-white/5'
                    }`}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-1.5 scrollbar-none flex flex-col gap-0.5" style={nd}>
          {filteredData.map((item, i) => {
            const isActive = i === listIndex
            const isHovered = hoveredId === item.id
            const config = TYPE_CONFIG[item.type]
            const ItemIcon = config?.icon || Circle
            return (
              <div key={item.id}
                onClick={() => selectItem(item)}
                onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex flex-col px-3 py-2 rounded-md cursor-pointer transition-all border ${
                  isActive ? 'border-white/10 bg-white/[0.05] translate-x-[2px]' : 'border-transparent hover:bg-white/[0.02]'
                }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex items-center justify-center shrink-0 ${config?.color || 'text-[#888]'} ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    <ItemIcon size={14} strokeWidth={2.5} />
                  </span>
                  <span className={`flex-1 font-mono text-[12px] truncate ${isActive || isHovered ? 'text-[#E0E0E0]' : 'text-[#777]'}`}>
                    {item.preview}
                  </span>
                  <span className="text-[8px] text-[#555] shrink-0 tabular-nums">{item.createdAt}</span>
                  {item.pinned && (
                    <Star size={11} className="text-[#666] shrink-0 cursor-pointer" fill="currentColor"
                      onClick={e => { e.stopPropagation(); TogglePin(item.id) }} />
                  )}
                </div>
                {isHovered && item.details && (
                  <div className="mt-1.5 ml-[22px] overflow-hidden">
                    {renderDetails(item)}
                  </div>
                )}
              </div>
            )
          })}
          {filteredData.length === 0 && (
            <div className="text-center py-10 text-[#555] text-xs font-mono">
              {isCommandMode ? 'Unknown command' : 'No results'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="h-7 border-t border-[#333] bg-[#1A1A1A] shrink-0 flex items-center justify-between px-3 text-[9px] text-[#555] font-mono select-none relative" style={nd}>
        <div className="flex items-center gap-2">
          <span>Tab 侧栏</span>
          <span>↵ 粘贴</span>
          <span>Esc 隐藏</span>
        </div>
        <span>{activationKey}</span>
        {/* Resize handle */}
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={e => {
            e.preventDefault()
            const sx = e.screenX, sy = e.screenY, sw = window.outerWidth, sh = window.outerHeight
            const onMove = (mv: MouseEvent) => WindowSetSize(Math.max(260, sw + mv.screenX - sx), Math.max(300, sh + mv.screenY - sy))
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
            window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
          }}>
          <svg width="8" height="8" viewBox="0 0 8 8" className="absolute bottom-1 right-1 text-[#444]">
            <path d="M7 1L1 7M7 4L4 7M7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Prompt fill modal */}
      {promptFill && (
        <PromptFillModal item={promptFill} onDone={() => setPromptFill(null)}
          accentColor="#E879F9" bgColor="#141414" textColor="#E0E0E0" mutedColor="#888" borderColor="#333" />
      )}
    </div>
  )
}
