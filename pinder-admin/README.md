# Pinder Admin

Standalone administrative web app for the Pinder platform.

## What it covers

- User oversight and account status.
- Pet lifecycle and adoption availability.
- Match, adoption and conversation hygiene.
- Event cancellation and attendance pressure.
- Group management and moderation queue.

## Why this app exists

The backend and mobile app show that Pinder is a pet adoption and community platform with users, pets, matches, adoption chats, events and groups. This admin console focuses on the operational layer an administrator would realistically need.

## Run locally

From this folder:

```bash
npm run dev
```

Then open the printed URL in the browser.

## Data mode

- The app starts with a seeded snapshot so it works immediately.
- You can try live sync against the backend by changing the API base URL in the sidebar.
- Existing backend routes used by the admin view include `GET /users`, `GET /pets`, `GET /matches`, `GET /events`, `GET /groups`, `DELETE /pets/:id`, `PUT /matches/:id`, and `PATCH /events/:id/cancel`.