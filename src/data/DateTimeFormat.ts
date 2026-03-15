// Specify the locale and options
const options: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
};

// Format the date
export const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", options).format(date);
