use rusqlite::{Connection, params};
use serde::Deserialize;
use serde::Serialize;
use std::sync::Mutex;
use tauri::Manager;
use tauri::Emitter;

mod dto;
// Database state wrapper
pub struct DbConnection(pub Mutex<Connection>);

// Define a payload struct for better type safety
#[derive(Serialize, Clone)]
struct ImportCompletePayload {
    message: String,
    //records_imported: usize,
}

#[derive(Serialize, Clone)]
struct ImportProgressPayload {
    stage: String,
    current: usize,
    total: usize,
    percent: f32,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn import_qwk_file_to_db(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    // Clone what you need for the blocking task
    let app_handle = app.clone();

    // This closure runs on a thread pool designed for blocking operations
    tauri::async_runtime::spawn_blocking(move || {
          match perform_import_qwk_file_to_db(app, file_path) {
            Ok(()) => {
                let _ = app_handle.emit("import-complete", ImportCompletePayload {
                    message: "Import completed successfully".to_string(),
                    //records_imported: records,
                });
            }
            Err(e) => {
                 let _ = app_handle.emit("import-error", e.to_string());
            }
          }


    }).await
    .map_err(|e| format!("Task failed: {}", e))?; // Handle potential panic from the blocking task

    Ok(())
}

fn perform_import_qwk_file_to_db(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let parser = qwk_rs::Parser::from_file(&file_path).map_err(|e| e.to_string())?;

    let db = app.state::<DbConnection>();
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    let server = &parser.server;

    conn.execute(
        "INSERT OR REPLACE INTO servers (bbs_id, bbs_name, city_and_state, phone_number, sysop_name, creation_time, user_name) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            server.bbs_id,
            server.bbs_name,
            server.city_and_state,
            server.phone_number,
            server.sysop_name,
            server.creation_time,
            server.user_name,
        ],
    ).map_err(|e| e.to_string())?;

    // Store conferences
    for conference in &parser.conferences {
        conn.execute(
            "INSERT OR REPLACE INTO conferences (conference_id, title, bbs_id) VALUES (?1, ?2, ?3)",
            params![conference.id, &conference.title, server.bbs_id,],
        )
        .map_err(|e| e.to_string())?;
    }

    // Store messages
    let total_messages = parser.messages.len();
    let transaction = conn.transaction().map_err(|e| e.to_string())?;
    {
        let mut stmt = transaction
            .prepare(
                "INSERT OR REPLACE INTO messages (msg_id, type_id, date, time, to_field, from_field, in_reply_to, message_count, conference_id, text, subject, bbs_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            )
            .map_err(|e| e.to_string())?;
        for (index, message) in parser.messages.iter().enumerate() {
            stmt.execute(params![
                message.msg_id,
                message.type_id.to_string(),
                &message.date,
                &message.time,
                &message.to,
                &message.from,
                message.in_reply_to,
                message.message_count,
                message.conference_id,
                &message.text,
                &message.subject,
                server.bbs_id,
            ])
            .map_err(|e| e.to_string())?;

            let current = index + 1;
            if total_messages > 0 && (current % 50 == 0 || current == total_messages) {
                let percent = (current as f32 / total_messages as f32) * 100.0;
                let _ = app.emit(
                    "import-progress",
                    ImportProgressPayload {
                        stage: "messages".to_string(),
                        current,
                        total: total_messages,
                        percent,
                    },
                );
            }
        }
    }
    transaction.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_servers(app: tauri::AppHandle) -> Result<Vec<qwk_rs::Server>, String> {
let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT bbs_id, bbs_name, city_and_state, phone_number, sysop_name, creation_time, user_name FROM servers",
        )
        .map_err(|e| e.to_string())?;

    let servers = stmt
        .query_map([], |row| {
            Ok(qwk_rs::Server {
                bbs_id: row.get(0)?,
                bbs_name: row.get(1)?,
                city_and_state: row.get(2)?,
                phone_number: row.get(3)?,
                sysop_name: row.get(4)?,
                creation_time: row.get(5)?,
                user_name: row.get(6)?
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

        Ok(servers)
    }

#[tauri::command]
fn get_conferences(
    app: tauri::AppHandle,
    bbs_id: String,
) -> Result<Vec<dto::Conference>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT c.conference_id,
       c.title,
       COUNT(CASE WHEN m.type_id NOT IN ('V') THEN 1 END) AS message_count, 
       SUM(CASE WHEN m.type_id IN (' ', '+', '~', '%', '!', '$') THEN 1 ELSE 0 END) AS unread_count
FROM conferences c
LEFT JOIN messages m ON c.conference_id = m.conference_id 
    AND m.bbs_id = ?1
WHERE c.bbs_id = ?1
GROUP BY c.conference_id, c.title
ORDER BY c.conference_id;",
        )
        .map_err(|e| e.to_string())?;

    let conferences = stmt
        .query_map([&bbs_id], |row| {
            Ok(dto::Conference {
                id: row.get(0)?,
                title: row.get(1)?,
                message_count: row.get(2)?,
                unread_count: row.get(3)?
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(conferences)
}

#[tauri::command]
fn get_messages(
    app: tauri::AppHandle,
    bbs_id: String,
    conference_id: i64,
) -> Result<Vec<qwk_rs::Message>, String> {
    let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT msg_id, type_id, date, time, to_field, from_field, in_reply_to, message_count, conference_id, text, subject FROM messages WHERE bbs_id = ?1 AND conference_id = ?2 AND type_id is not 'V' ORDER BY msg_id")
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map(params![&bbs_id, conference_id], |row| {
            Ok(qwk_rs::Message {
                msg_id: row.get(0)?,
                type_id: row.get::<_, String>(1)?.chars().next().unwrap_or(' '),
                date: row.get(2)?,
                time: row.get(3)?,
                to: row.get(4)?,
                from: row.get(5)?,
                in_reply_to: row.get(6)?,
                message_count: row.get(7)?,
                conference_id: row.get(8)?,
                text: row.get(9)?,
                subject: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(messages)
}

#[derive(Debug, Deserialize)]
pub struct UpdateMessagesPayload {
    pub bbs_id: String,
    pub conference_id: String,
    pub message_ids: Vec<i32>,
    pub status: char,
}

/// Update read status for multiple messages in the same BBS and conference
#[tauri::command]
fn update_messages_read_status(
    app: tauri::AppHandle,
    payload: UpdateMessagesPayload
) -> Result<usize, String> {
        let db = app.state::<DbConnection>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    // Create placeholders for the IN clause
    let placeholders = payload.message_ids.iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");
    
    // Build query with all three conditions
    let sql = format!(
        "UPDATE messages 
         SET type_id = ?1 
         WHERE bbs_id = ?2 
           AND conference_id = ?3 
           AND msg_id IN ({})",
        placeholders
    );
    
    let status_str = payload.status.to_string();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(payload.message_ids.len() + 3);
    params.push(&status_str);
    params.push(&payload.bbs_id);
    params.push(&payload.conference_id);
    for id in &payload.message_ids {
        params.push(id);
    }
    
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let rows_affected = stmt.execute(params.as_slice())
        .map_err(|e| format!("Failed to execute update: {}", e))?;
    

    let _ = app.emit("messages-dirty", ());

    Ok(rows_affected)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database connection
            let db_path = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("qwk_reader.db");
            
            // Ensure parent directory exists
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).expect("could not create app data directory");
            }
            
            let conn = Connection::open(&db_path).expect("could not open database");

            // Create tables
            conn.execute_batch(
                r#"
                -- Messages table
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    msg_id INTEGER NOT NULL,
                    type_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    time TEXT NOT NULL,
                    to_field TEXT NOT NULL,
                    from_field TEXT NOT NULL,
                    in_reply_to INTEGER NOT NULL,
                    message_count INTEGER NOT NULL,
                    conference_id INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    bbs_id TEXT NOT NULL,
                    UNIQUE(msg_id, bbs_id)
                );

                -- Conferences table
                CREATE TABLE IF NOT EXISTS conferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conference_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    bbs_id TEXT NOT NULL,
                    UNIQUE(conference_id, bbs_id)
                );

                -- Servers table
                CREATE TABLE IF NOT EXISTS servers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bbs_id TEXT NOT NULL UNIQUE,
                    bbs_name TEXT NOT NULL,
                    city_and_state TEXT,
                    phone_number TEXT,
                    sysop_name TEXT,
                    creation_time TEXT,
                    user_name TEXT
                );

                -- Create indexes for better query performance
                CREATE INDEX IF NOT EXISTS idx_messages_conference ON messages(conference_id, bbs_id);
                CREATE INDEX IF NOT EXISTS idx_messages_msg_id ON messages(msg_id, bbs_id);
                CREATE INDEX IF NOT EXISTS idx_conferences_bbs_id ON conferences(bbs_id);
                "#,
            )
            .expect("could not create database tables");

                        // Register database state
            app.manage(DbConnection(Mutex::new(conn)));


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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![import_qwk_file_to_db, get_servers, get_conferences, get_messages, update_messages_read_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
