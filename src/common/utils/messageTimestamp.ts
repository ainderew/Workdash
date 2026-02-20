type MessageTimestampInput = string | number | Date;

const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "2-digit",
});

const DAY_DIVIDER_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
});

const toValidDate = (value: MessageTimestampInput): Date | null => {
    const nextDate = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(nextDate.getTime())) {
        return null;
    }
    return nextDate;
};

const isSameLocalDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();

export const isSameMessageCalendarDay = (
    aValue: MessageTimestampInput,
    bValue: MessageTimestampInput,
): boolean => {
    const firstDate = toValidDate(aValue);
    const secondDate = toValidDate(bValue);
    if (!firstDate || !secondDate) {
        return false;
    }

    return isSameLocalDay(firstDate, secondDate);
};

export const formatChatMessageTimestamp = (
    value: MessageTimestampInput,
    nowValue: MessageTimestampInput = new Date(),
): string => {
    const messageDate = toValidDate(value);
    const now = toValidDate(nowValue);
    if (!messageDate || !now) {
        return "";
    }

    const timeLabel = TIME_FORMATTER.format(messageDate);
    if (isSameLocalDay(messageDate, now)) {
        return timeLabel;
    }

    const yesterday = new Date(now.getTime());
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameLocalDay(messageDate, yesterday)) {
        return `Yesterday at ${timeLabel}`;
    }

    const dateLabel = DATE_FORMATTER.format(messageDate);
    return `${dateLabel} at ${timeLabel}`;
};

export const formatChatDaySeparatorLabel = (
    value: MessageTimestampInput,
): string => {
    const messageDate = toValidDate(value);
    if (!messageDate) {
        return "";
    }

    return DAY_DIVIDER_FORMATTER.format(messageDate);
};
