use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Vault {
    pub version: u32,
    pub sheets: Vec<Sheet>,
    pub settings: VaultSettings,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Sheet {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub masked: bool,
    pub data: HashMap<String, String>,
    pub column_widths: HashMap<u32, f64>,
    pub row_heights: HashMap<u32, f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VaultSettings {
    pub theme: String,
    pub hotkey: String,
    pub idle_lock_minutes: u32,
    pub auto_save_debounce_ms: u32,
}

impl Default for Vault {
    fn default() -> Self {
        Self {
            version: 1,
            sheets: vec![Sheet::default()],
            settings: VaultSettings::default(),
            created_at: chrono_now(),
            updated_at: chrono_now(),
        }
    }
}

impl Default for Sheet {
    fn default() -> Self {
        Self {
            id: uuid_simple(),
            name: "Sheet 1".to_string(),
            icon: "grid".to_string(),
            color: "#D4915E".to_string(),
            masked: false,
            data: HashMap::new(),
            column_widths: HashMap::new(),
            row_heights: HashMap::new(),
        }
    }
}

impl Default for VaultSettings {
    fn default() -> Self {
        Self {
            theme: "carbon".to_string(),
            hotkey: "Ctrl+Shift+Space".to_string(),
            idle_lock_minutes: 5,
            auto_save_debounce_ms: 500,
        }
    }
}

fn uuid_simple() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    format!("{}", secs)
}
