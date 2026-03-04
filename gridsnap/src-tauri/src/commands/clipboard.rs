use arboard::Clipboard;
use tauri::Emitter;

#[tauri::command]
pub fn write_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    clipboard
        .set_text(&text)
        .map_err(|e| format!("Clipboard error: {}", e))?;
    let _ = app.emit("clipboard-written", ());
    Ok(())
}

#[tauri::command]
pub fn read_clipboard() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    clipboard
        .get_text()
        .map_err(|e| format!("Clipboard error: {}", e))
}
