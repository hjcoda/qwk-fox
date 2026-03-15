use rusqlite::Connection;
use std::sync::Mutex;
use tauri::Manager;

/// Shared application database connection state.
pub struct DbConnection(pub Mutex<Connection>);

/// Initialize the SQLite database, create schema, and apply migrations.
/// Initialize the SQLite database, create schema, and apply migrations.
pub fn init_db(app: &tauri::App) -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = app
        .path()
        .app_local_data_dir()
        .expect("could not resolve app local data path")
        .join("qwk_reader.db");

    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("could not create app data directory");
    }

    let conn = Connection::open(&db_path).expect("could not open database");

    init_db_on_connection(&conn)?;

    Ok(conn)
}

/// Create schema and apply migrations on an existing connection.
pub fn init_db_on_connection(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
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

        -- Message headers table
        CREATE TABLE IF NOT EXISTS message_headers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bbs_id TEXT NOT NULL,
            conference_id INTEGER NOT NULL,
            msg_id INTEGER NOT NULL,
            section INTEGER NOT NULL,
            section_bytes INTEGER NOT NULL,
            section_blocks INTEGER NOT NULL,
            utf8 INTEGER,
            format TEXT,
            message_ids_json TEXT,
            in_reply_to TEXT,
            when_written TEXT,
            when_imported TEXT,
            when_exported TEXT,
            exported_from TEXT,
            sender TEXT,
            sender_net_addr TEXT,
            sender_ip_addr TEXT,
            sender_host_name TEXT,
            sender_protocol TEXT,
            organization TEXT,
            reply_to TEXT,
            subject TEXT,
            to_field TEXT,
            to_net_addr TEXT,
            x_ftn_area TEXT,
            x_ftn_seen_by TEXT,
            x_ftn_path TEXT,
            x_ftn_msgid TEXT,
            x_ftn_reply TEXT,
            x_ftn_pid TEXT,
            x_ftn_flags TEXT,
            x_ftn_tid TEXT,
            x_ftn_chrs TEXT,
            x_ftn_kludge TEXT,
            editor TEXT,
            columns INTEGER,
            tags TEXT,
            path TEXT,
            newsgroups TEXT,
            conference INTEGER,
            header_json TEXT,
            UNIQUE(bbs_id, conference_id, msg_id)
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_messages_conference ON messages(conference_id, bbs_id);
        CREATE INDEX IF NOT EXISTS idx_messages_msg_id ON messages(msg_id, bbs_id);
        CREATE INDEX IF NOT EXISTS idx_conferences_bbs_id ON conferences(bbs_id);
        CREATE INDEX IF NOT EXISTS idx_message_headers_lookup ON message_headers(bbs_id, conference_id, msg_id);
        "#,
    )
    .expect("could not create database tables");

    let columns = {
        let mut stmt = conn
            .prepare("PRAGMA table_info(message_headers)")
            .expect("could not inspect message_headers table");
        stmt.query_map([], |row| row.get::<_, String>(1))
            .expect("could not query message_headers columns")
            .collect::<Result<Vec<_>, _>>()
            .expect("could not read message_headers columns")
    };
    fn ensure_column(conn: &Connection, columns: &[String], name: &str, data_type: &str) {
        if !columns.iter().any(|column| column == name) {
            let statement = format!(
                "ALTER TABLE message_headers ADD COLUMN {} {}",
                name, data_type
            );
            conn.execute(&statement, []).unwrap_or_else(|err| {
                panic!("could not add {} column to message_headers: {}", name, err)
            });
        }
    }

    ensure_column(&conn, &columns, "header_json", "TEXT");
    ensure_column(&conn, &columns, "section_bytes", "INTEGER");
    ensure_column(&conn, &columns, "section_blocks", "INTEGER");
    ensure_column(&conn, &columns, "utf8", "INTEGER");
    ensure_column(&conn, &columns, "format", "TEXT");
    ensure_column(&conn, &columns, "message_ids_json", "TEXT");
    ensure_column(&conn, &columns, "in_reply_to", "TEXT");
    ensure_column(&conn, &columns, "when_written", "TEXT");
    ensure_column(&conn, &columns, "when_imported", "TEXT");
    ensure_column(&conn, &columns, "when_exported", "TEXT");
    ensure_column(&conn, &columns, "exported_from", "TEXT");
    ensure_column(&conn, &columns, "sender", "TEXT");
    ensure_column(&conn, &columns, "sender_net_addr", "TEXT");
    ensure_column(&conn, &columns, "sender_ip_addr", "TEXT");
    ensure_column(&conn, &columns, "sender_host_name", "TEXT");
    ensure_column(&conn, &columns, "sender_protocol", "TEXT");
    ensure_column(&conn, &columns, "organization", "TEXT");
    ensure_column(&conn, &columns, "reply_to", "TEXT");
    ensure_column(&conn, &columns, "subject", "TEXT");
    ensure_column(&conn, &columns, "to_field", "TEXT");
    ensure_column(&conn, &columns, "to_net_addr", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_area", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_seen_by", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_path", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_msgid", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_reply", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_pid", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_flags", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_tid", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_chrs", "TEXT");
    ensure_column(&conn, &columns, "x_ftn_kludge", "TEXT");
    ensure_column(&conn, &columns, "editor", "TEXT");
    ensure_column(&conn, &columns, "columns", "INTEGER");
    ensure_column(&conn, &columns, "tags", "TEXT");
    ensure_column(&conn, &columns, "path", "TEXT");
    ensure_column(&conn, &columns, "newsgroups", "TEXT");
    ensure_column(&conn, &columns, "conference", "INTEGER");

    Ok(())
}
