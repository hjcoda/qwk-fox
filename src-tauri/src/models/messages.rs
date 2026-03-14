/// Message payload returned to the frontend, with optional header data.
#[derive(Debug, serde::Serialize)]
pub struct MessageWithHeader {
    #[serde(flatten)]
    pub message: qwk_rs::Message,
    pub header: Option<qwk_rs::Header>,
}
