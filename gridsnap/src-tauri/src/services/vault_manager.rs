use crate::models::vault::Vault;
use crate::services::{encryption, storage};

/// Loads and decrypts the vault.
pub fn load(app: &tauri::AppHandle, password: &str) -> Result<Option<Vault>, String> {
    let encrypted = storage::read_vault_file(app)?;
    match encrypted {
        None => Ok(None),
        Some(data) => {
            let plaintext = encryption::decrypt(&data, password)?;
            let vault: Vault = serde_json::from_slice(&plaintext)
                .map_err(|e| format!("Failed to parse vault: {}", e))?;
            Ok(Some(vault))
        }
    }
}

/// Encrypts and saves the vault.
pub fn save(app: &tauri::AppHandle, vault: &Vault, password: &str) -> Result<(), String> {
    let json = serde_json::to_vec(vault)
        .map_err(|e| format!("Failed to serialize vault: {}", e))?;
    let encrypted = encryption::encrypt(&json, password)?;
    storage::write_vault_file(app, &encrypted)?;
    Ok(())
}

/// Changes the vault password by decrypting with old and re-encrypting with new.
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
