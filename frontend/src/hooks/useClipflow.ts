import { useState, useEffect, useRef, useCallback } from 'react'
import { EventsOn } from '../../wailsjs/runtime/runtime'
import {
  GetClipData, GetActivationKey, HidePanel, PasteText,
  TogglePin, ClearUnpinned, ReregisterHotkey, DeleteItem,
} from '../../wailsjs/go/main/App'

export type ClipItem = {
  id: string
  type: 'LINK' | 'CODE' | 'TEXT' | 'IMG' | 'CMD' | 'ACTION' | 'PROMPT'
  content: string
  preview: string
  details: string
  pinned?: boolean
  createdAt?: string
}

export const CATS = [
  { id: 'all',    label: 'All'    },
  { id: 'text',   label: 'Text'   },
  { id: 'link',   label: 'Link'   },
  { id: 'code',   label: 'Code'   },
  { id: 'prompt', label: 'Prompt' },
  { id: 'pinned', label: 'Pinned' },
]

export const TYPE_COLOR: Record<string, string> = {
  TEXT: '#4ADE80', LINK: '#38BDF8', CODE: '#C084FC',
  IMG:  '#FB923C', CMD:  '#22D3EE', ACTION: '#FBBF24',
  PROMPT: '#E879F9',
}

export function extractVars(template: string): string[] {
  const matches = template.match(/\{\{(.*?)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(2, -2)))]
}

export function fillVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
}

export function useClipflow() {
  const [isOpen,         setIsOpen]         = useState(true)
  const [search,         setSearch]         = useState('')
  const [clipData,       setClipData]       = useState<ClipItem[]>([])
  const [activationKey,  setActivationKey]  = useState('Alt + C')
  const [activeCategory, setActiveCategory] = useState('all')
  const [listIndex,      setListIndex]      = useState(0)
  const [expandedIndex,  setExpandedIndex]  = useState<number | null>(null)
  const [pasteQueue,     setPasteQueue]     = useState<string[]>([])
  const [isRecordingKey, setIsRecordingKey] = useState(false)
  const [promptFill, setPromptFill] = useState<ClipItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isCommandMode = search.startsWith('>')

  useEffect(() => {
    GetClipData().then(d => setClipData(d as ClipItem[]))
    GetActivationKey().then(setActivationKey)
  }, [])

  useEffect(() => {
    EventsOn('panel:shown', () => {
      setIsOpen(true)
      setSearch('')
      setTimeout(() => inputRef.current?.focus(), 50)
    })
    EventsOn('panel:hidden',      () => setIsOpen(false))
    EventsOn('clipboard:new',     (item: ClipItem) => setClipData(p => [item, ...p]))
    EventsOn('clipboard:updated', () => GetClipData().then(d => setClipData(d as ClipItem[])))
  }, [])

  const filteredData: ClipItem[] = (() => {
    if (isCommandMode) {
      const q = search.slice(1).toLowerCase()
      const cmds: ClipItem[] = [
        { id: 'cmd-clear', type: 'CMD',    content: 'clear',   preview: 'clear — 清除未固定条目', details: '删除所有未固定的剪贴板条目' },
        { id: 'cmd-set',   type: 'CMD',    content: 'set-key', preview: 'set-key — 更改快捷键',  details: `当前绑定: ${activationKey}` },
      ]
      return q ? cmds.filter(c => c.preview.toLowerCase().includes(q)) : cmds
    }
    let items = activeCategory === 'all'
      ? clipData
      : activeCategory === 'pinned'
        ? clipData.filter(i => i.pinned)
        : clipData.filter(i => i.type === activeCategory.toUpperCase())
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.content.toLowerCase().includes(q) || i.preview.toLowerCase().includes(q)
      )
    }
    return items
  })()

  const selectItem = useCallback((item: ClipItem) => {
    if (item.id === 'cmd-clear') { ClearUnpinned(); setSearch(''); return }
    if (item.id === 'cmd-set')   { setIsRecordingKey(true); return }
    if (item.type === 'PROMPT' && extractVars(item.content).length > 0) {
      setPromptFill(item)
      return
    }
    PasteText(item.content)
    HidePanel()
    setIsOpen(false)
  }, [])

  const hide = useCallback(() => { HidePanel(); setIsOpen(false) }, [])

  const handleRecordKey = useCallback((e: React.KeyboardEvent) => {
    if (!isRecordingKey) return
    e.preventDefault()
    if (e.key === 'Escape') { setIsRecordingKey(false); return }
    if (['Control','Alt','Shift','Meta'].includes(e.key)) return
    const mods: string[] = []
    if (e.ctrlKey)  mods.push('Ctrl')
    if (e.altKey)   mods.push('Alt')
    if (e.shiftKey) mods.push('Shift')
    if (mods.length === 0) return
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key
    const label = [...mods, k].join(' + ')
    setActivationKey(label)
    setIsRecordingKey(false)
    const flags = (e.ctrlKey ? 0x0002 : 0) | (e.altKey ? 0x0001 : 0) | (e.shiftKey ? 0x0004 : 0)
    ReregisterHotkey(label, flags, k.charCodeAt(0))
  }, [isRecordingKey])

  return {
    isOpen, setIsOpen,
    search, setSearch,
    clipData,
    activationKey,
    activeCategory, setActiveCategory,
    listIndex, setListIndex,
    expandedIndex, setExpandedIndex,
    pasteQueue, setPasteQueue,
    isRecordingKey, setIsRecordingKey,
    promptFill, setPromptFill,
    inputRef,
    isCommandMode,
    filteredData,
    selectItem,
    hide,
    handleRecordKey,
    TogglePin,
    DeleteItem,
  }
}
