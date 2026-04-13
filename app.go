package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ClipItem struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Content   string `json:"content"`
	Preview   string `json:"preview"`
	Details   string `json:"details"`
	Pinned    bool   `json:"pinned"`
	CreatedAt string `json:"createdAt"`
}

type App struct {
	ctx          context.Context
	mu           sync.Mutex
	items        []ClipItem
	nextID       int
	ignore       atomic.Bool
	panelVisible atomic.Bool
	hotkey       *HotkeyManager
	clipmon      *ClipboardMonitor

	activationKey string
}

func NewApp() *App {
	a := &App{
		nextID:        1001,
		activationKey: "Alt + C",
	}
	a.loadItems()
	return a
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	a.hotkey = NewHotkeyManager(a)
	a.hotkey.Register() // starts locked OS-thread loop

	a.clipmon = NewClipboardMonitor(a)
	go a.clipmon.Start()

	SkipTaskbar()

	// Show panel briefly on startup so user knows the app is alive
	a.ShowPanel()
}

func (a *App) onBeforeClose(ctx context.Context) bool {
	runtime.WindowHide(ctx)
	EmptyWorkingSet()
	return true
}

// ---- 前端绑定方法 ----

func (a *App) ShowPanel() {
	x, y := a.calcPopupPos(240, 400)
	runtime.WindowSetPosition(a.ctx, x, y)
	runtime.WindowShow(a.ctx)
	runtime.WindowSetSize(a.ctx, 240, 400)
	a.panelVisible.Store(true)
	runtime.EventsEmit(a.ctx, "panel:shown")
}

func (a *App) HidePanel() {
	a.panelVisible.Store(false)
	runtime.EventsEmit(a.ctx, "panel:hidden")
	runtime.WindowHide(a.ctx)
	EmptyWorkingSet()
}

func (a *App) TogglePanel() {
	if a.panelVisible.Load() {
		a.HidePanel()
	} else {
		a.ShowPanel()
	}
}

func (a *App) PasteText(content string) {
	a.ignore.Store(true)
	WriteClipboard(content)
	SimulateCtrlV()
}

func (a *App) GetActivationKey() string {
	return a.activationKey
}

func (a *App) ReregisterHotkey(displayText string, modifiers int, vkey int) bool {
	a.hotkey.Unregister()
	ok := a.hotkey.RegisterWith(uint32(modifiers), uint32(vkey))
	if ok {
		a.activationKey = displayText
	}
	return ok
}

func (a *App) GetClipData() []ClipItem {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]ClipItem, len(a.items))
	copy(out, a.items)
	return out
}

func (a *App) ClearUnpinned() {
	a.mu.Lock()
	var kept []ClipItem
	for _, it := range a.items {
		if it.Pinned {
			kept = append(kept, it)
		}
	}
	a.items = kept
	a.mu.Unlock()
	a.saveItems()
	runtime.EventsEmit(a.ctx, "clipboard:updated")
}

func (a *App) SavePrompt(content string) {
	a.addItem(content, "TEXT", "AI Prompt / 自定义提示词")
	runtime.EventsEmit(a.ctx, "clipboard:updated")
}

func (a *App) TogglePin(id string) {
	a.mu.Lock()
	for i := range a.items {
		if a.items[i].ID == id {
			a.items[i].Pinned = !a.items[i].Pinned
			break
		}
	}
	a.mu.Unlock()
	a.saveItems()
	runtime.EventsEmit(a.ctx, "clipboard:updated")
}

// ---- 内部方法 ----

func (a *App) onClipboardNewContent(text string) {
	if a.ignore.Load() {
		a.ignore.Store(false)
		return
	}
	a.addItem(text, detectType(text), "")
	a.saveItems()
	runtime.EventsEmit(a.ctx, "clipboard:new", a.items[0])
	runtime.EventsEmit(a.ctx, "clipboard:updated")
}

func (a *App) addItem(content, typ, detailsOverride string) {
	a.mu.Lock()
	defer a.mu.Unlock()

	preview := buildPreview(content)
	details := detailsOverride
	if details == "" {
		details = buildDetails(content, typ)
	}

	item := ClipItem{
		ID:        fmt.Sprintf("%d", a.nextID),
		Type:      typ,
		Content:   content,
		Preview:   preview,
		Details:   details,
		Pinned:    false,
		CreatedAt: time.Now().Format("15:04"),
	}
	a.nextID++
	a.items = append([]ClipItem{item}, a.items...)
}

func (a *App) calcPopupPos(panelW, panelH int) (int, int) {
	mx, my := GetCursorPos()
	monX, monY, monW, monH := GetMonitorRect(mx, my)

	x := mx + 12
	y := my + 12

	if x+panelW+16 > monX+monW {
		x = monX + monW - panelW - 16
	}
	if y+panelH+16 > monY+monH {
		y = monY + monH - panelH - 16
	}
	if x < monX+16 {
		x = monX + 16
	}
	if y < monY+16 {
		y = monY + 16
	}
	return x, y
}

// ---- 持久化 ----

func (a *App) dataPath() string {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
	}
	dir := filepath.Join(appData, "clipflow")
	os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "data.json")
}

func (a *App) saveItems() {
	a.mu.Lock()
	defer a.mu.Unlock()

	data, err := json.Marshal(a.items)
	if err != nil {
		return
	}
	os.WriteFile(a.dataPath(), data, 0644)
}

func (a *App) loadItems() {
	data, err := os.ReadFile(a.dataPath())
	if err != nil {
		a.items = defaultItems()
		return
	}
	var items []ClipItem
	if json.Unmarshal(data, &items) != nil {
		a.items = defaultItems()
		return
	}
	a.items = items
	maxID := 1000
	for _, it := range items {
		var n int
		if _, err := fmt.Sscanf(it.ID, "%d", &n); err == nil && n > maxID {
			maxID = n
		}
	}
	a.nextID = maxID + 1
}

func defaultItems() []ClipItem {
	return []ClipItem{
		{ID: "1", Type: "CODE", Content: `{"theme": "dark", "layout": "vertical", "sidebar": true}`, Preview: `{"theme": "dark", "layout": "vertical"...`, Details: "JSON Payload", CreatedAt: "10:30"},
		{ID: "2", Type: "TEXT", Content: "#FF5733", Preview: "#FF5733", Details: "HEX Color Code", Pinned: true, CreatedAt: "10:15"},
		{ID: "3", Type: "LINK", Content: "https://github.com/microsoft/winui", Preview: "https://github.com/microsoft/winui", Details: "Microsoft UI Library (WinUI) is a native UX framework.", CreatedAt: "09:45"},
		{ID: "4", Type: "CODE", Content: "const isCommand = search.startsWith(\">\");", Preview: "const isCommand = search.startsWith(\">\");", Details: "// 万物皆指令\nif (isCommand) {\n  renderCommands();\n}", CreatedAt: "09:20"},
		{ID: "5", Type: "TEXT", Content: "竖向极简侧边栏设计规范.md", Preview: "竖向极简侧边栏设计规范.md", Details: "# 核心理念\n\n380x560 竖向比例，左侧折叠栏，Lucide 图标统一视觉大小。", Pinned: true, CreatedAt: "08:50"},
		{ID: "100", Type: "PROMPT", Content: "请将以下内容翻译成{{语言}}，保持原文的语气和风格：\n\n{{内容}}", Preview: "翻译成{{语言}}", Details: "翻译 Prompt — 填入目标语言和内容", Pinned: true, CreatedAt: "08:00"},
		{ID: "101", Type: "PROMPT", Content: "请审查以下{{语言}}代码，指出bug、性能问题和改进建议：\n\n```{{语言}}\n{{代码}}\n```", Preview: "代码审查 — {{语言}}", Details: "代码审查 Prompt — 填入语言和代码", Pinned: true, CreatedAt: "08:00"},
		{ID: "102", Type: "PROMPT", Content: "请将以下内容改写为{{格式}}风格，要求{{要求}}：\n\n{{内容}}", Preview: "改写为{{格式}}", Details: "改写 Prompt — 填入格式、要求和内容", Pinned: true, CreatedAt: "08:00"},
		{ID: "103", Type: "PROMPT", Content: "请总结以下内容，提取{{数量}}个关键要点：\n\n{{内容}}", Preview: "总结{{数量}}个要点", Details: "总结 Prompt — 填入数量和内容", Pinned: true, CreatedAt: "08:00"},
		{ID: "104", Type: "PROMPT", Content: "你是一个{{角色}}专家。请帮我{{任务}}：\n\n{{背景}}", Preview: "{{角色}}专家 — {{任务}}", Details: "角色扮演 Prompt — 填入角色、任务和背景", Pinned: true, CreatedAt: "08:00"},
	}
}
