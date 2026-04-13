import React, { useEffect, useState } from 'react'
import { Search, Pin, ChevronRight, Type, Link, Code2, Image, Zap, Sparkles, LayoutGrid, Menu, Star } from 'lucide-react'
import { useClipflow, TYPE_COLOR } from '../hooks/useClipflow'
import { PromptFillModal } from '../components/PromptFillModal'
import { WindowSetSize, WindowSetPosition, WindowGetPosition, WindowGetSize } from '../../wailsjs/runtime/runtime'
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
  bg:            'rgba(28, 28, 28, 0.90)',
  surface:       'rgba(255,255,255,0.04)',
  surfaceHover:  'rgba(255,255,255,0.08)',
  border:        'rgba(255,255,255,0.083)',
  text:          'rgba(255,255,255,0.886)',
  textSecondary: 'rgba(255,255,255,0.544)',
  textDisabled:  'rgba(255,255,255,0.36)',
  accent:        '#0078D4',
  accentHover:   '#1084D8',
  accentBg:      'rgba(0,120,212,0.15)',
  shadow:        '0 16px 48px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
}
const LIGHT: Scheme = {
  bg:            'rgba(243,243,243,0.88)',
  surface:       'rgba(0,0,0,0.03)',
  surfaceHover:  'rgba(0,0,0,0.055)',
  border:        'rgba(0,0,0,0.073)',
  text:          'rgba(0,0,0,0.89)',
  textSecondary: 'rgba(0,0,0,0.55)',
  textDisabled:  'rgba(0,0,0,0.36)',
  accent:        '#0067C0',
  accentHover:   '#006CBB',
  accentBg:      'rgba(0,103,192,0.10)',
  shadow:        '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
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

/* ── Mica noise overlay (inline SVG data URI) ────────────────────── */
const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

/* ═══════════════════════════════════════════════════════════════════ */
export function WinUITheme({ onSwitch }: { onSwitch: () => void }) {
  const [isDark,       setIsDark]       = useState(() => localStorage.getItem('wui-dark') !== 'false')
  const [hoveredId,    setHoveredId]    = useState<string | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const c = isDark ? DARK : LIGHT

  const toggleSidebar = async () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    const [pos, size] = await Promise.all([WindowGetPosition(), WindowGetSize()])
    if (next) {
      WindowSetPosition(pos.x - SIDEBAR_W, pos.y)
      WindowSetSize(size.w + SIDEBAR_W, size.h)
    } else {
      WindowSetPosition(pos.x + SIDEBAR_W, pos.y)
      WindowSetSize(size.w - SIDEBAR_W, size.h)
    }
  }

  const {
    isOpen, search, setSearch, activeCategory, setActiveCategory,
    filteredData, listIndex, setListIndex,
    isRecordingKey, activationKey, selectItem, hide,
    handleRecordKey, inputRef, isCommandMode,
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

  const toggleDark = () => {
    const n = !isDark; setIsDark(n); localStorage.setItem('wui-dark', String(n))
  }

  const panelStyle: React.CSSProperties = {
    background: c.bg,
    backgroundImage: NOISE,
    backdropFilter: 'blur(60px) saturate(150%)',
    WebkitBackdropFilter: 'blur(60px) saturate(150%)',
    borderRadius: 8,
    border: `1px solid ${c.border}`,
    boxShadow: c.shadow,
  }

  return (
    /* Outer: transparent flex row — sidebar and main are sibling boxes */
    <div className="w-full h-full flex flex-row items-stretch gap-1.5"
         style={{ fontFamily: "'Segoe UI Variable','Segoe UI',system-ui,sans-serif", ...nd }}>

      {/* ── Sidebar: completely separate box ─────────────────── */}
      {sidebarOpen && (
        <div style={{ width: SIDEBAR_W, flexShrink: 0, ...panelStyle, ...nd }}>
          <div className="flex flex-col items-center pt-3 pb-2 gap-0.5 h-full" style={drag}>
            {CATS.map(({ id, label, Icon }) => {
              const isActive = activeCategory === id
              return (
                <button key={id}
                  onClick={() => { setActiveCategory(id); toggleSidebar(); inputRef.current?.focus() }}
                  title={label}
                  className="w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all"
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
      )}

      {/* ── Main panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={panelStyle}>

        {/* Title bar */}
        <div className="flex items-center h-9 px-2 shrink-0 select-none gap-1"
             style={{ ...drag, borderBottom: `1px solid ${c.border}` }}>
          <button onClick={toggleSidebar} style={nd}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors shrink-0"
            title="分类">
            <Menu size={15} strokeWidth={1.8} style={{ color: sidebarOpen ? c.accent : c.textSecondary }} />
          </button>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" fill={c.accent}/>
              <rect x="8.5" y="1" width="6.5" height="6.5" rx="1.5" fill={c.accent} opacity=".5"/>
              <rect x="1" y="8.5" width="6.5" height="6.5" rx="1.5" fill={c.accent} opacity=".5"/>
              <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5" fill={c.accent} opacity=".25"/>
            </svg>
            <span className="text-[11px] font-semibold" style={{ color: c.text }}>Clipflow</span>
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
        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2"
             style={{
               ...nd,
               scrollbarWidth: 'thin',
               scrollbarColor: `${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'} transparent`,
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
          const dot = TYPE_COLOR[item.type] ?? '#888'

          return (
            <div key={item.id}
              onClick={() => selectItem(item)}
              onMouseEnter={() => { setHoveredId(item.id); setListIndex(i) }}
              onMouseLeave={() => setHoveredId(null)}
              className="flex flex-col rounded-md cursor-pointer select-none mb-0.5 overflow-hidden"
              style={{
                background: isActive ? c.accentBg : isHovered ? c.surfaceHover : 'transparent',
                borderLeft: isActive ? `3px solid ${c.accent}` : '3px solid transparent',
                transition: 'background 120ms ease, border-color 120ms ease',
                paddingLeft: isActive ? 5 : 8,
                paddingRight: 8,
                paddingTop: 7,
                paddingBottom: 7,
              }}>

              {/* Main row */}
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={13} strokeWidth={1.8} style={{ color: dot, flexShrink: 0, opacity: 0.85 }} />
                <span className="flex-1 text-[12.5px] truncate" style={{ color: c.text }}>
                  {item.preview}
                </span>
                {item.createdAt && (
                  <span className="text-[10px] tabular-nums shrink-0" style={{ color: c.textDisabled }}>
                    {item.createdAt}
                  </span>
                )}
                {item.pinned && (
                  <button onClick={e => { e.stopPropagation(); TogglePin(item.id) }}
                    className="shrink-0 transition-transform hover:scale-110"
                    style={{ color: c.accent }}>
                    <Pin size={11} fill="currentColor" strokeWidth={0} />
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
                  {item.details}
                </div>
              </div>
            </div>
          )
        })}
      </div>

        {/* ── Footer */}
        <div className="h-7 px-3 flex items-center justify-between shrink-0 select-none"
           style={{ borderTop: `1px solid ${c.border}`, ...nd }}>
        <div className="flex items-center gap-3">
          {[['↵', '粘贴'], ['Esc', '隐藏']].map(([key, label]) => (
            <span key={key} className="flex items-center gap-1 text-[10px]" style={{ color: c.textDisabled }}>
              <kbd className="px-1 py-px rounded text-[9px] font-sans"
                   style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
        <span className="text-[10px]" style={{ color: c.textDisabled }}>{activationKey}</span>

        </div>
      </div>{/* end main panel */}

      {/* ── Prompt fill modal ────────────────────────────────── */}
      {promptFill && (
        <PromptFillModal item={promptFill} onDone={() => setPromptFill(null)}
          accentColor={c.accent} bgColor={isDark ? '#1C1C1C' : '#F3F3F3'}
          textColor={c.text} mutedColor={c.textSecondary} borderColor={c.border} />
      )}
    </div>
  )
}
