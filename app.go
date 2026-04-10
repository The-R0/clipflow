package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ClipItem struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Content string `json:"content"`
	Preview string `json:"preview"`
	Details string `json:"details"`
	Pinned  bool   `json:"pinned"`
}

type App struct {
	ctx     context.Context
	mu      sync.Mutex
	items   []ClipItem
	nextID  int
	ignore  atomic.Bool
	hotkey  *HotkeyManager
	clipmon *ClipboardMonitor

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
	a.hotkey.Register()

	a.clipmon = NewClipboardMonitor(a)
	go a.clipmon.Start()

	SkipTaskbar()
}

func (a *App) onBeforeClose(ctx context.Context) bool {
	runtime.WindowHide(ctx)
	EmptyWorkingSet()
	return true
}

// ---- 前端绑定方法 ----

func (a *App) ShowPanel() {
	x, y := a.calcPopupPos(280, 360)
	runtime.WindowSetPosition(a.ctx, x, y)
	runtime.WindowShow(a.ctx)
	runtime.WindowSetSize(a.ctx, 280, 360)
}

func (a *App) HidePanel() {
	runtime.WindowHide(a.ctx)
	EmptyWorkingSet()
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
		ID:      fmt.Sprintf("%d", a.nextID),
		Type:    typ,
		Content: content,
		Preview: preview,
		Details: details,
		Pinned:  false,
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
		{ID: "1", Type: "CODE", Content: `{"theme": "dark", "layout": "vertical", "sidebar": true}`, Preview: `{"theme": "dark", "layout": "vertical"...`, Details: "JSON Payload"},
		{ID: "2", Type: "TEXT", Content: "#FF5733", Preview: "#FF5733", Details: "HEX Color Code", Pinned: true},
		{ID: "3", Type: "LINK", Content: "https://github.com/microsoft/winui", Preview: "https://github.com/microsoft/winui", Details: "Microsoft UI Library (WinUI) is a native UX framework."},
		{ID: "4", Type: "CODE", Content: "const isCommand = search.startsWith(\">\");", Preview: "const isCommand = search.startsWith(\">\");", Details: "// 万物皆指令\nif (isCommand) {\n  renderCommands();\n}"},
		{ID: "5", Type: "TEXT", Content: "竖向极简侧边栏设计规范.md", Preview: "竖向极简侧边栏设计规范.md", Details: "# 核心理念\n\n380x560 竖向比例，左侧折叠栏，Lucide 图标统一视觉大小。", Pinned: true},
	}
}
