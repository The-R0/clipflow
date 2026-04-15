import React, { useEffect, useState } from 'react'
import { Search, Pin, ChevronRight, Type, Link, Code2, Image, Zap, Sparkles, LayoutGrid, Menu, Star, X } from 'lucide-react'
import { useClipflow } from '../hooks/useClipflow'
import { PromptFillModal } from '../components/PromptFillModal'
import { TogglePin } from '../../wailsjs/go/main/App'

const SIDEBAR_W = 56

const nd = { '--wails-draggable': 'no-drag' } as React.CSSProperties
const drag = { '--wails-draggable': 'drag' } as React.CSSProperties

/* ── Fluent Design tokens ────────────────────────────────────────── */
type Scheme = {
  bg: string; surface: string; surfaceHover: string
  border: string; text: string; textSecondary: string; textDisabled: string
  accent: string; accentHover: string; accentBg: string
  shadow: string
}

const DARK: Scheme = {
  bg:            'rgba(40, 40, 40, 0.96)',
  surface:       'rgba(255,255,255,0.045)',
  surfaceHover:  'rgba(255,255,255,0.075)',
  border:        'rgba(255,255,255,0.08)',
  text:          'rgba(255,255,255,0.89)',
  textSecondary: 'rgba(255,255,255,0.56)',
  textDisabled:  'rgba(255,255,255,0.35)',
  accent:        '#76B9ED',
  accentHover:   '#87C4F0',
  accentBg:      'rgba(118,185,237,0.14)',
  shadow:        'none',
}
const LIGHT: Scheme = {
  bg:            'rgba(241,245,250,0.95)',
  surface:       'rgba(255,255,255,0.58)',
  surfaceHover:  'rgba(255,255,255,0.85)',
  border:        'rgba(58,78,103,0.18)',
  text:          'rgba(0,0,0,0.89)',
  textSecondary: 'rgba(0,0,0,0.62)',
  textDisabled:  'rgba(0,0,0,0.36)',
  accent:        '#0F6CBD',
  accentHover:   '#175EA6',
  accentBg:      'rgba(15,108,189,0.12)',
  shadow:        'none',
}

/* ── Category config ─────────────────────────────────────────────── */
const CATS = [
  { id: 'all',    label: '全部',  Icon: LayoutGrid },
  { id: 'text',   label: '文本',  Icon: Type       },
  { id: 'link',   label: '链接',  Icon: Link       },
  { id: 'code',   label: '代码',  Icon: Code2      },
  { id: 'prompt', label: 'Prompt',Icon: Sparkles   },
  { id: 'pinned', label: '收藏',  Icon: Star       },
]

const TYPE_ICON: Record<string, React.ElementType> = {
  TEXT: Type, LINK: Link, CODE: Code2, IMG: Image, CMD: Zap, ACTION: Zap, PROMPT: Sparkles,
}

/* ═══════════════════════════════════════════════════════════════════ */
export function WinUITheme({ onSwitch }: { onSwitch: () => void }) {
  const [isDark,       setIsDark]       = useState(() => localStorage.getItem('wui-dark') !== 'false')
  const [hoveredId,    setHoveredId]    = useState<string | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const c = isDark ? DARK : LIGHT

  const toggleSidebar = () => setSidebarOpen(p => !p)

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
      if (e.key === 'Escape')    { hide(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setListIndex(p => (p + 1) % len) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setListIndex(p => (p - 1 + len) % len) }
      if (e.key === 'Enter')     { e.preventDefault(); filteredData[listIndex] && selectItem(filteredData[listIndex]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, filteredData, listIndex])

  if (!isOpen) return null

  const toggleDark = () => {
    const n = !isDark; setIsDark(n); localStorage.setItem('wui-dark', String(n))
  }

  const panelStyle: React.CSSProperties = {
    background: c.bg,
    borderRadius: 12,
    border: `1px solid ${c.border}`,
    boxShadow: 'none',
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative"
         style={{ fontFamily: "'Microsoft YaHei','Inter','Segoe UI Variable','Segoe UI',system-ui,sans-serif", ...panelStyle, ...nd }}>

        {/* ── Sidebar: absolute overlay on the LEFT, no window resize ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: SIDEBAR_W, zIndex: 30,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 160ms cubic-bezier(.4,0,.2,1)',
          background: c.bg,
          borderRight: `1px solid ${c.border}`,
          borderRadius: '12px 0 0 12px',
          boxShadow: 'none',
          ...nd,
        }}>
          <div className="flex flex-col items-center pt-3 pb-2 gap-0.5 h-full">
            {CATS.map(({ id, label, Icon }) => {
              const isActive = activeCategory === id
              return (
                <button key={id}
                  onClick={() => { setActiveCategory(id); toggleSidebar(); inputRef.current?.focus() }}
                  title={label}
                  className="w-10 h-10 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all"
                  style={{
                    '--wails-draggable': 'no-drag',
                    background: isActive ? c.accentBg : 'transparent',
                    color: isActive ? c.accent : c.textSecondary,
                  } as React.CSSProperties}>
                  <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span style={{ fontSize: 8, lineHeight: 1.2 }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Title bar */}
        <div className="flex items-center h-9 px-2 shrink-0 select-none gap-1"
             style={{ ...drag, borderBottom: `1px solid ${c.border}` }}>
          <button onClick={toggleSidebar} style={nd}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors shrink-0"
            title="分类">
            <Menu size={15} strokeWidth={1.8} style={{ color: sidebarOpen ? c.accent : c.textSecondary }} />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[11.5px] font-medium" style={{ color: c.text }}>Clipflow</span>
          </div>
          <div className="flex items-center gap-0.5" style={nd}>
            <button onClick={toggleDark}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors"
              style={{ color: c.textSecondary }} title={isDark ? '浅色' : '深色'}>
              {isDark
                ? <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12A4 4 0 1 0 8 4a4 4 0 0 0 0 8zm0 1.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11z"/></svg>
                : <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7 2a5 5 0 0 0 4.33 7.47A5 5 0 1 1 7 2z"/></svg>
              }
            </button>
            <button onClick={onSwitch}
              className="w-7 h-7 rounded flex items-center justify-center text-[11px]"
              style={{ color: c.textDisabled }} title="切换主题">⊞</button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 pt-2.5 pb-0 shrink-0" style={nd}>
          <div className="flex items-center gap-2 h-8 px-2.5 rounded-md"
               style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <Search size={13} style={{ color: c.textDisabled, flexShrink: 0 }} />
            {isRecordingKey ? (
              <span className="flex-1 text-[12px] animate-pulse" style={{ color: c.accent }}>
                按下快捷键… Esc 取消
              </span>
            ) : (
              <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={handleRecordKey}
                placeholder={isCommandMode ? '输入指令…' : '搜索剪贴板…'}
                className="flex-1 bg-transparent outline-none text-[12px]"
                style={{ color: c.text, caretColor: c.accent }}
                spellCheck={false} autoComplete="off" />
            )}
            {search && (
              <button onClick={() => setSearch('')} style={{ color: c.textDisabled }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 5.293 10.146 1.147a.5.5 0 0 1 .707.707L6.707 6l4.146 4.146a.5.5 0 0 1-.707.707L6 6.707l-4.146 4.146a.5.5 0 0 1-.707-.707L5.293 6 1.147 1.854A.5.5 0 0 1 1.854 1.147L6 5.293z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-1.5 pt-1.5 pb-1.5 scrollbar-hover"
             style={{
               ...nd,
             }}>
        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2"
               style={{ color: c.textDisabled }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <span className="text-[11px]">{isCommandMode ? '未知指令' : '无内容'}</span>
          </div>
        )}

        {filteredData.map((item, i) => {
          const isActive = i === listIndex
          const isHovered = hoveredId === item.id
          const isExpanded = isHovered || isActive
          const Icon = TYPE_ICON[item.type] || ChevronRight

          return (
            <div key={item.id}
              onClick={() => selectItem(item)}
              onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
              onMouseLeave={() => setHoveredId(null)}
              className="flex flex-col rounded-md cursor-pointer select-none mb-0.5 overflow-hidden"
              style={{
                background: isActive ? c.accentBg : isHovered ? c.surfaceHover : 'transparent',
                border: `1px solid ${isActive ? c.accent : 'transparent'}`,
                transition: 'background 120ms ease, border-color 120ms ease',
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 6,
                paddingBottom: 6,
              }}>

              {/* Main row */}
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={13} strokeWidth={1.8} style={{ color: isActive ? c.accent : c.textSecondary, flexShrink: 0 }} />
                <span className="flex-1 text-[12.5px] truncate" style={{ color: c.text }}>
                  {item.preview}
                </span>
                {item.createdAt && (
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: c.textDisabled }}>
                    {item.createdAt}
                  </span>
                )}
                {(item.pinned || isHovered) && (
                  <button onClick={e => { e.stopPropagation(); TogglePin(item.id) }}
                    className="shrink-0 transition-transform hover:scale-110"
                    style={{ color: item.pinned ? '#FACC15' : c.textDisabled }}>
                    <Star size={11} fill={item.pinned ? "currentColor" : "none"} strokeWidth={item.pinned ? 0 : 1.8} />
                  </button>
                )}
                {isHovered && (
                  <button onClick={e => { e.stopPropagation(); DeleteItem(item.id) }}
                    className="shrink-0 transition-transform hover:scale-110"
                    style={{ color: c.textDisabled }}>
                    <X size={11} strokeWidth={1.8} />
                  </button>
                )}
              </div>

              {/* Expandable details */}
              <div style={{
                maxHeight: isExpanded && item.details ? 72 : 0,
                overflow: 'hidden',
                transition: 'max-height 150ms ease',
                opacity: isExpanded && item.details ? 1 : 0,
              }}>
                <div className="mt-1.5 ml-5 text-[10.5px] leading-relaxed line-clamp-3"
                     style={{ color: c.textSecondary, fontFamily: item.type === 'CODE' ? "'Cascadia Code','Consolas',monospace" : 'inherit' }}>
                  {item.type === 'TEXT' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(item.content.trim()) ? (
                    <div className="flex items-center gap-2">
                      <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: item.content.trim(), border: `1px solid ${c.border}`, flexShrink: 0 }} />
                      <span>{item.content.trim()}</span>
                    </div>
                  ) : item.details}
                </div>
              </div>
            </div>
          )
        })}
      </div>

        {/* ── Footer */}
        <div className="h-5 px-2 flex items-center justify-between shrink-0 select-none"
           style={{ borderTop: `1px solid ${c.border}`, ...nd }}>
        <div className="flex items-center gap-2">
          {[['↵', '粘贴'], ['Esc', '隐藏']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-0.5 text-[8px]" style={{ color: c.textDisabled }}>
              <kbd className="px-0.5 rounded text-[7px]"
                   style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
        <span className="text-[8px]" style={{ color: c.textDisabled }}>{activationKey}</span>

        </div>

      {/* ── Prompt fill modal ────────────────────────────────── */}
      {promptFill && (
        <PromptFillModal item={promptFill} onDone={() => setPromptFill(null)}
          accentColor={c.accent} bgColor={isDark ? '#1C1C1C' : '#F3F3F3'}
          textColor={c.text} mutedColor={c.textSecondary} borderColor={c.border} />
      )}
    </div>
  )
}
