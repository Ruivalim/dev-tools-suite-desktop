use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, Column, Row, TypeInfo};
use sysinfo::{Disks, System};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};
use tauri_plugin_autostart::MacosLauncher;

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy};

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
fn show_in_dock() {
    unsafe {
        let app = NSApp();
        app.setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyRegular);
        app.activateIgnoringOtherApps_(true);
    }
}

// ============================================================================
// Tray
// ============================================================================

fn create_tray_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    let open = MenuItem::with_id(app, "open", "Open DevToolsSuite", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    Menu::with_items(app, &[&open, &separator, &quit])
}

pub fn setup_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let menu = create_tray_menu(app)?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    #[cfg(target_os = "macos")]
                    show_in_dock();

                    // Garantir que não está em fullscreen antes de mostrar
                    if window.is_fullscreen().unwrap_or(false) {
                        let _ = window.set_fullscreen(false);
                    }

                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();

                    // Ativar novamente após mostrar a janela
                    #[cfg(target_os = "macos")]
                    unsafe {
                        use cocoa::appkit::NSApp;
                        NSApp().activateIgnoringOtherApps_(true);
                    }
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

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
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_system_stats,
            pg_test_connection,
            pg_get_tables,
            pg_execute_query
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
