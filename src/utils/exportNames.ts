export const buildTimestampSuffix = (date: Date = new Date()): string => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
};

export const buildExportName = (fileName: string, suffix: string, date: Date = new Date()): string => {
  const baseName = fileName.replace(/\.pdf$/i, "");
  return `${baseName}_${suffix}_${buildTimestampSuffix(date)}.pdf`;
};
