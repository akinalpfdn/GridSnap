use crate::commands::vault::VaultState;
use crate::models::vault::Vault;
use crate::services::{encryption, storage};
use std::fs;
use tauri::State;

#[tauri::command]
pub fn export_vault(app: tauri::AppHandle, dest_path: String) -> Result<bool, String> {
    let data = storage::read_vault_file(&app)?
        .ok_or_else(|| "No vault file found to export.".to_string())?;
    fs::write(&dest_path, &data).map_err(|e| format!("Failed to write backup: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn import_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    source_path: String,
    backup_password: String,
) -> Result<Vault, String> {
    let data =
        fs::read(&source_path).map_err(|e| format!("Failed to read backup file: {}", e))?;

    // Decrypt if password provided, otherwise treat as plaintext
    let plaintext = if backup_password.is_empty() {
        data
    } else {
        encryption::decrypt(&data, &backup_password)?
    };

    // Validate JSON structure
    let vault: Vault = serde_json::from_slice(&plaintext)
        .map_err(|e| format!("Invalid vault file: {}", e))?;

    // Re-encrypt with current session password and save
    let session_pw = state.password.lock().unwrap();
    let password = match session_pw.as_ref() {
        Some(p) => p.as_str(),
        None => "",
    };

    if password.is_empty() {
        storage::write_vault_file(&app, &plaintext)?;
    } else {
        let encrypted = encryption::encrypt(&plaintext, password)?;
        storage::write_vault_file(&app, &encrypted)?;
    }

    Ok(vault)
}
