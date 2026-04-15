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
