export type NotificationType = "new_event" | "saved_event_reminder" | "event_change" | "event_cancelled";

export type NotificationRecord = {
  id: string;
  userId: string;
  eventId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relevanceExplanation: string;
  createdAt: string;
  readAt?: string | null;
  status: "pending" | "created" | "read" | "dismissed";
  actionUrl?: string;
  idempotencyKey: string;
};

export function createNotificationRecord(
  input: Omit<NotificationRecord, "readAt" | "status"> & {
    readAt?: string | null;
    status?: NotificationRecord["status"];
  },
): NotificationRecord {
  const now = new Date().toISOString();
  return {
    ...input,
    createdAt: input.createdAt ?? now,
    readAt: input.readAt ?? null,
    status: input.status ?? "created",
  };
}

export function dedupeNotifications(existing: NotificationRecord[], candidate: NotificationRecord): NotificationRecord[] {
  const unique = new Set(existing.map((item) => item.idempotencyKey));
  if (!unique.has(candidate.idempotencyKey)) {
    return [...existing, candidate];
  }
  return existing;
}

export function resolveNotificationReminder(userId: string, eventId: string, reminderTime: string): NotificationRecord {
  const idempotencyKey = `${userId}:${eventId}:saved_event_reminder:${reminderTime}`;
  return createNotificationRecord({
    id: `${userId}-${eventId}-reminder`,
    userId,
    eventId,
    type: "saved_event_reminder",
    title: "Saved event reminder",
    message: "Your saved event is approaching its start time.",
    relevanceExplanation: "Reminder generated from your saved-event preferences.",
    createdAt: new Date().toISOString(),
    idempotencyKey,
    actionUrl: `/events/${eventId}`,
    status: "pending",
  });
}

export const demoNotifications: NotificationRecord[] = [
  {
    id: "notif-1",
    userId: "demo-user",
    eventId: "evt-01",
    type: "new_event",
    title: "New skill match: Python for Analytics Bootcamp",
    message: "This workshop covers Python and data analysis, which are skills in your current roadmap.",
    relevanceExplanation: "High match with your Data analyst roadmap.",
    createdAt: "2026-10-23T09:00:00.000Z",
    readAt: null,
    status: "created",
    actionUrl: "/events/evt-01",
    idempotencyKey: "demo-user:evt-01:new_event",
  },
  {
    id: "notif-2",
    userId: "demo-user",
    eventId: "evt-03",
    type: "saved_event_reminder",
    title: "Saved event reminder",
    message: "SQL Deep Dive for Analysts starts soon.",
    relevanceExplanation: "You saved this event and it matches your roadmap.",
    createdAt: "2026-10-22T10:00:00.000Z",
    readAt: null,
    status: "pending",
    actionUrl: "/events/evt-03",
    idempotencyKey: "demo-user:evt-03:saved_event_reminder",
  },
];
