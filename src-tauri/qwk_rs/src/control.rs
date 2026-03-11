use crate::Parser;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io;
use std::io::{BufRead, BufReader};
use zip::ZipArchive;

/// A single BBS node which created a QWK packet
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Server {
    pub bbs_id: String,
    pub bbs_name: String,
    pub city_and_state: String,
    pub phone_number: String,
    pub sysop_name: String,
    pub creation_time: String,
    pub user_name: String,
}

/// A conference category
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conference {
    pub id: u32,
    pub title: String,
}

impl Parser {
    pub fn read_control(&mut self, archive: &mut ZipArchive<File>) -> Result<Server, io::Error> {
        let control_file = archive.by_path("CONTROL.DAT")?;
        let reader = BufReader::new(control_file);
        let lines: Vec<String> = reader.lines().map(|line| line.unwrap()).collect();

        let server = Server {
            bbs_name: lines[0].trim().to_string(),
            city_and_state: lines[1].trim().to_string(),
            phone_number: lines[2].trim().to_string(),
            sysop_name: lines[3].trim().to_string(),
            bbs_id: lines[4].trim().to_string(),
            creation_time: lines[5].trim().to_string(),
            user_name: lines[6].trim().to_string(),
        };

        for line_no in (11..lines.len() - 3).step_by(2) {
            self.conferences.push(Conference {
                id: lines[line_no].trim().parse::<u32>().unwrap(),
                title: lines[line_no + 1].trim().to_string(),
            })
        }

        Ok(server)
    }
}
