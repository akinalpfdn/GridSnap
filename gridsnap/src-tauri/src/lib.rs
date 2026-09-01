mod commands;
mod models;
mod services;
mod tray;

use std::sync::Mutex;
use tauri::Manager;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered before every other plugin: a second launch
        // (e.g. the autostart LaunchAgent plus opening the app manually on
        // macOS) exits immediately and reveals the running window instead of
        // spawning a second tray icon.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_always_on_top(true);
                let _ = window.set_focus();
            }
        }))
        .manage(commands::vault::VaultState {
            password: Mutex::new(None),
            locked: Mutex::new(false),
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // macOS: hide from dock, live only in system tray
            #[cfg(target_os = "macos")]
            app.set_activation_policy(ActivationPolicy::Accessory);

            tray::setup_tray_events(app)?;

            // Register Ctrl+Shift+Space global shortcut
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Space,
            );
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Some(window) = handle.get_webview_window("main") {
                        if window.is_visible().unwrap_or(false) {
                            let _ = window.hide();
                        } else {
                            let _ = window.show();
                            let _ = window.set_always_on_top(true);
                            let _ = window.set_focus();
                        }
                    }
                }
            })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault::load_vault,
            commands::vault::save_vault,
            commands::vault::create_vault,
            commands::vault::change_password,
            commands::vault::lock_vault,
            commands::clipboard::write_clipboard,
            commands::clipboard::read_clipboard,
            commands::autostart::autostart_enable,
            commands::autostart::autostart_disable,
            commands::autostart::autostart_is_enabled,
            commands::shortcut::change_shortcut,
            commands::app::quit_app,
            commands::app::hide_window,
            commands::sheet_password::hash_sheet_password,
            commands::sheet_password::verify_sheet_password,
            commands::backup::export_vault,
            commands::backup::import_vault,
            commands::update::check_for_update,
            commands::update::skip_update,
            commands::update::open_release_page,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
