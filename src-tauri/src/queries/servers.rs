use crate::dto;

/// Fetch all servers from the database.
pub fn fetch_servers(conn: &rusqlite::Connection) -> Result<Vec<qwk_rs::Server>, String> {
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
                user_name: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(servers)
}

/// Fetch conferences for the specified BBS.
pub fn fetch_conferences(
    conn: &rusqlite::Connection,
    bbs_id: &str,
) -> Result<Vec<dto::Conference>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT c.conference_id,
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
        .query_map([bbs_id], |row| {
            Ok(dto::Conference {
                id: row.get(0)?,
                title: row.get(1)?,
                message_count: row.get(2)?,
                unread_count: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(conferences)
}
