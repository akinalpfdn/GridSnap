use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const VAULT_FILENAME: &str = "vault.gs";

/// Returns the vault file path in the app data directory.
pub fn vault_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(app_dir.join(VAULT_FILENAME))
}

/// Reads raw bytes from the vault file.
pub fn read_vault_file(app: &tauri::AppHandle) -> Result<Option<Vec<u8>>, String> {
    let path = vault_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read(&path).map_err(|e| format!("Failed to read vault: {}", e))?;
    Ok(Some(data))
}

/// Writes raw bytes to the vault file.
pub fn write_vault_file(app: &tauri::AppHandle, data: &[u8]) -> Result<(), String> {
    let path = vault_path(app)?;
    fs::write(&path, data).map_err(|e| format!("Failed to write vault: {}", e))?;
    Ok(())
}
