use crate::models::update::UpdateInfo;
use crate::services::update_checker;
use tauri_plugin_opener::OpenerExt;

/// Returns the latest release if it is newer than this build and not skipped.
/// The HTTP call lives here rather than in the webview so the app keeps its
/// `default-src 'self'` CSP — the webview never gets network access.
#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let current = app.package_info().version.to_string();
    update_checker::check(&app, &current).await
}

/// Suppresses the indicator for one specific version. The next release brings it back.
#[tauri::command]
pub fn skip_update(app: tauri::AppHandle, version: String) -> Result<(), String> {
    let mut state = update_checker::read_state(&app)?;
    state.skipped_version = Some(version);
    update_checker::write_state(&app, &state)
}

/// Opens a release page in the default browser. Only accepts URLs on the
/// project's own releases page so a compromised webview cannot use this as a
/// generic "open any URL" primitive.
#[tauri::command]
pub fn open_release_page(app: tauri::AppHandle, url: Option<String>) -> Result<(), String> {
    const ALLOWED_PREFIX: &str = "https://github.com/akinalpfdn/GridSnap/releases/";
    let target = match url {
        Some(u) if u.starts_with(ALLOWED_PREFIX) => u,
        Some(_) => return Err("Refused to open a URL outside the releases page.".into()),
        None => update_checker::RELEASES_PAGE.to_string(),
    };
    app.opener()
        .open_url(target, None::<&str>)
        .map_err(|e| format!("Failed to open release page: {}", e))
}
