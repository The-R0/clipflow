package main

import (
	"strings"
	"syscall"
	"unicode/utf16"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	WM_CLIPBOARDUPDATE = 0x031D
	CF_UNICODETEXT     = 13
	GMEM_MOVEABLE      = 0x0002
)

var (
	user32DLL   = windows.NewLazyDLL("user32.dll")
	kernel32DLL = windows.NewLazyDLL("kernel32.dll")

	procAddClipboardFormatListener = user32DLL.NewProc("AddClipboardFormatListener")
	procCreateWindowExW            = user32DLL.NewProc("CreateWindowExW")
	procDestroyWindow              = user32DLL.NewProc("DestroyWindow")
	procDefWindowProcW             = user32DLL.NewProc("DefWindowProcW")
	procRegisterClassExW           = user32DLL.NewProc("RegisterClassExW")
	procGetMessageW                = user32DLL.NewProc("GetMessageW")
	procOpenClipboard              = user32DLL.NewProc("OpenClipboard")
	procCloseClipboard             = user32DLL.NewProc("CloseClipboard")
	procGetClipboardData           = user32DLL.NewProc("GetClipboardData")
	procSetClipboardData           = user32DLL.NewProc("SetClipboardData")
	procEmptyClipboard             = user32DLL.NewProc("EmptyClipboard")
	procGlobalAlloc                = kernel32DLL.NewProc("GlobalAlloc")
	procGlobalFree                 = kernel32DLL.NewProc("GlobalFree")
	procGlobalLock                 = kernel32DLL.NewProc("GlobalLock")
	procGlobalUnlock               = kernel32DLL.NewProc("GlobalUnlock")
	procGlobalSize                 = kernel32DLL.NewProc("GlobalSize")
	procGetCursorPos               = user32DLL.NewProc("GetCursorPos")
	procMonitorFromPoint           = user32DLL.NewProc("MonitorFromPoint")
	procGetMonitorInfoW            = user32DLL.NewProc("GetMonitorInfoW")
	procSendInput                  = user32DLL.NewProc("SendInput")
	procGetModuleHandleW           = kernel32DLL.NewProc("GetModuleHandleW")
)

type ClipboardMonitor struct {
	app      *App
	hwnd     syscall.Handle
	lastText string
	quit     chan struct{}
}

func NewClipboardMonitor(app *App) *ClipboardMonitor {
	return &ClipboardMonitor{
		app:  app,
		quit: make(chan struct{}),
	}
}

func (m *ClipboardMonitor) Start() {
	m.createMsgWindow()
	defer procDestroyWindow.Call(uintptr(m.hwnd))

	procAddClipboardFormatListener.Call(uintptr(m.hwnd))

	var ms msg
	for {
		ret, _, _ := procGetMessageW.Call(
			uintptr(unsafe.Pointer(&ms)),
			uintptr(m.hwnd), 0, 0,
		)
		if ret == 0 || ret == ^uintptr(0) {
			break
		}

		select {
		case <-m.quit:
			return
		default:
		}

		if ms.Message == WM_CLIPBOARDUPDATE {
			text := ReadClipboard()
			if text != "" && text != m.lastText {
				m.lastText = text
				m.app.onClipboardNewContent(text)
			}
		}
	}
}

func (m *ClipboardMonitor) createMsgWindow() {
	className, _ := windows.UTF16PtrFromString("ClipFlowMsgWnd")

	hInstance, _, _ := procGetModuleHandleW.Call(0)

	type wndClassEx struct {
		Size        uint32
		Style       uint32
		LpfnWndProc uintptr
		CbClsExtra  int32
		CbWndExtra  int32
		HInstance   syscall.Handle
		HIcon       syscall.Handle
		HCursor     syscall.Handle
		HbrBackground syscall.Handle
		LpszMenuName  *uint16
		LpszClassName *uint16
		HIconSm       syscall.Handle
	}

	wc := wndClassEx{
		Size:          uint32(unsafe.Sizeof(wndClassEx{})),
		LpfnWndProc:   procDefWindowProcW.Addr(),
		HInstance:     syscall.Handle(hInstance),
		LpszClassName: className,
	}

	procRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc)))

	hwnd, _, _ := procCreateWindowExW.Call(
		0,
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(className)),
		0,
		0, 0, 0, 0,
		0, 0,
		hInstance,
		0,
	)
	m.hwnd = syscall.Handle(hwnd)
}

func ReadClipboard() string {
	ret, _, _ := procOpenClipboard.Call(0)
	if ret == 0 {
		return ""
	}
	defer procCloseClipboard.Call()

	hData, _, _ := procGetClipboardData.Call(CF_UNICODETEXT)
	if hData == 0 {
		return ""
	}

	p, _, _ := procGlobalLock.Call(hData)
	if p == 0 {
		return ""
	}
	defer procGlobalUnlock.Call(hData)

	size, _, _ := procGlobalSize.Call(hData)
	if size == 0 {
		return ""
	}

	n := int(size) / 2
	if n == 0 {
		return ""
	}

	u16 := unsafe.Slice((*uint16)(unsafe.Pointer(p)), n)
	end := n
	for i, v := range u16 {
		if v == 0 {
			end = i
			break
		}
	}
	return windows.UTF16ToString(u16[:end])
}

func WriteClipboard(text string) {
	procOpenClipboard.Call(0)
	defer procCloseClipboard.Call()

	procEmptyClipboard.Call()

	u16 := utf16.Encode([]rune(text + "\x00"))
	size := uintptr(len(u16)) * unsafe.Sizeof(u16[0])

	hMem, _, _ := procGlobalAlloc.Call(GMEM_MOVEABLE, size)
	if hMem == 0 {
		return
	}

	p, _, _ := procGlobalLock.Call(hMem)
	if p == 0 {
		procGlobalFree.Call(hMem)
		return
	}

	dst := unsafe.Slice((*uint16)(unsafe.Pointer(p)), len(u16))
	copy(dst, u16)
	procGlobalUnlock.Call(hMem)

	procSetClipboardData.Call(CF_UNICODETEXT, hMem)
}

func SimulateCtrlV() {
	const (
		INPUT_KEYBOARD  = 1
		KEYEVENTF_KEYUP = 0x0002
		VK_CONTROL      = 0x11
		VK_V            = 0x56
	)

	type KEYBDINPUT struct {
		WVk         uint16
		WScan       uint16
		DwFlags     uint32
		Time        uint32
		DwExtraInfo uintptr
	}
	type INPUT struct {
		Type uint32
		Ki   KEYBDINPUT
	}

	inputs := []INPUT{
		{Type: INPUT_KEYBOARD, Ki: KEYBDINPUT{WVk: VK_CONTROL}},
		{Type: INPUT_KEYBOARD, Ki: KEYBDINPUT{WVk: VK_V}},
		{Type: INPUT_KEYBOARD, Ki: KEYBDINPUT{WVk: VK_V, DwFlags: KEYEVENTF_KEYUP}},
		{Type: INPUT_KEYBOARD, Ki: KEYBDINPUT{WVk: VK_CONTROL, DwFlags: KEYEVENTF_KEYUP}},
	}

	procSendInput.Call(4, uintptr(unsafe.Pointer(&inputs[0])), unsafe.Sizeof(inputs[0]))
}

func GetCursorPos() (int, int) {
	var point struct{ X, Y int32 }
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&point)))
	return int(point.X), int(point.Y)
}

func GetMonitorRect(x, y int) (int, int, int, int) {
	mon, _, _ := procMonitorFromPoint.Call(uintptr(x), uintptr(y), 2 /* MONITOR_DEFAULTTONEAREST */)
	if mon == 0 {
		return 0, 0, 1920, 1080
	}

	type MONITORINFO struct {
		CbSize    uint32
		RcMonitor struct{ Left, Top, Right, Bottom int32 }
		RcWork    struct{ Left, Top, Right, Bottom int32 }
		DwFlags   uint32
	}

	var mi MONITORINFO
	mi.CbSize = uint32(unsafe.Sizeof(mi))
	procGetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi)))

	return int(mi.RcWork.Left), int(mi.RcWork.Top),
		int(mi.RcWork.Right - mi.RcWork.Left),
		int(mi.RcWork.Bottom - mi.RcWork.Top)
}

// ---- 内容类型检测 ----

func detectType(content string) string {
	trimmed := strings.TrimSpace(content)

	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return "LINK"
	}
	if isJSON(trimmed) {
		return "CODE"
	}
	if hasCodeHint(trimmed) {
		return "CODE"
	}
	if isHexColor(trimmed) {
		return "TEXT"
	}
	return "TEXT"
}

func isHexColor(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) == 4 || len(s) == 7 {
		if s[0] == '#' {
			for _, c := range s[1:] {
				if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
					return false
				}
			}
			return true
		}
	}
	return false
}

func isJSON(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 2 {
		return false
	}
	return (s[0] == '{' && s[len(s)-1] == '}') || (s[0] == '[' && s[len(s)-1] == ']')
}

func hasCodeHint(s string) bool {
	hints := []string{"{", "}", ";", "=>", "#include", "function ", "const ", "let ", "class "}
	for _, h := range hints {
		if strings.Contains(s, h) {
			return true
		}
	}
	return false
}

func buildPreview(content string) string {
	oneLine := strings.Join(strings.Fields(content), " ")
	if len(oneLine) > 52 {
		return oneLine[:49] + "..."
	}
	return oneLine
}

func buildDetails(content, typ string) string {
	switch typ {
	case "LINK":
		return "URL / Link"
	case "CODE":
		return "Code Snippet"
	default:
		return content
	}
}
