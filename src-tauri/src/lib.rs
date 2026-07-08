use std::fs;
use std::io::Read;
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn download_and_open(app: tauri::AppHandle, url: String, filename: String) -> Result<(), String> {
    let response = ureq::get(&url).call().map_err(|e| format!("Download failed: {e}"))?;

    let dir = std::env::temp_dir().join("clickside_attachments");
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create temp dir: {e}"))?;

    let path = dir.join(&filename);
    let mut body = Vec::new();
    response
        .into_reader()
        .read_to_end(&mut body)
        .map_err(|e| format!("Failed to read response: {e}"))?;
    fs::write(&path, &body).map_err(|e| format!("Failed to write file: {e}"))?;

    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("Failed to open file: {e}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![download_and_open])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
