use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

static ALLOW_CLOSE: AtomicBool = AtomicBool::new(false);
static OPEN_PATHS: Mutex<Vec<String>> = Mutex::new(Vec::new());

fn remember_topo(path: String) {
    let file = PathBuf::from(&path);
    let ext = file.extension().and_then(|value| value.to_str()).unwrap_or("");
    if !ext.eq_ignore_ascii_case("topo") || !file.is_file() {
        return;
    }
    let Ok(mut paths) = OPEN_PATHS.lock() else {
        return;
    };
    if !paths.iter().any(|item| item == &path) {
        paths.push(path);
    }
}

fn launch_paths() -> Vec<String> {
    for arg in std::env::args().skip(1) {
        remember_topo(arg);
    }
    OPEN_PATHS.lock().map(|paths| paths.clone()).unwrap_or_default()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RecentFile {
    path: String,
    title: String,
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn recent_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("recent.json"))
}

fn autosave_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("autosave.topo"))
}

fn read_recent(app: &AppHandle) -> Vec<RecentFile> {
    let Ok(path) = recent_path(app) else {
        return Vec::new();
    };
    let Ok(text) = fs::read_to_string(path) else {
        return Vec::new();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

fn file_to_string(path: tauri_plugin_dialog::FilePath) -> Option<String> {
    path.into_path().ok().map(|value| value.to_string_lossy().into_owned())
}

#[tauri::command]
fn pick_open(app: AppHandle) -> Option<String> {
    let picked = app
        .dialog()
        .file()
        .set_title("Åpne topologi")
        .add_filter("Topologi", &["topo"])
        .blocking_pick_file()?;
    file_to_string(picked)
}

#[tauri::command]
fn pick_save(app: AppHandle, title: String, file_name: String, filter_name: String, extensions: Vec<String>) -> Option<String> {
    let owned: Vec<&str> = extensions.iter().map(String::as_str).collect();
    let picked = app
        .dialog()
        .file()
        .set_title(title)
        .set_file_name(file_name)
        .add_filter(filter_name, &owned)
        .blocking_save_file()?;
    file_to_string(picked)
}

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn recent_list(app: AppHandle) -> Vec<RecentFile> {
    read_recent(&app)
}

#[tauri::command]
fn recent_add(app: AppHandle, path: String, title: String) -> Result<(), String> {
    if path.is_empty() {
        return Ok(());
    }
    let mut files = read_recent(&app);
    files.retain(|file| file.path != path);
    files.insert(0, RecentFile { path, title });
    files.truncate(8);
    let text = serde_json::to_string_pretty(&files).map_err(|error| error.to_string())?;
    fs::write(recent_path(&app)?, text).map_err(|error| error.to_string())
}

#[tauri::command]
fn autosave_write(app: AppHandle, contents: String) -> Result<(), String> {
    fs::write(autosave_path(&app)?, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn autosave_read(app: AppHandle) -> Option<String> {
    let path = autosave_path(&app).ok()?;
    let text = fs::read_to_string(path).ok()?;
    if text.trim().is_empty() {
        None
    } else {
        Some(text)
    }
}

#[tauri::command]
fn autosave_clear(app: AppHandle) -> Result<(), String> {
    let path = autosave_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn launch_files() -> Vec<String> {
    launch_paths()
}

#[tauri::command]
fn force_close(window: tauri::WebviewWindow) {
    ALLOW_CLOSE.store(true, Ordering::SeqCst);
    let _ = window.close();
}

fn item(app: &AppHandle, id: &str, label: &str, accelerator: Option<&str>) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItem::with_id(app, id, label, true, accelerator)
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let app_menu = Submenu::with_items(
        app,
        "Topologi Studio",
        true,
        &[
            &item(app, "about", "Om Topologi Studio", None)?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "quit", "Avslutt Topologi Studio", Some("CmdOrCtrl+Q"))?,
        ],
    )?;
    let file_menu = Submenu::with_items(
        app,
        "Fil",
        true,
        &[
            &item(app, "new", "Nytt…", Some("CmdOrCtrl+N"))?,
            &item(app, "open", "Åpne…", Some("CmdOrCtrl+O"))?,
            &item(app, "recent", "Åpne nylig…", None)?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "save", "Lagre", Some("CmdOrCtrl+S"))?,
            &item(app, "save-as", "Lagre som…", Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "export-png", "Eksporter PNG…", Some("CmdOrCtrl+Shift+E"))?,
            &item(app, "export-svg", "Eksporter SVG…", None)?,
            &item(app, "export-pdf", "Eksporter PDF…", None)?,
        ],
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "Rediger",
        true,
        &[
            &item(app, "undo", "Angre", Some("CmdOrCtrl+Z"))?,
            &item(app, "redo", "Gjør om", Some("CmdOrCtrl+Shift+Z"))?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "cut", "Klipp ut", Some("CmdOrCtrl+X"))?,
            &item(app, "copy", "Kopier", Some("CmdOrCtrl+C"))?,
            &item(app, "paste", "Lim inn", Some("CmdOrCtrl+V"))?,
            &item(app, "duplicate", "Dupliser", Some("CmdOrCtrl+D"))?,
            &item(app, "delete", "Slett", Some("Backspace"))?,
            &item(app, "select-all", "Merk alt", Some("CmdOrCtrl+A"))?,
        ],
    )?;
    let view_menu = Submenu::with_items(
        app,
        "Vis",
        true,
        &[
            &item(app, "zoom-in", "Forstørr", Some("CmdOrCtrl+Plus"))?,
            &item(app, "zoom-out", "Forminsk", Some("CmdOrCtrl+Minus"))?,
            &item(app, "zoom-100", "100 %", Some("CmdOrCtrl+0"))?,
            &item(app, "zoom-fit", "Tilpass vindu", Some("CmdOrCtrl+1"))?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "toggle-grid", "Rutenett", None)?,
            &item(app, "toggle-snap", "Fest til rutenett", None)?,
            &item(app, "theme-dark", "Mørkt tema", None)?,
            &item(app, "theme-light", "Lyst tema", None)?,
        ],
    )?;
    let object_menu = Submenu::with_items(
        app,
        "Objekt",
        true,
        &[
            &item(app, "front", "Legg foran", Some("CmdOrCtrl+Shift+]"))?,
            &item(app, "back", "Legg bakerst", Some("CmdOrCtrl+Shift+["))?,
            &item(app, "forward", "Flytt frem", Some("CmdOrCtrl+]"))?,
            &item(app, "backward", "Flytt bak", Some("CmdOrCtrl+["))?,
            &PredefinedMenuItem::separator(app)?,
            &item(app, "align-left", "Venstrejuster", None)?,
            &item(app, "align-hcenter", "Midtstill horisontalt", None)?,
            &item(app, "align-right", "Høyrejuster", None)?,
            &item(app, "align-top", "Toppjuster", None)?,
            &item(app, "align-vcenter", "Midtstill vertikalt", None)?,
            &item(app, "align-bottom", "Bunnjuster", None)?,
            &item(app, "distribute-h", "Fordel horisontalt", None)?,
            &item(app, "distribute-v", "Fordel vertikalt", None)?,
        ],
    )?;
    let help_menu = Submenu::with_items(
        app,
        "Hjelp",
        true,
        &[&item(app, "shortcuts", "Tastatursnarveier", None)?],
    )?;
    Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &view_menu, &object_menu, &help_menu])
}

fn handle_runtime_event(app: &AppHandle, event: &tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Opened { urls } = event {
        for url in urls {
            if let Ok(path) = url.to_file_path() {
                let text = path.to_string_lossy().into_owned();
                remember_topo(text.clone());
                let _ = app.emit("open-path", text);
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let _ = launch_paths();
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("menu", event.id().as_ref().to_string());
                }
            });
            if let Some(window) = app.get_webview_window("main") {
                let watched = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        if !ALLOW_CLOSE.load(Ordering::SeqCst) {
                            api.prevent_close();
                            let _ = watched.emit("menu", "quit");
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pick_open,
            pick_save,
            read_text,
            write_text,
            write_bytes,
            recent_list,
            recent_add,
            autosave_write,
            autosave_read,
            autosave_clear,
            launch_files,
            force_close
        ])
        .build(tauri::generate_context!())
        .expect("kunne ikke starte Topologi Studio")
        .run(|app, event| handle_runtime_event(app, &event));
}
