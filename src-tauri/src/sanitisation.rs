use chrono::NaiveDate;

pub fn american_to_iso(date_str: &str) -> Result<String, String> {
    let trimmed = date_str.trim();

    let separator = if trimmed.contains('/') { '/' } else { '-' };
    let parts: Vec<&str> = trimmed.split(separator).collect();
    if parts.len() == 3 {
        let month = parts[0];
        let day = parts[1];
        let year = parts[2];

        if year.len() == 4
            && let Ok(date) = NaiveDate::parse_from_str(
                &format!("{:0>2}-{:0>2}-{}", month, day, year),
                "%m-%d-%Y",
            )
        {
            return Ok(date.format("%Y-%m-%d").to_string());
        }

        if year.len() == 2
            && let Ok(year_num) = year.parse::<u32>()
        {
            let full_year = if year_num >= 70 {
                1900 + year_num
            } else {
                2000 + year_num
            };
            let normalized = format!("{:0>2}-{:0>2}-{:04}", month, day, full_year);
            let date = NaiveDate::parse_from_str(&normalized, "%m-%d-%Y")
                .map_err(|e| format!("Invalid date format: {}", e))?;
            return Ok(date.format("%Y-%m-%d").to_string());
        }
    }

    let date = NaiveDate::parse_from_str(trimmed, "%m-%d-%Y")
        .map_err(|e| format!("Invalid date format: {}", e))?;

    // Format as YYYY-MM-DD
    Ok(date.format("%Y-%m-%d").to_string())
}
