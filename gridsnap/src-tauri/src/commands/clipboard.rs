use tauri::Emitter;
use std::process::Command;

#[tauri::command]
pub fn write_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
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

#[tauri::command]
pub fn read_clipboard() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args(["-Command", "Get-Clipboard"])
            .output()
            .map_err(|e| format!("Clipboard error: {}", e))?;
        if !output.status.success() {
            return Err("Failed to read clipboard".to_string());
        }
        let text = String::from_utf8_lossy(&output.stdout).trim_end().to_string();
        return Ok(text);
    }
    #[allow(unreachable_code)]
    Err("Unsupported platform".to_string())
}
