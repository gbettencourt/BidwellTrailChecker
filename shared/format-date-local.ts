// YYYY-MM-DD for a date in Chico local time, shared by the server
// (weather) and the client (status card).
export const formatDateLocal = (date: Date): string =>
	date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
