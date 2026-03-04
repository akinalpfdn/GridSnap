use crate::models::vault::Vault;
use crate::services::{encryption, storage};

/// Loads the vault. If password is empty, reads plaintext JSON.
/// If password is provided, decrypts with AES-256-GCM.
pub fn load(app: &tauri::AppHandle, password: &str) -> Result<Option<Vault>, String> {
    let raw = storage::read_vault_file(app)?;
    match raw {
        None => Ok(None),
        Some(data) => {
            let plaintext = if password.is_empty() {
                // Plaintext mode — data is raw JSON
                data
            } else {
                encryption::decrypt(&data, password)?
            };
            let vault: Vault = serde_json::from_slice(&plaintext)
                .map_err(|e| format!("Failed to parse vault: {}", e))?;
            Ok(Some(vault))
        }
    }
}

/// Saves the vault. If password is empty, writes plaintext JSON.
/// If password is provided, encrypts with AES-256-GCM.
pub fn save(app: &tauri::AppHandle, vault: &Vault, password: &str) -> Result<(), String> {
    let json = serde_json::to_vec(vault)
        .map_err(|e| format!("Failed to serialize vault: {}", e))?;
    if password.is_empty() {
        storage::write_vault_file(app, &json)?;
    } else {
        let encrypted = encryption::encrypt(&json, password)?;
        storage::write_vault_file(app, &encrypted)?;
    }
    Ok(())
}

/// Changes the vault password. Handles all transitions:
/// - unprotected -> protected (old_password = "")
/// - protected -> unprotected (new_password = "")
/// - protected -> protected (both non-empty)
pub fn change_password(
    app: &tauri::AppHandle,
    old_password: &str,
    new_password: &str,
) -> Result<(), String> {
    let vault = load(app, old_password)?
        .ok_or_else(|| "No vault found".to_string())?;
    save(app, &vault, new_password)?;
    Ok(())
}
