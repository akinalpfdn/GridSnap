use tauri::Emitter;

#[tauri::command]
pub fn write_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    // Use arboard for cross-platform clipboard
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell for reliable clipboard on Windows
        let status = Command::new("powershell")
            .args(["-Command", &format!("Set-Clipboard -Value '{}'", text.replace('\'', "''"))])
            .status()
            .map_err(|e| format!("Clipboard error: {}", e))?;
        if !status.success() {
            return Err("Failed to write to clipboard".to_string());
        }
    }

    let _ = app.emit("clipboard-written", ());
    Ok(())
}
