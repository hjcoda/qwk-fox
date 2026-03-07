use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conference {
    pub id: u32,
    pub title: String,
    pub message_count: u32,
    pub unread_count: u32,
}
