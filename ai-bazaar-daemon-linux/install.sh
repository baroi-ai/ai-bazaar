#!/bin/bash
set -e

# Define installation target directories
INSTALL_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

# Create directories if they don't exist
mkdir -p "$INSTALL_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$DESKTOP_DIR"

# Copy binary and icons
echo "Installing AI Bazaar..."
cp -f "$(dirname "$0")/ai-bazaar-daemon" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/ai-bazaar-daemon"

cp -f "$(dirname "$0")/icon.png" "$ICON_DIR/ai-bazaar-daemon.png"
cp -f "$(dirname "$0")/logo.png" "$ICON_DIR/ai-bazaar-daemon-logo.png"

# Create .desktop application shortcut
echo "Creating desktop shortcut..."
cat <<EOF > "$DESKTOP_DIR/ai-bazaar-daemon.desktop"
[Desktop Entry]
Type=Application
Name=AI Bazaar
Comment=Lightweight bridge for executing local AI models.
Exec=$INSTALL_DIR/ai-bazaar-daemon
Icon=ai-bazaar-daemon
Terminal=false
Categories=Utility;Development;
EOF

chmod +x "$DESKTOP_DIR/ai-bazaar-daemon.desktop"

echo "Installation complete! You can now launch the app with its logo from your application menu or dock."
