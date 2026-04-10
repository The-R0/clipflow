import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, Circle, Star, Type, Link2, Code2, Image as ImageIcon, Zap, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import {
  ShowPanel,
  HidePanel,
  PasteText,
  GetActivationKey,
  ReregisterHotkey,
  GetClipData,
  ClearUnpinned,
  SavePrompt,
  TogglePin,
} from '../wailsjs/go/main/App';
import { EventsOn } from '../wailsjs/runtime/runtime';

type ClipItem = {
  id: string;
  type: 'LINK' | 'CODE' | 'TEXT' | 'IMG' | 'CMD' | 'ACTION';
  content: string;
  preview: string;
  details: string;
  pinned?: boolean;
};

const CATEGORIES = [
  { id: 'all', icon: Circle, label: 'All', color: 'text-[#E0E0E0]' },
  { id: 'pinned', icon: Star, label: 'Pinned', color: 'text-[#E0E0E0]' },
  { id: 'text', icon: Type, label: 'Text', color: 'text-[#8C857B]' },
  { id: 'link', icon: Link2, label: 'Link', color: 'text-[#5C7080]' },
  { id: 'code', icon: Code2, label: 'Code', color: 'text-[#8F5C5C]' },
  { id: 'img', icon: ImageIcon, label: 'Image', color: 'text-[#8F835C]' },
];

const TYPE_CONFIG: Record<string, { icon: React.ElementType, color: string }> = {
  TEXT: { icon: Type, color: 'text-[#8C857B]' },
  LINK: { icon: Link2, color: 'text-[#5C7080]' },
  CODE: { icon: Code2, color: 'text-[#8F5C5C]' },
  IMG:  { icon: ImageIcon, color: 'text-[#8F835C]' },
  CMD:  { icon: Zap, color: 'text-[#00E5FF]' },
  ACTION: { icon: Sparkles, color: 'text-[#F59E0B]' },
};

const isHexColor = (str: string) => /^#([0-9A-F]{3}){1,2}$/i.test(str.trim());
const parseJSON = (str: string) => {
  try {
    const obj = JSON.parse(str);
    return typeof obj === 'object' && obj !== null ? JSON.stringify(obj, null, 2) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clipData, setClipData] = useState<ClipItem[]>([]);
  const [activationKey, setActivationKey] = useState('Alt + C');
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [listIndex, setListIndex] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [pasteQueue, setPasteQueue] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isCommandMode = search.startsWith('>');

  // Load initial data from Go backend
  useEffect(() => {
    GetClipData().then(data => setClipData(data as ClipItem[]));
    GetActivationKey().then(key => setActivationKey(key));

    // Listen for Go events
    EventsOn('clipboard:new', (item: ClipItem) => {
      setClipData(prev => [item, ...prev]);
    });

    EventsOn('clipboard:updated', () => {
      GetClipData().then(data => setClipData(data as ClipItem[]));
    });

    // Listen for hotkey press from Go backend
    EventsOn('hotkey:pressed', () => {
      if (!isOpen) {
        setIsOpen(true);
        setSearch('');
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setIsOpen(false);
        HidePanel();
      }
    });
  }, []);

  // Reset list index on filter change
  useEffect(() => {
    setListIndex(0);
    setExpandedIndex(null);
  }, [search, activeCategory]);

  // Scroll follow
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.children[listIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [listIndex, isOpen]);

  const filteredData = useMemo(() => {
    if (isCommandMode) {
      const cmdSearch = search.slice(1).toLowerCase();
      const commands: ClipItem[] = [
        { id: 'cmd-set', type: 'CMD', content: 'set shortcut', preview: '修改唤醒快捷键 (Set Shortcut)', details: `当前快捷键: ${activationKey}\n按下 Enter 开始录制新快捷键` },
        { id: 'cmd-clear', type: 'CMD', content: 'clear history', preview: '清空剪切板历史 (Clear History)', details: '将删除所有非收藏的剪切板记录。' },
      ];
      return commands.filter(c => c.content.includes(cmdSearch) || c.preview.toLowerCase().includes(cmdSearch));
    }

    const parsedSearch = search.trim().toLowerCase();
    const results = clipData.filter(item => {
      if (activeCategory === 'pinned' && !item.pinned) return false;
      if (activeCategory === 'code' && item.type !== 'CODE') return false;
      if (activeCategory === 'link' && item.type !== 'LINK') return false;
      if (activeCategory === 'img' && item.type !== 'IMG') return false;
      if (activeCategory === 'text' && item.type !== 'TEXT') return false;
      if (parsedSearch) {
        return item.content.toLowerCase().includes(parsedSearch);
      }
      return true;
    });

    if (!isCommandMode && search.trim()) {
      const exactMatch = clipData.some(item => item.content.trim() === search.trim());
      if (!exactMatch) {
        results.unshift({
          id: 'action-save',
          type: 'ACTION',
          content: search.trim(),
          preview: `保存提示词: ${search.trim()}`,
          details: '按 Enter 将此输入永久保存为快捷提示词 (Prompt)'
        });
      }
    }

    return results;
  }, [search, activeCategory, isCommandMode, clipData, activationKey]);

  // Shortcut recording handler
  const handleRecordKey = (e: React.KeyboardEvent) => {
    if (!isRecordingKey) return;
    e.preventDefault();

    if (e.key === 'Escape') {
      setIsRecordingKey(false);
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    const keys: string[] = [];
    const mods: number[] = [];
    let vkey = 0;

    if (e.ctrlKey || e.metaKey) { keys.push('Ctrl'); mods.push(0x0002); }
    if (e.altKey) { keys.push('Alt'); mods.push(0x0001); }
    if (e.shiftKey) { keys.push('Shift'); mods.push(0x0004); }

    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      const keyName = e.code === 'Space' ? 'Space' : e.key.toUpperCase();
      keys.push(keyName);
      // Map key to VK code
      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        vkey = e.key.toUpperCase().charCodeAt(0);
      } else if (e.code === 'Space') {
        vkey = 0x20;
      }
      const displayText = keys.join(' + ');
      const modifier = mods.reduce((a, b) => a | b, 0);
      ReregisterHotkey(displayText, modifier, vkey).then(ok => {
        if (ok) setActivationKey(displayText);
      });
      setIsRecordingKey(false);
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Panel keyboard navigation
  useEffect(() => {
    const handlePanelKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isRecordingKey) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        setPasteQueue([]);
        setIsSidebarOpen(false);
        HidePanel();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (!isCommandMode) {
          const currentIndex = CATEGORIES.findIndex(c => c.id === activeCategory);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + CATEGORIES.length) % CATEGORIES.length
            : (currentIndex + 1) % CATEGORIES.length;
          setActiveCategory(CATEGORIES[nextIndex].id);
          setIsSidebarOpen(true);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setListIndex(prev => (prev + 1) % (filteredData.length || 1));
        setExpandedIndex(null);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setListIndex(prev => (prev - 1 + filteredData.length) % (filteredData.length || 1));
        setExpandedIndex(null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setExpandedIndex(listIndex);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setExpandedIndex(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredData.length > 0) {
          const selectedItem = filteredData[listIndex];

          if (selectedItem.type === 'CMD' || selectedItem.type === 'ACTION') {
            if (selectedItem.id === 'cmd-set') {
              setIsRecordingKey(true);
            } else if (selectedItem.id === 'cmd-clear') {
              ClearUnpinned();
              setSearch('');
            } else if (selectedItem.id === 'action-save') {
              SavePrompt(selectedItem.content);
              setSearch('');
              setIsOpen(false);
              HidePanel();
            }
            return;
          }

          if (e.shiftKey) {
            setPasteQueue(prev =>
              prev.includes(selectedItem.id)
                ? prev.filter(id => id !== selectedItem.id)
                : [...prev, selectedItem.id]
            );
          } else {
            // Paste and close
            PasteText(selectedItem.content);
            setIsOpen(false);
            setPasteQueue([]);
            HidePanel();
          }
        }
      }
    };

    window.addEventListener('keydown', handlePanelKeyDown);
    return () => window.removeEventListener('keydown', handlePanelKeyDown);
  }, [isOpen, isRecordingKey, filteredData, listIndex, activeCategory, isCommandMode]);

  // Window blur → hide panel
  useEffect(() => {
    const handleBlur = () => {
      if (isOpen) {
        setIsOpen(false);
        setPasteQueue([]);
        HidePanel();
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [isOpen]);

  const renderContentAwareDetails = (item: ClipItem) => {
    if (item.type === 'CMD' || item.type === 'ACTION') {
      return (
        <div className={cn(
          "p-3 rounded border font-mono text-xs whitespace-pre-wrap",
          item.type === 'CMD' ? "border-[#00E5FF]/20 bg-[#00E5FF]/5 text-[#00E5FF]" : "border-[#F59E0B]/20 bg-[#F59E0B]/5 text-[#F59E0B]"
        )}>
          {item.details}
        </div>
      );
    }

    const hexMatch = isHexColor(item.content);
    if (hexMatch) {
      return (
        <div className="flex items-center gap-4 p-2">
          <div className="w-12 h-12 rounded shadow-inner border border-[#333]" style={{ backgroundColor: item.content }} />
          <span className="font-mono text-base text-[#E0E0E0]">{item.content.toUpperCase()}</span>
        </div>
      );
    }
    const jsonMatch = parseJSON(item.content);
    if (jsonMatch) {
      return (
        <pre className="p-3 rounded border border-[#333] bg-[#0A0A0A] text-[#A0A0A0] font-mono text-[10px] overflow-x-auto">
          <code dangerouslySetInnerHTML={{
            __html: jsonMatch.replace(/"(.*?)":/g, '<span class="text-[#5C7080]">"$1"</span>:')
                             .replace(/: "(.*?)"/g, ': <span class="text-[#8F835C]">"$1"</span>')
          }} />
        </pre>
      );
    }
    return (
      <div className="p-3 rounded border border-[#333] bg-[#0A0A0A] text-[#A0A0A0] font-mono text-xs whitespace-pre-wrap leading-relaxed">
        {item.details}
      </div>
    );
  };

  const ActiveIcon = CATEGORIES.find(c => c.id === activeCategory)?.icon || Circle;

  return (
    <div className="w-full h-full font-sans bg-transparent">
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-black/20"
               onClick={(e) => { if (e.target === e.currentTarget) { setIsOpen(false); HidePanel(); } }}>

            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="w-full h-full bg-[#1C1C1C]/95 backdrop-blur-2xl border border-[#333333] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              style={{ '--wails-draggable': 'drag' } as React.CSSProperties}
            >
              {/* Header */}
              <div className="flex items-center px-3 h-12 border-b border-[#333333] shrink-0 bg-[#1A1A1A]" style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}>
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors mr-2",
                    isSidebarOpen ? "bg-white/10 text-white" : "text-[#888] hover:text-[#E0E0E0] hover:bg-white/5"
                  )}
                >
                  <Menu size={16} strokeWidth={2.5} />
                </button>

                <AnimatePresence>
                  {!isSidebarOpen && !isCommandMode && (
                    <motion.div
                      initial={{ width: 0, opacity: 0, marginRight: 0 }}
                      animate={{ width: 'auto', opacity: 1, marginRight: 8 }}
                      exit={{ width: 0, opacity: 0, marginRight: 0 }}
                      className="flex items-center justify-center text-[#555]"
                    >
                      <ActiveIcon size={14} strokeWidth={2.5} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <span className={cn("font-mono text-base mr-2 transition-colors", isCommandMode ? "text-[#00E5FF]" : "text-[#555]")}>{'>'}</span>

                {isRecordingKey ? (
                  <div
                    tabIndex={0}
                    onKeyDown={handleRecordKey}
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-[#00E5FF] text-[13px] font-mono animate-pulse"
                  >
                    Listening... (Esc to cancel)
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={handleRecordKey}
                    placeholder={isCommandMode ? "输入指令..." : "搜索..."}
                    className="flex-1 bg-transparent border-none outline-none text-[#E0E0E0] text-[13px] placeholder:text-[#555] font-sans"
                    autoComplete="off"
                    spellCheck="false"
                  />
                )}
              </div>

              {/* Body: Sidebar + List */}
              <div className="flex flex-1 overflow-hidden relative">

                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 48, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="border-r border-[#333333] bg-[#141414] flex flex-col items-center py-3 gap-3 shrink-0 overflow-hidden"
                    >
                      {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        const Icon = cat.icon;
                        return (
                          <div
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); inputRef.current?.focus(); }}
                            title={cat.label}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200",
                              isActive
                                ? cn("bg-white/10 shadow-sm", cat.color)
                                : "text-[#555] hover:text-[#888] hover:bg-white/5"
                            )}
                          >
                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* List */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-2 hide-scrollbar flex flex-col gap-0.5">
                  {filteredData.map((item, idx) => {
                    const isSelected = listIndex === idx;
                    const isExpanded = expandedIndex === idx;
                    const config = TYPE_CONFIG[item.type];
                    const queuePosition = pasteQueue.indexOf(item.id);
                    const isInQueue = queuePosition !== -1;
                    const ItemIcon = config?.icon || Circle;

                    return (
                      <div key={item.id} className="flex flex-col">
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-150 ease-out border relative",
                            isSelected ? "border-white/10 bg-white/[0.05] translate-x-[2px]" : "border-transparent text-[#888] hover:bg-white/[0.02]",
                            isInQueue && "bg-[#2b3a42]/30 border-[#5C7080]/30"
                          )}
                          onMouseEnter={() => setListIndex(idx)}
                          onClick={(e) => {
                            setListIndex(idx);
                            if (item.type === 'CMD' || item.type === 'ACTION') {
                              if (item.id === 'cmd-set') setIsRecordingKey(true);
                              if (item.id === 'cmd-clear') { ClearUnpinned(); setSearch(''); }
                              if (item.id === 'action-save') {
                                SavePrompt(item.content);
                                setSearch('');
                                setIsOpen(false);
                                HidePanel();
                              }
                              return;
                            }
                            if (e.shiftKey) {
                              setPasteQueue(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                            } else {
                              PasteText(item.content);
                              setIsOpen(false);
                              setPasteQueue([]);
                              HidePanel();
                            }
                          }}
                        >
                          {isInQueue ? (
                            <span className="w-4 h-4 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] flex items-center justify-center text-[9px] font-bold border border-[#00E5FF]/30 shrink-0">
                              {queuePosition + 1}
                            </span>
                          ) : (
                            <span className={cn("flex items-center justify-center shrink-0", config?.color || 'text-[#888]', isSelected ? "opacity-100" : "opacity-60")}>
                              <ItemIcon size={14} strokeWidth={2.5} />
                            </span>
                          )}
                          <span className={cn("flex-1 font-mono text-[12px] whitespace-nowrap overflow-hidden text-ellipsis transition-colors", isSelected || isInQueue ? "text-[#E0E0E0]" : "text-[#777]")}>
                            {item.preview}
                          </span>
                          {item.pinned && (
                            <Star
                              size={12}
                              className="text-[#666] shrink-0 cursor-pointer"
                              fill="currentColor"
                              onClick={(e) => { e.stopPropagation(); TogglePin(item.id); }}
                            />
                          )}
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="overflow-hidden ml-[32px] mr-2"
                            >
                              <div className="py-1.5 pb-3">
                                {renderContentAwareDetails(item)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <div className="text-center py-10 text-[#555] text-xs font-mono">
                      {isCommandMode ? "Unknown command" : "No results found"}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="h-8 border-t border-[#333333] bg-[#1A1A1A] shrink-0 flex items-center justify-between px-2 text-[10px] text-[#666] font-mono select-none overflow-hidden whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center"><kbd className="font-sans border border-[#444] bg-[#222] rounded px-1 py-0.5 mr-1 text-[#aaa]">Tab</kbd>切换</span>
                  <span className="flex items-center"><kbd className="font-sans border border-[#444] bg-[#222] rounded px-1 py-0.5 mr-1 text-[#aaa]">↵</kbd>复制</span>
                  <span className="flex items-center"><kbd className="font-sans border border-[#444] bg-[#222] rounded px-1 py-0.5 mr-1 text-[#aaa]">⇧+↵</kbd>队列</span>
                </div>
                <div className="flex items-center pr-3">
                  <span className="flex items-center"><kbd className="font-sans border border-[#444] bg-[#222] rounded px-1 py-0.5 mr-1 text-[#aaa]">&gt;</kbd>指令</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
