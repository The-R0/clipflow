package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:             "ClipFlow",
		Width:             240,
		Height:            400,
		MinWidth:          220,
		MinHeight:         300,
		MaxWidth:          800,
		MaxHeight:         800,
		AssetServer:       &assetserver.Options{Assets: assets},
		BackgroundColour:  &options.RGBA{R: 0, G: 0, B: 0, A: 0},
		OnStartup:         app.startup,
		OnBeforeClose:     app.onBeforeClose,
		Frameless:         true,
		StartHidden:       false,
		HideWindowOnClose: true,
		AlwaysOnTop:       true,
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
