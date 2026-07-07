//go:build windows

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"image/color"
	"net/url"
	"os/exec"
	"strings"
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

type PodmanMachine struct {
	Name    string `json:"Name"`
	Default bool   `json:"Default"`
	Running bool   `json:"Running"`
}

type PodmanConnection struct {
	Name string `json:"Name"`
	URI  string `json:"URI"`
}

func hideWindow(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
}

func cleanupPodmanService() {
	// No-op on Windows. We connect directly to the background VM named pipe.
}

func ensureEngineReady(w fyne.Window, onReady func(), onFailure func()) {
	go func() {
		// Step 1: Check if podman CLI is installed
		podmanPath, err := exec.LookPath("podman")
		if err != nil {
			writeLog("❌ Podman CLI not found in system path.\n")
			fyne.Do(func() {
				var d dialog.Dialog
				retryBtn := widget.NewButtonWithIcon("Retry Connection", theme.ViewRefreshIcon(), func() {
					if d != nil {
						d.Hide()
					}
					ensureEngineReady(w, onReady, onFailure)
				})
				downloadBtn := widget.NewButtonWithIcon("Download Podman Desktop", theme.HelpIcon(), func() {
					u, _ := url.Parse("https://podman-desktop.io/")
					fyne.CurrentApp().OpenURL(u)
				})
				content := fyneContainer.NewVBox(
					widget.NewLabel("Podman CLI was not found on your system path.\nAI Bazaar requires Podman to securely run AI models.\n\nPlease install Podman Desktop and WSL virtualization features."),
					fyneContainer.NewCenter(fyneContainer.NewHBox(downloadBtn, retryBtn)),
				)
				d = dialog.NewCustom("Podman Required", "Quit App", content, w)
				d.SetOnClosed(func() {
					if dockerCli == nil {
						if onFailure != nil {
							onFailure()
						} else {
							fyne.CurrentApp().Quit()
						}
					}
				})
				d.Show()
			})
			return
		}

		// Step 2: Check if machine is initialized
		writeLog("🔍 Checking Podman VM machines...\n")
		cmd := exec.Command(podmanPath, "machine", "ls", "--format", "json")
		hideWindow(cmd)
		out, err := cmd.Output()

		var machines []PodmanMachine
		if err == nil && len(out) > 0 {
			json.Unmarshal(out, &machines)
		}

		if err != nil || len(machines) == 0 {
			// No machine initialized! Automate creation.
			writeLog("ℹ️ No Podman machine initialized. Attempting initialization...\n")
			fyne.Do(func() {
				progress := widget.NewProgressBarInfinite()
				content := fyneContainer.NewVBox(
					widget.NewLabel("Initializing AI Container VM (podman machine init)...\nThis download and WSL setup may take a few minutes."),
					progress,
				)
				loadingD := dialog.NewCustom("Setting Up Environment", "", content, w)
				loadingD.Show()

				go func() {
					initCmd := exec.Command(podmanPath, "machine", "init", "--provider", "wsl")
					hideWindow(initCmd)
					initErr := initCmd.Run()

					fyne.Do(func() {
						loadingD.Hide()
						if initErr != nil {
							writeLog("❌ Automated podman machine init failed: %v\n", initErr)
							showSetupFailureDialog(w, "podman machine init --provider wsl", "AI Bazaar failed to automatically initialize the Podman machine.\nPlease open Command Prompt or PowerShell and run the command manually:", onReady, onFailure)
						} else {
							writeLog("✅ Automated podman machine init succeeded!\n")
							startPodmanMachineStep(w, podmanPath, onReady, onFailure)
						}
					})
				}()
			})
			return
		}

		// Machine is already initialized, move to start check
		startPodmanMachineStep(w, podmanPath, onReady, onFailure)
	}()
}

func startPodmanMachineStep(w fyne.Window, podmanPath string, onReady func(), onFailure func()) {
	// Re-run ls to find if the machine is currently running
	cmd := exec.Command(podmanPath, "machine", "ls", "--format", "json")
	hideWindow(cmd)
	out, err := cmd.Output()

	var machines []PodmanMachine
	if err == nil {
		json.Unmarshal(out, &machines)
	}

	isRunning := false
	defaultMachineName := "podman-machine-default"
	for _, m := range machines {
		if m.Default || len(machines) == 1 {
			if m.Running {
				isRunning = true
			}
			defaultMachineName = m.Name
			break
		}
	}

	if !isRunning {
		writeLog("ℹ️ Podman machine %s is stopped. Starting VM...\n", defaultMachineName)
		fyne.Do(func() {
			progress := widget.NewProgressBarInfinite()
			content := fyneContainer.NewVBox(
				widget.NewLabel(fmt.Sprintf("Starting AI Container VM (%s)...\nThis may take up to a minute.", defaultMachineName)),
				progress,
			)
			loadingD := dialog.NewCustom("Starting Engine", "", content, w)
			loadingD.Show()

			go func() {
				startCmd := exec.Command(podmanPath, "machine", "start", defaultMachineName)
				hideWindow(startCmd)
				startErr := startCmd.Run()

				fyne.Do(func() {
					loadingD.Hide()
					if startErr != nil {
						writeLog("❌ Automated podman machine start failed: %v\n", startErr)
						showSetupFailureDialog(w, "podman machine start", "AI Bazaar failed to automatically start the Podman machine VM.\nPlease open Command Prompt or PowerShell and run the start command manually:", onReady, onFailure)
					} else {
						writeLog("✅ Automated podman machine start succeeded!\n")
						connectSDKAndFinish(w, podmanPath, onReady, onFailure)
					}
				})
			}()
		})
		return
	}

	// VM is running, directly connect SDK client
	connectSDKAndFinish(w, podmanPath, onReady, onFailure)
}

func showSetupFailureDialog(w fyne.Window, cmdText string, message string, onReady func(), onFailure func()) {
	var d dialog.Dialog

	commandLabel := canvas.NewText(cmdText, color.RGBA{R: 34, G: 197, B: 94, A: 255})
	commandLabel.TextStyle = fyne.TextStyle{Bold: true, Monospace: true}

	bg := canvas.NewRectangle(color.RGBA{R: 24, G: 24, B: 27, A: 255})
	bg.SetMinSize(fyne.NewSize(300, 36))

	scrollContainer := fyneContainer.NewHScroll(commandLabel)
	cmdContainer := fyneContainer.NewStack(bg, fyneContainer.NewPadded(scrollContainer))

	var copyBtn *widget.Button
	copyBtn = widget.NewButtonWithIcon("Copy", theme.ContentCopyIcon(), func() {
		w.Clipboard().SetContent(cmdText)
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
	})

	retryBtn := widget.NewButtonWithIcon("Retry Setup", theme.ViewRefreshIcon(), func() {
		if d != nil {
			d.Hide()
		}
		ensureEngineReady(w, onReady, onFailure)
	})

	content := fyneContainer.NewVBox(
		widget.NewLabel(message),
		fyneContainer.NewBorder(nil, nil, nil, copyBtn, cmdContainer),
		fyneContainer.NewCenter(retryBtn),
	)

	d = dialog.NewCustom("Setup Failed", "Quit App", content, w)
	d.SetOnClosed(func() {
		if dockerCli == nil {
			if onFailure != nil {
				onFailure()
			} else {
				fyne.CurrentApp().Quit()
			}
		}
	})
	d.Show()
}

func connectSDKAndFinish(w fyne.Window, podmanPath string, onReady func(), onFailure func()) {
	var socketURL = "npipe:////./pipe/podman-machine-default"

	// Dynamically check connection list
	cmd := exec.Command(podmanPath, "system", "connection", "list", "--format", "json")
	hideWindow(cmd)
	if out, err := cmd.Output(); err == nil {
		var conns []PodmanConnection
		if json.Unmarshal(out, &conns) == nil {
			for _, c := range conns {
				if strings.HasPrefix(c.URI, "npipe://") {
					socketURL = c.URI
					break
				}
			}
		}
	}

	// Build a list of candidates to try in order
	candidates := []string{socketURL}
	addCandidate := func(u string) {
		for _, c := range candidates {
			if c == u {
				return
			}
		}
		candidates = append(candidates, u)
	}
	addCandidate("npipe:////./pipe/docker_engine")
	addCandidate("npipe:////./pipe/podman-machine-default")
	addCandidate("npipe:////./pipe/podman-machine-default-root")

	var connectedCli *client.Client
	var finalURL string
	var lastErr error

	for _, urlCandidate := range candidates {
		writeLog("🔌 Trying to connect to Podman named pipe: %s\n", urlCandidate)
		tempCli, err := client.NewClientWithOpts(
			client.WithHost(urlCandidate),
			client.WithAPIVersionNegotiation(),
		)
		if err != nil {
			lastErr = err
			continue
		}

		pingCtx, pingCancel := context.WithTimeout(context.Background(), 2*time.Second)
		_, pingErr := tempCli.Ping(pingCtx)
		pingCancel()

		if pingErr == nil {
			connectedCli = tempCli
			finalURL = urlCandidate
			break
		} else {
			lastErr = pingErr
		}
	}

	if connectedCli == nil {
		writeLog("❌ Connection check failed. Cannot connect to any Podman named pipe: %v\n", lastErr)
		fyne.Do(func() {
			showSetupFailureDialog(w, "podman machine start", "Failed to connect to the Podman named pipe VM.\nPlease ensure your VM is fully started and WSL is functional.", onReady, onFailure)
		})
		return
	}

	// Connected! Save client and complete ready hook
	processMutex.Lock()
	dockerCli = connectedCli
	processMutex.Unlock()

	writeLog("✅ Podman Engine is ready and connected via Named Pipe: %s\n", finalURL)
	if onReady != nil {
		fyne.Do(onReady)
	}
}
