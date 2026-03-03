use crate::models::vault::Vault;
use crate::services::vault_manager;
use std::sync::Mutex;
use tauri::State;

pub struct VaultState {
    pub password: Mutex<Option<String>>,
}

#[tauri::command]
pub fn load_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    password: String,
) -> Result<Option<Vault>, String> {
    let result = vault_manager::load(&app, &password)?;
    if result.is_some() {
        *state.password.lock().unwrap() = Some(password);
    }
    Ok(result)
}

#[tauri::command]
pub fn save_vault(
    app: tauri::AppHandle,
    state: State<'_, VaultState>,
    vault: Vault,
) -> Result<bool, String> {
    let pw = state.password.lock().unwrap();
    let password = pw.as_ref().ok_or("Vault is locked")?;
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
    *state.password.lock().unwrap() = Some(password);
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
    *state.password.lock().unwrap() = Some(new_password);
    Ok(true)
}
