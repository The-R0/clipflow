package main

import (
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

func EmptyWorkingSet() {
	psapi := windows.NewLazyDLL("psapi.dll")
	kernel32 := windows.NewLazyDLL("kernel32.dll")

	emptyWorkingSet := psapi.NewProc("EmptyWorkingSet")
	getCurrentProcess := kernel32.NewProc("GetCurrentProcess")

	hProc, _, _ := getCurrentProcess.Call()
	emptyWorkingSet.Call(hProc)
}

func SkipTaskbar() {
	user32 := windows.NewLazyDLL("user32.dll")
	kernel32 := windows.NewLazyDLL("kernel32.dll")
	getConsoleWindow := kernel32.NewProc("GetConsoleWindow")
	setWindowPos := user32.NewProc("SetWindowPos")

	hwnd, _, _ := getConsoleWindow.Call()
	if hwnd != 0 {
		const SWP_HIDEWINDOW = 0x0080
		const SWP_NOMOVE = 0x0002
		const SWP_NOSIZE = 0x0001
		setWindowPos.Call(hwnd, 0, 0, 0, 0, 0, SWP_HIDEWINDOW|SWP_NOMOVE|SWP_NOSIZE)
	}

	findWindow := user32.NewProc("FindWindowW")
	className, _ := windows.UTF16PtrFromString("")
	windowName, _ := windows.UTF16PtrFromString("ClipFlow")
	hwnd2, _, _ := findWindow.Call(uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(windowName)))
	if hwnd2 != 0 {
		const SWP_HIDEWINDOW = 0x0080
		const SWP_NOMOVE = 0x0002
		const SWP_NOSIZE = 0x0001
		setWindowPos.Call(hwnd2, uintptr(1), 0, 0, 0, 0, SWP_HIDEWINDOW|SWP_NOMOVE|SWP_NOSIZE)
	}
}

// EnsureConsoleHidden hides the console window on Windows
func EnsureConsoleHidden() {
	user32 := windows.NewLazyDLL("user32.dll")
	kernel32 := windows.NewLazyDLL("kernel32.dll")
	getConsoleWindow := kernel32.NewProc("GetConsoleWindow")
	showWindow := user32.NewProc("ShowWindow")

	hwnd, _, _ := getConsoleWindow.Call()
	if hwnd != 0 {
		showWindow.Call(hwnd, 0) // SW_HIDE
	}
}

func EnsureSingleInstance() bool {
	kernel32 := windows.NewLazyDLL("kernel32.dll")
	createMutex := kernel32.NewProc("CreateMutexW")

	name, _ := windows.UTF16PtrFromString("ClipFlow_SingleInstance")
	createMutex.Call(0, 0, uintptr(unsafe.Pointer(name)))

	lastErr := windows.GetLastError()
	return lastErr != windows.ERROR_ALREADY_EXISTS
}

func ActivateExistingWindow() {
	user32 := windows.NewLazyDLL("user32.dll")
	findWindow := user32.NewProc("FindWindowW")
	setForegroundWindow := user32.NewProc("SetForegroundWindow")
	showWindow := user32.NewProc("ShowWindow")

	className, _ := windows.UTF16PtrFromString("")
	windowName, _ := windows.UTF16PtrFromString("ClipFlow")
	hwnd, _, _ := findWindow.Call(uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(windowName)))
	if hwnd != 0 {
		showWindow.Call(hwnd, 9) // SW_RESTORE
		setForegroundWindow.Call(hwnd)
	}
}

// MakeWindowToolWindow removes the window from taskbar by setting WS_EX_TOOLWINDOW
func MakeWindowToolWindow() {
	user32 := windows.NewLazyDLL("user32.dll")
	findWindow := user32.NewProc("FindWindowW")
	getWindowLong := user32.NewProc("GetWindowLongPtrW")
	setWindowLong := user32.NewProc("SetWindowLongPtrW")
	setWindowPos := user32.NewProc("SetWindowPos")

	className, _ := windows.UTF16PtrFromString("")
	windowName, _ := windows.UTF16PtrFromString("ClipFlow")
	hwnd, _, _ := findWindow.Call(uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(windowName)))
	if hwnd == 0 {
		return
	}

	const GWL_EXSTYLE = ^uintptr(20) // -20
	exStyle, _, _ := getWindowLong.Call(hwnd, GWL_EXSTYLE)
	const WS_EX_TOOLWINDOW = 0x00000080
	const WS_EX_APPWINDOW = 0x00040000
	newStyle := (exStyle | WS_EX_TOOLWINDOW) &^ WS_EX_APPWINDOW
	setWindowLong.Call(hwnd, GWL_EXSTYLE, newStyle)

	const SWP_NOMOVE = 0x0002
	const SWP_NOSIZE = 0x0001
	const SWP_NOZORDER = 0x0004
	const SWP_FRAMECHANGED = 0x0020
	setWindowPos.Call(hwnd, 0, 0, 0, 0, 0, SWP_NOMOVE|SWP_NOSIZE|SWP_NOZORDER|SWP_FRAMECHANGED)
}

var trayWnd uintptr

// AddTrayIcon adds a system tray notification icon
func AddTrayIcon() {
	user32 := windows.NewLazyDLL("user32.dll")
	kernel32 := windows.NewLazyDLL("kernel32.dll")
	shell32 := windows.NewLazyDLL("shell32.dll")

	getModuleHandle := kernel32.NewProc("GetModuleHandleW")
	loadIcon := user32.NewProc("LoadIconW")
	shellNotifyIcon := shell32.NewProc("Shell_NotifyIconW")

	hInstance, _, _ := getModuleHandle.Call(0)
	// Load default application icon
	icon, _, _ := loadIcon.Call(hInstance, uintptr(unsafe.Pointer(uintptr(32512)))) // IDI_APPLICATION

	// Find our window
	findWindow := user32.NewProc("FindWindowW")
	className, _ := windows.UTF16PtrFromString("")
	windowName, _ := windows.UTF16PtrFromString("ClipFlow")
	trayWnd, _, _ = findWindow.Call(uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(windowName)))

	type NOTIFYICONDATA struct {
		CbSize           uint32
		HWnd             uintptr
		UID              uint32
		UFlags           uint32
		UCallbackMessage uint32
		HIcon            uintptr
		SzTip            [128]uint16
		DwState          uint32
		DwStateMask      uint32
		SzInfo           [256]uint16
		UNew             uint32
		UNTimeout        uint32
		UNVersion        uint32
		SzInfoTitle      [64]uint16
		DwInfoFlags      uint32
	}

	const NIM_ADD = 0x00000000
	const NIF_MESSAGE = 0x00000001
	const NIF_ICON = 0x00000002
	const NIF_TIP = 0x00000004

	var tip [128]uint16
	copy(tip[:], []uint16{0x0043, 0x006C, 0x0069, 0x0070, 0x0046, 0x006C, 0x006F, 0x0077}) // "ClipFlow"

	nid := NOTIFYICONDATA{
		CbSize:           uint32(unsafe.Sizeof(NOTIFYICONDATA{})),
		HWnd:             trayWnd,
		UID:              1,
		UFlags:           NIF_MESSAGE | NIF_ICON | NIF_TIP,
		UCallbackMessage: 0x0400 + 1, // WM_APP + 1
		HIcon:            icon,
	}
	nid.SzTip = tip

	shellNotifyIcon.Call(NIM_ADD, uintptr(unsafe.Pointer(&nid)))
}

// RemoveTrayIcon removes the system tray icon
func RemoveTrayIcon() {
	shell32 := windows.NewLazyDLL("shell32.dll")
	shellNotifyIcon := shell32.NewProc("Shell_NotifyIconW")

	type NOTIFYICONDATA struct {
		CbSize           uint32
		HWnd             uintptr
		UID              uint32
		UFlags           uint32
		UCallbackMessage uint32
		HIcon            uintptr
		SzTip            [128]uint16
		DwState          uint32
		DwStateMask      uint32
		SzInfo           [256]uint16
		UNew             uint32
		UNTimeout        uint32
		UNVersion        uint32
		SzInfoTitle      [64]uint16
		DwInfoFlags      uint32
	}

	const NIM_DELETE = 0x00000002
	nid := NOTIFYICONDATA{
		CbSize: uint32(unsafe.Sizeof(NOTIFYICONDATA{})),
		HWnd:   trayWnd,
		UID:    1,
	}
	shellNotifyIcon.Call(NIM_DELETE, uintptr(unsafe.Pointer(&nid)))
}

func RemoveWindowShadow() {
	user32 := windows.NewLazyDLL("user32.dll")
	dwmapi := windows.NewLazyDLL("dwmapi.dll")

	findWindow := user32.NewProc("FindWindowW")
	dwmSetWindowAttribute := dwmapi.NewProc("DwmSetWindowAttribute")

	className, _ := windows.UTF16PtrFromString("")
	windowName, _ := windows.UTF16PtrFromString("ClipFlow")
	hwnd, _, _ := findWindow.Call(uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(windowName)))
	if hwnd == 0 {
		return
	}

	// Remove CS_DROPSHADOW from window class
	const GCL_STYLE = ^uintptr(26) // -26
	getClassLongPtr := user32.NewProc("GetClassLongPtrW")
	setClassLongPtr := user32.NewProc("SetClassLongPtrW")
	classStyle, _, _ := getClassLongPtr.Call(hwnd, GCL_STYLE)
	const CS_DROPSHADOW = 0x00020000
	if classStyle&CS_DROPSHADOW != 0 {
		setClassLongPtr.Call(hwnd, GCL_STYLE, classStyle&^CS_DROPSHADOW)
	}

	// DWM: disable rounded corners and shadow (DWM_WINDOW_CORNER_PREFERENCE = DWMWCP_OFF = 2)
	const DWMWA_WINDOW_CORNER_PREFERENCE = 33
	const DWMWCP_OFF = 2
	val := uint32(DWMWCP_OFF)
	dwmSetWindowAttribute.Call(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, uintptr(unsafe.Pointer(&val)), 4)

	// Remove WS_EX_LAYERED edge shadow by extending frame into client area
	// MARGINS = {0,0,0,0} removes the DWM shadow frame
	type margins struct{ Left, Right, Top, Bottom int32 }
	m := margins{0, 0, 0, 0}
	dwmExtendFrameIntoClientArea := dwmapi.NewProc("DwmExtendFrameIntoClientArea")
	dwmExtendFrameIntoClientArea.Call(hwnd, uintptr(unsafe.Pointer(&m)))

	// Force redraw
	const SWP_NOMOVE = 0x0002
	const SWP_NOSIZE = 0x0001
	const SWP_FRAMECHANGED = 0x0020
	const SWP_NOZORDER = 0x0004
	setWindowPos := user32.NewProc("SetWindowPos")
	setWindowPos.Call(hwnd, 0, 0, 0, 0, 0, SWP_NOMOVE|SWP_NOSIZE|SWP_NOZORDER|SWP_FRAMECHANGED)
}

// msg represents the Windows MSG structure
type msg struct {
	HWnd    syscall.Handle
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      struct{ X, Y int32 }
}
