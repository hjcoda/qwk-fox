// Specify the locale and options
// Specify the locale and options
const dateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

const parseMMDDYYYY = (dateString: string): Date => {
  const parts = dateString.split('-');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

const validDate = (date: string): boolean => {
  return Number.isFinite(new Date(date).getTime());
}

// Format the date
export const formatDate = (date: string): string => {
  // Y2K bug, we meet again! Expand dates to likely 4-digit equivalent.
  const segments = date.split('-');
  const year = Number(segments[segments.length - 1]);
  if (!isNaN(year) && year < 100) {
    if (year <= 70) {
      segments[segments.length - 1] = `${2000 + year}`;
    }
    else {
      segments[segments.length - 1] = `${1900 + year}`;
    }
    date = segments.join('-');
  }


  let options = dateTimeOptions;
  // If the time is missing just return the date
  if (!validDate(date)) {
    const mmddyyyy = parseMMDDYYYY(date);
    if (validDate(mmddyyyy.toISOString())) {
      date = mmddyyyy.toISOString();
      options = dateOptions;
    }
  }

  const locale = localStorage.getItem("qwk-fox.locale") ?? "en-US";
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}
