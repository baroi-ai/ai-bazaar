package main

import (
	"context"
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
	"syscall"
	"time"

	// Docker SDK imports
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	dockerContainer "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"

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

//const pbBaseURL = "https://api.aibazaars.store/"

const pbBaseURL = "http://127.0.0.1:8080"

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

// Global Docker Client
var dockerCli *client.Client

var podmanCmd *exec.Cmd
var podmanSocketPath string

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
	// 1. Check for NVIDIA GPU
	if err := exec.Command("nvidia-smi").Run(); err == nil {
		writeLog("🔍 [GPU Detection]: NVIDIA GPU detected via nvidia-smi.\n")
		return "nvidia"
	}
	if dockerCli != nil {
		if info, err := dockerCli.Info(context.Background()); err == nil {
			if _, ok := info.Runtimes["nvidia"]; ok {
				writeLog("🔍 [GPU Detection]: NVIDIA runtime detected in Docker.\n")
				return "nvidia"
			}
		}
	}

	// 2. Check for AMD GPU (Linux specific paths)
	if _, err := os.Stat("/dev/kfd"); err == nil {
		if _, err := os.Stat("/dev/dri"); err == nil {
			writeLog("🔍 [GPU Detection]: AMD GPU detected via /dev/kfd and /dev/dri.\n")
			return "amd"
		}
	}

	writeLog("🔍 [GPU Detection]: No compatible GPU found. Defaulting to CPU mode.\n")
	return "none"
}

func findPodmanPath() (string, error) {
	baseDir := getBaseDir()

	// Ensure the bin/ directory exists
	binDir := filepath.Join(baseDir, "bin")
	os.MkdirAll(binDir, 0755)

	// Check local bin paths
	localPaths := []string{
		filepath.Join(binDir, "podman.AppImage"),
		filepath.Join(binDir, "podman.Appimage"),
		filepath.Join(binDir, "podman"),
	}

	for _, localPath := range localPaths {
		if _, err := os.Stat(localPath); err == nil {
			// Make sure it is executable
			if err := os.Chmod(localPath, 0755); err != nil {
				writeLog("⚠️ Failed to set executable permissions on %s: %v\n", localPath, err)
			}
			return localPath, nil
		}
	}

	// Fallback to system-wide podman
	if sysPath, err := exec.LookPath("podman"); err == nil {
		return sysPath, nil
	}

	return "", fmt.Errorf("podman executable not found in local bin directory or system PATH")
}

func startPodmanService() (string, error) {
	// If it's already running, return the socket path
	if podmanCmd != nil && podmanCmd.Process != nil {
		return "unix://" + podmanSocketPath, nil
	}

	podmanPath, err := findPodmanPath()
	if err != nil {
		return "", err
	}

	// Create a unique socket path for this run
	baseDir := getBaseDir()
	socketDir := filepath.Join(baseDir, "tmp")
	os.MkdirAll(socketDir, 0755)
	socketFile := filepath.Join(socketDir, "podman.sock")
	podmanSocketPath = socketFile

	// Remove old socket if exists
	os.Remove(socketFile)

	writeLog("🚀 Starting Podman system service on %s...\n", socketFile)

	// Command: podman system service --time=0 unix://<socketFile>
	cmd := exec.Command(podmanPath, "system", "service", "--time=0", "unix://"+socketFile)

	// Set pgid so children are killed together on Linux
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	// Start in background
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("failed to start podman service: %w", err)
	}
	podmanCmd = cmd

	// Poll until the socket is active and accepting connections
	socketURL := "unix://" + socketFile
	writeLog("⏳ Waiting for Podman service socket to become ready...\n")

	ready := false
	for i := 0; i < 50; i++ { // Up to 5 seconds
		if _, err := os.Stat(socketFile); err == nil {
			// Try to connect to ensure it's responsive
			conn, err := net.DialTimeout("unix", socketFile, 100*time.Millisecond)
			if err == nil {
				conn.Close()
				ready = true
				break
			}
		}
		time.Sleep(100 * time.Millisecond)
	}

	if !ready {
		// Clean up on failure
		cmd.Process.Kill()
		cmd.Wait()
		podmanCmd = nil
		return "", fmt.Errorf("timeout waiting for podman service socket")
	}

	writeLog("✅ Podman service is active.\n")
	return socketURL, nil
}

func cleanupPodmanService() {
	if podmanCmd != nil && podmanCmd.Process != nil {
		writeLog("🛑 Terminating Podman API service...\n")
		// Kill the process group to clean up helper processes as well
		syscall.Kill(-podmanCmd.Process.Pid, syscall.SIGKILL)
		podmanCmd.Wait()
		podmanCmd = nil
	}
	if podmanSocketPath != "" {
		os.Remove(podmanSocketPath)
	}
}

// ---------------------------------------------------------
// PODMAN LIFECYCLE MANAGEMENT (SDK)
// ---------------------------------------------------------

func ensureEngineReady(w fyne.Window, onReady func(), onFailure func()) {
	go func() {
		ctx := context.Background()

		socketURL, err := startPodmanService()
		if err != nil {
			writeLog("❌ Podman service failed to start: %v\n", err)
			fyne.Do(func() {
				description := widget.NewLabel("Podman not found. Please install via command below:")

				distros := map[string]string{
					"Ubuntu / Debian":      "sudo apt-get update && sudo apt-get -y install podman",
					"Arch Linux & Manjaro": "sudo pacman -S podman",
					"Fedora":               "sudo dnf -y install podman",
					"Alpine Linux":         "sudo apk add podman",
					"Raspberry Pi OS":      "sudo apt-get update && sudo apt-get -y install podman",
					"RHEL":                 "sudo dnf install podman",
				}

				options := []string{
					"Ubuntu / Debian",
					"Arch Linux & Manjaro",
					"Fedora",
					"Alpine Linux",
					"Raspberry Pi OS",
					"RHEL",
				}

				commandLabel := canvas.NewText("Select your distribution...", color.RGBA{R: 34, G: 197, B: 94, A: 255})
				commandLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

				bg := canvas.NewRectangle(color.RGBA{R: 24, G: 24, B: 27, A: 255})
				bg.SetMinSize(fyne.NewSize(350, 36))

				scrollContainer := fyneContainer.NewHScroll(commandLabel)
				cmdContainer := fyneContainer.NewStack(bg, fyneContainer.NewPadded(scrollContainer))

				var copyBtn *widget.Button
				copyBtn = widget.NewButtonWithIcon("Copy", theme.ContentCopyIcon(), func() {
					cmd := commandLabel.Text
					if cmd != "" && cmd != "Select your distribution..." {
						w.Clipboard().SetContent(cmd)
						copyBtn.SetText("Copied!")
						copyBtn.SetIcon(theme.ConfirmIcon())
						copyBtn.Refresh()

						go func() {
							time.Sleep(1500 * time.Millisecond)
							fyne.Do(func() {
								copyBtn.SetText("Copy")
								copyBtn.SetIcon(theme.ContentCopyIcon())
								copyBtn.Refresh()
							})
						}()
					}
				})
				copyBtn.Disable()

				selectWidget := widget.NewSelect(options, func(selected string) {
					if cmd, ok := distros[selected]; ok {
						commandLabel.Text = cmd
						commandLabel.Refresh()
						copyBtn.Enable()
					} else {
						commandLabel.Text = ""
						commandLabel.Refresh()
						copyBtn.Disable()
					}
				})
				selectWidget.PlaceHolder = "Select your Linux distribution..."
				selectWidget.SetSelected("Ubuntu / Debian")

				form := widget.NewForm(
					widget.NewFormItem("Distribution", selectWidget),
					widget.NewFormItem("Command", fyneContainer.NewBorder(nil, nil, nil, copyBtn, cmdContainer)),
				)

				dialogContent := fyneContainer.NewVBox(
					description,
					form,
				)

				dialog.ShowCustomConfirm("Podman Required", "Install Podman", "Quit App",
					dialogContent,
					func(install bool) {
						if install {
							u, _ := url.Parse("https://podman.io/docs/installation#linux-distributions")
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

		// Initialize Docker SDK Client (pointing to our Podman socket)
		cli, err := client.NewClientWithOpts(
			client.WithHost(socketURL),
			client.WithAPIVersionNegotiation(),
		)
		if err != nil {
			writeLog("❌ Failed to initialize client for Podman: %v\n", err)
			if onFailure != nil {
				fyne.Do(onFailure)
			}
			return
		}

		// Ping to ensure connection works
		if _, pingErr := cli.Ping(ctx); pingErr != nil {
			writeLog("❌ Failed to ping Podman socket: %v\n", pingErr)
			if onFailure != nil {
				fyne.Do(onFailure)
			}
			return
		}

		// Success! Podman is running.
		processMutex.Lock()
		dockerCli = cli // Save global reference
		processMutex.Unlock()
		writeLog("✅ Podman Engine is ready and connected.\n")
		if onReady != nil {
			onReady()
		}
	}()
}

func stopDockerContainer(slug string) {
	if dockerCli == nil {
		return
	}
	containerName := "aibazaar-" + slug
	writeLog("🛑 [STOP]: Stopping app %s...\n", slug)

	processMutex.Lock()
	stoppingApps[slug] = true
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
	processMutex.Unlock()

	ctx := context.Background()
	timeout := 10 // Give it 10 seconds to shut down gracefully

	// SDK Call to stop
	err := dockerCli.ContainerStop(ctx, containerName, container.StopOptions{Timeout: &timeout})
	if err != nil {
		writeLog("⚠️ [STOP]: App %s might already be stopped.\n", slug)
	}

	// Also prune it to be clean
	dockerCli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})

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
	ctx := context.Background()

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
	// PULL DOCKER IMAGE VIA SDK (With Progress)
	// ==========================================
	writeLog("📥 Initiating Docker Image Pull for %s...\n", req.ImageLink)
	writeWS(conn, "📥 SYSTEM: Pulling Docker Image... (This might take a few minutes)")

	reader, pullErr := dockerCli.ImagePull(ctx, req.ImageLink, types.ImagePullOptions{})
	if pullErr != nil {
		writeLog("❌ ERROR: Failed to pull image: %v\n", pullErr)
		processMutex.Lock()
		delete(installingApps, safeSlug)
		processMutex.Unlock()
		if refreshInstalledApps != nil {
			fyne.Do(func() { refreshInstalledApps() })
		}
		return
	}

	// Decode JSON progress stream
	dec := json.NewDecoder(reader)
	type dockerPullMsg struct {
		Status         string `json:"status"`
		Id             string `json:"id"`
		ProgressDetail struct {
			Current int64 `json:"current"`
			Total   int64 `json:"total"`
		} `json:"progressDetail"`
	}

	var lastUpdate time.Time
	for {
		var msg dockerPullMsg
		if err := dec.Decode(&msg); err == io.EOF {
			break
		} else if err != nil {
			continue
		}

		// Throttle UI updates to prevent freezing (twice a second)
		if time.Since(lastUpdate) > 500*time.Millisecond || msg.Status == "Download complete" || msg.Status == "Pull complete" {
			progressStr := ""
			if msg.ProgressDetail.Total > 0 {
				mbCurrent := float64(msg.ProgressDetail.Current) / 1024 / 1024
				mbTotal := float64(msg.ProgressDetail.Total) / 1024 / 1024
				progressStr = fmt.Sprintf(" (%.1f MB / %.1f MB)", mbCurrent, mbTotal)
			}
			updateDockerPullLog(msg.Id, msg.Status, progressStr)

			wsMsg := msg.Status
			if msg.Id != "" {
				wsMsg = msg.Id + ": " + msg.Status
			}
			wsMsg += progressStr
			writeWS(conn, "🐳 [Docker Pull]: "+wsMsg)
			lastUpdate = time.Now()
		}
	}
	reader.Close()

	processMutex.Lock()
	delete(installingApps, safeSlug)
	processMutex.Unlock()
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}

	// ==========================================
	// RUN DOCKER CONTAINER VIA SDK
	// ==========================================
	writeLog("⚡ Launching App...\n")
	writeWS(conn, "⚡ SYSTEM: Launching App...")

	dockerCli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})

	internalPort := req.InternalPort
	if internalPort == "" {
		internalPort = targetPort
	}

	portBindings := nat.PortMap{
		nat.Port(internalPort + "/tcp"): []nat.PortBinding{{HostIP: "127.0.0.1", HostPort: targetPort}},
	}

	var hostConfig dockerContainer.HostConfig
	hostConfig.PortBindings = portBindings
	hostConfig.AutoRemove = true

	gpuType := "none"
	if req.IsGPU {
		gpuType = detectGPUSupport()
	}

	applyGPUConfig := func(gType string) {
		hostConfig.Resources.DeviceRequests = nil
		hostConfig.Resources.Devices = nil
		if gType == "nvidia" {
			hostConfig.Resources.DeviceRequests = []dockerContainer.DeviceRequest{
				{
					Driver:       "nvidia",
					Count:        -1,
					Capabilities: [][]string{{"gpu"}},
				},
			}
		} else if gType == "amd" {
			hostConfig.Resources.Devices = []dockerContainer.DeviceMapping{
				{
					PathOnHost:        "/dev/kfd",
					PathInContainer:   "/dev/kfd",
					CgroupPermissions: "rwm",
				},
				{
					PathOnHost:        "/dev/dri",
					PathInContainer:   "/dev/dri",
					CgroupPermissions: "rwm",
				},
			}
			hostConfig.SecurityOpt = []string{"seccomp=unconfined"}
			hostConfig.GroupAdd = []string{"video", "render"}
		}
	}

	var resp dockerContainer.CreateResponse
	var createErr error
	var startErr error
	launched := false

	// Attempt GPU launch if requested and available
	if req.IsGPU && gpuType != "none" {
		writeLog("🔌 [GPU]: Attempting to launch in GPU mode (%s)...\n", gpuType)
		writeWS(conn, fmt.Sprintf("🔌 SYSTEM: Attempting to launch in GPU mode (%s)...", gpuType))

		applyGPUConfig(gpuType)
		resp, createErr = dockerCli.ContainerCreate(ctx, &dockerContainer.Config{
			Image: req.ImageLink,
			Env:   []string{"PORT=" + internalPort},
		}, &hostConfig, nil, nil, containerName)

		if createErr == nil {
			startErr = dockerCli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
			if startErr == nil {
				launched = true
			} else {
				writeLog("⚠️ [GPU]: Failed to start container in GPU mode: %v\n", startErr)
				dockerCli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})
			}
		} else {
			writeLog("⚠️ [GPU]: Failed to create container in GPU mode: %v\n", createErr)
		}
	}

	// Fallback to CPU mode if not launched
	if !launched {
		if req.IsGPU && !req.IsFallback {
			// User requested GPU, it failed/wasn't found, and they don't want CPU fallback
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

		applyGPUConfig("none")
		resp, createErr = dockerCli.ContainerCreate(ctx, &dockerContainer.Config{
			Image: req.ImageLink,
			Env:   []string{"PORT=" + internalPort},
		}, &hostConfig, nil, nil, containerName)

		if createErr != nil {
			writeLog("❌ ERROR: Failed to create App: %v\n", createErr)
			writeWS(conn, "❌ ERROR: Failed to create App.")
			return
		}

		startErr = dockerCli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
		if startErr != nil {
			writeLog("❌ ERROR: Failed to start App: %v\n", startErr)
			writeWS(conn, "❌ ERROR: Failed to start App.")
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
	logReader, err := dockerCli.ContainerLogs(ctx, resp.ID, types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
	})
	if err == nil {
		go func() {
			outWriter := &UILogWriter{Prefix: "📦 [Out]:", Conn: conn}
			errWriter := &UILogWriter{Prefix: "ℹ️ [Log]:", Conn: conn}
			stdcopy.StdCopy(outWriter, errWriter, logReader)
			logReader.Close()
		}()
	}

	// Wait for container to exit
	statusCh, errCh := dockerCli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
	select {
	case err := <-errCh:
		if err != nil {
			writeLog("⚠️ SYSTEM: App exited with error: %v\n", err)
		}
	case <-statusCh:
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
	ctx := context.Background()

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

	dockerCli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})

	internalPort := config.InternalPort
	if internalPort == "" {
		internalPort = targetPort
	}

	portBindings := nat.PortMap{
		nat.Port(internalPort + "/tcp"): []nat.PortBinding{{HostIP: "127.0.0.1", HostPort: targetPort}},
	}

	var hostConfig dockerContainer.HostConfig
	hostConfig.PortBindings = portBindings
	hostConfig.AutoRemove = true

	gpuType := "none"
	if config.IsGPU {
		gpuType = detectGPUSupport()
	}

	applyGPUConfig := func(gType string) {
		hostConfig.Resources.DeviceRequests = nil
		hostConfig.Resources.Devices = nil
		if gType == "nvidia" {
			hostConfig.Resources.DeviceRequests = []dockerContainer.DeviceRequest{
				{
					Driver:       "nvidia",
					Count:        -1,
					Capabilities: [][]string{{"gpu"}},
				},
			}
		} else if gType == "amd" {
			hostConfig.Resources.Devices = []dockerContainer.DeviceMapping{
				{
					PathOnHost:        "/dev/kfd",
					PathInContainer:   "/dev/kfd",
					CgroupPermissions: "rwm",
				},
				{
					PathOnHost:        "/dev/dri",
					PathInContainer:   "/dev/dri",
					CgroupPermissions: "rwm",
				},
			}
			hostConfig.SecurityOpt = []string{"seccomp=unconfined"}
			hostConfig.GroupAdd = []string{"video", "render"}
		}
	}

	var resp dockerContainer.CreateResponse
	var createErr error
	var startErr error
	launched := false

	// Attempt GPU launch if requested and available
	if config.IsGPU && gpuType != "none" {
		writeLog("🔌 [GPU]: [LOCAL] Attempting to launch in GPU mode (%s)...\n", gpuType)

		applyGPUConfig(gpuType)
		resp, createErr = dockerCli.ContainerCreate(ctx, &dockerContainer.Config{
			Image: config.ImageLink,
			Env:   []string{"PORT=" + internalPort},
		}, &hostConfig, nil, nil, containerName)

		if createErr == nil {
			startErr = dockerCli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
			if startErr == nil {
				launched = true
			} else {
				writeLog("⚠️ [GPU]: [LOCAL] Failed to start container in GPU mode: %v\n", startErr)
				dockerCli.ContainerRemove(ctx, containerName, types.ContainerRemoveOptions{Force: true})
			}
		} else {
			writeLog("⚠️ [GPU]: [LOCAL] Failed to create container in GPU mode: %v\n", createErr)
		}
	}

	// Fallback to CPU mode if not launched
	if !launched {
		if config.IsGPU && !config.IsFallback {
			return fmt.Errorf("GPU mode failed, and CPU fallback is disabled")
		}

		if config.IsGPU {
			writeLog("⚠️ [GPU]: [LOCAL] Falling back to CPU mode...\n")
		} else {
			writeLog("ℹ️ [LOCAL] Launching in CPU mode...\n")
		}

		applyGPUConfig("none")
		resp, createErr = dockerCli.ContainerCreate(ctx, &dockerContainer.Config{
			Image: config.ImageLink,
			Env:   []string{"PORT=" + internalPort},
		}, &hostConfig, nil, nil, containerName)

		if createErr != nil {
			return fmt.Errorf("failed to create app in CPU mode: %v", createErr)
		}

		startErr = dockerCli.ContainerStart(ctx, resp.ID, types.ContainerStartOptions{})
		if startErr != nil {
			return fmt.Errorf("failed to start app in CPU mode: %v", startErr)
		}
	}

	processMutex.Lock()
	activeContainers[slug] = true
	processMutex.Unlock()

	writeLog("🚀 ONLINE: http://127.0.0.1:%s\n", targetPort)

	logReader, err := dockerCli.ContainerLogs(ctx, resp.ID, types.ContainerLogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     true,
	})
	if err == nil {
		go func() {
			outWriter := &UILogWriter{Prefix: fmt.Sprintf("🐳 [%s]:", slug)}
			stdcopy.StdCopy(outWriter, outWriter, logReader)
			logReader.Close()
		}()
	}

	go func() {
		statusCh, _ := dockerCli.ContainerWait(ctx, resp.ID, container.WaitConditionNotRunning)
		<-statusCh
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

func uninstallApp(rawSlug string) {
	slug := sanitizeSlug(rawSlug)
	ctx := context.Background()

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

	// 2. Remove Docker Image via SDK
	if configData, err := os.ReadFile(configPath); err == nil {
		var config BazaarConfig
		if json.Unmarshal(configData, &config) == nil && config.ImageLink != "" && dockerCli != nil {
			writeLog("🗑️ Removing Docker Image: %s...\n", config.ImageLink)
			_, err := dockerCli.ImageRemove(ctx, config.ImageLink, types.ImageRemoveOptions{Force: true})
			if err != nil {
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
		cleanupPodmanService()
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
