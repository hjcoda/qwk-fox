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

const YYYYMMDDRegex = /\d{4}-[01]\d-[0-3]\d/;
const MMDDYYYYRegex = /[01]\d-[0-3]\d-\d{4}/;

const parseMMDDYYYY = (dateString: string): Date => {
  const parts = dateString.split("-");
  const month = parseInt(parts[0], 10) - 1; // Months are 0-indexed in JS
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
};

const validDate = (date: string): boolean => {
  return Number.isFinite(new Date(date).getTime());
};

// Format the date
export const formatDate = (date: string): string => {
  let options = dateTimeOptions;

  if (MMDDYYYYRegex.test(date)) {
    const mmddyyyy = parseMMDDYYYY(date);
    if (validDate(mmddyyyy.toISOString())) {
      date = mmddyyyy.toISOString();
      options = dateOptions;
    }
  } else if (!YYYYMMDDRegex.test(date)) {
    const segments = date.split("-");
    const year = Number(segments[segments.length - 1]);

    // Y2K bug, we meet again! Expand dates to likely 4-digit equivalent.
    if (!isNaN(year) && year < 100) {
      if (year <= 70) {
        segments[segments.length - 1] = `${2000 + year}`;
      } else {
        segments[segments.length - 1] = `${1900 + year}`;
      }
      date = segments.join("-");
    }
  }

  const locale = localStorage.getItem("qwk-fox.locale") ?? "en-US";
  const outDate = new Intl.DateTimeFormat(locale, options).format(
    new Date(date),
  );

  return outDate;
};
