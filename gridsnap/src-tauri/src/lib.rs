mod commands;
mod models;
mod services;
mod tray;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::vault::VaultState {
            password: Mutex::new(None),
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            tray::setup_tray_events(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault::load_vault,
            commands::vault::save_vault,
            commands::vault::create_vault,
            commands::vault::change_password,
            commands::clipboard::write_clipboard,
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
