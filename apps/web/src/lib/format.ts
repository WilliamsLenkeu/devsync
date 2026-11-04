import { formatDistanceToNowStrict, isBefore, parseISO } from 'date-fns';

export const timeAgo = (iso: string) => `${formatDistanceToNowStrict(parseISO(iso))} ago`;

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(parseISO(iso));

export const isOverdue = (dueDate: string | null, status: string) =>
  !!dueDate && status !== 'DONE' && isBefore(parseISO(dueDate), new Date());

export const humanize = (enumValue: string) =>
  enumValue.charAt(0) + enumValue.slice(1).toLowerCase().replace(/_/g, ' ');
