/// Read header fields for the current row if present.
pub fn read_header_fields(
    row: &rusqlite::Row<'_>,
) -> Result<Option<qwk_rs::Header>, rusqlite::Error> {
    if row.get::<_, Option<i64>>(11)?.is_none() {
        return Ok(None);
    }

    let other_fields = row
        .get::<_, Option<String>>(48)?
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default();
    let message_ids = row
        .get::<_, Option<String>>(16)?
        .and_then(|value| serde_json::from_str(&value).ok())
        .unwrap_or_default();

    Ok(Some(qwk_rs::Header {
        section: row.get::<_, Option<i64>>(11)?.unwrap_or_default() as u32,
        section_bytes: row.get::<_, Option<i64>>(12)?.map(|value| value as u32),
        section_blocks: row.get::<_, Option<i64>>(13)?.map(|value| value as u32),
        utf8: row.get::<_, Option<i64>>(14)?.map(|value| value != 0),
        format: row.get::<_, Option<String>>(15)?,
        message_ids,
        in_reply_to: row.get::<_, Option<String>>(17)?,
        when_written: row.get::<_, Option<String>>(18)?,
        when_imported: row.get::<_, Option<String>>(19)?,
        when_exported: row.get::<_, Option<String>>(20)?,
        exported_from: row.get::<_, Option<String>>(21)?,
        sender: row.get::<_, Option<String>>(22)?,
        sender_net_addr: row.get::<_, Option<String>>(23)?,
        sender_ip_addr: row.get::<_, Option<String>>(24)?,
        sender_host_name: row.get::<_, Option<String>>(25)?,
        sender_protocol: row.get::<_, Option<String>>(26)?,
        organization: row.get::<_, Option<String>>(27)?,
        reply_to: row.get::<_, Option<String>>(28)?,
        subject: row.get::<_, Option<String>>(29)?,
        to: row.get::<_, Option<String>>(30)?,
        to_net_addr: row.get::<_, Option<String>>(31)?,
        x_ftn_area: row.get::<_, Option<String>>(32)?,
        x_ftn_seen_by: row.get::<_, Option<String>>(33)?,
        x_ftn_path: row.get::<_, Option<String>>(34)?,
        x_ftn_msgid: row.get::<_, Option<String>>(35)?,
        x_ftn_reply: row.get::<_, Option<String>>(36)?,
        x_ftn_pid: row.get::<_, Option<String>>(37)?,
        x_ftn_flags: row.get::<_, Option<String>>(38)?,
        x_ftn_tid: row.get::<_, Option<String>>(39)?,
        x_ftn_chrs: row.get::<_, Option<String>>(40)?,
        x_ftn_kludge: row.get::<_, Option<String>>(41)?,
        editor: row.get::<_, Option<String>>(42)?,
        columns: row.get::<_, Option<i64>>(43)?.map(|value| value as u32),
        tags: row.get::<_, Option<String>>(44)?,
        path: row.get::<_, Option<String>>(45)?,
        newsgroups: row.get::<_, Option<String>>(46)?,
        conference: row.get::<_, Option<i64>>(47)?.map(|value| value as u32),
        other_fields,
    }))
}

/// Override message fields with header values when available.
pub fn override_message_fields(message: &mut qwk_rs::Message, header: &qwk_rs::Header) {
    if let Some(subject) = &header.subject {
        message.subject = subject.clone();
    }
    if let Some(to) = &header.to {
        message.to = to.clone();
    }
    if let Some(sender) = &header.sender {
        message.from = sender.clone();
    }
}
