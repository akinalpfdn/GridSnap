use crate::models::update::{UpdateInfo, UpdateState};
use crate::services::storage;
use std::fs;
use std::time::Duration;

/// Public, unauthenticated endpoint — 60 requests/hour per IP is far more than
/// a check on launch plus one every few hours needs.
const RELEASES_API: &str =
    "https://api.github.com/repos/akinalpfdn/GridSnap/releases/latest";
pub const RELEASES_PAGE: &str = "https://github.com/akinalpfdn/GridSnap/releases/latest";

const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

/// Splits a tag or version into (major, minor, patch), tolerating a leading `v`
/// and ignoring any pre-release/build suffix. Returns None on anything unparsable
/// so a malformed tag is treated as "no update" rather than a spurious prompt.
fn parse_version(raw: &str) -> Option<(u64, u64, u64)> {
    let core = raw.trim().trim_start_matches('v');
    let core = core.split(['-', '+']).next()?;
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next().unwrap_or("0").parse().ok()?;
    let patch = parts.next().unwrap_or("0").parse().ok()?;
    Some((major, minor, patch))
}

pub fn read_state(app: &tauri::AppHandle) -> Result<UpdateState, String> {
    let path = storage::update_state_path(app)?;
    if !path.exists() {
        return Ok(UpdateState::default());
    }
    let data = fs::read(&path).map_err(|e| format!("Failed to read update state: {}", e))?;
    // A corrupt state file must not block the app — fall back to "nothing skipped".
    Ok(serde_json::from_slice(&data).unwrap_or_default())
}

pub fn write_state(app: &tauri::AppHandle, state: &UpdateState) -> Result<(), String> {
    let path = storage::update_state_path(app)?;
    let data = serde_json::to_vec_pretty(state)
        .map_err(|e| format!("Failed to serialize update state: {}", e))?;
    fs::write(&path, data).map_err(|e| format!("Failed to write update state: {}", e))?;
    Ok(())
}

/// Decides whether a release payload represents an update worth showing.
/// Kept free of IO so the whole rule set is directly testable.
fn decide(
    current_version: &str,
    release: &serde_json::Value,
    skipped_version: Option<&str>,
) -> Result<Option<UpdateInfo>, String> {
    let current = parse_version(current_version)
        .ok_or_else(|| format!("Unreadable app version: {}", current_version))?;

    let tag = release
        .get("tag_name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Release response has no tag_name".to_string())?;

    let Some(latest) = parse_version(tag) else {
        return Ok(None);
    };
    if latest <= current {
        return Ok(None);
    }

    let latest_version = tag.trim_start_matches('v').to_string();
    if skipped_version == Some(latest_version.as_str()) {
        return Ok(None);
    }

    Ok(Some(UpdateInfo {
        current_version: current_version.to_string(),
        latest_version,
        notes: release
            .get("body")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string(),
        release_url: release
            .get("html_url")
            .and_then(|v| v.as_str())
            .unwrap_or(RELEASES_PAGE)
            .to_string(),
    }))
}

async fn fetch_latest_release() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        // GitHub rejects requests without a User-Agent.
        .user_agent(concat!("GridSnap/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client
        .get(RELEASES_API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("Update check request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Update check returned HTTP {}", response.status()));
    }

    response
        .json()
        .await
        .map_err(|e| format!("Update check returned invalid JSON: {}", e))
}

/// Asks GitHub for the latest release and returns it only if it is a newer
/// version than `current_version` and has not been skipped by the user.
pub async fn check(
    app: &tauri::AppHandle,
    current_version: &str,
) -> Result<Option<UpdateInfo>, String> {
    let release = fetch_latest_release().await?;
    let skipped = read_state(app)?.skipped_version;
    decide(current_version, &release, skipped.as_deref())
}

#[cfg(test)]
mod tests {
    use super::{decide, fetch_latest_release, parse_version, RELEASES_PAGE};
    use serde_json::json;

    /// Hits the real GitHub API — excluded from the default run so the suite
    /// stays offline-safe. Run with: cargo test -- --ignored
    #[tokio::test]
    #[ignore]
    async fn should_fetch_a_release_payload_decide_can_read() {
        let release = fetch_latest_release().await.expect("request failed");
        let tag = release["tag_name"].as_str().expect("no tag_name");
        assert!(parse_version(tag).is_some(), "unparsable tag: {tag}");
        // A build one patch behind the live release must be offered the update.
        assert!(decide("0.0.1", &release, None).unwrap().is_some());
    }

    /// Shaped exactly like the fields GridSnap reads from
    /// GET /repos/{owner}/{repo}/releases/latest.
    fn release(tag: &str) -> serde_json::Value {
        json!({
            "tag_name": tag,
            "body": "  **Full Changelog**: ...  ",
            "html_url": format!("https://github.com/akinalpfdn/GridSnap/releases/tag/{tag}"),
        })
    }

    #[test]
    fn should_report_update_when_release_is_newer() {
        let found = decide("1.2.2", &release("v1.2.3"), None).unwrap().unwrap();
        assert_eq!(found.latest_version, "1.2.3");
        assert_eq!(found.current_version, "1.2.2");
        assert_eq!(
            found.release_url,
            "https://github.com/akinalpfdn/GridSnap/releases/tag/v1.2.3"
        );
        assert_eq!(found.notes, "**Full Changelog**: ...");
    }

    #[test]
    fn should_report_nothing_when_release_matches_running_version() {
        assert!(decide("1.2.2", &release("v1.2.2"), None).unwrap().is_none());
    }

    #[test]
    fn should_report_nothing_when_release_is_older() {
        assert!(decide("1.2.2", &release("v1.1.0"), None).unwrap().is_none());
    }

    #[test]
    fn should_report_nothing_when_that_version_was_skipped() {
        assert!(decide("1.2.2", &release("v1.2.3"), Some("1.2.3"))
            .unwrap()
            .is_none());
    }

    #[test]
    fn should_report_update_when_a_different_version_was_skipped() {
        // Skipping 1.2.3 must not silence 1.3.0.
        assert!(decide("1.2.2", &release("v1.3.0"), Some("1.2.3"))
            .unwrap()
            .is_some());
    }

    #[test]
    fn should_report_nothing_when_tag_is_unparsable() {
        assert!(decide("1.2.2", &release("nightly"), None).unwrap().is_none());
    }

    #[test]
    fn should_error_when_response_has_no_tag() {
        assert!(decide("1.2.2", &json!({ "body": "x" }), None).is_err());
    }

    #[test]
    fn should_fall_back_to_releases_page_when_html_url_missing() {
        let found = decide("1.2.2", &json!({ "tag_name": "v1.2.3" }), None)
            .unwrap()
            .unwrap();
        assert_eq!(found.release_url, RELEASES_PAGE);
        assert_eq!(found.notes, "");
    }


    #[test]
    fn should_parse_tags_with_and_without_v_prefix() {
        assert_eq!(parse_version("v1.2.3"), Some((1, 2, 3)));
        assert_eq!(parse_version("1.2.3"), Some((1, 2, 3)));
    }

    #[test]
    fn should_ignore_prerelease_and_build_suffixes() {
        assert_eq!(parse_version("v1.2.3-beta.1"), Some((1, 2, 3)));
        assert_eq!(parse_version("1.2.3+build7"), Some((1, 2, 3)));
    }

    #[test]
    fn should_default_missing_components_to_zero() {
        assert_eq!(parse_version("v2"), Some((2, 0, 0)));
        assert_eq!(parse_version("v2.1"), Some((2, 1, 0)));
    }

    #[test]
    fn should_return_none_when_tag_is_not_a_version() {
        assert_eq!(parse_version("nightly"), None);
        assert_eq!(parse_version(""), None);
    }

    #[test]
    fn should_order_versions_numerically_not_lexically() {
        // "1.10.0" < "1.9.0" under string comparison — the bug this guards against.
        assert!(parse_version("v1.10.0") > parse_version("v1.9.0"));
        assert!(parse_version("v1.2.2") < parse_version("v1.2.10"));
    }
}
