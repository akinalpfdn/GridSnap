use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{self, Argon2, Params};
use rand::RngCore;
use zeroize::Zeroize;

const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

/// Derives a 256-bit key from password using Argon2id.
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; KEY_LEN], String> {
    let params = Params::new(65536, 3, 4, Some(KEY_LEN))
        .map_err(|e| format!("Argon2 params error: {}", e))?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

    let mut key = [0u8; KEY_LEN];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation error: {}", e))?;
    Ok(key)
}

/// Encrypts data with AES-256-GCM.
/// Returns: [salt (16B) | nonce (12B) | ciphertext | tag (16B)]
pub fn encrypt(plaintext: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    let mut key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init error: {}", e))?;
    key.zeroize();

    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption error: {}", e))?;

    let mut result = Vec::with_capacity(SALT_LEN + NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&salt);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

/// Decrypts data encrypted with `encrypt`.
pub fn decrypt(encrypted: &[u8], password: &str) -> Result<Vec<u8>, String> {
    if encrypted.len() < SALT_LEN + NONCE_LEN + 16 {
        return Err("Encrypted data too short".to_string());
    }

    let salt = &encrypted[..SALT_LEN];
    let nonce_bytes = &encrypted[SALT_LEN..SALT_LEN + NONCE_LEN];
    let ciphertext = &encrypted[SALT_LEN + NONCE_LEN..];

    let mut key = derive_key(password, salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init error: {}", e))?;
    key.zeroize();

    let nonce = Nonce::from_slice(nonce_bytes);
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed — wrong password or corrupt data".to_string())?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let data = b"Hello, GridSnap!";
        let password = "test_password_123";

        let encrypted = encrypt(data, password).unwrap();
        let decrypted = decrypt(&encrypted, password).unwrap();

        assert_eq!(data.to_vec(), decrypted);
    }

    #[test]
    fn test_wrong_password_fails() {
        let data = b"secret data";
        let encrypted = encrypt(data, "correct_password").unwrap();
        let result = decrypt(&encrypted, "wrong_password");
        assert!(result.is_err());
    }
}
