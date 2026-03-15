use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tauri::Manager;

use crate::db::DbConnection;
use crate::queries;

/// Import a QWK file into the local database.
#[tauri::command]
pub async fn import_qwk_file_to_db(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let app_handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let result = crate::import::perform_import_qwk_file_to_db(app, file_path);
        match result {
            Ok(()) => {
                let _ = app_handle.emit(
                    "import-complete",
                    ImportCompletePayload {
                        message: "Import completed successfully".to_string(),
                    },
                );
            }
            Err(e) => {
                let _ = app_handle.emit("import-error", e.to_string());
            }
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?;
    Ok(())
}

/// Fetch all servers from the database.
#[tauri::command]
pub fn get_servers(app: tauri::AppHandle) -> Result<Vec<qwk_rs::Server>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::servers::fetch_servers(&conn)
}

/// Fetch conferences for the given server.
#[tauri::command]
pub fn get_conferences(
    app: tauri::AppHandle,
    bbs_id: String,
) -> Result<Vec<crate::dto::Conference>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::servers::fetch_conferences(&conn, &bbs_id)
}

/// Fetch messages (and headers) for a conference.
#[tauri::command]
pub fn get_messages(
    app: tauri::AppHandle,
    bbs_id: String,
    conference_id: i64,
) -> Result<Vec<crate::models::messages::MessageWithHeader>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    queries::messages::fetch_messages(&conn, &bbs_id, conference_id)
}

/// Payload for updating message read status.
#[derive(Debug, Deserialize)]
pub struct UpdateMessagesPayload {
    pub bbs_id: String,
    pub conference_id: String,
    pub message_ids: Vec<i32>,
    pub status: char,
}

/// Update read status for multiple messages in the same BBS and conference.
#[tauri::command]
pub fn update_messages_read_status(
    app: tauri::AppHandle,
    payload: UpdateMessagesPayload,
) -> Result<usize, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let rows_affected = queries::messages::update_read_status(
        &conn,
        &payload.bbs_id,
        &payload.conference_id,
        &payload.message_ids,
        payload.status,
    )?;

    let _ = app.emit("messages-dirty", ());

    Ok(rows_affected)
}

/// Payload emitted when an import completes.
#[derive(Serialize, Clone)]
struct ImportCompletePayload {
    message: String,
}
