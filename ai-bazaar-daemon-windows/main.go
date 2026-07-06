package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"image/color"
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
	"time"

	// Fyne imports (Aliased container to fyneContainer to avoid conflicts)
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	fyneContainer "fyne.io/fyne/v2/container"
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

const pbBaseURL = "https://api.aibazaars.store/"

//const pbBaseURL = "http://127.0.0.1:8080"

var pbClient = &http.Client{Timeout: 10 * time.Second}

type ClientRequest struct {
	Action       string `json:"action"`
	Slug         string `json:"slug"`
	AppName      string `json:"app_name"`
	AppIcon      string `json:"app_icon"`
	AppId        string `json:"app_id"`
	ImageLink    string `json:"image_link"`
	Port         string `json:"port"`
	InternalPort string `json:"internal_port"`
	IsGPU        bool   `json:"is_gpu"`
	IsFallback   bool   `json:"is_fallback"`
}

type BazaarConfig struct {
	AppName      string `json:"app_name"`
	AppIcon      string `json:"app_icon"`
	AppId        string `json:"app_id"`
	ImageLink    string `json:"image_link"`
	Port         string `json:"port"`
	InternalPort string `json:"internal_port"`
	IsGPU        bool   `json:"is_gpu"`
	IsFallback   bool   `json:"is_fallback"`
}

type EndpointRequest struct {
	Slug      string `json:"slug"`
	ImageLink string `json:"image_link"`
}

type PBResponse struct {
	Page       int     `json:"page"`
	TotalPages int     `json:"totalPages"`
	Items      []PBApp `json:"items"`
}

type PBApp struct {
	Id               string `json:"id"`
	Name             string `json:"Name"`
	Slug             string `json:"slug"`
	Icon             string `json:"icon"`
	ShortDescription string `json:"shortDescription"`
	Size             string `json:"size"`
}

var activeContainers = make(map[string]bool) // slug -> is running
var installingApps = make(map[string]bool)
var startingApps = make(map[string]bool)
var stoppingApps = make(map[string]bool)
var uninstallingApps = make(map[string]bool)
var processMutex sync.Mutex
var wsMutex sync.Mutex
var mainWindow fyne.Window

// UI Controller Hooks
var refreshInstalledApps func()
var refreshExploreApps func()
var switchToInstalledTab func()
var exploreLoaded = false

// ---------------------------------------------------------
// UTILITY AND DIRECTORY HANDLERS
// ---------------------------------------------------------

func sanitizeSlug(slug string) string {
	clean := filepath.Clean(slug)
	clean = strings.ReplaceAll(clean, "..", "")
	clean = strings.ReplaceAll(clean, "/", "")
	clean = strings.ReplaceAll(clean, "\\", "")
	return clean
}

func getBaseDir() string {
	ex, _ := os.Executable()
	baseDir := filepath.Dir(ex)
	if strings.Contains(filepath.ToSlash(baseDir), "go-build") || strings.Contains(filepath.ToSlash(baseDir), "Temp") {
		baseDir, _ = os.Getwd()
	}
	return baseDir
}

func getAppFolderPath(rawSlug string) string {
	slug := sanitizeSlug(rawSlug)
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

func detectGPUSupport() string {
	// Query GPU on Windows using wmic
	cmd := exec.Command("wmic", "path", "win32_VideoController", "get", "name")
	if output, err := cmd.Output(); err == nil {
		outputStr := strings.ToLower(string(output))
		if strings.Contains(outputStr, "nvidia") {
			writeLog("🔍 [GPU Detection]: NVIDIA GPU detected via wmic.\n")
			return "nvidia"
		}
		if strings.Contains(outputStr, "amd") || strings.Contains(outputStr, "radeon") {
			writeLog("🔍 [GPU Detection]: AMD GPU detected via wmic.\n")
			return "amd"
		}
		if strings.Contains(outputStr, "intel") || strings.Contains(outputStr, "arc") {
			writeLog("🔍 [GPU Detection]: Intel GPU detected via wmic.\n")
			return "intel"
		}
	}

	// Fallback to nvidia-smi checks
	if err := exec.Command("nvidia-smi").Run(); err == nil {
		writeLog("🔍 [GPU Detection]: NVIDIA GPU detected via nvidia-smi.\n")
		return "nvidia"
	}
	if err := exec.Command("nvidia-smi.exe").Run(); err == nil {
		writeLog("🔍 [GPU Detection]: NVIDIA GPU detected via nvidia-smi.exe.\n")
		return "nvidia"
	}

	// Check NVSMI default path
	nvsmiPath := "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe"
	if _, err := os.Stat(nvsmiPath); err == nil {
		if err := exec.Command(nvsmiPath).Run(); err == nil {
			writeLog("🔍 [GPU Detection]: NVIDIA GPU detected via NVSMI path.\n")
			return "nvidia"
		}
	}

	writeLog("🔍 [GPU Detection]: No compatible GPU found. Defaulting to CPU mode.\n")
	return "none"
}

func ensureEngineReady(w fyne.Window, onReady func(), onFailure func()) {
	go func() {
		_, err := exec.LookPath("wslc")
		if err != nil {
			cmd := exec.Command("wslc", "version")
			if err := cmd.Run(); err != nil {
				fyne.Do(func() {
					description := widget.NewLabel("WSL Containers (wslc) is not installed.\nAI Bazaar requires WSL Containers to securely run AI models.\n\nPlease ensure you have the latest WSL pre-release version installed.")
					
					dialog.ShowCustomConfirm("WSL Containers Required", "Install/Update WSL", "Quit App",
						description,
						func(install bool) {
							if install {
								u, _ := url.Parse("https://learn.microsoft.com/en-us/windows/wsl/install")
								fyne.CurrentApp().OpenURL(u)
							}
							if onFailure != nil {
								onFailure()
							}
							fyne.CurrentApp().Quit()
						}, w)
				})
				return
			}
		}

		writeLog("✅ WSL Containers (wslc) is ready.\n")
		if onReady != nil {
			onReady()
		}
	}()
}

func stopDockerContainer(slug string) {
	containerName := "aibazaar-" + slug
	writeLog("🛑 [STOP]: Stopping app %s...\n", slug)

	processMutex.Lock()
	stoppingApps[slug] = true
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
	processMutex.Unlock()

	// Stop container
	stopCmd := exec.Command("wslc", "stop", containerName)
	if err := stopCmd.Run(); err != nil {
		writeLog("⚠️ [STOP]: App %s might already be stopped: %v\n", slug, err)
	}

	// Remove container
	rmCmd := exec.Command("wslc", "rm", "-f", containerName)
	rmCmd.Run()

	processMutex.Lock()
	delete(activeContainers, slug)
	delete(stoppingApps, slug)
	processMutex.Unlock()

	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
}

// ---------------------------------------------------------
// LOGGING & STREAMING
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

func updateDockerPullLog(id string, status string, progressInfo string) {
	logMutex.Lock()
	defer logMutex.Unlock()

	newLine := ""
	if id != "" {
		newLine = fmt.Sprintf("🐳 [Docker Pull]: %s: %s%s\n", id, status, progressInfo)
	} else {
		newLine = fmt.Sprintf("🐳 [Docker Pull]: %s%s\n", status, progressInfo)
	}

	// Print to stdout
	fmt.Print(newLine)

	// If no ID is provided, just append to permanentLog
	if id == "" {
		permanentLog += newLine
		if len(permanentLog) > 50000 {
			permanentLog = permanentLog[len(permanentLog)-50000:]
		}
		if logBinding != nil {
			logBinding.Set(permanentLog)
		}
		return
	}

	prefix := fmt.Sprintf("🐳 [Docker Pull]: %s:", id)
	lines := strings.Split(permanentLog, "\n")
	found := false

	for i := len(lines) - 1; i >= 0; i-- {
		if strings.HasPrefix(lines[i], prefix) {
			lines[i] = strings.TrimSuffix(newLine, "\n") // Replace the line
			found = true
			break
		}
	}

	if found {
		permanentLog = strings.Join(lines, "\n")
	} else {
		permanentLog += newLine
	}

	if len(permanentLog) > 50000 {
		permanentLog = permanentLog[len(permanentLog)-50000:]
	}
	if logBinding != nil {
		logBinding.Set(permanentLog)
	}
}

func writeWS(conn *websocket.Conn, msg string) {
	if conn != nil {
		wsMutex.Lock()
		conn.WriteMessage(websocket.TextMessage, []byte(msg))
		wsMutex.Unlock()
	}
}

// UILogWriter redirects standard output streams to our UI log system
type UILogWriter struct {
	Prefix string
	Conn   *websocket.Conn
}

func (w *UILogWriter) Write(p []byte) (n int, err error) {
	lines := strings.Split(string(p), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if len(trimmed) > 0 {
			writeLog("%s %s\n", w.Prefix, trimmed)
			writeWS(w.Conn, w.Prefix+" "+trimmed)
		}
	}
	return len(p), nil
}

// ---------------------------------------------------------
// CORE INSTALLATION & EXECUTION ENGINE (SDK INTEGRATED)
// ---------------------------------------------------------

func executeRunAction(req ClientRequest, conn *websocket.Conn) {
	safeSlug := sanitizeSlug(req.Slug)
	appFolder := getAppFolderPath(safeSlug)
	containerName := "aibazaar-" + safeSlug

	processMutex.Lock()
	isRunning := activeContainers[safeSlug]
	installingApps[safeSlug] = true
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
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
		writeLog("⚡ Application %s is already running.\n", safeSlug)
		writeWS(conn, fmt.Sprintf("🚀 ONLINE: App is already running at http://127.0.0.1:%s", targetPort))

		processMutex.Lock()
		delete(installingApps, safeSlug)
		if refreshInstalledApps != nil {
			fyne.Do(func() { refreshInstalledApps() })
		}
		processMutex.Unlock()
		return
	}

	targetPort := req.Port
	if targetPort == "" {
		targetPort = "8899"
	}
	targetPort = getAvailablePort(targetPort)

	configData := BazaarConfig{
		AppName:      req.AppName,
		AppIcon:      req.AppIcon,
		AppId:        req.AppId,
		ImageLink:    req.ImageLink,
		Port:         targetPort,
		InternalPort: req.InternalPort,
		IsGPU:        req.IsGPU,
		IsFallback:   req.IsFallback,
	}
	configBytes, _ := json.Marshal(configData)
	os.MkdirAll(appFolder, 0755)
	os.WriteFile(filepath.Join(appFolder, ".bazaar"), configBytes, 0644)

	// Cache App Icon
	if req.AppIcon != "" && req.AppId != "" {
		iconURL := fmt.Sprintf("%s/api/files/apps/%s/%s?thumb=100x100", pbBaseURL, req.AppId, req.AppIcon)
		resp, err := pbClient.Get(iconURL)
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			out, _ := os.Create(filepath.Join(appFolder, req.AppIcon))
			io.Copy(out, resp.Body)
			out.Close()
		}
	}

	// ==========================================
	// PULL WSL CONTAINER IMAGE
	// ==========================================
	writeLog("📥 Initiating WSL Container Image Pull for %s...\n", req.ImageLink)
	writeWS(conn, "📥 SYSTEM: Pulling WSL Container Image... (This might take a few minutes)")

	pullCmd := exec.Command("wslc", "pull", req.ImageLink)
	pullStdout, pullErr := pullCmd.StdoutPipe()
	if pullErr == nil {
		pullCmd.Stderr = pullCmd.Stdout
		if err := pullCmd.Start(); err == nil {
			scanner := bufio.NewScanner(pullStdout)
			for scanner.Scan() {
				line := scanner.Text()
				updateDockerPullLog("", line, "")
				writeWS(conn, "🐳 [WSLC Pull]: "+line)
			}
			pullCmd.Wait()
		} else {
			writeLog("❌ ERROR: Failed to start image pull: %v\n", err)
			writeWS(conn, "❌ ERROR: Failed to start image pull.")
		}
	} else {
		writeLog("❌ ERROR: Failed to create stdout pipe: %v\n", pullErr)
		writeWS(conn, "❌ ERROR: Failed to pull image.")
	}

	processMutex.Lock()
	delete(installingApps, safeSlug)
	processMutex.Unlock()
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}

	// ==========================================
	// RUN WSL CONTAINER
	// ==========================================
	writeLog("⚡ Launching App...\n")
	writeWS(conn, "⚡ SYSTEM: Launching App...")

	// Remove previous container if it exists
	exec.Command("wslc", "rm", "-f", containerName).Run()

	internalPort := req.InternalPort
	if internalPort == "" {
		internalPort = targetPort
	}

	gpuType := "none"
	if req.IsGPU {
		gpuType = detectGPUSupport()
	}

	runContainer := func(useGPU bool) bool {
		args := []string{"run", "-d", "--name", containerName, "-p", "127.0.0.1:" + targetPort + ":" + internalPort, "-e", "PORT=" + internalPort}
		if useGPU {
			args = append(args, "--gpus", "all")
		}
		args = append(args, req.ImageLink)

		runCmd := exec.Command("wslc", args...)
		if err := runCmd.Run(); err != nil {
			return false
		}
		return true
	}

	launched := false
	if req.IsGPU && gpuType != "none" {
		writeLog("🔌 [GPU]: Attempting to launch in GPU mode (%s)...\n", gpuType)
		writeWS(conn, fmt.Sprintf("🔌 SYSTEM: Attempting to launch in GPU mode (%s)...", gpuType))
		if runContainer(true) {
			launched = true
		} else {
			writeLog("⚠️ [GPU]: Failed to launch container in GPU mode.\n")
			writeWS(conn, "⚠️ SYSTEM: Failed to launch container in GPU mode.")
			exec.Command("wslc", "rm", "-f", containerName).Run()
		}
	}

	if !launched {
		if req.IsGPU && !req.IsFallback {
			writeLog("❌ ERROR: GPU mode failed, and CPU fallback is disabled.\n")
			writeWS(conn, "❌ ERROR: GPU mode failed, and CPU fallback is disabled.")
			return
		}

		if req.IsGPU {
			writeLog("⚠️ [GPU]: Falling back to CPU mode...\n")
			writeWS(conn, "⚠️ SYSTEM: Falling back to CPU mode...")
		} else {
			writeLog("ℹ️ Launching in CPU mode...\n")
			writeWS(conn, "ℹ️ SYSTEM: Launching in CPU mode...")
		}

		if !runContainer(false) {
			writeLog("❌ ERROR: Failed to start App in CPU mode.\n")
			writeWS(conn, "❌ ERROR: Failed to start App in CPU mode.")
			return
		}
	}

	processMutex.Lock()
	activeContainers[safeSlug] = true
	processMutex.Unlock()
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}

	writeLog("🚀 ONLINE: Interface bound on port %s.\n", targetPort)
	writeWS(conn, fmt.Sprintf("🚀 ONLINE: Interface bound on http://127.0.0.1:%s", targetPort))

	// Stream Logs back to UI
	logCmd := exec.Command("wslc", "logs", "-f", containerName)
	logStdout, logErr := logCmd.StdoutPipe()
	if logErr == nil {
		logCmd.Stderr = logCmd.Stdout
		if err := logCmd.Start(); err == nil {
			go func() {
				defer logStdout.Close()
				scanner := bufio.NewScanner(logStdout)
				for scanner.Scan() {
					line := scanner.Text()
					writeLog("📦 [Out]: %s\n", line)
					writeWS(conn, "📦 [Out]: "+line)
				}
				logCmd.Wait()
			}()
		}
	}

	// Wait for container to exit using wslc wait
	waitCmd := exec.Command("wslc", "wait", containerName)
	if err := waitCmd.Run(); err != nil {
		writeLog("⚠️ SYSTEM: App exited: %v\n", err)
	} else {
		writeLog("💤 SYSTEM: App stopped cleanly.\n")
		writeWS(conn, "💤 SYSTEM: App stopped cleanly.")
	}

	processMutex.Lock()
	delete(activeContainers, safeSlug)
	processMutex.Unlock()

	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
}

// ---------------------------------------------------------
// LOCAL APP LAUNCHER (Standalone)
// ---------------------------------------------------------

func startAppLocally(rawSlug string) error {
	slug := sanitizeSlug(rawSlug)
	containerName := "aibazaar-" + slug

	processMutex.Lock()
	isRunning := activeContainers[slug]
	processMutex.Unlock()

	if isRunning {
		return fmt.Errorf("app is already running")
	}

	appFolder := getAppFolderPath(slug)
	configPath := filepath.Join(appFolder, ".bazaar")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("app configuration missing")
	}

	var config BazaarConfig
	if err := json.Unmarshal(configData, &config); err != nil || config.ImageLink == "" {
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

	// Remove previous container
	exec.Command("wslc", "rm", "-f", containerName).Run()

	internalPort := config.InternalPort
	if internalPort == "" {
		internalPort = targetPort
	}

	gpuType := "none"
	if config.IsGPU {
		gpuType = detectGPUSupport()
	}

	runContainer := func(useGPU bool) bool {
		args := []string{"run", "-d", "--name", containerName, "-p", "127.0.0.1:" + targetPort + ":" + internalPort, "-e", "PORT=" + internalPort}
		if useGPU {
			args = append(args, "--gpus", "all")
		}
		args = append(args, config.ImageLink)

		runCmd := exec.Command("wslc", args...)
		if err := runCmd.Run(); err != nil {
			return false
		}
		return true
	}

	launched := false
	if config.IsGPU && gpuType != "none" {
		writeLog("🔌 [GPU]: [LOCAL] Attempting to launch in GPU mode (%s)...\n", gpuType)
		if runContainer(true) {
			launched = true
		} else {
			writeLog("⚠️ [GPU]: [LOCAL] Failed to launch container in GPU mode.\n")
			exec.Command("wslc", "rm", "-f", containerName).Run()
		}
	}

	if !launched {
		if config.IsGPU && !config.IsFallback {
			return fmt.Errorf("GPU mode failed, and CPU fallback is disabled")
		}

		if config.IsGPU {
			writeLog("⚠️ [GPU]: [LOCAL] Falling back to CPU mode...\n")
		} else {
			writeLog("ℹ️ [LOCAL] Launching in CPU mode...\n")
		}

		if !runContainer(false) {
			return fmt.Errorf("failed to start App in CPU mode")
		}
	}

	processMutex.Lock()
	activeContainers[slug] = true
	processMutex.Unlock()

	writeLog("🚀 ONLINE: http://127.0.0.1:%s\n", targetPort)

	// Stream Logs
	logCmd := exec.Command("wslc", "logs", "-f", containerName)
	logStdout, logErr := logCmd.StdoutPipe()
	if logErr == nil {
		logCmd.Stderr = logCmd.Stdout
		if err := logCmd.Start(); err == nil {
			go func() {
				defer logStdout.Close()
				outWriter := &UILogWriter{Prefix: fmt.Sprintf("🐳 [%s]:", slug)}
				scanner := bufio.NewScanner(logStdout)
				for scanner.Scan() {
					line := scanner.Text()
					outWriter.Write([]byte(line + "\n"))
				}
				logCmd.Wait()
			}()
		}
	}

	go func() {
		waitCmd := exec.Command("wslc", "wait", containerName)
		waitCmd.Run()
		writeLog("💤 [%s]: Process finished.\n", slug)

		processMutex.Lock()
		delete(activeContainers, slug)
		processMutex.Unlock()
		if refreshInstalledApps != nil {
			fyne.Do(func() { refreshInstalledApps() })
		}
	}()

	return nil
}

func uninstallApp(rawSlug string) {
	slug := sanitizeSlug(rawSlug)

	processMutex.Lock()
	uninstallingApps[slug] = true
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
	processMutex.Unlock()

	// 1. Stop container cleanly first
	stopDockerContainer(slug)

	targetDir := getAppFolderPath(slug)
	configPath := filepath.Join(targetDir, ".bazaar")

	// 2. Remove Image
	if configData, err := os.ReadFile(configPath); err == nil {
		var config BazaarConfig
		if json.Unmarshal(configData, &config) == nil && config.ImageLink != "" {
			writeLog("🗑️ Removing WSL Container Image: %s...\n", config.ImageLink)
			rmiCmd := exec.Command("wslc", "rmi", "-f", config.ImageLink)
			if err := rmiCmd.Run(); err != nil {
				writeLog("⚠️ Could not remove image (it may be in use): %v\n", err)
			}
		}
	}

	// 3. Clear local files
	os.RemoveAll(targetDir)
	writeLog("🗑️ [DELETE]: Uninstalled %s from local storage.\n", slug)

	processMutex.Lock()
	delete(uninstallingApps, slug)
	processMutex.Unlock()

	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
	if refreshExploreApps != nil {
		fyne.Do(func() { refreshExploreApps() })
	}
}

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

	processMutex.Lock()
	for slug := range installingApps {
		found := false
		for _, a := range apps {
			if a == slug {
				found = true
				break
			}
		}
		if !found {
			apps = append(apps, slug)
		}
	}
	processMutex.Unlock()

	return apps
}

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
	_, err := os.Stat(filepath.Join(targetDir, ".bazaar"))
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

	// Run stop logic in background so API responds instantly
	go stopDockerContainer(req.Slug)

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

	// Threaded uninstallation
	go uninstallApp(req.Slug)

	w.WriteHeader(http.StatusOK)
}

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
			fyne.Do(func() {
				ensureEngineReady(mainWindow, func() {
					go executeRunAction(req, conn)
				}, nil)
			})
		}
	}
}

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
// POCKETBASE DATA PARSING & FETCHING
// ---------------------------------------------------------

func fetchExploreApps(page int, query string, excludeSlugs []string) (*PBResponse, error) {
	osName := "Linux"
	if runtime.GOOS == "windows" {
		osName = "Windows"
	} else if runtime.GOOS == "darwin" {
		osName = "Mac OS"
	}

	filter := fmt.Sprintf("(platforms ~ '%s' && execution_type = 'daemon_uv')", osName)

	for _, slug := range excludeSlugs {
		filter += fmt.Sprintf(" && slug != '%s'", sanitizeSlug(slug))
	}

	if query != "" {
		filter += fmt.Sprintf(" && (Name ~ '%s' || shortDescription ~ '%s')", query, query)
	}

	reqURL := fmt.Sprintf("%s/api/collections/apps/records?page=%d&perPage=10&sort=-created&filter=%s", pbBaseURL, page, url.QueryEscape(filter))

	resp, err := pbClient.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to connect to database")
	}

	var pbResp PBResponse
	if err := json.NewDecoder(resp.Body).Decode(&pbResp); err != nil {
		return nil, err
	}
	return &pbResp, nil
}

func fetchFullAppRecord(appId string) (*ClientRequest, error) {
	reqURL := fmt.Sprintf("%s/api/collections/apps/records/%s", pbBaseURL, appId)
	resp, err := pbClient.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	req := &ClientRequest{
		Action: "RUN",
		Port:   "8899",
	}

	if v, ok := raw["slug"].(string); ok {
		req.Slug = v
	}
	if v, ok := raw["Name"].(string); ok {
		req.AppName = v
	}
	if v, ok := raw["icon"].(string); ok {
		req.AppIcon = v
	}
	if v, ok := raw["id"].(string); ok {
		req.AppId = v
	}

	var targetMap map[string]interface{}
	dlRaw, hasSnake := raw["download_links"]
	dlRawCamel, hasCamel := raw["downloadLinks"]
	var dl interface{}
	if hasSnake && dlRaw != nil {
		dl = dlRaw
	} else if hasCamel && dlRawCamel != nil {
		dl = dlRawCamel
	}

	if dl != nil {
		if dlMap, ok := dl.(map[string]interface{}); ok {
			targetMap = dlMap
		} else if dlStr, ok := dl.(string); ok {
			var parsedMap map[string]interface{}
			if err := json.Unmarshal([]byte(dlStr), &parsedMap); err == nil {
				targetMap = parsedMap
			}
		}
	}

	if targetMap == nil {
		targetMap = raw
	}

	if v, ok := targetMap["image_link"].(string); ok {
		req.ImageLink = v
	}

	var internalPort string
	if v, ok := raw["internal_port"].(string); ok {
		internalPort = v
	} else if v, ok := raw["internalPort"].(string); ok {
		internalPort = v
	} else if v, ok := raw["internal_port"].(float64); ok {
		internalPort = fmt.Sprintf("%.0f", v)
	} else if v, ok := raw["internalPort"].(float64); ok {
		internalPort = fmt.Sprintf("%.0f", v)
	}

	if internalPort == "" && targetMap != nil {
		if v, ok := targetMap["internal_port"].(string); ok {
			internalPort = v
		} else if v, ok := targetMap["internalPort"].(string); ok {
			internalPort = v
		} else if v, ok := targetMap["internal_port"].(float64); ok {
			internalPort = fmt.Sprintf("%.0f", v)
		} else if v, ok := targetMap["internalPort"].(float64); ok {
			internalPort = fmt.Sprintf("%.0f", v)
		}
	}
	req.InternalPort = internalPort

	return req, nil
}

func fetchIcon(appId, iconName string) fyne.Resource {
	if iconName == "" {
		return theme.QuestionIcon()
	}
	imgURL := fmt.Sprintf("%s/api/files/apps/%s/%s?thumb=100x100", pbBaseURL, appId, iconName)
	resp, err := pbClient.Get(imgURL)
	if err != nil || resp.StatusCode != 200 {
		return theme.WarningIcon()
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return fyne.NewStaticResource(iconName, b)
}

func startServer() bool {
	ln, err := net.Listen("tcp", "127.0.0.1:4500")
	if err != nil {
		return false
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/check", handleCheck)
	mux.HandleFunc("/stop", handleStop)
	mux.HandleFunc("/delete", handleDelete)
	mux.HandleFunc("/ws", handleWebSocket)
	writeLog("📡 AI BAZAAR ENGINE ONLINE (Port: 4500)\n")

	s := &http.Server{Handler: mux}
	go s.Serve(ln)
	return true
}

func main() {
	os.MkdirAll(filepath.Join(getBaseDir(), "core", "apps"), 0755)

	a := app.New()

	iconPath := filepath.Join(getBaseDir(), "icon.png")
	logoPath := filepath.Join(getBaseDir(), "logo.png")

	var appIcon fyne.Resource
	if res, err := fyne.LoadResourceFromPath(iconPath); err == nil {
		appIcon = res
	} else if res, err := fyne.LoadResourceFromPath(logoPath); err == nil {
		appIcon = res
	}

	if appIcon != nil {
		a.SetIcon(appIcon)
	}

	mainWindow = a.NewWindow("AI Bazaar Local Engine")
	mainWindow.Resize(fyne.NewSize(850, 600))
	mainWindow.SetFixedSize(true)

	if appIcon != nil {
		mainWindow.SetIcon(appIcon)
	}

	mainWindow.SetCloseIntercept(func() {
		processMutex.Lock()
		runningCount := len(activeContainers)
		installingCount := len(installingApps)
		startingCount := len(startingApps)
		stoppingCount := len(stoppingApps)
		uninstallingCount := len(uninstallingApps)
		processMutex.Unlock()

		if runningCount > 0 || installingCount > 0 || startingCount > 0 || stoppingCount > 0 || uninstallingCount > 0 {
			var reasons []string
			if runningCount > 0 {
				reasons = append(reasons, fmt.Sprintf("%d AI model(s) running", runningCount))
			}
			if installingCount > 0 {
				reasons = append(reasons, fmt.Sprintf("%d app(s) installing", installingCount))
			}
			if startingCount > 0 {
				reasons = append(reasons, fmt.Sprintf("%d app(s) starting", startingCount))
			}
			if stoppingCount > 0 {
				reasons = append(reasons, fmt.Sprintf("%d app(s) stopping", stoppingCount))
			}
			if uninstallingCount > 0 {
				reasons = append(reasons, fmt.Sprintf("%d app(s) uninstalling", uninstallingCount))
			}

			dialog.ShowInformation(
				"Operation in Progress",
				fmt.Sprintf("AI Bazaar cannot close yet because:\n\n- %s\n\nPlease wait for all tasks to complete or stop all active apps in the 'Installed Apps' tab before closing.", strings.Join(reasons, "\n- ")),
				mainWindow,
			)
			return // Abort the close action
		}

		// Zero apps running/installing/starting/stopping/uninstalling. Clean exit!
		writeLog("🛑 Shutting down daemon...\n")
		a.Quit()
	})

	logBinding = binding.NewString()
	logBinding.Set("Welcome to the AI Bazaar Engine.\nReady to connect.\n")

	// ==========================================
	// 1. LOGS TAB
	// ==========================================
	terminalUI := newReadOnlyEntry()
	terminalUI.Bind(logBinding)
	scrollContainer := fyneContainer.NewScroll(terminalUI)

	btnClear := widget.NewButton("🧹 Clear Logs", func() {
		logMutex.Lock()
		permanentLog = ""
		logMutex.Unlock()
		if logBinding != nil {
			logBinding.Set("")
		}
	})

	topBar := fyneContainer.NewPadded(
		fyneContainer.NewHBox(layout.NewSpacer(), btnClear),
	)
	terminalLayout := fyneContainer.NewBorder(topBar, nil, nil, nil, scrollContainer)
	tabTerminal := fyneContainer.NewTabItem("📋 Logs", fyneContainer.NewPadded(terminalLayout))

	// ==========================================
	// 2. EXPLORE TAB
	// ==========================================
	var loadExploreData func()
	currentPage := 1
	currentQuery := ""

	exploreContent := fyneContainer.NewVBox()
	exploreScroll := fyneContainer.NewScroll(exploreContent)

	searchInput := widget.NewEntry()
	searchInput.PlaceHolder = "Search AI apps... (Press Enter to search)"

	searchInput.OnSubmitted = func(s string) {
		currentQuery = s
		currentPage = 1
		loadExploreData()
	}

	searchBtn := widget.NewButtonWithIcon("", theme.SearchIcon(), func() {
		currentQuery = searchInput.Text
		currentPage = 1
		loadExploreData()
	})

	btnRefreshExplore := widget.NewButtonWithIcon("", theme.ViewRefreshIcon(), func() {
		currentPage = 1
		loadExploreData()
	})

	lblPage := widget.NewLabel("Page 1")
	btnPrev := widget.NewButtonWithIcon("", theme.NavigateBackIcon(), func() {
		if currentPage > 1 {
			currentPage--
			loadExploreData()
		}
	})
	btnNext := widget.NewButtonWithIcon("", theme.NavigateNextIcon(), func() {
		currentPage++
		loadExploreData()
	})

	loadExploreData = func() {
		exploreContent.Objects = []fyne.CanvasObject{fyneContainer.NewCenter(widget.NewLabel("Connecting to AI Bazaar..."))}
		exploreContent.Refresh()

		go func(page int, query string) {
			installedSlugs := getInstalledApps()
			res, err := fetchExploreApps(page, query, installedSlugs)

			var newObjects []fyne.CanvasObject

			if err != nil {
				errLbl := widget.NewLabel("❌ Cannot connect to AI Bazaar servers.")
				retryBtn := widget.NewButtonWithIcon("Try Again", theme.ViewRefreshIcon(), func() {
					loadExploreData()
				})
				newObjects = []fyne.CanvasObject{fyneContainer.NewVBox(errLbl, retryBtn)}
			} else if len(res.Items) == 0 {
				newObjects = []fyne.CanvasObject{widget.NewLabel("No compatible apps found for your operating system.")}
			} else {
				for _, item := range res.Items {
					img := canvas.NewImageFromResource(theme.QuestionIcon())
					img.FillMode = canvas.ImageFillContain
					img.SetMinSize(fyne.NewSize(64, 64))

					go func(appId, iconName string, targetImg *canvas.Image) {
						iconRes := fetchIcon(appId, iconName)
						fyne.Do(func() {
							targetImg.Resource = iconRes
							targetImg.Refresh()
						})
					}(item.Id, item.Icon, img)

					nameLbl := canvas.NewText(item.Name, theme.ForegroundColor())
					nameLbl.TextStyle.Bold = true
					nameLbl.TextSize = 16

					appSize := item.Size
					if appSize == "" {
						appSize = "Varies"
					}
					sizeLbl := canvas.NewText(appSize, color.RGBA{150, 150, 150, 255})
					sizeLbl.TextSize = 12

					shortDesc := item.ShortDescription
					runes := []rune(shortDesc)
					if len(runes) > 75 {
						shortDesc = string(runes[:72]) + "..."
					}
					descLbl := widget.NewLabel(shortDesc)
					descLbl.Wrapping = fyne.TextTruncate

					titleBox := fyneContainer.NewBorder(nil, nil, nameLbl, sizeLbl, layout.NewSpacer())
					textCol := fyneContainer.NewVBox(titleBox, descLbl)

					appId := item.Id
					appSlug := item.Slug
					appName := item.Name
					appIcon := item.Icon

					installBtn := widget.NewButton("Install", func() {
						ensureEngineReady(mainWindow, func() {
							if switchToInstalledTab != nil {
								switchToInstalledTab()
							}

							processMutex.Lock()
							installingApps[appSlug] = true
							processMutex.Unlock()

							if refreshInstalledApps != nil {
								fyne.Do(func() { refreshInstalledApps() })
							}
							if refreshExploreApps != nil {
								fyne.Do(func() { refreshExploreApps() })
							}

							go func(id, slug, name, icon string) {
								req, err := fetchFullAppRecord(id)

								if err != nil || req == nil || req.ImageLink == "" {
									writeLog("❌ ERROR: Failed to fetch app Docker Image from PocketBase.\n")
									processMutex.Lock()
									delete(installingApps, slug)
									processMutex.Unlock()
									if refreshInstalledApps != nil {
										fyne.Do(func() { refreshInstalledApps() })
									}
									return
								}

								req.AppName = name
								req.AppIcon = icon
								req.AppId = id
								req.Slug = slug

								executeRunAction(*req, nil)
							}(appId, appSlug, appName, appIcon)
						}, nil)
					})

					card := fyneContainer.NewBorder(nil, nil, fyneContainer.NewPadded(img), fyneContainer.NewPadded(installBtn), textCol)
					newObjects = append(newObjects, fyneContainer.NewPadded(card), widget.NewSeparator())
				}
				fyne.Do(func() {
					lblPage.SetText(fmt.Sprintf("Page %d of %d", res.Page, res.TotalPages))
				})
			}

			fyne.Do(func() {
				exploreContent.Objects = newObjects
				exploreContent.Refresh()
				exploreScroll.ScrollToTop()
			})

		}(currentPage, currentQuery)
	}

	refreshExploreApps = loadExploreData

	searchTools := fyneContainer.NewHBox(searchBtn, btnRefreshExplore)
	searchBox := fyneContainer.NewBorder(nil, nil, nil, searchTools, searchInput)

	paginationBox := fyneContainer.NewHBox(layout.NewSpacer(), btnPrev, lblPage, btnNext, layout.NewSpacer())
	exploreLayout := fyneContainer.NewBorder(searchBox, paginationBox, nil, nil, exploreScroll)
	tabExplore := fyneContainer.NewTabItem("🌐 Explore", fyneContainer.NewPadded(exploreLayout))

	// ==========================================
	// 3. INSTALLED APPS TAB
	// ==========================================
	var tabs *fyneContainer.AppTabs
	appList := fyneContainer.NewVBox()

	updateApps := func() {
		appList.Objects = nil
		installedApps := getInstalledApps()

		if len(installedApps) == 0 {
			appList.Add(widget.NewLabel("No AI models installed locally."))
		} else {
			for _, slug := range installedApps {
				appSlug := sanitizeSlug(slug)

				processMutex.Lock()
				isRunning := activeContainers[appSlug]
				isInstalling := installingApps[appSlug]
				isStarting := startingApps[appSlug]
				isStopping := stoppingApps[appSlug]
				isUninstalling := uninstallingApps[appSlug]
				processMutex.Unlock()

				var actionBtn *widget.Button
				var openBtn *widget.Button

				targetPort := "8899"
				displayName := strings.ReplaceAll(appSlug, "-", " ")
				iconName := ""
				appId := ""

				configPath := filepath.Join(getAppFolderPath(appSlug), ".bazaar")
				if configData, err := os.ReadFile(configPath); err == nil {
					var config BazaarConfig
					if json.Unmarshal(configData, &config) == nil {
						if config.Port != "" {
							targetPort = config.Port
						}
						if config.AppName != "" {
							displayName = config.AppName
						}
						iconName = config.AppIcon
						appId = config.AppId
					}
				}

				img := canvas.NewImageFromResource(theme.GridIcon())
				img.FillMode = canvas.ImageFillContain
				img.SetMinSize(fyne.NewSize(48, 48))

				if iconName != "" {
					localIconPath := filepath.Join(getAppFolderPath(appSlug), iconName)
					if _, err := os.Stat(localIconPath); err == nil {
						img = canvas.NewImageFromFile(localIconPath)
						img.FillMode = canvas.ImageFillContain
						img.SetMinSize(fyne.NewSize(48, 48))
					} else if appId != "" {
						go func(aid, iname, path string, targetImg *canvas.Image) {
							iconRes := fetchIcon(aid, iname)
							fyne.Do(func() {
								targetImg.Resource = iconRes
								targetImg.Refresh()
							})
							os.WriteFile(path, iconRes.Content(), 0644)
						}(appId, iconName, localIconPath, img)
					}
				}

				nameLbl := canvas.NewText(displayName, theme.ForegroundColor())
				nameLbl.TextStyle.Bold = true
				nameLbl.TextSize = 16

				statusText := "Offline"
				statusColor := color.RGBA{150, 150, 150, 255}

				if isInstalling {
					statusText = "Downloading app... (Check Logs)"
					statusColor = color.RGBA{56, 189, 248, 255}
				} else if isStarting {
					statusText = "Starting app..."
					statusColor = color.RGBA{56, 189, 248, 255}
				} else if isStopping {
					statusText = "Stopping app..."
					statusColor = color.RGBA{239, 68, 68, 255}
				} else if isUninstalling {
					statusText = "Uninstalling app..."
					statusColor = color.RGBA{239, 68, 68, 255}
				} else if isRunning {
					statusText = fmt.Sprintf("Running (Port %s)", targetPort)
					statusColor = color.RGBA{16, 185, 129, 255}
				}

				statusLbl := canvas.NewText(statusText, statusColor)
				statusLbl.TextSize = 12

				textCol := fyneContainer.NewVBox(nameLbl, statusLbl)

				var workingText string
				if isInstalling {
					workingText = "Installing..."
				} else if isStarting {
					workingText = "Starting..."
				} else if isStopping {
					workingText = "Stopping..."
				} else if isUninstalling {
					workingText = "Uninstalling..."
				}

				if isInstalling || isStarting || isStopping || isUninstalling {
					actionBtn = widget.NewButton(workingText, func() {})
					actionBtn.Disable()
				} else if isRunning {
					actionBtn = widget.NewButtonWithIcon("Stop", theme.MediaStopIcon(), func() {
						// Run in Goroutine to prevent UI lock
						go stopDockerContainer(appSlug)
					})

					openBtn = widget.NewButton("🌐 Open UI", func() {
						if u, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%s", targetPort)); err == nil {
							a.OpenURL(u)
						}
					})
				} else {
					actionBtn = widget.NewButtonWithIcon("Start App", theme.MediaPlayIcon(), func() {
						processMutex.Lock()
						startingApps[appSlug] = true
						processMutex.Unlock()
						if refreshInstalledApps != nil {
							refreshInstalledApps()
						}

						ensureEngineReady(mainWindow, func() {
							err := startAppLocally(appSlug)
							processMutex.Lock()
							delete(startingApps, appSlug)
							processMutex.Unlock()

							fyne.Do(func() {
								if err != nil {
									dialog.ShowError(err, mainWindow)
								}
								refreshInstalledApps()
							})
						}, func() {
							processMutex.Lock()
							delete(startingApps, appSlug)
							processMutex.Unlock()
							fyne.Do(func() {
								refreshInstalledApps()
							})
						})
					})

					if _, err := os.Stat(configPath); os.IsNotExist(err) {
						actionBtn.Disable()
						actionBtn.SetText("Run (Web Only)")
					}
				}

				var btnBox *fyne.Container

				if isInstalling || isStarting || isStopping || isUninstalling {
					progress := widget.NewProgressBarInfinite()
					progressContainer := fyneContainer.NewGridWrap(fyne.NewSize(100, 36), progress)
					btnBox = fyneContainer.NewHBox(actionBtn, progressContainer)
				} else {
					delBtn := widget.NewButtonWithIcon("Uninstall", theme.DeleteIcon(), func() {
						dialog.ShowConfirm("Uninstall App", "Are you sure you want to delete "+displayName+"?\nThis will remove the app files and clear storage space.", func(ok bool) {
							if ok {
								// Run in Goroutine to prevent UI lock
								go uninstallApp(appSlug)
							}
						}, mainWindow)
					})

					if isRunning {
						btnBox = fyneContainer.NewHBox(openBtn, actionBtn, delBtn)
					} else {
						btnBox = fyneContainer.NewHBox(actionBtn, delBtn)
					}
				}

				card := fyneContainer.NewBorder(nil, nil, fyneContainer.NewPadded(img), fyneContainer.NewPadded(btnBox), fyneContainer.NewPadded(textCol))
				appList.Add(fyneContainer.NewPadded(card))
				appList.Add(widget.NewSeparator())
			}
		}
		appList.Refresh()
	}

	refreshInstalledApps = updateApps

	btnRefreshApps := widget.NewButton("↻ Refresh List", func() {
		updateApps()
	})

	tabApps := fyneContainer.NewTabItem("📦 Installed Apps",
		fyneContainer.NewBorder(
			fyneContainer.NewPadded(btnRefreshApps), nil, nil, nil,
			fyneContainer.NewScroll(appList),
		),
	)

	// ==========================================
	// 4. SETTINGS TAB
	// ==========================================
	var logoUI fyne.CanvasObject
	if _, err := os.Stat("logo.png"); err == nil {
		logoImg := canvas.NewImageFromFile("logo.png")
		logoImg.FillMode = canvas.ImageFillContain
		logoImg.SetMinSize(fyne.NewSize(120, 120))
		logoUI = fyneContainer.NewCenter(fyneContainer.NewPadded(logoImg))
	} else {
		logoUI = layout.NewSpacer()
	}

	lblTitle := canvas.NewText("🛍️ AI Bazaar Engine", theme.ForegroundColor())
	lblTitle.TextSize = 24
	lblTitle.TextStyle = fyne.TextStyle{Bold: true}
	lblTitle.Alignment = fyne.TextAlignCenter

	lblDesc := widget.NewLabelWithStyle(
		"The lightweight bridge for securely executing AI models.\nPowered by AI Bazaar Engine.\nListening on Port 4500.",
		fyne.TextAlignCenter,
		fyne.TextStyle{},
	)
	lblDesc.Wrapping = fyne.TextWrapWord

	btnStore := widget.NewButtonWithIcon("Open AI Bazaar Store", theme.HomeIcon(), func() {
		if u, err := url.Parse("https://aibazaars.store"); err == nil {
			a.OpenURL(u)
		}
	})

	btnOpenApps := widget.NewButtonWithIcon("Open Apps Directory", theme.FolderOpenIcon(), func() {
		appsPath := filepath.Join(getBaseDir(), "core", "apps")
		os.MkdirAll(appsPath, 0755)
		u, err := url.Parse("file://" + filepath.ToSlash(appsPath))
		if err == nil {
			a.OpenURL(u)
		}
	})

	buttonsBox := fyneContainer.NewPadded(fyneContainer.NewGridWithColumns(2, btnStore, btnOpenApps))

	headerBox := fyneContainer.NewVBox(
		logoUI,
		fyneContainer.NewPadded(fyneContainer.NewCenter(lblTitle)),
		fyneContainer.NewPadded(lblDesc),
		buttonsBox,
		widget.NewSeparator(),
	)

	tabSettings := fyneContainer.NewTabItem("⚙️ Settings", fyneContainer.NewScroll(fyneContainer.NewPadded(headerBox)))

	tabs = fyneContainer.NewAppTabs(tabTerminal, tabExplore, tabApps, tabSettings)
	tabs.SetTabLocation(fyneContainer.TabLocationTop)

	switchToInstalledTab = func() {
		fyne.Do(func() {
			tabs.Select(tabApps)
		})
	}

	tabs.OnSelected = func(tab *fyneContainer.TabItem) {
		if tab.Text == "📦 Installed Apps" {
			updateApps()
		} else if tab.Text == "🌐 Explore" {
			if !exploreLoaded {
				exploreLoaded = true
				loadExploreData()
			}
		}
	}

	mainWindow.SetContent(tabs)

	// Pre-flight check on initial app startup
	fyne.Do(func() {
		ensureEngineReady(mainWindow, func() {
			if !startServer() {
				d := dialog.NewInformation("Port Conflict", "Port 4500 is already in use.\n\nPlease close any other instances of AI Bazaar and try again.", mainWindow)
				d.SetOnClosed(func() {
					a.Quit()
				})
				d.Show()
			}
		}, nil)
	})

	mainWindow.ShowAndRun()
}
