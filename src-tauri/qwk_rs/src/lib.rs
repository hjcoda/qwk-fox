use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::path::Path;
use zip::ZipArchive;

mod control;
mod headers;
mod messages;

// Re-export types
pub use crate::control::Server;
pub use crate::messages::Message;

/// Parsed data from a QWK packet
#[readonly::make]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Parser {
    pub server: control::Server,
    pub conferences: Vec<control::Conference>,
    pub messages: Vec<messages::Message>,
    pub headers: HashMap<String, headers::Header>,
}

impl Parser {
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
