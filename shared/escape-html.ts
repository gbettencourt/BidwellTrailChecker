// Shared by the server email templates and the client map popups —
// the same escaping, in one place, instead of a copy on each side.
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
