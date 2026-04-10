package main

import (
	"sync"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"golang.org/x/sys/windows"
)

const (
	WM_HOTKEY = 0x0312

	MOD_ALT   = 0x0001
	MOD_CTRL  = 0x0002
	MOD_SHIFT = 0x0004
	MOD_WIN   = 0x0008

	VK_C     = 0x43
	VK_SPACE = 0x20
)

type HotkeyManager struct {
	app       *App
	mu        sync.Mutex
	hotkeyID  int
	modifiers uint32
	vkey      uint32
	quit      chan struct{}
}

func NewHotkeyManager(app *App) *HotkeyManager {
	return &HotkeyManager{
		app:       app,
		hotkeyID:  1,
		modifiers: MOD_ALT,
		vkey:      VK_C,
		quit:      make(chan struct{}),
	}
}

func (h *HotkeyManager) Register() bool {
	return h.RegisterWith(h.modifiers, h.vkey)
}

func (h *HotkeyManager) RegisterWith(modifiers, vkey uint32) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.modifiers = modifiers
	h.vkey = vkey

	kernel32 := windows.NewLazyDLL("user32.dll")
	registerHotKey := kernel32.NewProc("RegisterHotKey")

	ret, _, _ := registerHotKey.Call(
		0,
		uintptr(h.hotkeyID),
		uintptr(modifiers),
		uintptr(vkey),
	)

	if ret != 1 {
		return false
	}

	go h.messageLoop()
	return true
}

func (h *HotkeyManager) Unregister() {
	h.mu.Lock()
	defer h.mu.Unlock()

	kernel32 := windows.NewLazyDLL("user32.dll")
	unregisterHotKey := kernel32.NewProc("UnregisterHotKey")
	unregisterHotKey.Call(0, uintptr(h.hotkeyID))

	select {
	case h.quit <- struct{}{}:
	default:
	}
}

func (h *HotkeyManager) messageLoop() {
	var m msg

	user32 := windows.NewLazyDLL("user32.dll")
	getMessage := user32.NewProc("GetMessageW")

	for {
		ret, _, _ := getMessage.Call(
			uintptr(unsafe.Pointer(&m)),
			0, 0, 0,
		)
		if ret == 0 || ret == ^uintptr(0) {
			return
		}

		select {
		case <-h.quit:
			return
		default:
		}

		if m.Message == WM_HOTKEY && m.WParam == uintptr(h.hotkeyID) {
			runtime.EventsEmit(h.app.ctx, "hotkey:pressed")
		}
	}
}
