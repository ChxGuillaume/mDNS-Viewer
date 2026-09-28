mod discovery;
#[cfg(target_os = "macos")]
mod menu;

use discovery::{Discovery, Snapshot};
use tauri::{Manager, RunEvent, State};

#[tauri::command]
fn snapshot(discovery: State<'_, Discovery>) -> Snapshot {
    discovery.snapshot()
}

#[tauri::command]
fn rescan(discovery: State<'_, Discovery>) -> Result<(), String> {
    discovery.start()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    #[cfg(target_os = "macos")]
    let builder = builder.menu(menu::build);

    let app = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("mdns_sd", log::LevelFilter::Warn)
                .level_for(
                    "mdns_viewer_lib",
                    if cfg!(debug_assertions) {
                        log::LevelFilter::Debug
                    } else {
                        log::LevelFilter::Info
                    },
                )
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let discovery = Discovery::new(app.handle().clone());
            if let Err(e) = discovery.start() {
                log::error!("{e}");
            }
            app.manage(discovery);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![snapshot, rescan])
        .build(tauri::generate_context!())
        .expect("error while building mDNS Viewer");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            handle.state::<Discovery>().stop();
        }
    });
}
