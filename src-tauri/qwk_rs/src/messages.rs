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

/// Read status of the message and message category
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

/// A message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
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
    fn process_message_header(buffer: &[u8]) -> Message {
        Message {
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

        loop {
            // Read message header (128 bytes)
            match reader.read_exact(&mut buffer) {
                Ok(()) => {
                    let mut message = Self::process_message_header(&buffer);

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

                    message.text = read_ascii_to_base64(&text_bytes);
                    // TODO - look for entry in headers hashmap at key of current file pointer address
                    // if found, supplement the message data with the header data.

                    let _ = &self.messages.push(message);
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
