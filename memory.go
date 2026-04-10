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

// msg represents the Windows MSG structure
type msg struct {
	HWnd    syscall.Handle
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      struct{ X, Y int32 }
}
