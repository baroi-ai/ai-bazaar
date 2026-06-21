package main

import (
	"archive/zip"
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
	"strconv"
	"strings"
	"sync"
	"time"

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

const pbBaseURL = "http://127.0.0.1:8090"

var pbClient = &http.Client{Timeout: 10 * time.Second} // Prevents UI freezes if DB is offline

type ClientRequest struct {
	Action          string     `json:"action"`
	Slug            string     `json:"slug"`
	AppName         string     `json:"app_name"`
	AppIcon         string     `json:"app_icon"`
	AppId           string     `json:"app_id"`
	GithubURL       string     `json:"github_url"`
	Environments    []string   `json:"environments"`
	InstallCommands [][]string `json:"install_commands"`
	StartCommand    []string   `json:"start_command"`
	Port            string     `json:"port"`
}

type BazaarConfig struct {
	AppName      string   `json:"app_name"`
	AppIcon      string   `json:"app_icon"`
	AppId        string   `json:"app_id"`
	StartCommand []string `json:"start_command"`
	Port         string   `json:"port"`
}

type EndpointRequest struct {
	Slug      string `json:"slug"`
	GithubURL string `json:"github_url"`
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

var activeProcesses = make(map[string]*exec.Cmd)
var installingApps = make(map[string]bool)
var processMutex sync.Mutex
var wsMutex sync.Mutex // SECURITY: Prevents concurrent WebSocket panics

// UI Controller Hooks for Cross-Tab Communication
var refreshInstalledApps func()
var refreshExploreApps func()
var switchToInstalledTab func()
var exploreLoaded = false

// ---------------------------------------------------------
// RECONFIGURED UTILITY AND DIRECTORY HANDLERS
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

func getPixiPath() string {
	pixiExe := "pixi"
	if runtime.GOOS == "windows" {
		pixiExe = "pixi.exe"
	}
	return filepath.Join(getBaseDir(), "bin", pixiExe)
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

func killUnixTree(pid int) {
	out, err := exec.Command("pgrep", "-P", fmt.Sprintf("%d", pid)).Output()
	if err == nil {
		for _, childStr := range strings.Fields(string(out)) {
			if childPid, err := strconv.Atoi(childStr); err == nil {
				killUnixTree(childPid)
			}
		}
	}
	exec.Command("kill", "-9", fmt.Sprintf("%d", pid)).Run()
}

func stopProcessTree(cmd *exec.Cmd) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	if runtime.GOOS == "windows" {
		exec.Command("taskkill", "/T", "/F", "/PID", fmt.Sprintf("%d", cmd.Process.Pid)).Run()
	} else {
		killUnixTree(cmd.Process.Pid)
	}
}

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

type ProgressWriter struct {
	TotalDownloaded int64
	LastReported    int64
	Conn            *websocket.Conn
}

func (pw *ProgressWriter) Write(p []byte) (int, error) {
	n := len(p)
	pw.TotalDownloaded += int64(n)
	if pw.TotalDownloaded-pw.LastReported >= 1048576 {
		pw.LastReported = pw.TotalDownloaded
		if pw.Conn != nil {
			mb := float64(pw.TotalDownloaded) / 1024.0 / 1024.0
			msg := fmt.Sprintf("PROGRESS|download|📥 Downloading Repository Payload: %.1f MB", mb)
			wsMutex.Lock()
			pw.Conn.WriteMessage(websocket.TextMessage, []byte(msg))
			wsMutex.Unlock()
		}
	}
	return n, nil
}

func writeWS(conn *websocket.Conn, msg string) {
	if conn != nil {
		wsMutex.Lock()
		conn.WriteMessage(websocket.TextMessage, []byte(msg))
		wsMutex.Unlock()
	}
}

func runAndStream(cmd *exec.Cmd, prefix string, conn *websocket.Conn) error {
	stdoutPipe, _ := cmd.StdoutPipe()
	stderrPipe, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			msg := prefix + " " + scanner.Text()
			writeLog(msg + "\n")
			writeWS(conn, msg)
		}
	}()

	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stderrPipe)
		for scanner.Scan() {
			msg := prefix + " " + scanner.Text()
			writeLog(msg + "\n")
			writeWS(conn, msg)
		}
	}()

	wg.Wait()
	return cmd.Wait()
}

// ---------------------------------------------------------
// CORE INSTALLATION & EXECUTION ENGINE
// ---------------------------------------------------------

func executeRunAction(req ClientRequest, conn *websocket.Conn) {
	safeSlug := sanitizeSlug(req.Slug)
	appFolder := getAppFolderPath(safeSlug)

	processMutex.Lock()
	_, isRunning := activeProcesses[safeSlug]

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

	pixiExe := getPixiPath()
	targetPort := req.Port
	if targetPort == "" {
		targetPort = "8899"
	}

	targetPort = getAvailablePort(targetPort)

	configData := BazaarConfig{
		AppName:      req.AppName,
		AppIcon:      req.AppIcon,
		AppId:        req.AppId,
		StartCommand: req.StartCommand,
		Port:         targetPort,
	}
	configBytes, _ := json.Marshal(configData)
	os.MkdirAll(appFolder, 0755)
	os.WriteFile(filepath.Join(appFolder, ".bazaar"), configBytes, 0644)

	// CACHE ICON LOCALLY
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

	if _, err := os.Stat(filepath.Join(appFolder, "pixi.toml")); os.IsNotExist(err) {
		writeLog("📥 Initiating GitHub Repository Payload Download...\n")
		writeWS(conn, "📥 SYSTEM: Initiating GitHub Repository Payload Download...")

		if req.GithubURL == "" {
			writeLog("❌ ERROR: GitHub Repository URL is missing. Cannot install.\n")
			writeWS(conn, "❌ ERROR: Repository payload download aborted.")
			processMutex.Lock()
			delete(installingApps, safeSlug)
			if refreshInstalledApps != nil {
				fyne.Do(func() { refreshInstalledApps() })
			}
			processMutex.Unlock()
			return
		}

		zipURL := strings.TrimSuffix(req.GithubURL, "/") + "/archive/HEAD.zip"
		resp, err := http.Get(zipURL) // GitHub downloads can be large, omitting rigid timeout
		if err != nil || resp.StatusCode != 200 {
			writeLog("❌ ERROR: Repository payload download aborted.\n")
			writeWS(conn, "❌ ERROR: Repository payload download aborted.")

			processMutex.Lock()
			delete(installingApps, safeSlug)
			if refreshInstalledApps != nil {
				fyne.Do(func() { refreshInstalledApps() })
			}
			processMutex.Unlock()
			return
		}

		tempZip := appFolder + "_temp.zip"
		out, _ := os.Create(tempZip)

		pw := &ProgressWriter{Conn: conn}
		io.Copy(out, io.TeeReader(resp.Body, pw))

		out.Close()
		resp.Body.Close()

		finalMB := float64(pw.TotalDownloaded) / 1024.0 / 1024.0
		writeWS(conn, "PROGRESS|download|")
		writeWS(conn, fmt.Sprintf("✅ SYSTEM: Download complete (%.1f MB). Extracting...", finalMB))

		rZip, err := zip.OpenReader(tempZip)
		if err == nil {
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

				// SECURITY: Zip Slip Vulnerability Prevention
				if !strings.HasPrefix(filepath.Clean(fpath), filepath.Clean(appFolder)+string(os.PathSeparator)) {
					continue
				}

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
		}
		os.Remove(tempZip)

		writeLog("🪄 Scaffolding isolated runtime dependencies...\n")
		writeWS(conn, "🪄 SYSTEM: Scaffolding isolated runtime dependencies blueprint...")

		cmdInit := exec.Command(pixiExe, "init", ".")
		cmdInit.Dir = appFolder
		runAndStream(cmdInit, "⚙️ [Pixi Setup]:", conn)

		if len(req.Environments) > 0 {
			initArgs := append([]string{"add"}, req.Environments...)
			cmdAdd := exec.Command(pixiExe, initArgs...)
			cmdAdd.Dir = appFolder
			runAndStream(cmdAdd, "⚙️ [Pixi Core]:", conn)
		}

		for _, instCmd := range req.InstallCommands {
			if len(instCmd) == 0 {
				continue
			}
			writeLog("⚙️ Synchronizing deployment step -> %v\n", instCmd)
			writeWS(conn, fmt.Sprintf("⚙️ SYSTEM: Synchronizing deployment step -> %v", instCmd))
			fullInstallArgs := append([]string{"run"}, instCmd...)
			cmdInst := exec.Command(pixiExe, fullInstallArgs...)
			cmdInst.Dir = appFolder
			runAndStream(cmdInst, "⚙️ [Pixi Fetch]:", conn)
		}
	}

	processMutex.Lock()
	delete(installingApps, safeSlug)
	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}
	processMutex.Unlock()

	writeLog("⚡ Launching sandboxed environment context...\n")
	writeWS(conn, "⚡ SYSTEM: Launching sandboxed environment context...")

	if len(req.StartCommand) == 0 {
		writeLog("❌ ERROR: No start command provided.\n")
		writeWS(conn, "❌ ERROR: No start command provided.")
		return
	}

	runArgs := append([]string{"run"}, req.StartCommand...)
	runCmd := exec.Command(pixiExe, runArgs...)
	runCmd.Dir = appFolder
	runCmd.Env = append(os.Environ(), "PORT="+targetPort)

	stdout, _ := runCmd.StdoutPipe()
	stderr, _ := runCmd.StderrPipe()

	processMutex.Lock()
	activeProcesses[safeSlug] = runCmd
	processMutex.Unlock()

	if refreshInstalledApps != nil {
		fyne.Do(func() { refreshInstalledApps() })
	}

	if err := runCmd.Start(); err != nil {
		writeLog("❌ ERROR: Critical startup execution error occurred.\n")
		writeWS(conn, "❌ ERROR: Critical startup execution error occurred.")
		return
	}

	writeLog("🚀 ONLINE: Interface bound on port %s.\n", targetPort)
	writeWS(conn, fmt.Sprintf("🚀 ONLINE: Interface bound on http://127.0.0.1:%s", targetPort))

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			writeLog("📦 [Out]: %s\n", scanner.Text())
			writeWS(conn, "📦 [Out]: "+scanner.Text())
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			writeLog("ℹ️ [Log]: %s\n", scanner.Text())
			writeWS(conn, "ℹ️ [Log]: "+scanner.Text())
		}
	}()

	runCmd.Wait()
	writeLog("💤 SYSTEM: Execution layer wrapped cleanly.\n")
	writeWS(conn, "💤 SYSTEM: Execution layer wrapped cleanly.")

	processMutex.Lock()
	delete(activeProcesses, safeSlug)
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
			executeRunAction(req, conn)
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

	// SECURITY/LOGIC: Requires execution_type = 'daemon_uv' & filters by OS
	filter := fmt.Sprintf("(platforms ~ '%s' && execution_type = 'daemon_uv')", osName)

	for _, slug := range excludeSlugs {
		filter += fmt.Sprintf(" && slug != '%s'", sanitizeSlug(slug))
	}

	if query != "" {
		filter += fmt.Sprintf(" && (Name ~ '%s' || shortDescription ~ '%s')", query, query)
	}

	// Always grab the newest apps first
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

	extractStringArray := func(val interface{}) []string {
		var res []string
		if val == nil {
			return res
		}

		if arr, ok := val.([]interface{}); ok {
			for _, s := range arr {
				if str, ok := s.(string); ok {
					res = append(res, str)
				}
			}
		} else if str, ok := val.(string); ok {
			var parsed []string
			if err := json.Unmarshal([]byte(str), &parsed); err == nil {
				return parsed
			}
			if strings.TrimSpace(str) != "" {
				return strings.Fields(str)
			}
		}
		return res
	}

	extractInstallCommands := func(val interface{}) [][]string {
		var res [][]string
		if val == nil {
			return res
		}

		if arr, ok := val.([]interface{}); ok {
			for _, cmdGrp := range arr {
				res = append(res, extractStringArray(cmdGrp))
			}
		} else if str, ok := val.(string); ok {
			var parsed [][]string
			if err := json.Unmarshal([]byte(str), &parsed); err == nil {
				return parsed
			}
			if strings.TrimSpace(str) != "" {
				res = append(res, strings.Fields(str))
			}
		}
		return res
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

	if v, ok := targetMap["github_url"].(string); ok {
		req.GithubURL = v
	}
	req.Environments = extractStringArray(targetMap["environments"])
	req.StartCommand = extractStringArray(targetMap["start_command"])
	req.InstallCommands = extractInstallCommands(targetMap["install_commands"])

	if len(req.StartCommand) == 0 {
		if rawCmd, exists := raw["start_command"]; exists {
			req.StartCommand = extractStringArray(rawCmd)
		}
	}

	if len(req.StartCommand) == 0 {
		if rawCmd, exists := raw["startCommand"]; exists {
			req.StartCommand = extractStringArray(rawCmd)
		}
		if rawCmd, exists := targetMap["startCommand"]; exists {
			req.StartCommand = extractStringArray(rawCmd)
		}
	}

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

	var appIcon fyne.Resource
	if res, err := fyne.LoadResourceFromPath(iconPath); err == nil {
		appIcon = res
	} else if res, err := fyne.LoadResourceFromPath(logoPath); err == nil {
		appIcon = res
	}

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

	// ==========================================
	// 1. TERMINAL TAB
	// ==========================================
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

	// ==========================================
	// 2. EXPLORE TAB
	// ==========================================
	var loadExploreData func()
	currentPage := 1
	currentQuery := ""

	exploreContent := container.NewVBox()
	exploreScroll := container.NewScroll(exploreContent)

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
		exploreContent.Objects = []fyne.CanvasObject{container.NewCenter(widget.NewLabel("Connecting to AI Bazaar..."))}
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
				newObjects = []fyne.CanvasObject{container.NewVBox(errLbl, retryBtn)}
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

					nameLbl := canvas.NewText(item.Name, color.White)
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

					titleBox := container.NewBorder(nil, nil, nameLbl, sizeLbl, layout.NewSpacer())
					textCol := container.NewVBox(titleBox, descLbl)

					appId := item.Id
					appSlug := item.Slug
					appName := item.Name
					appIcon := item.Icon

					installBtn := widget.NewButton("Install", func() {
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

							if err != nil || req == nil || req.GithubURL == "" {
								writeLog("❌ ERROR: Failed to fetch app installation data from PocketBase.\n")
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
					})

					card := container.NewBorder(nil, nil, container.NewPadded(img), container.NewPadded(installBtn), textCol)
					newObjects = append(newObjects, container.NewPadded(card), widget.NewSeparator())
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

	searchTools := container.NewHBox(searchBtn, btnRefreshExplore)
	searchBox := container.NewBorder(nil, nil, nil, searchTools, searchInput)

	paginationBox := container.NewHBox(layout.NewSpacer(), btnPrev, lblPage, btnNext, layout.NewSpacer())
	exploreLayout := container.NewBorder(searchBox, paginationBox, nil, nil, exploreScroll)
	tabExplore := container.NewTabItem("🌐 Explore", container.NewPadded(exploreLayout))

	// ==========================================
	// 3. INSTALLED APPS TAB
	// ==========================================
	var tabs *container.AppTabs
	appList := container.NewVBox()

	updateApps := func() {
		appList.Objects = nil
		installedApps := getInstalledApps()

		if len(installedApps) == 0 {
			appList.Add(widget.NewLabel("No AI models installed locally."))
		} else {
			for _, slug := range installedApps {
				appSlug := sanitizeSlug(slug) // Security pass

				processMutex.Lock()
				_, isRunning := activeProcesses[appSlug]
				isInstalling := installingApps[appSlug]
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

				nameLbl := canvas.NewText(displayName, color.White)
				nameLbl.TextStyle.Bold = true
				nameLbl.TextSize = 16

				statusText := "Offline"
				statusColor := color.RGBA{150, 150, 150, 255}

				if isInstalling {
					statusText = "Downloading... (Check Terminal)"
					statusColor = color.RGBA{56, 189, 248, 255}
				} else if isRunning {
					statusText = fmt.Sprintf("Running (Port %s)", targetPort)
					statusColor = color.RGBA{16, 185, 129, 255}
				}

				statusLbl := canvas.NewText(statusText, statusColor)
				statusLbl.TextSize = 12

				textCol := container.NewVBox(nameLbl, statusLbl)

				if isInstalling {
					actionBtn = widget.NewButtonWithIcon("Working...", theme.DocumentCreateIcon(), func() {})
					actionBtn.Disable()
				} else if isRunning {
					actionBtn = widget.NewButtonWithIcon("Stop", theme.MediaStopIcon(), func() {
						processMutex.Lock()
						if cmd, exists := activeProcesses[appSlug]; exists {
							stopProcessTree(cmd)
							delete(activeProcesses, appSlug)
							writeLog("🛑 [STOP]: Force terminated from UI: %s\n", appSlug)
						}
						processMutex.Unlock()
						refreshInstalledApps()
					})

					openBtn = widget.NewButton("🌐 Open UI", func() {
						if u, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%s", targetPort)); err == nil {
							a.OpenURL(u)
						}
					})
				} else {
					actionBtn = widget.NewButtonWithIcon("Start App", theme.MediaPlayIcon(), func() {
						err := startAppLocally(appSlug)
						if err != nil {
							dialog.ShowError(err, w)
						} else {
							tabs.Select(tabTerminal)
							refreshInstalledApps()
						}
					})

					if _, err := os.Stat(configPath); os.IsNotExist(err) {
						actionBtn.Disable()
						actionBtn.SetText("Run (Web Only)")
					}
				}

				var btnBox *fyne.Container

				if isInstalling {
					btnBox = container.NewHBox(actionBtn)
				} else {
					delBtn := widget.NewButtonWithIcon("Uninstall", theme.DeleteIcon(), func() {
						dialog.ShowConfirm("Uninstall App", "Are you sure you want to delete "+displayName+"?", func(ok bool) {
							if ok {
								uninstallApp(appSlug)
								refreshInstalledApps()
								if refreshExploreApps != nil && exploreLoaded {
									fyne.Do(func() { refreshExploreApps() })
								}
							}
						}, w)
					})

					if isRunning {
						btnBox = container.NewHBox(openBtn, actionBtn, delBtn)
					} else {
						btnBox = container.NewHBox(actionBtn, delBtn)
					}
				}

				card := container.NewBorder(nil, nil, container.NewPadded(img), container.NewPadded(btnBox), container.NewPadded(textCol))
				appList.Add(container.NewPadded(card))
				appList.Add(widget.NewSeparator())
			}
		}
		appList.Refresh()
	}

	refreshInstalledApps = updateApps

	btnRefreshApps := widget.NewButton("↻ Refresh List", func() {
		updateApps()
	})

	tabApps := container.NewTabItem("📦 Installed Apps",
		container.NewBorder(
			container.NewPadded(btnRefreshApps), nil, nil, nil,
			container.NewScroll(appList),
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
		logoUI = container.NewCenter(container.NewPadded(logoImg))
	} else {
		logoUI = layout.NewSpacer()
	}

	lblTitle := canvas.NewText("🛍️ AI Bazaar Engine", theme.ForegroundColor())
	lblTitle.TextSize = 24
	lblTitle.TextStyle = fyne.TextStyle{Bold: true}
	lblTitle.Alignment = fyne.TextAlignCenter

	lblDesc := widget.NewLabelWithStyle(
		"The lightweight bridge daemon for securely executing AI models.\nPowered by Portable Pixi Runtimes.\nListening on Port 4500.",
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

	tabs = container.NewAppTabs(tabTerminal, tabExplore, tabApps, tabSettings)
	tabs.SetTabLocation(container.TabLocationTop)

	switchToInstalledTab = func() {
		tabs.Select(tabApps)
	}

	tabs.OnSelected = func(tab *container.TabItem) {
		if tab.Text == "📦 Installed Apps" {
			updateApps()
		} else if tab.Text == "🌐 Explore" {
			if !exploreLoaded {
				exploreLoaded = true
				loadExploreData()
			}
		}
	}

	w.SetContent(tabs)

	startServer()
	w.ShowAndRun()
}
