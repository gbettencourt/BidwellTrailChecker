export function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

export const formatPhoneNumber = (input?: string): string => {
  if (!input) {
    return "";
  }

  input = input.replace(/\D/g, "").substring(0, 10);

  const size = input.length;
  if (size === 0) {
    return input;
  }

  if (size < 4) {
    input = `(${input}`;
  } else if (size < 7) {
    input = `(${input.substring(0, 3)}) ${input.substring(3, 6)}`;
  } else {
    input = `(${input.substring(0, 3)}) ${input.substring(
      3,
      6
    )}-${input.substring(6, 10)}`;
  }

  return input;
};

export const cleanPhoneNumber = (input?: string): string => {
  return input ? input.replace(/\D/g, "") : "";
};

export const TRAIL_PAGE_URL =
  "https://chico.ca.us/Our-Community/Parks-Recreation-and-Experience-the-Outdoors/Park-Trails/Trail-Gate--Facility-Status-and-Hours/index.html";

// e.g. "45 minutes", "5 hours", "3 days"
export const formatDuration = (ms: number): string => {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `${days} days`;
};

export type StatusEvent = {
  status: "Open" | "Closed";
  at: string;
  source: "auto" | "manual" | "email";
};

export type StatusHistory = {
  current: StatusEvent | null;
  trackedSince: string | null;
  stats: { avgClosureMs: number | null; closuresLast90Days: number };
  events: StatusEvent[];
};
