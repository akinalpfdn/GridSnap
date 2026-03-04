use base64::{engine::general_purpose::STANDARD, Engine};

const VERIFY_TOKEN: &[u8] = b"GRIDSNAP_SHEET_VERIFY";

/// Encrypts a known token with the given password and returns base64.
#[tauri::command]
pub fn hash_sheet_password(password: String) -> Result<String, String> {
    let encrypted = crate::services::encryption::encrypt(VERIFY_TOKEN, &password)?;
    Ok(STANDARD.encode(&encrypted))
}

/// Verifies a password by decrypting the stored hash and comparing.
#[tauri::command]
pub fn verify_sheet_password(hash: String, password: String) -> Result<bool, String> {
    let encrypted = STANDARD
        .decode(&hash)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
    match crate::services::encryption::decrypt(&encrypted, &password) {
        Ok(plaintext) => Ok(plaintext == VERIFY_TOKEN),
        Err(_) => Ok(false), // Wrong password = false, not an error
    }
}
