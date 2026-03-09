use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use bstr::ByteSlice;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::{io, u16};
use zip::ZipArchive;

// Define possible message states
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Server {
    pub id: u32,
    pub bbs_id: String,
    pub bbs_name: String,
    pub city_and_state: String,
    pub phone_number: String,
    pub sysop_name: String,
    pub creation_time: String,
    pub user_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conference {
    pub id: u32,
    pub title: String,
}

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

#[readonly::make]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Parser {
    pub bbs_name: String,
    pub city_and_state: String,
    pub phone_number: String,
    pub sysop_name: String,
    pub bbs_id: String,
    pub creation_time: String,
    pub user_name: String,
    pub conferences: Vec<Conference>,
    pub messages: Vec<Message>,
}

const BUFFER_SIZE: usize = 128;

impl Parser {
    fn read_ascii_number(buffer: &[u8]) -> u32 {
        buffer
            .as_bstr()
            .to_str_lossy()
            .trim()
            .parse::<u32>()
            .unwrap()
    }

    fn read_ascii_to_base64(buffer: &[u8]) -> String {
        // Quirk of the format
        STANDARD.encode(
            buffer
                .iter()
                .map(|&byte| if byte == 0xe3 { 0x0a } else { byte })
                .collect::<Vec<u8>>(),
        )
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

    fn process_message_header(buffer: &[u8]) -> Message {
        Message {
            type_id: char::from(buffer[0]),
            msg_id: Self::read_ascii_number(&buffer[1..7]),
            date: Self::read_ascii(&buffer[8..16]),
            time: Self::read_ascii(&buffer[16..21]),
            to: Self::read_ascii(&buffer[21..46]),
            from: Self::read_ascii(&buffer[46..71]),
            in_reply_to: Self::read_ascii_number(&buffer[108..116]),
            message_count: Self::read_ascii_number(&buffer[116..122]),
            conference_id: u16::from_le_bytes([buffer[123], buffer[124]]),
            text: String::new(),
            subject: Self::read_ascii(&buffer[71..96]),
        }
    }

    pub fn read_control(&mut self, archive: &mut ZipArchive<File>) -> Result<(), io::Error> {
        let control_file = archive.by_path("CONTROL.DAT")?;
        let reader = BufReader::new(control_file);
        let lines: Vec<String> = reader.lines().map(|line| line.unwrap()).collect();

        self.bbs_name = lines[0].trim().to_string();
        self.city_and_state = lines[1].trim().to_string();
        self.phone_number = lines[2].trim().to_string();
        self.sysop_name = lines[3].trim().to_string();
        self.bbs_id = lines[4].trim().to_string();
        self.creation_time = lines[5].trim().to_string();
        self.user_name = lines[6].trim().to_string();

        for line_no in (11..lines.len() - 3).step_by(2) {
            self.conferences.push(Conference {
                id: lines[line_no].trim().parse::<u32>().unwrap(),
                title: lines[line_no + 1].trim().to_string(),
            })
        }
        Ok(())
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
                    let mut text_bytes = Vec::<u8>::new();
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

                    message.text = Self::read_ascii_to_base64(&text_bytes);
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

    pub fn from_file<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let mut parser = Parser {
            bbs_name: "".to_string(),
            city_and_state: "".to_string(),
            phone_number: "".to_string(),
            sysop_name: "".to_string(),
            bbs_id: "".to_string(),
            creation_time: "".to_string(),
            user_name: "".to_string(),
            conferences: Vec::new(),
            messages: Vec::new(),
        };

        //let mut messages: Vec<Message> = Vec::new();
        let file = File::open(path)?;
        let mut archive = ZipArchive::new(file)?;

        let _ = Self::read_control(&mut parser, &mut archive);
        let _ = Self::read_messages(&mut parser, &mut archive);

        Ok(parser)
    }
}
