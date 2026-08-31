use serde::{Deserialize, Serialize};

/// A release that is newer than the running build, handed to the frontend.
#[derive(Serialize, Clone, Debug)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub notes: String,
    pub release_url: String,
}

/// Persisted between runs so a skipped release stays skipped.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct UpdateState {
    pub skipped_version: Option<String>,
}
