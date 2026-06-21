package main

import (
	"archive/zip"
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/data/binding"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type ClientRequest struct {
	Action          string     `json:"action"`
	Slug            string     `json:"slug"`
	GithubURL       string     `json:"github_url"`
	Environments    []string   `json:"environments"`
	InstallCommands [][]string `json:"install_commands"`
	StartCommand    []string   `json:"start_command"`
	Port            string     `json:"port"`
}

type BazaarConfig struct {
	StartCommand []string `json:"start_command"`
	Port         string   `json:"port"`
}

type EndpointRequest struct {
	Slug      string `json:"slug"`
	GithubURL string `json:"github_url"`
}

var activeProcesses = make(map[string]*exec.Cmd)
var processMutex sync.Mutex

// ---------------------------------------------------------
// RECONFIGURED UTILITY AND DIRECTORY HANDLERS
// ---------------------------------------------------------

func getBaseDir() string {
	ex, _ := os.Executable()
	baseDir := filepath.Dir(ex)
	if strings.Contains(filepath.ToSlash(baseDir), "go-build") || strings.Contains(filepath.ToSlash(baseDir), "Temp") {
		baseDir, _ = os.Getwd()
	}
	return baseDir
}

func getPixiPath() string {
	baseDir := getBaseDir()

	// Handle Windows
	if runtime.GOOS == "windows" {
		return filepath.Join(baseDir, "bin", "pixi.exe")
	}

	// Handle macOS (Darwin) with your dynamic subfolder structure from the screenshot
	if runtime.GOOS == "darwin" {
		if runtime.GOARCH == "arm64" {
			// M1, M2, M3, M4 Apple Silicon Chips
			return filepath.Join(baseDir, "bin", "pixi-arm64", "pixi_aarch64-apple-darwin", "pixi")
		}
		// Intel Core i5/i7/i9 Chips
		return filepath.Join(baseDir, "bin", "pixi-amd64", "pixi_x86_64-apple-darwin", "pixi")
	}

	// Default fallback for Linux
	return filepath.Join(baseDir, "bin", "pixi")
}

func getAppFolderPath(slug string) string {
	return filepath.Join(getBaseDir(), "core", "apps", slug)
}

func getAvailablePort(desiredPort string) string {
	ln, err := net.Listen("tcp", "127.0.0.1:"+desiredPort)
	if err == nil {
		ln.Close()
		return desiredPort
	}
	ln, err = net.Listen("tcp", "127.0.0.1:0")
	if err == nil {
		port := fmt.Sprintf("%d", ln.Addr().(*net.TCPAddr).Port)
		ln.Close()
		return port
	}
	return desiredPort
}

// stopProcessTree cleanly kills the process AND all of its children (Python/Node servers)
func stopProcessTree(cmd *exec.Cmd) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	if runtime.GOOS == "windows" {
		// Native Windows command to forcefully kill a process tree
		exec.Command("taskkill", "/T", "/F", "/PID", fmt.Sprintf("%d", cmd.Process.Pid)).Run()
	} else {
		// Unix: Send an interrupt so Pixi gracefully stops its child Python apps
		cmd.Process.Signal(os.Interrupt)
	}
}

// ---------------------------------------------------------
// LOGGER LAYERS
// ---------------------------------------------------------

var permanentLog string
var logMutex sync.Mutex
var logBinding binding.String

func writeLog(format string, a ...interface{}) {
	msg := fmt.Sprintf(format, a...)
	fmt.Print(msg)
	logMutex.Lock()
	defer logMutex.Unlock()

	permanentLog += msg
	if len(permanentLog) > 50000 {
		permanentLog = permanentLog[len(permanentLog)-50000:]
	}
	if logBinding != nil {
		logBinding.Set(permanentLog)
	}
}

// ---------------------------------------------------------
// LOCAL APP LAUNCHER
// ---------------------------------------------------------

func startAppLocally(slug string) error {
	processMutex.Lock()
	_, isRunning := activeProcesses[slug]
	processMutex.Unlock()

	if isRunning {
		return fmt.Errorf("app is already running")
	}

	appFolder := getAppFolderPath(slug)
	pixiExe := getPixiPath()

	configPath := filepath.Join(appFolder, ".bazaar")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("app configuration missing. Please launch from website first")
	}

	var config BazaarConfig
	if err := json.Unmarshal(configData, &config); err != nil || len(config.StartCommand) == 0 {
		return fmt.Errorf("invalid app configuration")
	}

	targetPort := config.Port
	if targetPort == "" {
		targetPort = "8899"
	}

	targetPort = getAvailablePort(targetPort)

	config.Port = targetPort
	configBytes, _ := json.Marshal(config)
	os.WriteFile(configPath, configBytes, 0644)

	writeLog("⚡ [LOCAL] Launching %s...\n", slug)

	runArgs := append([]string{"run"}, config.StartCommand...)
	runCmd := exec.Command(pixiExe, runArgs...)
	runCmd.Dir = appFolder

	runCmd.Env = append(os.Environ(), "PORT="+targetPort)

	stdout, _ := runCmd.StdoutPipe()
	stderr, _ := runCmd.StderrPipe()

	processMutex.Lock()
	activeProcesses[slug] = runCmd
	processMutex.Unlock()

	if err := runCmd.Start(); err != nil {
		writeLog("❌ ERROR: Failed to start locally.\n")
		return err
	}

	writeLog("🚀 ONLINE: http://127.0.0.1:%s\n", targetPort)

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			writeLog("📦 [%s]: %s\n", slug, scanner.Text())
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			writeLog("ℹ️ [%s]: %s\n", slug, scanner.Text())
		}
	}()

	go func() {
		runCmd.Wait()
		writeLog("💤 [%s]: Process finished.\n", slug)

		processMutex.Lock()
		delete(activeProcesses, slug)
		processMutex.Unlock()
	}()

	return nil
}

// ---------------------------------------------------------
// APP MANAGEMENT FUNCTIONS (FOR UI)
// ---------------------------------------------------------

func getInstalledApps() []string {
	var apps []string
	appsDir := filepath.Join(getBaseDir(), "core", "apps")
	entries, err := os.ReadDir(appsDir)
	if err != nil {
		return apps
	}
	for _, entry := range entries {
		if entry.IsDir() {
			apps = append(apps, entry.Name())
		}
	}
	return apps
}

func uninstallApp(slug string) {
	processMutex.Lock()
	if cmd, exists := activeProcesses[slug]; exists {
		stopProcessTree(cmd)
		delete(activeProcesses, slug)
	}
	processMutex.Unlock()

	targetDir := getAppFolderPath(slug)
	os.RemoveAll(targetDir)
	writeLog("🗑️ [DELETE]: Uninstalled %s from local storage.\n", slug)
}

// ---------------------------------------------------------
// REST API SYSTEM
// ---------------------------------------------------------

func handleCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req EndpointRequest
	json.NewDecoder(r.Body).Decode(&req)

	targetDir := getAppFolderPath(req.Slug)
	_, err := os.Stat(filepath.Join(targetDir, "pixi.toml"))
	installed := err == nil

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"installed": installed})
}

func handleStop(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req EndpointRequest
	json.NewDecoder(r.Body).Decode(&req)

	processMutex.Lock()
	if cmd, exists := activeProcesses[req.Slug]; exists {
		stopProcessTree(cmd)
		delete(activeProcesses, req.Slug)
		writeLog("🛑 [STOP]: Force terminated process for context: %s\n", req.Slug)
	}
	processMutex.Unlock()

	w.WriteHeader(http.StatusOK)
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req EndpointRequest
	json.NewDecoder(r.Body).Decode(&req)

	targetDir := getAppFolderPath(req.Slug)
	os.RemoveAll(targetDir)
	writeLog("🗑️ [DELETE]: Purged local environment path: %s\n", targetDir)

	w.WriteHeader(http.StatusOK)
}

// ---------------------------------------------------------
// CORE SOCKET ORCHESTRATOR
// ---------------------------------------------------------

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		var req ClientRequest
		if err := conn.ReadJSON(&req); err != nil {
			break
		}

		if req.Action == "RUN" {
			appFolder := getAppFolderPath(req.Slug)

			processMutex.Lock()
			_, isRunning := activeProcesses[req.Slug]
			processMutex.Unlock()

			if isRunning {
				targetPort := "8899"
				configPath := filepath.Join(appFolder, ".bazaar")
				if configData, err := os.ReadFile(configPath); err == nil {
					var config BazaarConfig
					if json.Unmarshal(configData, &config) == nil && config.Port != "" {
						targetPort = config.Port
					}
				}
				writeLog("⚡ Application %s is already running.\n", req.Slug)
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("🚀 ONLINE: App is already running at http://127.0.0.1:%s", targetPort)))
				continue
			}

			pixiExe := getPixiPath()
			targetPort := req.Port
			if targetPort == "" {
				targetPort = "8899"
			}

			targetPort = getAvailablePort(targetPort)

			configData := BazaarConfig{
				StartCommand: req.StartCommand,
				Port:         targetPort,
			}
			configBytes, _ := json.Marshal(configData)
			os.MkdirAll(appFolder, 0755)
			os.WriteFile(filepath.Join(appFolder, ".bazaar"), configBytes, 0644)

			if _, err := os.Stat(filepath.Join(appFolder, "pixi.toml")); os.IsNotExist(err) {
				writeLog("📥 Downloading deployment repository source code...\n")
				conn.WriteMessage(websocket.TextMessage, []byte("📥 SYSTEM: Downloading deployment repository source code..."))

				zipURL := strings.TrimSuffix(req.GithubURL, "/") + "/archive/HEAD.zip"
				resp, err := http.Get(zipURL)
				if err != nil {
					writeLog("❌ ERROR: Repository payload download aborted.\n")
					conn.WriteMessage(websocket.TextMessage, []byte("❌ ERROR: Repository payload download aborted."))
					continue
				}

				tempZip := appFolder + "_temp.zip"
				out, _ := os.Create(tempZip)
				io.Copy(out, resp.Body)
				out.Close()
				resp.Body.Close()

				rZip, _ := zip.OpenReader(tempZip)
				for _, f := range rZip.File {
					pathParts := strings.Split(f.Name, "/")
					if len(pathParts) <= 1 {
						continue
					}
					cleanSubPath := strings.Join(pathParts[1:], "/")
					if cleanSubPath == "" {
						continue
					}

					fpath := filepath.Join(appFolder, cleanSubPath)
					if f.FileInfo().IsDir() {
						os.MkdirAll(fpath, os.ModePerm)
						continue
					}
					os.MkdirAll(filepath.Dir(fpath), os.ModePerm)
					outFile, _ := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
					rc, _ := f.Open()
					io.Copy(outFile, rc)
					outFile.Close()
					rc.Close()
				}
				rZip.Close()
				os.Remove(tempZip)

				writeLog("🪄 Scaffolding isolated runtime dependencies...\n")
				conn.WriteMessage(websocket.TextMessage, []byte("🪄 SYSTEM: Scaffolding isolated runtime dependencies blueprint..."))
				exec.Command(pixiExe, "init", ".").Run()

				if len(req.Environments) > 0 {
					initArgs := append([]string{"add"}, req.Environments...)
					cmdAdd := exec.Command(pixiExe, initArgs...)
					cmdAdd.Dir = appFolder
					cmdAdd.Run()
				}

				for _, instCmd := range req.InstallCommands {
					if len(instCmd) == 0 {
						continue
					}
					writeLog("⚙️ Synchronizing deployment step -> %v\n", instCmd)
					conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("⚙️ SYSTEM: Synchronizing deployment step -> %v", instCmd)))
					fullInstallArgs := append([]string{"run"}, instCmd...)
					cmdInst := exec.Command(pixiExe, fullInstallArgs...)
					cmdInst.Dir = appFolder
					cmdInst.Run()
				}
			}

			writeLog("⚡ Launching sandboxed environment context...\n")
			conn.WriteMessage(websocket.TextMessage, []byte("⚡ SYSTEM: Launching sandboxed environment context..."))

			if len(req.StartCommand) == 0 {
				writeLog("❌ ERROR: No start command provided.\n")
				conn.WriteMessage(websocket.TextMessage, []byte("❌ ERROR: No start command provided."))
				continue
			}

			runArgs := append([]string{"run"}, req.StartCommand...)
			runCmd := exec.Command(pixiExe, runArgs...)
			runCmd.Dir = appFolder

			runCmd.Env = append(os.Environ(), "PORT="+targetPort)

			stdout, _ := runCmd.StdoutPipe()
			stderr, _ := runCmd.StderrPipe()

			processMutex.Lock()
			activeProcesses[req.Slug] = runCmd
			processMutex.Unlock()

			if err := runCmd.Start(); err != nil {
				writeLog("❌ ERROR: Critical startup execution error occurred.\n")
				conn.WriteMessage(websocket.TextMessage, []byte("❌ ERROR: Critical startup execution error occurred."))
				continue
			}

			writeLog("🚀 ONLINE: Interface bound on port %s.\n", targetPort)
			conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("🚀 ONLINE: Interface bound on http://127.0.0.1:%s", targetPort)))

			go func() {
				scanner := bufio.NewScanner(stdout)
				for scanner.Scan() {
					writeLog("📦 [Out]: %s\n", scanner.Text())
					conn.WriteMessage(websocket.TextMessage, []byte("📦 [Out]: "+scanner.Text()))
				}
			}()

			go func() {
				scanner := bufio.NewScanner(stderr)
				for scanner.Scan() {
					writeLog("ℹ️ [Log]: %s\n", scanner.Text())
					conn.WriteMessage(websocket.TextMessage, []byte("ℹ️ [Log]: "+scanner.Text()))
				}
			}()

			runCmd.Wait()
			writeLog("💤 SYSTEM: Execution layer wrapped cleanly.\n")
			conn.WriteMessage(websocket.TextMessage, []byte("💤 SYSTEM: Execution layer wrapped cleanly."))

			processMutex.Lock()
			delete(activeProcesses, req.Slug)
			processMutex.Unlock()
		}
	}
}

// ---------------------------------------------------------
// CUSTOM TERMINAL WIDGET
// ---------------------------------------------------------

type readOnlyEntry struct {
	widget.Entry
}

func newReadOnlyEntry() *readOnlyEntry {
	e := &readOnlyEntry{}
	e.MultiLine = true
	e.Wrapping = fyne.TextWrapWord
	e.ExtendBaseWidget(e)
	return e
}

func (e *readOnlyEntry) TypedRune(r rune) {}
func (e *readOnlyEntry) TypedKey(k *fyne.KeyEvent) {
	switch k.Name {
	case fyne.KeyUp, fyne.KeyDown, fyne.KeyLeft, fyne.KeyRight, fyne.KeyPageUp, fyne.KeyPageDown, fyne.KeyHome, fyne.KeyEnd:
		e.Entry.TypedKey(k)
	}
}

// ---------------------------------------------------------
// STANDARD ENTRY INTERFACE
// ---------------------------------------------------------

func startServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/check", handleCheck)
	mux.HandleFunc("/stop", handleStop)
	mux.HandleFunc("/delete", handleDelete)
	mux.HandleFunc("/ws", handleWebSocket)
	writeLog("📡 AI BAZAAR NATIVE ENGINE ONLINE (Port: 4500)\n")
	go http.ListenAndServe("127.0.0.1:4500", mux)
}

func main() {
	os.MkdirAll(filepath.Join(getBaseDir(), "core", "apps"), 0755)

	a := app.New()

	iconPath := filepath.Join(getBaseDir(), "icon.png")
	logoPath := filepath.Join(getBaseDir(), "logo.png")

	// 2. Load the icon securely
	var appIcon fyne.Resource
	if res, err := fyne.LoadResourceFromPath(iconPath); err == nil {
		appIcon = res
	} else if res, err := fyne.LoadResourceFromPath(logoPath); err == nil {
		appIcon = res
	}

	// 3. Apply to the global application
	if appIcon != nil {
		a.SetIcon(appIcon)
	}

	w := a.NewWindow("AI Bazaar Local Engine")
	w.Resize(fyne.NewSize(850, 600))
	w.SetFixedSize(true)

	if appIcon != nil {
		w.SetIcon(appIcon)
	}

	w.SetCloseIntercept(func() {
		processMutex.Lock()
		runningCount := len(activeProcesses)
		processMutex.Unlock()

		msg := "Are you sure you want to exit the AI Bazaar Engine?"
		if runningCount > 0 {
			msg += fmt.Sprintf("\n\nThis will forcefully stop %d running AI model(s).", runningCount)
		}

		dialog.ShowConfirm("Confirm Exit", msg, func(ok bool) {
			if ok {
				writeLog("🛑 Shutting down daemon...\n")
				processMutex.Lock()
				for _, cmd := range activeProcesses {
					stopProcessTree(cmd)
				}
				processMutex.Unlock()
				a.Quit()
			}
		}, w)
	})

	logBinding = binding.NewString()
	logBinding.Set("Welcome to the AI Bazaar Local Engine.\nReady to connect.\n")

	terminalUI := newReadOnlyEntry()
	terminalUI.Bind(logBinding)
	scrollContainer := container.NewScroll(terminalUI)

	btnClear := widget.NewButton("🧹 Clear Terminal", func() {
		logMutex.Lock()
		permanentLog = ""
		logMutex.Unlock()
		if logBinding != nil {
			logBinding.Set("")
		}
	})

	topBar := container.NewPadded(
		container.NewHBox(layout.NewSpacer(), btnClear),
	)
	terminalLayout := container.NewBorder(topBar, nil, nil, nil, scrollContainer)
	tabTerminal := container.NewTabItem("🖥️ Terminal", container.NewPadded(terminalLayout))

	var tabs *container.AppTabs
	appList := container.NewVBox()

	var updateApps func()
	updateApps = func() {
		appList.Objects = nil
		installedApps := getInstalledApps()

		if len(installedApps) == 0 {
			appList.Add(widget.NewLabel("No AI models installed locally."))
		} else {
			for _, slug := range installedApps {
				appSlug := slug

				processMutex.Lock()
				_, isRunning := activeProcesses[appSlug]
				processMutex.Unlock()

				var actionBtn *widget.Button
				var openBtn *widget.Button

				targetPort := "8899"
				configPath := filepath.Join(getAppFolderPath(appSlug), ".bazaar")
				if configData, err := os.ReadFile(configPath); err == nil {
					var config BazaarConfig
					if json.Unmarshal(configData, &config) == nil && config.Port != "" {
						targetPort = config.Port
					}
				}

				if isRunning {
					actionBtn = widget.NewButtonWithIcon("Stop", theme.MediaStopIcon(), func() {
						processMutex.Lock()
						if cmd, exists := activeProcesses[appSlug]; exists {
							stopProcessTree(cmd)
							delete(activeProcesses, appSlug)
							writeLog("🛑 [STOP]: Force terminated from UI: %s\n", appSlug)
						}
						processMutex.Unlock()
						updateApps()
					})

					openBtn = widget.NewButton("🌐 Open UI", func() {
						if u, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%s", targetPort)); err == nil {
							a.OpenURL(u)
						}
					})
				} else {
					actionBtn = widget.NewButtonWithIcon("Run Local", theme.MediaPlayIcon(), func() {
						err := startAppLocally(appSlug)
						if err != nil {
							dialog.ShowError(err, w)
						} else {
							tabs.Select(tabTerminal)
							updateApps()
						}
					})

					if _, err := os.Stat(configPath); os.IsNotExist(err) {
						actionBtn.Disable()
						actionBtn.SetText("Run (Web Only)")
					}
				}

				delBtn := widget.NewButtonWithIcon("Uninstall", theme.DeleteIcon(), func() {
					dialog.ShowConfirm("Uninstall App", "Are you sure you want to delete "+appSlug+"?", func(ok bool) {
						if ok {
							uninstallApp(appSlug)
							updateApps()
						}
					}, w)
				})

				var btnBox *fyne.Container
				if isRunning {
					btnBox = container.NewHBox(openBtn, actionBtn, delBtn)
				} else {
					btnBox = container.NewHBox(actionBtn, delBtn)
				}

				statusIcon := "📦"
				statusText := ""
				if isRunning {
					statusIcon = "🟢"
					statusText = fmt.Sprintf("  [Running on %s]", targetPort)
				}

				labelText := fmt.Sprintf("%s %s %s", statusIcon, appSlug, statusText)
				row := container.NewBorder(nil, nil, nil, btnBox, widget.NewLabel(labelText))
				appList.Add(row)
			}
		}
		appList.Refresh()
	}

	btnRefreshApps := widget.NewButton("↻ Refresh List", func() {
		updateApps()
	})

	tabApps := container.NewTabItem("📦 Apps",
		container.NewBorder(
			container.NewPadded(btnRefreshApps), nil, nil, nil,
			container.NewScroll(appList),
		),
	)

	var logoUI fyne.CanvasObject
	if _, err := os.Stat("logo.png"); err == nil {
		logoImg := canvas.NewImageFromFile("logo.png")
		logoImg.FillMode = canvas.ImageFillContain
		logoImg.SetMinSize(fyne.NewSize(120, 120))
		logoUI = container.NewCenter(container.NewPadded(logoImg))
	} else {
		logoUI = layout.NewSpacer()
	}

	lblTitle := canvas.NewText("🛍️ AI Bazaar Engine", theme.ForegroundColor())
	lblTitle.TextSize = 24
	lblTitle.TextStyle = fyne.TextStyle{Bold: true}
	lblTitle.Alignment = fyne.TextAlignCenter

	lblDesc := widget.NewLabelWithStyle(
		"The lightweight, container-free bridge daemon for securely executing AI models.\nPowered by Portable Pixi Runtimes.\nListening on Port 4500.",
		fyne.TextAlignCenter,
		fyne.TextStyle{},
	)
	lblDesc.Wrapping = fyne.TextWrapWord

	btnStore := widget.NewButtonWithIcon("Open AI Bazaar Store", theme.HomeIcon(), func() {
		if u, err := url.Parse("https://aibazaars.store"); err == nil {
			a.OpenURL(u)
		}
	})

	headerBox := container.NewVBox(
		logoUI,
		container.NewPadded(container.NewCenter(lblTitle)),
		container.NewPadded(lblDesc),
		container.NewPadded(btnStore),
		widget.NewSeparator(),
	)

	tabSettings := container.NewTabItem("⚙️ Settings", container.NewScroll(container.NewPadded(headerBox)))

	tabs = container.NewAppTabs(tabTerminal, tabApps, tabSettings)
	tabs.SetTabLocation(container.TabLocationTop)

	tabs.OnSelected = func(tab *container.TabItem) {
		if tab.Text == "📦 Apps" {
			updateApps()
		}
	}

	w.SetContent(tabs)

	startServer()
	w.ShowAndRun()
}
