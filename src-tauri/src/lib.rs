use serde::Serialize;
use sysinfo::{Disks, System};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};

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

    // CPU usage (average across all cores)
    let cpu_usage = sys.global_cpu_usage();

    // RAM
    let ram_used = sys.used_memory();
    let ram_total = sys.total_memory();
    let ram_used_gb = format!("{:.1} GB", ram_used as f64 / 1_073_741_824.0);
    let ram_total_gb = format!("{:.1} GB", ram_total as f64 / 1_073_741_824.0);

    // Disk (primary disk)
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

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

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
                    let _ = window.show();
                    let _ = window.set_focus();
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_system_stats])
        .setup(|app| {
            #[cfg(desktop)]
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Don't close the app, just hide the window
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
