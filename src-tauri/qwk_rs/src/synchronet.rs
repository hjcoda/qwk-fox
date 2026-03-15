use chrono::{DateTime, FixedOffset, NaiveDateTime, TimeZone, Utc};

/// Parse Synchronet timestamps that include an optional hex suffix.
///
/// Accepts RFC3339, SMB-style timestamps (`YYYY-MM-DDTHH:MM:SS±HHMM`),
/// and compact timestamps (`YYYYMMDDHHMMSS±HHMM`). Returns a UTC
/// `YYYY-MM-DD HH:MM:SS` string when parsing succeeds.
pub fn parse_timestamp_with_hex(date_str: &str) -> Option<String> {
    let trimmed = date_str.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut parts = trimmed.split_whitespace();
    let timestamp = parts.next()?;

    // Try parsing as ISO 8601 with chrono
    // Handles: 2024-01-15T14:30:00Z, 2024-01-15T14:30:00+01:00, etc.
    if let Ok(dt) = DateTime::parse_from_rfc3339(timestamp) {
        // Convert to UTC and format for SQLite
        return Some(
            dt.with_timezone(&Utc)
                .format("%Y-%m-%d %H:%M:%S")
                .to_string(),
        );
    }

    // Try parsing ISO 8601 without timezone
    if let Ok(ndt) = NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        return Some(ndt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try parsing SMB format (YYYY-MM-DDTHH:MM:SS±HHMM)
    // Example: 2024-01-15T14:30:00-0500
    if timestamp.len() == 24 {
        let (datetime_part, tz_part) = timestamp.split_at(19);
        let tz_bytes = tz_part.as_bytes();
        if (tz_bytes[0] == b'+' || tz_bytes[0] == b'-')
            && tz_bytes[1..5].iter().all(|byte| byte.is_ascii_digit())
        {
            let hours = tz_part[1..3].parse::<i32>().ok()?;
            let minutes = tz_part[3..5].parse::<i32>().ok()?;
            let offset_seconds = hours * 3600 + minutes * 60;
            let offset_sign = if tz_part.starts_with('+') { 1 } else { -1 };

            if let Ok(ndt) = NaiveDateTime::parse_from_str(datetime_part, "%Y-%m-%dT%H:%M:%S") {
                let offset = FixedOffset::east_opt(offset_sign * offset_seconds)?;
                let dt_with_tz = offset.from_local_datetime(&ndt).single()?;
                return Some(
                    dt_with_tz
                        .with_timezone(&Utc)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string(),
                );
            }
        }
    }

    // Try SMB format without timezone
    if let Ok(ndt) = NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        return Some(ndt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try compact SMB format (YYYYMMDDHHMMSS±HHMM)
    // Example: 20260305072622-0800
    if timestamp.len() == 19 {
        let (datetime_part, tz_part) = timestamp.split_at(14);
        let tz_bytes = tz_part.as_bytes();
        if (tz_bytes[0] == b'+' || tz_bytes[0] == b'-')
            && tz_bytes[1..5].iter().all(|byte| byte.is_ascii_digit())
        {
            let hours = tz_part[1..3].parse::<i32>().ok()?;
            let minutes = tz_part[3..5].parse::<i32>().ok()?;
            let offset_seconds = hours * 3600 + minutes * 60;
            let offset_sign = if tz_part.starts_with('+') { 1 } else { -1 };

            if let Ok(ndt) = NaiveDateTime::parse_from_str(datetime_part, "%Y%m%d%H%M%S") {
                let offset = FixedOffset::east_opt(offset_sign * offset_seconds)?;
                let dt_with_tz = offset.from_local_datetime(&ndt).single()?;
                return Some(
                    dt_with_tz
                        .with_timezone(&Utc)
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string(),
                );
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::parse_timestamp_with_hex;

    #[test]
    fn parses_rfc3339_timestamps() {
        let input = "2024-01-15T14:30:00Z 1234";
        let parsed = parse_timestamp_with_hex(input).expect("timestamp should parse");
        assert_eq!(parsed, "2024-01-15 14:30:00");
    }

    #[test]
    fn parses_smb_timestamps_with_timezone() {
        let input = "2024-01-15T14:30:00-0500";
        let parsed = parse_timestamp_with_hex(input).expect("timestamp should parse");
        assert_eq!(parsed, "2024-01-15 19:30:00");
    }

    #[test]
    fn parses_compact_smb_timestamps() {
        let input = "20260305072622-0800";
        let parsed = parse_timestamp_with_hex(input).expect("timestamp should parse");
        assert_eq!(parsed, "2026-03-05 15:26:22");
    }
}
