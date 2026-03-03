<p align="center">
  <img src="icons/logo.svg" width="120" alt="GridSnap Logo" />
</p>

<h1 align="center">GridSnap</h1>

<p align="center">
  <strong>Encrypted grid-based note manager for sensitive data.</strong><br>
  SSH commands, credentials, API keys, code snippets — all one hotkey away.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-D4915E?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/tauri-v2-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/rust-secure-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bundle-~8.5MB-blue?style=flat-square" alt="Bundle Size" />
  <img src="https://img.shields.io/badge/RAM-~30MB-blue?style=flat-square" alt="Memory" />
  <img src="https://img.shields.io/badge/startup-<500ms-blue?style=flat-square" alt="Startup Time" />
</p>

---

## Why GridSnap?

You probably have credentials, SSH commands, connection strings, and API keys scattered across sticky notes, text files, and password managers that aren't designed for quick copy-paste workflows.

GridSnap gives you a **spreadsheet-like grid** that lives in your system tray. Press `Ctrl+Shift+Space`, click a cell, and it's on your clipboard. Everything is encrypted at rest with AES-256-GCM.

**This is not a password manager.** It's a fast, encrypted scratch grid for things you copy-paste daily.

---

## Features

**Grid Engine**
- Virtualized 1000×26 grid — scrolls at 60fps
- Keyboard navigation (Arrow keys, Tab, Enter, Escape)
- Type-to-edit: start typing to fill a cell
- Click-to-copy with `Ctrl+C` or the inline copy button
- Column resize (50–600px), row resize (22–120px)
- Search across all cells with instant highlighting

**Sheets**
- Multiple sheets with colored tabs
- Add, remove, rename, reorder
- **Masked sheets** — cell values show as `●●●●` until you click to edit
- Right-click a tab to toggle masking

**Security**
- AES-256-GCM encryption with Argon2id key derivation
- Master password required on launch
- Vault file is binary — unreadable without the password
- Keys are zeroized from memory after use
- No network access, no telemetry, no cloud

**Desktop Integration**
- System tray with show/hide toggle
- `Ctrl+Shift+Space` global hotkey (configurable)
- Close button minimizes to tray — the app stays ready
- Optional launch on startup
- ~8.5MB bundle, ~30MB RAM

---

## Installation

### Download

Grab the latest release from [**Releases**](../../releases):

| Platform | File |
|----------|------|
| Windows (installer) | `GridSnap_x.x.x_x64-setup.exe` |
| Windows (MSI) | `GridSnap_x.x.x_x64_en-US.msi` |

> macOS and Linux builds are planned.

### Build from Source

**Prerequisites:** [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/) 1.70+

```bash
git clone https://github.com/YOUR_USERNAME/GridSnap.git
cd GridSnap/gridsnap
npm install
npm run tauri dev      # Development with hot reload
npm run tauri build    # Production build
```

---

## Usage

1. **First launch** — create a master password
2. **Unlock** — enter your password to decrypt the vault
3. **Navigate** — click a cell or use arrow keys
4. **Edit** — double-click or press Enter, then type
5. **Copy** — click the copy icon or press `Ctrl+C`
6. **New sheet** — click `+` in the tab bar
7. **Mask a sheet** — right-click the tab to toggle `●●●●` mode
8. **Hide** — press `Ctrl+Shift+Space` or close the window (goes to tray)
9. **Quit** — right-click the tray icon → Quit

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Tauri v2 (~8.5MB bundle, native OS webview) |
| Frontend | React 18 + TypeScript |
| Styling | CSS Modules + CSS Custom Properties |
| Grid | Custom virtualized renderer (prefix-sum + binary search) |
| State | Zustand |
| Build | Vite 6 |
| Encryption | AES-256-GCM + Argon2id (Rust) |
| Storage | Encrypted JSON vault (Rust fs) |

---

## Project Structure

```
gridsnap/
├── src/                    # React frontend
│   ├── components/         # Grid, Sheets, Toolbar, LockScreen
│   ├── hooks/              # Navigation, resize, clipboard, search
│   ├── stores/             # Zustand (vaultStore, settingsStore)
│   ├── services/           # Tauri IPC bridge
│   ├── theme/              # CSS tokens + themes
│   ├── types/              # TypeScript definitions
│   └── utils/              # Grid math, cell keys, debounce
│
├── src-tauri/              # Rust backend
│   ├── src/commands/       # IPC handlers (vault, clipboard)
│   ├── src/services/       # Encryption, storage, vault manager
│   ├── src/models/         # Vault, Sheet, Settings structs
│   └── src/tray.rs         # System tray setup
│
└── icons/                  # App icons (all platforms)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle window (global) |
| `Arrow keys` | Navigate cells |
| `Tab` / `Shift+Tab` | Move right / left |
| `Enter` | Edit cell / move down |
| `Escape` | Stop editing / deselect |
| `Ctrl+C` | Copy cell value |
| `Delete` | Clear cell |
| Any key | Type-to-edit selected cell |

---

## Theming

GridSnap uses CSS custom properties for theming. The default **Carbon** theme is a warm dark theme with amber accents.

To create a new theme, add a CSS file in `src/theme/themes/` and define the `--theme-*` variables under a `[data-theme="your-theme"]` selector. No component changes needed.

---

## Security Model

- **Encryption**: AES-256-GCM (authenticated encryption)
- **Key derivation**: Argon2id (64MB memory, 3 iterations, 4 parallelism)
- **Storage format**: `[salt 16B | nonce 12B | ciphertext | tag 16B]`
- **No plaintext** ever touches disk — the vault file is always encrypted
- **Memory safety**: Rust backend with `zeroize` for sensitive data cleanup
- **No network**: the app makes zero outbound connections

---

## Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-thing`)
3. Commit your changes
4. Push and open a PR

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>Built with Tauri, React, and Rust. Encrypted by default.</sub>
</p>
