use rusqlite::{params, Connection};
use tauri::Emitter;
use tauri::Manager;

use crate::db::DbConnection;
use crate::sanitisation;

/// Progress payload emitted during import.
#[derive(serde::Serialize, Clone)]
struct ImportProgressPayload {
    stage: String,
    current: usize,
    total: usize,
    percent: f32,
}

/// Parse a QWK packet and persist its contents into the database.
/// Parse a QWK packet and persist its contents into the database.
pub fn perform_import_qwk_file_to_db(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<(), String> {
    let parser = qwk_rs::Parser::from_file(&file_path).map_err(|e| e.to_string())?;

    let db = app.state::<DbConnection>();
    let mut conn = db.0.lock().map_err(|e| e.to_string())?;
    import_parser(&mut conn, &parser, Some(&app))
}

/// Persist an already-parsed QWK packet into the database.
pub fn import_parser(
    conn: &mut Connection,
    parser: &qwk_rs::Parser,
    app: Option<&tauri::AppHandle>,
) -> Result<(), String> {
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
    )
    .map_err(|e| e.to_string())?;

    for conference in &parser.conferences {
        conn.execute(
            "INSERT OR REPLACE INTO conferences (conference_id, title, bbs_id) VALUES (?1, ?2, ?3)",
            params![conference.id, &conference.title, server.bbs_id,],
        )
        .map_err(|e| e.to_string())?;
    }

    store_messages(conn, server.bbs_id.as_str(), &parser.messages, app)?;
    store_headers(conn, server.bbs_id.as_str(), parser, app)?;

    Ok(())
}

/// Persist parsed messages into the database.
/// Persist parsed messages into the database.
fn store_messages(
    conn: &mut Connection,
    bbs_id: &str,
    messages: &[qwk_rs::Message],
    app: Option<&tauri::AppHandle>,
) -> Result<(), String> {
    let total_messages = messages.len();
    let transaction = conn.transaction().map_err(|e| e.to_string())?;
    {
        let mut stmt = transaction
            .prepare(
                "INSERT OR REPLACE INTO messages (msg_id, type_id, date, time, to_field, from_field, in_reply_to, message_count, conference_id, text, subject, bbs_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            )
            .map_err(|e| e.to_string())?;
        for (index, message) in messages.iter().enumerate() {
            let iso_date = &sanitisation::american_to_iso(&message.date)?;
            stmt.execute(params![
                message.msg_id,
                message.type_id.to_string(),
                iso_date,
                &message.time,
                &message.to,
                &message.from,
                message.in_reply_to,
                message.message_count,
                message.conference_id,
                &message.text,
                &message.subject,
                bbs_id,
            ])
            .map_err(|e| e.to_string())?;

            emit_progress(app, "messages", index + 1, total_messages)?;
        }
    }
    transaction.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Persist parsed headers into the database, matching to messages by section.
/// Persist parsed headers into the database, matching to messages by section.
fn store_headers(
    conn: &mut Connection,
    bbs_id: &str,
    parser: &qwk_rs::Parser,
    app: Option<&tauri::AppHandle>,
) -> Result<(), String> {
    if parser.headers.is_empty() {
        return Ok(());
    }

    let mut message_by_bytes = std::collections::HashMap::<u32, &qwk_rs::Message>::new();
    let mut message_by_blocks = std::collections::HashMap::<u32, &qwk_rs::Message>::new();
    for message in &parser.messages {
        if let Some(section_bytes) = message.section_bytes {
            message_by_bytes.insert(section_bytes, message);
        }
        if let Some(section_blocks) = message.section_blocks {
            message_by_blocks.insert(section_blocks, message);
        }
    }

    let header_total = parser.headers.len();
    let header_transaction = conn.transaction().map_err(|e| e.to_string())?;
    {
        for (index, header) in parser.headers.values().enumerate() {
            let message = if let Some(message) = message_by_bytes.get(&header.section) {
                *message
            } else if let Some(message) = message_by_blocks.get(&header.section) {
                *message
            } else {
                continue;
            };

            let section_bytes = message.section_bytes.unwrap_or_default();
            let section_blocks = message.section_blocks.unwrap_or_default();
            let extra_fields_json = serde_json::to_string(&header.other_fields)
                .map_err(|e| format!("Failed to serialize header extra fields: {}", e))?;
            let message_ids_json = serde_json::to_string(&header.message_ids)
                .map_err(|e| format!("Failed to serialize header message ids: {}", e))?;

            header_transaction
                .execute(
                    "INSERT OR REPLACE INTO message_headers (bbs_id, conference_id, msg_id, section, section_bytes, section_blocks, utf8, format, message_ids_json, in_reply_to, when_written, when_imported, when_exported, exported_from, sender, sender_net_addr, sender_ip_addr, sender_host_name, sender_protocol, organization, reply_to, subject, to_field, to_net_addr, x_ftn_area, x_ftn_seen_by, x_ftn_path, x_ftn_msgid, x_ftn_reply, x_ftn_pid, x_ftn_flags, x_ftn_tid, x_ftn_chrs, x_ftn_kludge, editor, columns, tags, path, newsgroups, conference, header_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41)",
                    params![
                        bbs_id,
                        message.conference_id,
                        message.msg_id,
                        header.section,
                        section_bytes,
                        section_blocks,
                        header.utf8.map(|value| if value { 1 } else { 0 }),
                        header.format.as_deref(),
                        message_ids_json,
                        header.in_reply_to.as_deref(),
                        header.when_written.as_deref(),
                        header.when_imported.as_deref(),
                        header.when_exported.as_deref(),
                        header.exported_from.as_deref(),
                        header.sender.as_deref(),
                        header.sender_net_addr.as_deref(),
                        header.sender_ip_addr.as_deref(),
                        header.sender_host_name.as_deref(),
                        header.sender_protocol.as_deref(),
                        header.organization.as_deref(),
                        header.reply_to.as_deref(),
                        header.subject.as_deref(),
                        header.to.as_deref(),
                        header.to_net_addr.as_deref(),
                        header.x_ftn_area.as_deref(),
                        header.x_ftn_seen_by.as_deref(),
                        header.x_ftn_path.as_deref(),
                        header.x_ftn_msgid.as_deref(),
                        header.x_ftn_reply.as_deref(),
                        header.x_ftn_pid.as_deref(),
                        header.x_ftn_flags.as_deref(),
                        header.x_ftn_tid.as_deref(),
                        header.x_ftn_chrs.as_deref(),
                        header.x_ftn_kludge.as_deref(),
                        header.editor.as_deref(),
                        header.columns,
                        header.tags.as_deref(),
                        header.path.as_deref(),
                        header.newsgroups.as_deref(),
                        header.conference,
                        extra_fields_json,
                    ],
                )
                .map_err(|e| e.to_string())?;

            emit_progress(app, "message-headers", index + 1, header_total)?;
        }
    }
    header_transaction.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Emit progress events during import batches.
/// Emit progress events during import batches.
fn emit_progress(
    app: Option<&tauri::AppHandle>,
    stage: &str,
    current: usize,
    total: usize,
) -> Result<(), String> {
    if total > 0 && (current % 100 == 0 || current == total) {
        if let Some(app) = app {
            let percent = (current as f32 / total as f32) * 100.0;
            let _ = app.emit(
                "import-progress",
                ImportProgressPayload {
                    stage: stage.to_string(),
                    current,
                    total,
                    percent,
                },
            );
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::import_parser;
    use crate::db::init_db_on_connection;
    use rusqlite::Connection;

    #[test]
    fn imports_messages_and_headers() {
        let conn = Connection::open_in_memory().expect("in-memory db");
        init_db_on_connection(&conn).expect("init schema");

        let parser = qwk_rs::Parser::new(
            qwk_rs::Server {
                bbs_id: "BBS".to_string(),
                bbs_name: "Test BBS".to_string(),
                city_and_state: "".to_string(),
                phone_number: "".to_string(),
                sysop_name: "".to_string(),
                creation_time: "".to_string(),
                user_name: "".to_string(),
            },
            vec![qwk_rs::Conference {
                id: 1,
                title: "General".to_string(),
            }],
            vec![qwk_rs::Message {
                section: Some(128),
                section_bytes: Some(128),
                section_blocks: Some(1),
                type_id: ' ',
                msg_id: 42,
                date: "03-05-2026".to_string(),
                time: "0726".to_string(),
                to: "TO".to_string(),
                from: "FROM".to_string(),
                in_reply_to: 0,
                message_count: 1,
                conference_id: 1,
                text: "SGVsbG8=".to_string(),
                subject: "Subject".to_string(),
            }],
            {
                let mut headers = std::collections::HashMap::new();
                headers.insert(
                    "128".to_string(),
                    qwk_rs::Header {
                        section: 128,
                        section_bytes: None,
                        section_blocks: None,
                        subject: Some("Header Subject".to_string()),
                        sender: Some("Header From".to_string()),
                        to: Some("Header To".to_string()),
                        ..Default::default()
                    },
                );
                headers
            },
        );

        let mut conn = conn;
        import_parser(&mut conn, &parser, None).expect("import parser");

        let message_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM messages", [], |row| row.get(0))
            .expect("count messages");
        assert_eq!(message_count, 1);

        let header_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM message_headers", [], |row| row.get(0))
            .expect("count headers");
        assert_eq!(header_count, 1);
    }
}
