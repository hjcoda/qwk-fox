use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::io::{BufReader, Read};
use zip::ZipArchive;

use crate::synchronet::parse_timestamp_with_hex;
use crate::Parser;

/// Synchronet header which augments messages with extra data.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Header {
    pub section: u32,
    pub section_bytes: Option<u32>,
    pub section_blocks: Option<u32>,
    pub utf8: Option<bool>,
    pub format: Option<String>,
    pub message_ids: Vec<String>,
    pub in_reply_to: Option<String>,
    pub when_written: Option<String>,
    pub when_imported: Option<String>,
    pub when_exported: Option<String>,
    pub exported_from: Option<String>,
    pub sender: Option<String>,
    pub sender_net_addr: Option<String>,
    pub sender_ip_addr: Option<String>,
    pub sender_host_name: Option<String>,
    pub sender_protocol: Option<String>,
    pub organization: Option<String>,
    pub reply_to: Option<String>,
    pub subject: Option<String>,
    pub to: Option<String>,
    pub to_net_addr: Option<String>,
    pub x_ftn_area: Option<String>,
    pub x_ftn_seen_by: Option<String>,
    pub x_ftn_path: Option<String>,
    pub x_ftn_msgid: Option<String>,
    pub x_ftn_reply: Option<String>,
    pub x_ftn_pid: Option<String>,
    pub x_ftn_flags: Option<String>,
    pub x_ftn_tid: Option<String>,
    pub x_ftn_chrs: Option<String>,
    pub x_ftn_kludge: Option<String>,
    pub editor: Option<String>,
    pub columns: Option<u32>,
    pub tags: Option<String>,
    pub path: Option<String>,
    pub newsgroups: Option<String>,
    pub conference: Option<u32>,
    pub other_fields: HashMap<String, Vec<String>>,
}

impl Parser {
    /// Parse a single header line into the current message header.
    fn parse_line_into_message(&mut self, line: &str, msg: &mut Header) {
        let (key, value) = if line.contains('=') {
            let parts: Vec<&str> = line.splitn(2, '=').collect();
            (parts[0].trim(), parts[1].trim())
        } else if line.contains(':') {
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            (parts[0].trim(), parts[1].trim())
        } else {
            return;
        };

        match key {
            "Utf8" => msg.utf8 = value.parse().ok(),
            "Format" => msg.format = Some(value.to_string()),
            "Message-ID" => msg
                .message_ids
                .push(value.trim_matches('<').trim_matches('>').to_string()),
            "In-Reply-To" => {
                msg.in_reply_to = Some(value.trim_matches('<').trim_matches('>').to_string())
            }
            "WhenWritten" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_written = Some(ts);
                }
            }
            "WhenImported" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_imported = Some(ts);
                }
            }
            "WhenExported" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_exported = Some(ts);
                }
            }
            "ExportedFrom" => msg.exported_from = Some(value.to_string()),
            "Sender" => msg.sender = Some(value.to_string()),
            "SenderNetAddr" => msg.sender_net_addr = Some(value.to_string()),
            "SenderIpAddr" => msg.sender_ip_addr = Some(value.to_string()),
            "SenderHostName" => msg.sender_host_name = Some(value.to_string()),
            "SenderProtocol" => msg.sender_protocol = Some(value.to_string()),
            "Organization" => msg.organization = Some(value.to_string()),
            "Subject" => msg.subject = Some(value.to_string()),
            "To" => msg.to = Some(value.to_string()),
            "ToNetAddr" => msg.to_net_addr = Some(value.to_string()),
            "X-FTN-AREA" => msg.x_ftn_area = Some(value.to_string()),
            "X-FTN-SEEN-BY" => msg.x_ftn_seen_by = Some(value.to_string()),
            "X-FTN-PATH" => msg.x_ftn_path = Some(value.to_string()),
            "X-FTN-MSGID" => msg.x_ftn_msgid = Some(value.to_string()),
            "X-FTN-REPLY" => msg.x_ftn_reply = Some(value.to_string()),
            "X-FTN-PID" => msg.x_ftn_pid = Some(value.to_string()),
            "X-FTN-Flags" => msg.x_ftn_flags = Some(value.to_string()),
            "X-FTN-TID" => msg.x_ftn_tid = Some(value.to_string()),
            "X-FTN-CHRS" => msg.x_ftn_chrs = Some(value.to_string()),
            "X-FTN-Kludge" => msg.x_ftn_kludge = Some(value.to_string()),
            "Editor" => msg.editor = Some(value.to_string()),
            "Columns" => msg.editor = value.parse().ok(),
            "Tags" => msg.tags = Some(value.to_string()),
            "Path" => msg.path = Some(value.to_string()),
            "Newsgroups" => msg.path = Some(value.to_string()),
            "Conference" => msg.conference = value.parse().ok(),
            _ => {
                msg.other_fields
                    .entry(key.to_string())
                    .or_insert_with(Vec::new)
                    .push(value.to_string());
            }
        }
    }

    /// Parse the contents of `HEADERS.DAT` into header records.
    fn parse_messages(&mut self, content: &str) {
        let mut current_message: Option<Header> = None;
        let mut in_section = false;

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            // Check for section header like [900]
            if line.starts_with('[') && line.ends_with(']') {
                // Save the previous message if it exists
                if let Some(msg) = current_message.take() {
                    let _ = &self
                        .headers
                        .entry(msg.section.to_string())
                        .insert_entry(msg);
                }

                // Start a new message
                let section_text = line[1..line.len() - 1].trim();
                let section_num = if let Some(hex) = section_text.strip_prefix("0x") {
                    u32::from_str_radix(hex, 16).unwrap_or(0)
                } else if section_text
                    .chars()
                    .any(|c| c.is_ascii_hexdigit() && c.is_ascii_alphabetic())
                {
                    u32::from_str_radix(section_text, 16).unwrap_or(0)
                } else {
                    section_text.parse::<u32>().unwrap_or(0)
                };
                current_message = Some(Header {
                    section: section_num,
                    section_bytes: None,
                    section_blocks: None,
                    ..Default::default()
                });
                in_section = true;
                continue;
            }

            // Parse key-value pairs if we're in a section
            if in_section {
                if let Some(msg) = &mut current_message {
                    self.parse_line_into_message(line, msg);
                }
            }
        }

        // Don't forget the last message
        if let Some(msg) = current_message {
            let _ = &self
                .headers
                .entry(msg.section.to_string())
                .insert_entry(msg);
        }
    }

    /// Parse `HEADERS.DAT` (if present) and populate header records.
    pub fn read_headers(&mut self, archive: &mut ZipArchive<File>) -> Result<(), io::Error> {
        println!("Looking for headers file");
        match archive.by_path("HEADERS.DAT") {
            Ok(header_file) => {
                println!("Found headers file");
                let mut contents = Vec::new();
                let mut reader = BufReader::new(header_file);
                if let Err(err) = reader.read_to_end(&mut contents) {
                    eprintln!("Failed to read HEADERS.DAT: {}", err);
                    return Err(err);
                }
                println!("Read headers file");
                let contents = String::from_utf8_lossy(&contents);
                self.parse_messages(&contents);
            }
            Err(err) => {
                eprintln!("Failed to open HEADERS.DAT: {}", err);
                return Err(io::Error::new(io::ErrorKind::Other, err));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::Header;
    use crate::Parser;
    use std::io::Cursor;
    use std::io::Write;
    use zip::write::FileOptions;
    use zip::ZipArchive;

    fn zip_with_headers(contents: &str) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut buffer = Cursor::new(Vec::new());
        {
            let mut writer = zip::ZipWriter::new(&mut buffer);
            writer
                .start_file("HEADERS.DAT", FileOptions::default())
                .expect("failed to start file");
            writer
                .write_all(contents.as_bytes())
                .expect("failed to write headers");
            writer.finish().expect("failed to finish zip");
        }
        buffer.set_position(0);
        ZipArchive::new(buffer).expect("failed to open zip archive")
    }

    #[test]
    fn parses_headers_and_timestamps() {
        let headers = "[1A]\n\
WhenWritten:  20260305072622-0800  41e0\n\
Message-ID: <abc123>\n\
Sender: Test Sender\n\
Subject: Hello\n\
To: Receiver\n";

        let mut archive = zip_with_headers(headers);
        let mut parser = Parser::default();
        parser.read_headers(&mut archive).expect("read headers");

        let header = parser.headers.get("26").expect("header should be present");
        assert_eq!(header.section, 26);
        assert_eq!(header.message_ids, vec!["abc123".to_string()]);
        assert_eq!(header.sender.as_deref(), Some("Test Sender"));
        assert_eq!(header.subject.as_deref(), Some("Hello"));
        assert_eq!(header.to.as_deref(), Some("Receiver"));
        assert_eq!(header.when_written.as_deref(), Some("2026-03-05 15:26:22"));
    }
}
