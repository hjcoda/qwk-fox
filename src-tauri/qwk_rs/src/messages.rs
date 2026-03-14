use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use bstr::ByteSlice;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufReader;
use std::io::Read;
use std::{io, u16};
use zip::ZipArchive;

use crate::Parser;

const BUFFER_SIZE: usize = 128;

/// Read status of a message and its category.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum MessageStatus {
    PublicUnread,
    PublicRead,
    PrivateUnread,
    PrivateRead,
    CommentToSysopUnread,
    CommentToSysopRead,
    PasswordProtectedUnread,
    PasswordProtectedRead,
    GroupPasswordUnread,
    GroupPasswordRead,
    GroupPasswordToAll,
}

impl MessageStatus {
    /// Convert a status to the QWK on-disk character representation.
    pub fn to_char(&self) -> char {
        match self {
            MessageStatus::PublicUnread => ' ',
            MessageStatus::PublicRead => '-',
            MessageStatus::PrivateUnread => '+',
            MessageStatus::PrivateRead => '*',
            MessageStatus::CommentToSysopUnread => '~',
            MessageStatus::CommentToSysopRead => '`',
            MessageStatus::PasswordProtectedUnread => '%',
            MessageStatus::PasswordProtectedRead => '^',
            MessageStatus::GroupPasswordUnread => '!',
            MessageStatus::GroupPasswordRead => '#',
            MessageStatus::GroupPasswordToAll => '$',
        }
    }

    /// Parse a QWK status character into a typed status.
    pub fn from_char(c: char) -> Option<Self> {
        match c {
            ' ' => Some(MessageStatus::PublicUnread),
            '-' => Some(MessageStatus::PublicRead),
            '+' => Some(MessageStatus::PrivateUnread),
            '*' => Some(MessageStatus::PrivateRead),
            '~' => Some(MessageStatus::CommentToSysopUnread),
            '`' => Some(MessageStatus::CommentToSysopRead),
            '%' => Some(MessageStatus::PasswordProtectedUnread),
            '^' => Some(MessageStatus::PasswordProtectedRead),
            '!' => Some(MessageStatus::GroupPasswordUnread),
            '#' => Some(MessageStatus::GroupPasswordRead),
            '$' => Some(MessageStatus::GroupPasswordToAll),
            _ => None,
        }
    }
}

/// A parsed message entry from `MESSAGES.DAT`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub section: Option<u32>,
    pub section_bytes: Option<u32>,
    pub section_blocks: Option<u32>,
    pub type_id: char,
    pub msg_id: u32,
    pub date: String,
    pub time: String,
    pub to: String,
    pub from: String,
    pub in_reply_to: u32,
    pub message_count: u32,
    pub conference_id: u16,
    pub text: String,
    pub subject: String,
}

fn read_ascii_number(buffer: &[u8]) -> u32 {
    buffer
        .as_bstr()
        .to_str_lossy()
        .trim()
        .parse::<u32>()
        .unwrap()
}

fn read_ascii_to_base64(buffer: &[u8]) -> String {
    let mut cleaned = Vec::with_capacity(buffer.len());
    for &byte in buffer {
        cleaned.push(if byte == 0xe3 { 0x0a } else { byte });
    }
    STANDARD.encode(cleaned)
}

fn read_ascii(buffer: &[u8]) -> String {
    // Quirk of the format
    buffer
        .iter()
        .map(|&byte| if byte == 0xe3 { 0x0a } else { byte })
        .collect::<Vec<u8>>()
        .as_bstr()
        .to_str_lossy()
        .to_string()
}

impl Parser {
    /// Parse a 128-byte message header into a [`Message`].
    fn process_message_header(buffer: &[u8], section_bytes: u32, section_blocks: u32) -> Message {
        Message {
            section: None,
            section_bytes: Some(section_bytes),
            section_blocks: Some(section_blocks),
            type_id: char::from(buffer[0]),
            msg_id: read_ascii_number(&buffer[1..7]),
            date: read_ascii(&buffer[8..16]),
            time: read_ascii(&buffer[16..21]),
            to: read_ascii(&buffer[21..46]),
            from: read_ascii(&buffer[46..71]),
            in_reply_to: read_ascii_number(&buffer[108..116]),
            message_count: read_ascii_number(&buffer[116..122]),
            conference_id: u16::from_le_bytes([buffer[123], buffer[124]]),
            text: String::new(),
            subject: read_ascii(&buffer[71..96]),
        }
    }

    /// Parse `MESSAGES.DAT` and populate the message list.
    pub fn read_messages(&mut self, archive: &mut ZipArchive<File>) -> Result<(), io::Error> {
        let mut buffer = [0u8; 128];
        // First parse conferences (conference names, and message ids)

        // Then read messages and assign to conferences
        let messages_file = archive.by_path("MESSAGES.DAT")?;
        let mut reader = BufReader::with_capacity(BUFFER_SIZE, messages_file);

        // Skip the first 128 bytes
        match reader.read_exact(&mut buffer) {
            Ok(()) => println!("Skipped header: {:?}", &buffer[..8]),
            Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => {
                return Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "File too short",
                ));
            }
            Err(e) => return Err(e),
        }

        let mut current_offset: u32 = 128;

        loop {
            // Read message header (128 bytes)
            match reader.read_exact(&mut buffer) {
                Ok(()) => {
                    let section_blocks = current_offset / 128;
                    let mut message =
                        Self::process_message_header(&buffer, current_offset, section_blocks);

                    // Read the message text chunks
                    let mut text_bytes = Vec::<u8>::with_capacity(
                        (message.message_count as usize).saturating_mul(BUFFER_SIZE),
                    );
                    for _chunk_num in 1..message.message_count {
                        match reader.read_exact(&mut buffer) {
                            Ok(()) => {
                                // Convert bytes to string, handling potential non-UTF8 data
                                // Using lossy conversion to avoid errors
                                //let chunk_text = Self::read_ascii_to_base64(&buffer);
                                text_bytes.extend(&buffer);
                            }
                            Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => {
                                eprintln!("Warning: Unexpected EOF while reading message chunks");
                                break;
                            }
                            Err(e) => return Err(e),
                        }
                    }

                    let message_size = (message.message_count as u32).saturating_mul(128);
                    message.section = Some(current_offset);
                    message.text = read_ascii_to_base64(&text_bytes);
                    // TODO - look for entry in headers hashmap at key of current file pointer address
                    // if found, supplement the message data with the header data.

                    let _ = &self.messages.push(message);

                    current_offset = current_offset.saturating_add(message_size);
                }
                Err(ref e) if e.kind() == io::ErrorKind::UnexpectedEof => {
                    // End of file reached normally
                    break;
                }
                Err(e) => return Err(e),
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::BUFFER_SIZE;
    use crate::Parser;
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    use std::io::Cursor;
    use std::io::Write;
    use zip::write::FileOptions;
    use zip::ZipArchive;

    fn write_ascii(buffer: &mut [u8], text: &str) {
        let bytes = text.as_bytes();
        let len = bytes.len().min(buffer.len());
        buffer[..len].copy_from_slice(&bytes[..len]);
    }

    fn zip_with_messages(payload: &[u8]) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut buffer = Cursor::new(Vec::new());
        {
            let mut writer = zip::ZipWriter::new(&mut buffer);
            writer
                .start_file("MESSAGES.DAT", FileOptions::default())
                .expect("failed to start file");
            writer.write_all(payload).expect("failed to write messages");
            writer.finish().expect("failed to finish zip");
        }
        buffer.set_position(0);
        ZipArchive::new(buffer).expect("failed to open zip archive")
    }

    #[test]
    fn parses_single_message_with_text() {
        let mut data = vec![0u8; BUFFER_SIZE];
        data.extend(vec![0u8; BUFFER_SIZE]);
        data.extend(vec![0u8; BUFFER_SIZE]);

        let header = &mut data[BUFFER_SIZE..BUFFER_SIZE * 2];
        header[0] = b' ';
        write_ascii(&mut header[1..7], "000001");
        write_ascii(&mut header[8..16], "03-05-26");
        write_ascii(&mut header[16..21], "0726 ");
        write_ascii(&mut header[21..46], "TO");
        write_ascii(&mut header[46..71], "FROM");
        write_ascii(&mut header[71..96], "SUBJECT");
        write_ascii(&mut header[108..116], "00000000");
        write_ascii(&mut header[116..122], "000002");
        header[123..125].copy_from_slice(&1u16.to_le_bytes());

        let text = &mut data[BUFFER_SIZE * 2..BUFFER_SIZE * 3];
        write_ascii(text, "HELLO");

        let mut archive = zip_with_messages(&data);
        let mut parser = Parser::default();
        parser.read_messages(&mut archive).expect("read messages");

        assert_eq!(parser.messages.len(), 1);
        let message = &parser.messages[0];
        assert_eq!(message.msg_id, 1);
        assert_eq!(message.section, Some(128));
        assert_eq!(message.section_bytes, Some(128));
        assert_eq!(message.section_blocks, Some(1));

        let decoded = STANDARD.decode(&message.text).expect("decode base64");
        assert!(decoded.starts_with(b"HELLO"));
    }
}
