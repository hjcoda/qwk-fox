//! QWK packet parsing library.
//!
//! This crate provides a high-level [`Parser`] that reads a `.qwk` archive
//! (ZIP file) and exposes the parsed server, conference, message, and optional
//! Synchronet header data.
//!
//! # Usage
//! ```no_run
//! use qwk_rs::Parser;
//!
//! let parser = Parser::from_file("/path/to/packet.qwk")?;
//! println!("Server: {}", parser.server.bbs_name);
//! println!("Conferences: {}", parser.conferences.len());
//! println!("Messages: {}", parser.messages.len());
//! # Ok::<(), std::io::Error>(())
//! ```
//!
//! The parser tries to load `HEADERS.DAT` if present and makes the parsed
//! Synchronet headers available via [`Parser::headers`].

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::path::Path;
use zip::ZipArchive;

mod control;
mod headers;
mod messages;
mod synchronet;

// Re-export types
pub use crate::control::Conference;
pub use crate::control::Server;
pub use crate::headers::Header;
pub use crate::messages::Message;

/// Parsed data from a QWK packet.
///
/// Use [`Parser::from_file`] to parse a `.qwk` archive. The parser attempts
/// to load `CONTROL.DAT`, `MESSAGES.DAT`, and `HEADERS.DAT` (optional).
#[readonly::make]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Parser {
    pub server: control::Server,
    pub conferences: Vec<control::Conference>,
    pub messages: Vec<messages::Message>,
    pub headers: HashMap<String, headers::Header>,
}

impl Parser {
    /// Construct a parser from already-parsed data.
    pub fn new(
        server: control::Server,
        conferences: Vec<control::Conference>,
        messages: Vec<messages::Message>,
        headers: HashMap<String, headers::Header>,
    ) -> Self {
        Self {
            server,
            conferences,
            messages,
            headers,
        }
    }

    /// Parse a `.qwk` archive from disk.
    ///
    /// Returns a populated [`Parser`] with server, conference, message, and
    /// optional header data.
    pub fn from_file<P: AsRef<Path>>(path: P) -> io::Result<Self> {
        let mut parser = Parser {
            ..Default::default()
        };

        let file = File::open(path)?;
        let mut archive = ZipArchive::new(file)?;

        parser.server = Self::read_control(&mut parser, &mut archive)?;
        let _ = Self::read_headers(&mut parser, &mut archive);
        let _ = Self::read_messages(&mut parser, &mut archive);

        Ok(parser)
    }
}
