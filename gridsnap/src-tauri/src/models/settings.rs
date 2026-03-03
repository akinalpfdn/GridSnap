use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppSettings {
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    pub window_width: Option<u32>,
    pub window_height: Option<u32>,
    pub always_on_top: bool,
    pub start_minimized: bool,
    pub autostart: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            window_x: None,
            window_y: None,
            window_width: Some(900),
            window_height: Some(600),
            always_on_top: false,
            start_minimized: false,
            autostart: false,
        }
    }
}
