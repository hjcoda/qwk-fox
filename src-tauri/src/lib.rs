use tauri::Manager;

mod db;
mod dto;
mod handlers;
mod import;
mod models;
mod queries;
mod sanitisation;

use db::DbConnection;

/// Entry point for the Tauri application runtime.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let conn = db::init_db(app)?;
            app.manage(DbConnection(std::sync::Mutex::new(conn)));

            let salt_path = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;

            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_devtools::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            handlers::import_qwk_file_to_db,
            handlers::get_servers,
            handlers::get_conferences,
            handlers::get_messages,
            handlers::update_messages_read_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
