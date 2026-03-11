use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::io::{BufReader, Read};
use zip::ZipArchive;

use crate::Parser;

/// Syncronet header which augments messages with extra data
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Header {
    section: u32,
    utf8: Option<bool>,
    format: Option<String>,
    message_ids: Vec<String>,
    in_reply_tos: Vec<String>,
    when_writtens: Vec<TimestampWithHex>,
    when_importeds: Vec<TimestampWithHex>,
    when_exporteds: Vec<TimestampWithHex>,
    exported_froms: Vec<String>,
    sender: Option<String>,
    sender_net_addr: Option<String>,
    sender_ip_addr: Option<String>,
    sender_host_name: Option<String>,
    sender_protocol: Option<String>,
    organization: Option<String>,
    reply_to: Option<String>,
    subject: Option<String>,
    to: Option<String>,
    to_net_addr: Option<String>,
    x_ftn_area: Option<String>,
    x_ftn_seen_by: Option<String>,
    x_ftn_path: Option<String>,
    x_ftn_msgid: Option<String>,
    x_ftn_reply: Option<String>,
    x_ftn_pid: Option<String>,
    x_ftn_flags: Option<String>,
    x_ftn_tid: Option<String>,
    x_ftn_chrs: Option<String>,
    x_ftn_kludge: Option<String>,
    editor: Option<String>,
    columns: Option<u32>,
    tags: Option<String>,
    path: Option<String>,
    newsgroups: Option<String>,
    conference: Option<u32>,
    other_fields: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TimestampWithHex {
    timestamp: String,
    hex: String,
}

fn parse_timestamp_with_hex(input: &str) -> Option<TimestampWithHex> {
    let parts: Vec<&str> = input.split_whitespace().collect();
    if parts.len() >= 2 {
        Some(TimestampWithHex {
            timestamp: parts[0].to_string(),
            hex: parts[1].to_string(),
        })
    } else {
        None
    }
}

impl Parser {
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
            "In-Reply-To" => msg
                .in_reply_tos
                .push(value.trim_matches('<').trim_matches('>').to_string()),
            "WhenWritten" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_writtens.push(ts);
                }
            }
            "WhenImported" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_importeds.push(ts);
                }
            }
            "WhenExported" => {
                if let Some(ts) = parse_timestamp_with_hex(value) {
                    msg.when_exporteds.push(ts);
                }
            }
            "ExportedFrom" => msg.exported_froms.push(value.to_string()),
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
                let section_num = line[1..line.len() - 1].parse::<u32>().unwrap_or(0);
                current_message = Some(Header {
                    section: section_num,
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

    pub fn read_headers(&mut self, archive: &mut ZipArchive<File>) -> Result<(), io::Error> {
        match archive.by_path("HEADERS.DAT") {
            Ok(header_file) => {
                let mut contents = String::new();
                let mut reader = BufReader::new(header_file);
                reader.read_to_string(&mut contents)?;
                self.parse_messages(&contents);
            }
            Err(_) => {}
        }

        Ok(())
    }
}
