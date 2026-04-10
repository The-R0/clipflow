package main

import (
	goruntime "runtime"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	WM_HOTKEY = 0x0312
	MOD_ALT   = 0x0001
	MOD_CTRL  = 0x0002
	MOD_SHIFT = 0x0004
	VK_C      = 0x43
)

type HotkeyManager struct {
	app       *App
	modifiers uint32
	vkey      uint32
}

func NewHotkeyManager(app *App) *HotkeyManager {
	return &HotkeyManager{
		app:       app,
		modifiers: MOD_ALT,
		vkey:      VK_C,
	}
}

func (h *HotkeyManager) Register() {
	go h.loop(h.modifiers, h.vkey)
}

func (h *HotkeyManager) RegisterWith(modifiers, vkey uint32) bool {
	h.modifiers = modifiers
	h.vkey = vkey
	go h.loop(modifiers, vkey)
	return true
}

func (h *HotkeyManager) Unregister() {}

func (h *HotkeyManager) loop(modifiers, vkey uint32) {
	// CRITICAL: lock goroutine to OS thread so RegisterHotKey and
	// GetMessageW run on the same thread.
	goruntime.LockOSThread()
	defer goruntime.UnlockOSThread()

	user32 := windows.NewLazyDLL("user32.dll")
	regHotKey := user32.NewProc("RegisterHotKey")
	unregHotKey := user32.NewProc("UnregisterHotKey")
	getMessage := user32.NewProc("GetMessageW")

	const hotkeyID = uintptr(0xBEEF)

	ret, _, lastErr := regHotKey.Call(0, hotkeyID, uintptr(modifiers), uintptr(vkey))
	if ret == 0 {
		println("[hotkey] RegisterHotKey failed:", lastErr.Error())
		return
	}
	println("[hotkey] RegisterHotKey OK, waiting for Alt+C...")
	defer unregHotKey.Call(0, hotkeyID)

	var m msg
	for {
		ret, _, _ := getMessage.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if ret == 0 || ret == ^uintptr(0) {
			return
		}
		if m.Message == WM_HOTKEY && m.WParam == hotkeyID {
			println("[hotkey] Alt+C pressed!")
			h.app.TogglePanel()
		}
	}
}
