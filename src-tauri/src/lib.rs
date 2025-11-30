use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, Column, Row, TypeInfo};
use std::sync::{Arc, Mutex};
use sysinfo::{Disks, System};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{TrayIconBuilder, TrayIconId},
    Manager, Runtime,
};
use tauri_plugin_autostart::MacosLauncher;
use uuid::Uuid;

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy, NSImage};
#[cfg(target_os = "macos")]
use cocoa::base::nil;
#[cfg(target_os = "macos")]
use cocoa::foundation::NSData;

// ============================================================================
// System Stats
// ============================================================================

#[derive(Serialize)]
pub struct SystemStats {
    cpu_usage: f32,
    ram_used: u64,
    ram_total: u64,
    ram_used_gb: String,
    ram_total_gb: String,
    disk_used: u64,
    disk_total: u64,
    disk_used_percent: f32,
    disk_free_gb: String,
}

#[tauri::command]
fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_usage = sys.global_cpu_usage();
    let ram_used = sys.used_memory();
    let ram_total = sys.total_memory();
    let ram_used_gb = format!("{:.1} GB", ram_used as f64 / 1_073_741_824.0);
    let ram_total_gb = format!("{:.1} GB", ram_total as f64 / 1_073_741_824.0);

    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks
        .iter()
        .filter(|d| d.mount_point() == std::path::Path::new("/"))
        .map(|d| {
            let total = d.total_space();
            let available = d.available_space();
            let used = total - available;
            (used, total)
        })
        .next()
        .unwrap_or((0, 0));

    let disk_used_percent = if disk_total > 0 {
        (disk_used as f64 / disk_total as f64 * 100.0) as f32
    } else {
        0.0
    };

    let disk_free = disk_total - disk_used;
    let disk_free_gb = format!("{:.1} GB", disk_free as f64 / 1_073_741_824.0);

    SystemStats {
        cpu_usage,
        ram_used,
        ram_total,
        ram_used_gb,
        ram_total_gb,
        disk_used,
        disk_total,
        disk_used_percent,
        disk_free_gb,
    }
}

// ============================================================================
// PostgreSQL
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct PgConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
}

#[derive(Debug, Serialize)]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub table_type: String,
}

#[tauri::command]
async fn pg_test_connection(connection: PgConnection) -> Result<String, String> {
    let url = format!(
        "postgres://{}:{}@{}:{}/{}",
        connection.user, connection.password, connection.host, connection.port, connection.database
    );

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok("Connection successful!".to_string())
}

#[tauri::command]
async fn pg_get_tables(connection: PgConnection) -> Result<Vec<TableInfo>, String> {
    let url = format!(
        "postgres://{}:{}@{}:{}/{}",
        connection.user, connection.password, connection.host, connection.port, connection.database
    );

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| e.to_string())?;

    let rows = sqlx::query(
        r#"
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let tables: Vec<TableInfo> = rows
        .iter()
        .map(|row| TableInfo {
            schema: row.get("table_schema"),
            name: row.get("table_name"),
            table_type: row.get("table_type"),
        })
        .collect();

    pool.close().await;

    Ok(tables)
}

#[tauri::command]
async fn pg_execute_query(connection: PgConnection, query: String) -> Result<QueryResult, String> {
    let url = format!(
        "postgres://{}:{}@{}:{}/{}",
        connection.user, connection.password, connection.host, connection.port, connection.database
    );

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| e.to_string())?;

    let rows = sqlx::query(&query)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let columns: Vec<String> = if !rows.is_empty() {
        rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect()
    } else {
        vec![]
    };

    let result_rows: Vec<Vec<serde_json::Value>> = rows
        .iter()
        .map(|row| {
            row.columns()
                .iter()
                .enumerate()
                .map(|(i, col)| {
                    let type_name = col.type_info().name();
                    match type_name {
                        "INT2" | "INT4" | "INT8" => {
                            if let Ok(v) = row.try_get::<i64, _>(i) {
                                serde_json::Value::Number(v.into())
                            } else {
                                serde_json::Value::Null
                            }
                        }
                        "FLOAT4" | "FLOAT8" | "NUMERIC" => {
                            if let Ok(v) = row.try_get::<f64, _>(i) {
                                serde_json::Number::from_f64(v)
                                    .map(serde_json::Value::Number)
                                    .unwrap_or(serde_json::Value::Null)
                            } else {
                                serde_json::Value::Null
                            }
                        }
                        "BOOL" => {
                            if let Ok(v) = row.try_get::<bool, _>(i) {
                                serde_json::Value::Bool(v)
                            } else {
                                serde_json::Value::Null
                            }
                        }
                        _ => {
                            if let Ok(v) = row.try_get::<String, _>(i) {
                                serde_json::Value::String(v)
                            } else {
                                serde_json::Value::Null
                            }
                        }
                    }
                })
                .collect()
        })
        .collect();

    let row_count = result_rows.len();

    pool.close().await;

    Ok(QueryResult {
        columns,
        rows: result_rows,
        row_count,
    })
}

// ============================================================================
// App Sync (PostgreSQL)
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub deleted: bool,
}

#[tauri::command]
async fn sync_test_connection(connection_string: String) -> Result<String, String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&connection_string)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok("Connection successful!".to_string())
}

#[tauri::command]
async fn sync_init_schema(connection_string: String) -> Result<(), String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&connection_string)
        .await
        .map_err(|e| e.to_string())?;

    // Create notes table if it doesn't exist
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS devtools_notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL,
            deleted BOOLEAN NOT NULL DEFAULT FALSE
        )
        "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    pool.close().await;

    Ok(())
}

#[tauri::command]
async fn sync_notes_pull(connection_string: String, since: i64) -> Result<Vec<SyncNote>, String> {
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&connection_string)
        .await
        .map_err(|e| e.to_string())?;

    let rows = sqlx::query(
        r#"
        SELECT id, title, content, created_at, updated_at, deleted
        FROM devtools_notes
        WHERE updated_at > $1
        ORDER BY updated_at ASC
        "#,
    )
    .bind(since)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let notes: Vec<SyncNote> = rows
        .iter()
        .map(|row| SyncNote {
            id: row.get("id"),
            title: row.get("title"),
            content: row.get("content"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
            deleted: row.get("deleted"),
        })
        .collect();

    pool.close().await;

    Ok(notes)
}

#[tauri::command]
async fn sync_notes_push(connection_string: String, notes: Vec<SyncNote>) -> Result<(), String> {
    if notes.is_empty() {
        return Ok(());
    }

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&connection_string)
        .await
        .map_err(|e| e.to_string())?;

    for note in notes {
        sqlx::query(
            r#"
            INSERT INTO devtools_notes (id, title, content, created_at, updated_at, deleted)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                updated_at = EXCLUDED.updated_at,
                deleted = EXCLUDED.deleted
            WHERE devtools_notes.updated_at < EXCLUDED.updated_at
            "#,
        )
        .bind(&note.id)
        .bind(&note.title)
        .bind(&note.content)
        .bind(note.created_at)
        .bind(note.updated_at)
        .bind(note.deleted)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    }

    pool.close().await;

    Ok(())
}

// ============================================================================
// Stopwatch Tray & Alert
// ============================================================================

#[tauri::command]
fn update_tray_title(app: tauri::AppHandle, title: Option<String>) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id(&TrayIconId::new("main")) {
        let display_title = title.unwrap_or_default();
        tray.set_title(Some(&display_title)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ============================================================================
// macOS Dock Visibility
// ============================================================================

#[cfg(target_os = "macos")]
fn hide_from_dock() {
    unsafe {
        let app = NSApp();
        app.setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory);
    }
}

#[cfg(target_os = "macos")]
const DOCK_ICON_BYTES: &[u8] = include_bytes!("../icons/icon.png");

#[cfg(target_os = "macos")]
fn show_in_dock() {
    unsafe {
        let app = NSApp();
        app.setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyRegular);

        // Restore the dock icon (macOS forgets it when switching activation policies)
        let icon_data = NSData::dataWithBytes_length_(
            nil,
            DOCK_ICON_BYTES.as_ptr() as *const std::ffi::c_void,
            DOCK_ICON_BYTES.len() as u64,
        );
        let icon_image = NSImage::initWithData_(NSImage::alloc(nil), icon_data);
        app.setApplicationIconImage_(icon_image);

        app.activateIgnoringOtherApps_(true);
    }
}

// ============================================================================
// Tray Helpers
// ============================================================================

fn generate_uuid() -> String {
    Uuid::new_v4().to_string()
}

fn generate_timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs()
        .to_string()
}

fn generate_timestamp_iso() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    // Simple ISO format
    let secs_per_day = 86400u64;
    let days_since_epoch = now / secs_per_day;
    let secs_today = now % secs_per_day;
    let hours = secs_today / 3600;
    let mins = (secs_today % 3600) / 60;
    let secs = secs_today % 60;

    // Calculate date (simplified, doesn't account for leap years perfectly but close enough)
    let mut year = 1970i32;
    let mut remaining_days = days_since_epoch as i32;

    loop {
        let days_in_year = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let days_in_months: [i32; 12] = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1;
    for days in days_in_months.iter() {
        if remaining_days < *days {
            break;
        }
        remaining_days -= days;
        month += 1;
    }
    let day = remaining_days + 1;

    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, hours, mins, secs)
}

fn generate_password(length: usize) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

fn get_quick_stats() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu = sys.global_cpu_usage();
    let ram_used = sys.used_memory() as f64 / 1_073_741_824.0;

    format!("CPU: {:.0}%  |  RAM: {:.1}GB", cpu, ram_used)
}

// ============================================================================
// Tray
// ============================================================================

// Global state for stopwatch display in tray
pub static STOPWATCH_STATE: std::sync::LazyLock<Arc<Mutex<Option<String>>>> =
    std::sync::LazyLock::new(|| Arc::new(Mutex::new(None)));

fn create_tray_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    // Main item
    let open = MenuItem::with_id(app, "open", "Open Dev Tools Suite", true, None::<&str>)?;

    // Quick Generate submenu
    let gen_uuid = MenuItem::with_id(app, "gen_uuid", "UUID", true, None::<&str>)?;
    let gen_timestamp = MenuItem::with_id(app, "gen_timestamp", "Unix Timestamp", true, None::<&str>)?;
    let gen_timestamp_iso = MenuItem::with_id(app, "gen_timestamp_iso", "ISO Timestamp", true, None::<&str>)?;
    let gen_password_16 = MenuItem::with_id(app, "gen_password_16", "Password (16 chars)", true, None::<&str>)?;
    let gen_password_32 = MenuItem::with_id(app, "gen_password_32", "Password (32 chars)", true, None::<&str>)?;

    let quick_generate = Submenu::with_id_and_items(
        app,
        "quick_generate",
        "Quick Generate",
        true,
        &[&gen_uuid, &gen_timestamp, &gen_timestamp_iso, &PredefinedMenuItem::separator(app)?, &gen_password_16, &gen_password_32],
    )?;

    // Clipboard Tools submenu
    let clip_base64_encode = MenuItem::with_id(app, "clip_base64_encode", "Base64 Encode", true, None::<&str>)?;
    let clip_base64_decode = MenuItem::with_id(app, "clip_base64_decode", "Base64 Decode", true, None::<&str>)?;
    let clip_url_encode = MenuItem::with_id(app, "clip_url_encode", "URL Encode", true, None::<&str>)?;
    let clip_url_decode = MenuItem::with_id(app, "clip_url_decode", "URL Decode", true, None::<&str>)?;
    let clip_json_format = MenuItem::with_id(app, "clip_json_format", "Format JSON", true, None::<&str>)?;
    let clip_json_minify = MenuItem::with_id(app, "clip_json_minify", "Minify JSON", true, None::<&str>)?;

    let clipboard_tools = Submenu::with_id_and_items(
        app,
        "clipboard_tools",
        "Clipboard Tools",
        true,
        &[
            &clip_base64_encode, &clip_base64_decode,
            &PredefinedMenuItem::separator(app)?,
            &clip_url_encode, &clip_url_decode,
            &PredefinedMenuItem::separator(app)?,
            &clip_json_format, &clip_json_minify,
        ],
    )?;

    // System stats (disabled, just for display)
    let stats = get_quick_stats();
    let stats_item = MenuItem::with_id(app, "stats", &stats, false, None::<&str>)?;

    // Stopwatch status (if running)
    let stopwatch_state = STOPWATCH_STATE.lock().unwrap();
    let stopwatch_item = if let Some(ref time) = *stopwatch_state {
        Some(MenuItem::with_id(app, "stopwatch", &format!("⏱ {}", time), false, None::<&str>)?)
    } else {
        None
    };
    drop(stopwatch_state);

    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    // Build menu based on stopwatch state
    if let Some(sw_item) = stopwatch_item {
        Menu::with_items(
            app,
            &[&open, &separator1, &quick_generate, &clipboard_tools, &separator2, &sw_item, &stats_item, &separator3, &quit],
        )
    } else {
        Menu::with_items(
            app,
            &[&open, &separator1, &quick_generate, &clipboard_tools, &separator2, &stats_item, &separator3, &quit],
        )
    }
}

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let menu = create_tray_menu(app)?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(tauri::include_image!("icons/tray-icon.png"))
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let event_id = event.id.as_ref();

            match event_id {
                "open" => {
                    if let Some(window) = app.get_webview_window("main") {
                        #[cfg(target_os = "macos")]
                        show_in_dock();

                        if window.is_fullscreen().unwrap_or(false) {
                            let _ = window.set_fullscreen(false);
                        }

                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();

                        #[cfg(target_os = "macos")]
                        unsafe {
                            use cocoa::appkit::NSApp;
                            NSApp().activateIgnoringOtherApps_(true);
                        }
                    }
                }

                // Quick Generate actions
                "gen_uuid" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        let _ = clipboard.set_text(generate_uuid());
                    }
                }
                "gen_timestamp" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        let _ = clipboard.set_text(generate_timestamp());
                    }
                }
                "gen_timestamp_iso" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        let _ = clipboard.set_text(generate_timestamp_iso());
                    }
                }
                "gen_password_16" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        let _ = clipboard.set_text(generate_password(16));
                    }
                }
                "gen_password_32" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        let _ = clipboard.set_text(generate_password(32));
                    }
                }

                // Clipboard Tools
                "clip_base64_encode" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            let encoded = BASE64.encode(text.as_bytes());
                            let _ = clipboard.set_text(encoded);
                        }
                    }
                }
                "clip_base64_decode" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if let Ok(decoded) = BASE64.decode(text.as_bytes()) {
                                if let Ok(decoded_str) = String::from_utf8(decoded) {
                                    let _ = clipboard.set_text(decoded_str);
                                }
                            }
                        }
                    }
                }
                "clip_url_encode" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            let encoded = urlencoding::encode(&text).to_string();
                            let _ = clipboard.set_text(encoded);
                        }
                    }
                }
                "clip_url_decode" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if let Ok(decoded) = urlencoding::decode(&text) {
                                let _ = clipboard.set_text(decoded.to_string());
                            }
                        }
                    }
                }
                "clip_json_format" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                if let Ok(formatted) = serde_json::to_string_pretty(&json) {
                                    let _ = clipboard.set_text(formatted);
                                }
                            }
                        }
                    }
                }
                "clip_json_minify" => {
                    if let Ok(mut clipboard) = arboard::Clipboard::new() {
                        if let Ok(text) = clipboard.get_text() {
                            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                if let Ok(minified) = serde_json::to_string(&json) {
                                    let _ = clipboard.set_text(minified);
                                }
                            }
                        }
                    }
                }

                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

// Command to update stopwatch state in tray
#[tauri::command]
fn set_stopwatch_tray(app: tauri::AppHandle, time: Option<String>) -> Result<(), String> {
    {
        let mut state = STOPWATCH_STATE.lock().unwrap();
        *state = time;
    }
    // Rebuild menu to show updated stopwatch
    if let Some(tray) = app.tray_by_id(&TrayIconId::new("main")) {
        if let Ok(menu) = create_tray_menu(&app) {
            let _ = tray.set_menu(Some(menu));
        }
    }
    Ok(())
}

// ============================================================================
// App Entry
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_system_stats,
            pg_test_connection,
            pg_get_tables,
            pg_execute_query,
            update_tray_title,
            set_stopwatch_tray,
            sync_test_connection,
            sync_init_schema,
            sync_notes_pull,
            sync_notes_push
        ])
        .setup(|app| {
            #[cfg(desktop)]
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let was_fullscreen = window.is_fullscreen().unwrap_or(false);

                // Sair do fullscreen antes de esconder para evitar tela preta no macOS
                if was_fullscreen {
                    let _ = window.set_fullscreen(false);
                    // Dar tempo pro macOS completar a animação de sair do fullscreen
                    let window_clone = window.clone();
                    let window_clone2 = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(600));
                        // Executar na main thread
                        let _ = window_clone.run_on_main_thread(move || {
                            #[cfg(target_os = "macos")]
                            {
                                let _ = window_clone2.hide();
                                hide_from_dock();
                            }
                            #[cfg(not(target_os = "macos"))]
                            {
                                let _ = window_clone2.hide();
                            }
                        });
                    });
                } else {
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    hide_from_dock();
                }

                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
