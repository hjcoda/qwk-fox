#!/bin/bash
# Save as launch.sh
export WINIT_UNIX_BACKEND=wayland
export GDK_BACKEND=wayland,x11
export QT_QPA_PLATFORM=wayland
export SDL_VIDEODRIVER=wayland
export MOZ_ENABLE_WAYLAND=1

# Launch your app
#WEBKIT_DISABLE_COMPOSITING_MODE=1 
WEBKIT_DISABLE_DMABUF_RENDERER=1 yarn tauri dev