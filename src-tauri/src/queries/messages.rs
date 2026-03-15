use rusqlite::params;

use crate::models;
use crate::queries::headers;

/// Fetch messages for a conference, including optional header data.
pub fn fetch_messages(
    conn: &rusqlite::Connection,
    bbs_id: &str,
    conference_id: i64,
) -> Result<Vec<models::messages::MessageWithHeader>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT m.msg_id, m.type_id, m.date, m.time, m.to_field, m.from_field, m.in_reply_to, m.message_count, m.conference_id, m.text, m.subject, h.section, h.section_bytes, h.section_blocks, h.utf8, h.format, h.message_ids_json, h.in_reply_to, h.when_written, h.when_imported, h.when_exported, h.exported_from, h.sender, h.sender_net_addr, h.sender_ip_addr, h.sender_host_name, h.sender_protocol, h.organization, h.reply_to, h.subject, h.to_field, h.to_net_addr, h.x_ftn_area, h.x_ftn_seen_by, h.x_ftn_path, h.x_ftn_msgid, h.x_ftn_reply, h.x_ftn_pid, h.x_ftn_flags, h.x_ftn_tid, h.x_ftn_chrs, h.x_ftn_kludge, h.editor, h.columns, h.tags, h.path, h.newsgroups, h.conference, h.header_json FROM messages m LEFT JOIN message_headers h ON h.bbs_id = m.bbs_id AND h.conference_id = m.conference_id AND h.msg_id = m.msg_id WHERE m.bbs_id = ?1 AND m.conference_id = ?2 AND m.type_id is not 'V' ORDER BY m.msg_id",
        )
        .map_err(|e| e.to_string())?;

    let messages = stmt
        .query_map(params![bbs_id, conference_id], |row| {
            let section = row.get::<_, Option<i64>>(11)?.map(|value| value as u32);
            let section_bytes = row.get::<_, Option<i64>>(12)?.map(|value| value as u32);
            let section_blocks = row.get::<_, Option<i64>>(13)?.map(|value| value as u32);
            let mut message = qwk_rs::Message {
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
                section,
                section_bytes,
                section_blocks,
            };

            let header = headers::read_header_fields(row)?;

            if let Some(header) = &header {
                headers::override_message_fields(&mut message, header);
            }

            Ok(models::messages::MessageWithHeader { message, header })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(messages)
}

/// Update read status for a set of messages.
pub fn update_read_status(
    conn: &rusqlite::Connection,
    bbs_id: &str,
    conference_id: &str,
    message_ids: &[i32],
    status: char,
) -> Result<usize, String> {
    let placeholders = message_ids
        .iter()
        .map(|_| "?")
        .collect::<Vec<_>>()
        .join(",");

    let sql = format!(
        "UPDATE messages 
         SET type_id = ?1 
         WHERE bbs_id = ?2 
           AND conference_id = ?3 
           AND msg_id IN ({})",
        placeholders
    );

    let status_str = status.to_string();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::with_capacity(message_ids.len() + 3);
    params.push(&status_str);
    params.push(&bbs_id);
    params.push(&conference_id);
    for id in message_ids {
        params.push(id);
    }

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows_affected = stmt
        .execute(params.as_slice())
        .map_err(|e| format!("Failed to execute update: {}", e))?;

    Ok(rows_affected)
}
