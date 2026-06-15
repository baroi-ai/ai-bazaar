package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ---------------------------------------------------------
// DATA STRUCTURES & GLOBAL STATE
// ---------------------------------------------------------

type AppRequest struct {
	Action string `json:"action"`
	Image  string `json:"image"`
	Port   string `json:"port"`
	Slug   string `json:"slug"`
}

type StopRequest struct {
	Slug string `json:"slug"`
}

type DeleteRequest struct {
	Image string `json:"image"`
}

type CheckRequest struct {
	Image string `json:"image"`
}

var gpuFlags []string

// Global registry to track and kill active downloads
var activeDownloads = make(map[string]context.CancelFunc)
var downloadsMutex sync.Mutex

// ---------------------------------------------------------
// SYSTEM INITIALIZATION
// ---------------------------------------------------------

func EnsurePodmanConfig() {
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	configDir := filepath.Join(home, ".config", "containers")
	os.MkdirAll(configDir, 0755)
	policyPath := filepath.Join(configDir, "policy.json")
	if _, err := os.Stat(policyPath); os.IsNotExist(err) {
		defaultPolicy := `{"default": [{"type": "insecureAcceptAnything"}]}`
		os.WriteFile(policyPath, []byte(defaultPolicy), 0644)
	}
}

func DetectAMDHardware() {
	fmt.Println("🔍 Probing system for AMD Hardware acceleration...")
	if _, err := os.Stat("/dev/dri"); os.IsNotExist(err) {
		return
	}
	files, _ := os.ReadDir("/sys/class/drm")
	isAMD := false
	for _, file := range files {
		if strings.HasPrefix(file.Name(), "card") {
			deviceLink := fmt.Sprintf("/sys/class/drm/%s/device/uevent", file.Name())
			data, err := os.ReadFile(deviceLink)
			if err == nil {
				if strings.Contains(string(data), "DRIVER=amdgpu") || strings.Contains(string(data), "DRIVER=radeon") {
					isAMD = true
				}
			}
		}
	}
	if isAMD {
		gpuFlags = []string{"--device", "/dev/dri:/dev/dri"}
		fmt.Println("✅ Success: AMD hardware isolated.")
	}
}

// ---------------------------------------------------------
// HTTP ENDPOINTS (REST API)
// ---------------------------------------------------------

func handleCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req CheckRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Image == "" {
		http.Error(w, "Missing image URL", http.StatusBadRequest)
		return
	}

	podmanPath, _ := filepath.Abs("./bin/podman")
	binDir, _ := filepath.Abs("./bin")

	cmd := exec.Command(podmanPath, "images", "-q", req.Image)
	cmd.Env = append(os.Environ(),
		"CONTAINERS_HELPER_BINARY_DIR="+binDir,
		"PATH="+binDir+":"+os.Getenv("PATH"),
	)

	out, _ := cmd.Output()
	isInstalled := len(strings.TrimSpace(string(out))) > 0

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if isInstalled {
		fmt.Printf("\n🔎 [CHECK]: App Image '%s' is installed.\n", req.Image)
		w.Write([]byte(`{"installed": true}`))
	} else {
		fmt.Printf("\n🔎 [CHECK]: App Image '%s' is NOT installed.\n", req.Image)
		w.Write([]byte(`{"installed": false}`))
	}
}

func handleStop(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req StopRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Slug == "" {
		http.Error(w, "Missing app slug", http.StatusBadRequest)
		return
	}

	// 1. If the app is currently downloading, hit the kill switch!
	downloadsMutex.Lock()
	if cancelFunc, exists := activeDownloads[req.Slug]; exists {
		fmt.Printf("\n🚫 [CANCEL]: Halting active download for '%s'.\n", req.Slug)
		cancelFunc()
		delete(activeDownloads, req.Slug)
	}
	downloadsMutex.Unlock()

	// 2. Target exactly the running app and forcefully execute it
	containerName := "aibazaar-" + req.Slug

	podmanPath, _ := filepath.Abs("./bin/podman")
	binDir, _ := filepath.Abs("./bin")
	cmd := exec.Command(podmanPath, "rm", "-f", containerName)
	cmd.Env = append(os.Environ(),
		"CONTAINERS_HELPER_BINARY_DIR="+binDir,
		"PATH="+binDir+":"+os.Getenv("PATH"),
	)
	cmd.Run()

	fmt.Printf("\n🛑 [STOP]: App container '%s' forcefully terminated.\n", containerName)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "stopped"}`))
}

func handleDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var req DeleteRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Image == "" {
		http.Error(w, "Missing image URL", http.StatusBadRequest)
		return
	}

	podmanPath, _ := filepath.Abs("./bin/podman")
	binDir, _ := filepath.Abs("./bin")

	cmd := exec.Command(podmanPath, "rmi", "-f", req.Image)
	cmd.Env = append(os.Environ(),
		"CONTAINERS_HELPER_BINARY_DIR="+binDir,
		"PATH="+binDir+":"+os.Getenv("PATH"),
	)

	cmd.Run()

	fmt.Printf("\n🗑️  [DELETE]: App Image '%s' permanently deleted from local cache.\n", req.Image)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "deleted"}`))
}

// ROUTE 4: /reset (Factory Reset: Stop all, delete all, prune system)
func handleReset(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	fmt.Println("\n⚠️  [RESET]: Initiating complete system wipe...")

	// 1. Cancel any active downloads globally
	downloadsMutex.Lock()
	for slug, cancelFunc := range activeDownloads {
		fmt.Printf("🚫 [CANCEL]: Halting active download for '%s'.\n", slug)
		cancelFunc()
		delete(activeDownloads, slug)
	}
	downloadsMutex.Unlock()

	podmanPath, _ := filepath.Abs("./bin/podman")
	binDir, _ := filepath.Abs("./bin")
	envVars := append(os.Environ(),
		"CONTAINERS_HELPER_BINARY_DIR="+binDir,
		"PATH="+binDir+":"+os.Getenv("PATH"),
	)

	// 2. Forcefully remove ALL containers (running or stopped)
	fmt.Println("🧹 [RESET]: Stopping and removing all containers...")
	cmdRm := exec.Command(podmanPath, "rm", "-fa")
	cmdRm.Env = envVars
	cmdRm.Run()

	// 3. Forcefully remove ALL downloaded images
	fmt.Println("🗑️  [RESET]: Deleting all downloaded images...")
	cmdRmi := exec.Command(podmanPath, "rmi", "-af")
	cmdRmi.Env = envVars
	cmdRmi.Run()

	// 4. Perform a deep system prune to clear leftover cache/networks
	fmt.Println("🔥 [RESET]: Deep cleaning podman system cache...")
	cmdPrune := exec.Command(podmanPath, "system", "prune", "-a", "--force")
	cmdPrune.Env = envVars
	cmdPrune.Run()

	fmt.Println("✅ [RESET]: System reset complete. Ready for fresh installations.")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "reset_complete"}`))
}

// ---------------------------------------------------------
// WEBSOCKET BRIDGE (Real-time Container Execution)
// ---------------------------------------------------------

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		var req AppRequest
		err := conn.ReadJSON(&req)
		if err != nil {
			break
		}

		if req.Action == "RUN" {
			podmanPath, _ := filepath.Abs("./bin/podman")
			binDir, _ := filepath.Abs("./bin")
			envVars := append(os.Environ(),
				"CONTAINERS_HELPER_BINARY_DIR="+binDir,
				"PATH="+binDir+":"+os.Getenv("PATH"),
			)

			targetPort := req.Port
			if targetPort == "" {
				targetPort = "8899"
			}

			containerName := "aibazaar-" + req.Slug

			cleanupCmd := exec.Command(podmanPath, "rm", "-f", containerName)
			cleanupCmd.Env = envVars
			cleanupCmd.Run()

			checkCmd := exec.Command(podmanPath, "images", "-q", req.Image)
			checkCmd.Env = envVars
			out, _ := checkCmd.Output()
			isInstalled := len(strings.TrimSpace(string(out))) > 0

			if isInstalled {
				msg := fmt.Sprintf("⚡ App already installed! Starting directly at http://127.0.0.1:%s", targetPort)
				fmt.Printf("\n🚀 [START]: Launching cached app %s on port %s\n", req.Slug, targetPort)
				conn.WriteMessage(websocket.TextMessage, []byte(msg))
			} else {
				msg := fmt.Sprintf("⚡ Installing App: %s (Check daemon terminal for real-time MB/GB progress...)", req.Image)
				fmt.Printf("\n📥 [DOWNLOAD]: Pulling image %s from registry...\n", req.Image)
				conn.WriteMessage(websocket.TextMessage, []byte(msg))

				ctx, cancel := context.WithCancel(context.Background())

				downloadsMutex.Lock()
				activeDownloads[req.Slug] = cancel
				downloadsMutex.Unlock()

				pullCmd := exec.CommandContext(ctx, podmanPath, "pull", req.Image)
				pullCmd.Env = envVars
				pullCmd.Stdout = os.Stdout
				pullCmd.Stderr = os.Stderr

				err := pullCmd.Run()

				downloadsMutex.Lock()
				delete(activeDownloads, req.Slug)
				downloadsMutex.Unlock()

				if err != nil {
					if ctx.Err() == context.Canceled {
						fmt.Printf("\n❌ [CANCELLED]: Download for %s was safely aborted by user.\n", req.Image)
						conn.WriteMessage(websocket.TextMessage, []byte("❌ Download Cancelled by User."))
					} else {
						fmt.Printf("\n❌ [ERROR]: Failed to download %s\n", req.Image)
						conn.WriteMessage(websocket.TextMessage, []byte("❌ Download failed! Check terminal for details."))
					}
					continue
				}

				fmt.Println("\n✅ [DOWNLOAD]: Complete! Booting engine...")
				conn.WriteMessage(websocket.TextMessage, []byte("✅ Download Complete! Booting up AI Engine..."))
			}

			args := []string{"run", "--rm", "--name", containerName, "-p", targetPort + ":" + targetPort}

			if len(gpuFlags) > 0 {
				args = append(args, gpuFlags...)
			}
			args = append(args, req.Image)

			cmd := exec.Command(podmanPath, args...)
			cmd.Env = envVars

			stdout, _ := cmd.StdoutPipe()
			stderr, _ := cmd.StderrPipe()
			cmd.Start()

			go func() {
				scanner := bufio.NewScanner(stdout)
				for scanner.Scan() {
					conn.WriteMessage(websocket.TextMessage, []byte("📦 [App Out]: "+scanner.Text()))
				}
			}()

			go func() {
				scanner := bufio.NewScanner(stderr)
				for scanner.Scan() {
					conn.WriteMessage(websocket.TextMessage, []byte("ℹ️ [App Log]: "+scanner.Text()))
				}
			}()

			cmd.Wait()
			fmt.Printf("\n💤 [EXIT]: Container %s gracefully exited.\n", containerName)
			conn.WriteMessage(websocket.TextMessage, []byte("✅ App stopped. Resources cleanly deallocated."))
		}
	}
}

func main() {
	EnsurePodmanConfig()
	DetectAMDHardware()

	http.HandleFunc("/check", handleCheck)
	http.HandleFunc("/delete", handleDelete)
	http.HandleFunc("/stop", handleStop)
	http.HandleFunc("/reset", handleReset) // NEW: The Deep Clean Endpoint
	http.HandleFunc("/ws", handleWebSocket)

	fmt.Println("\n==================================================")
	fmt.Println("📡 AI BAZAAR DAEMON ONLINE")
	fmt.Println("🌐 Listening on http://127.0.0.1:4500")
	fmt.Println("==================================================")
	log.Fatal(http.ListenAndServe(":4500", nil))
}
