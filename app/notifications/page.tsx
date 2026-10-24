import Link from "next/link";

import { demoNotifications } from "@/lib/notifications";

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">Notifications</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">In-app notification center</h1>
        </div>
        <nav className="flex gap-3 text-sm font-medium text-slate-700">
          <Link href="/">Overview</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/events">Events</Link>
          <Link href="/notifications">Notifications</Link>
        </nav>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Unread items</h2>
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Mark all read</button>
        </div>

        <div className="space-y-4">
          {demoNotifications.map((notification) => (
            <article key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{notification.type}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{notification.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {notification.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>{new Date(notification.createdAt).toLocaleString()}</span>
                <span>{notification.relevanceExplanation}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
