/**
 * date.ts
 * Centralized date utility to enforce Taiwan Time (Asia/Taipei, UTC+8)
 * Ensures consistency regardless of the user's physical timezone.
 */

export const getTaiwanDateString = (dateInput?: Date | string | number): string => {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';

    // Use Intl.DateTimeFormat to force Asia/Taipei timezone
    // en-CA locale formats as YYYY-MM-DD natively
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Taipei',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
};
