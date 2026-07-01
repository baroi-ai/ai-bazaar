#!/bin/bash
set -e

# Define installation target directories
INSTALL_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

echo "Uninstalling AI Bazaar..."

# Remove binary
if [ -f "$INSTALL_DIR/ai-bazaar-daemon" ]; then
    rm -f "$INSTALL_DIR/ai-bazaar-daemon"
    echo "Removed binary."
fi

# Remove icons
if [ -f "$ICON_DIR/ai-bazaar-daemon.png" ]; then
    rm -f "$ICON_DIR/ai-bazaar-daemon.png"
fi
if [ -f "$ICON_DIR/ai-bazaar-daemon-logo.png" ]; then
    rm -f "$ICON_DIR/ai-bazaar-daemon-logo.png"
fi
echo "Removed icons."

# Remove desktop shortcut
if [ -f "$DESKTOP_DIR/ai-bazaar-daemon.desktop" ]; then
    rm -f "$DESKTOP_DIR/ai-bazaar-daemon.desktop"
    echo "Removed desktop shortcut."
fi

echo "Uninstallation complete!"
