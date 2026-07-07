//go:build !windows

package main

import (
	"context"
	"fmt"
	"image/color"
	"net"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	fyneContainer "fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"

	"github.com/docker/docker/client"
)

func hideWindow(cmd *exec.Cmd) {
	// No-op on Linux
}

func startPodmanService() (string, error) {
	// If it's already running, return the socket path
	if podmanCmd != nil && podmanCmd.Process != nil {
		return "unix://" + podmanSocketPath, nil
	}

	podmanPath, err := exec.LookPath("podman")
	if err != nil {
		return "", fmt.Errorf("podman is not installed on this system: %w", err)
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
