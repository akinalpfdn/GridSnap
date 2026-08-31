use crate::models::vault::Vault;
use crate::services::vault_manager;
use std::sync::Mutex;
use tauri::State;

pub struct VaultState {
    /// None = plaintext mode (no password), Some(pw) = encrypted mode
    pub password: Mutex<Option<String>>,
    /// Set by `lock_vault`. Distinguishes "locked, password forgotten" from
    /// plaintext mode — both have `password == None`, but writing in the first
    /// case would silently rewrite an encrypted vault as plaintext.
    pub locked: Mutex<bool>,
}

#[tauri::command]
pub fn load_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    password: String,
) -> Result<Option<Vault>, String> {
    let result = vault_manager::load(&app, &password)?;
    if result.is_some() {
        if password.is_empty() {
            *state.password.lock().unwrap() = None;
        } else {
            *state.password.lock().unwrap() = Some(password);
        }
        *state.locked.lock().unwrap() = false;
    }
    Ok(result)
}

#[tauri::command]
pub fn save_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    vault: Vault,
) -> Result<bool, String> {
    if *state.locked.lock().unwrap() {
        return Err("Vault is locked.".to_string());
    }
    let pw = state.password.lock().unwrap();
    let password = match pw.as_ref() {
        Some(p) => p.as_str(),
        None => "",
    };
    vault_manager::save(&app, &vault, password)?;
    Ok(true)
}

#[tauri::command]
pub fn create_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    password: String,
    vault: Vault,
) -> Result<bool, String> {
    vault_manager::save(&app, &vault, &password)?;
    if password.is_empty() {
        *state.password.lock().unwrap() = None;
    } else {
        *state.password.lock().unwrap() = Some(password);
    }
    Ok(true)
}

#[tauri::command]
pub fn change_password(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    old_password: String,
    new_password: String,
) -> Result<bool, String> {
    vault_manager::change_password(&app, &old_password, &new_password)?;
    if new_password.is_empty() {
        *state.password.lock().unwrap() = None;
    } else {
        *state.password.lock().unwrap() = Some(new_password);
    }
    Ok(true)
}

/// Forgets the session password so nothing can read or rewrite the vault until
/// the master password is entered again. Callers must persist pending changes
/// first — a locked vault refuses to save.
#[tauri::command]
pub fn lock_vault(state: State<'_, VaultState>) {
    *state.password.lock().unwrap() = None;
    *state.locked.lock().unwrap() = true;
}
