import {
  formatDate,
  formatDateTime,
  formatRelative,
  getEventStatus,
  getPetAgeLabel,
} from "./data.js";

const state = {
  section: "overview",
  query: "",
  data: {
    users: [],
    pets: [],
    matches: [],
    events: [],
    groups: [],
    messages: [],
  },
  selected: null,
  syncState: "loading",
  apiBaseUrl:
    localStorage.getItem("pinder-admin-api") || "http://localhost:3000",
};

const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const searchInput = document.getElementById("search");
const refreshButton = document.getElementById("refreshData");
const kpiGrid = document.getElementById("kpiGrid");
const primaryContent = document.getElementById("primaryContent");
const insightContent = document.getElementById("insightContent");
const sectionHeader = document.getElementById("sectionHeader");
const insightHeader = document.getElementById("insightHeader");

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.section = button.dataset.section;
    state.selected = null;
    render();
  });
});

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  render();
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";
  state.syncState = "loading";
  render();

  try {
    const errors = await hydrateFromApi();
    state.syncState = errors.length ? "partial" : "live";
  } catch (error) {
    state.syncState = "error";
    alert(`Could not refresh live data: ${error.message}`);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh";
    render();
  }
});

bootstrapData();

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    handleAction(
      actionButton.dataset.action,
      actionButton.dataset.id,
      actionButton.dataset.entity,
    );
    return;
  }

  const selectButton = event.target.closest("[data-select]");
  if (selectButton) {
    state.selected = JSON.parse(selectButton.dataset.select);
    render();
  }
});

function normalizeUser(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    photo: user.photo || "https://placehold.co/96x96/111827/f59e0b?text=U",
    location: user.location || "Unknown",
    isBanned: Boolean(user.isBanned),
    created_at: user.created_at || new Date().toISOString(),
    last_active:
      user.last_active || user.created_at || new Date().toISOString(),
    petsCount: user.petsCount ?? user.pets?.length ?? 0,
    matchesCount: user.matchesCount ?? 0,
    createdEvents: user.createdEvents ?? 0,
  };
}

function normalizePet(pet) {
  return {
    pet_id: pet.pet_id,
    name: pet.name,
    species: pet.species?.name || pet.species || "Unknown",
    breed: pet.breed?.name || pet.breed || "Mixed",
    ownerId: pet.owner?.user_id || pet.ownerId,
    ownerName: pet.owner?.username || pet.ownerName || "Unknown",
    location: pet.owner?.location || pet.location || "Unknown",
    gender: pet.gender || "Unknown",
    size: pet.size || "Unknown",
    energy: pet.energy ?? 0,
    age: pet.age ?? 3,
    forAdoption: Boolean(pet.forAdoption),
    main_photo:
      pet.main_photo ||
      pet.photo ||
      "https://placehold.co/640x480/111827/f59e0b?text=Pet",
  };
}

function normalizeMatch(match) {
  return {
    match_id: match.match_id,
    pet1: match.pet1 || {},
    pet2: match.pet2 || {},
    pet_1_id: match.pet_1_id,
    pet_2_id: match.pet_2_id,
    is_adoption: Boolean(match.is_adoption),
    adopter_id: match.adopter_id || null,
    adopter_name: match.adopter_name || match.adopter?.username || null,
    unmatched: Boolean(match.unmatched),
    unmatched_by: match.unmatched_by || null,
    adoption_confirmed_by_owner: Boolean(match.adoption_confirmed_by_owner),
    adoption_confirmed_by_adopter: Boolean(match.adoption_confirmed_by_adopter),
    timestamp: match.timestamp || new Date().toISOString(),
    lastMessage:
      match.lastMessage ||
      match.messages?.[0]?.content ||
      "Sem mensagens ainda",
  };
}

function normalizeEvent(event) {
  return {
    event_id: event.event_id,
    title: event.title,
    description: event.description || "",
    starts_at: event.starts_at,
    ends_at: event.ends_at || null,
    location: event.location || "Unknown",
    attendee_count: event.attendee_count ?? event.attendees?.length ?? 0,
    max_attendees: event.max_attendees ?? null,
    cancelled: Boolean(event.cancelled),
    created_by: event.created_by,
    creatorName: event.creator?.username || event.creatorName || "Unknown",
  };
}

function normalizeGroup(group) {
  return {
    group_id: group.group_id,
    title: group.title,
    date: group.date,
    time: group.time || formatDateTime(group.date).split(", ")[1] || "--:--",
    location: group.location || "Unknown",
    attendeeCount: group.attendeeCount ?? group._count?.attendees ?? 0,
    max_attendees: group.max_attendees ?? null,
    created_by: group.created_by,
    creatorName: group.creatorName || "Unknown",
  };
}

async function hydrateFromApi() {
  const base = state.apiBaseUrl.replace(/\/$/, "");
  const results = await Promise.allSettled([
    fetchJson(`${base}/users`, "users"),
    fetchJson(`${base}/pets`, "pets"),
    fetchJson(`${base}/matches`, "matches"),
    fetchJson(`${base}/events`, "events"),
    fetchJson(`${base}/groups`, "groups"),
    fetchJson(`${base}/messages/admin`, "messages"),
  ]);

  const errors = [];

  const usersResult = results[0];
  if (usersResult.status === "fulfilled") {
    state.data.users = usersResult.value.map(normalizeUser);
  } else {
    state.data.users = [];
    errors.push(usersResult.reason);
  }

  const petsResult = results[1];
  if (petsResult.status === "fulfilled") {
    state.data.pets = petsResult.value.map(normalizePet);
  } else {
    state.data.pets = [];
    errors.push(petsResult.reason);
  }

  const matchesResult = results[2];
  if (matchesResult.status === "fulfilled") {
    state.data.matches = matchesResult.value.map((match) => ({
      ...normalizeMatch(match),
      pet1: normalizePet(match.pet1),
      pet2: normalizePet(match.pet2),
    }));
  } else {
    state.data.matches = [];
    errors.push(matchesResult.reason);
  }

  const eventsResult = results[3];
  if (eventsResult.status === "fulfilled") {
    state.data.events = eventsResult.value.map(normalizeEvent);
  } else {
    state.data.events = [];
    errors.push(eventsResult.reason);
  }

  const groupsResult = results[4];
  if (groupsResult.status === "fulfilled") {
    state.data.groups = groupsResult.value.map(normalizeGroup);
  } else {
    state.data.groups = [];
    errors.push(groupsResult.reason);
  }

  const messagesResult = results[5];
  if (messagesResult.status === "fulfilled") {
    state.data.messages = Array.isArray(messagesResult.value)
      ? messagesResult.value
      : [];
  } else {
    state.data.messages = [];
    errors.push(messagesResult.reason);
  }

  enrichLiveStats();

  if (errors.length === results.length) {
    throw new Error(errors[0]?.message || "Failed to load live admin data");
  }

  return errors;
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${label} request failed (${response.status} ${response.statusText})`,
    );
  }

  if (!contentType.includes("application/json")) {
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `${label} returned non-JSON response from ${url}: ${snippet || "empty body"}`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(
      `${label} returned invalid JSON from ${url}: ${snippet || "empty body"}`,
    );
  }
}

async function bootstrapData() {
  render();

  try {
    const errors = await hydrateFromApi();
    state.syncState = errors.length ? "partial" : "live";
  } catch (error) {
    state.syncState = "error";
    console.error("Failed to load live admin data:", error);
  }

  render();
}

function enrichLiveStats() {
  const petsByOwner = new Map();
  const matchesByUser = new Map();
  const eventsByCreator = new Map();

  state.data.pets.forEach((pet) => {
    petsByOwner.set(pet.ownerId, (petsByOwner.get(pet.ownerId) || 0) + 1);
  });

  state.data.matches.forEach((match) => {
    const ownerIds = [
      match.pet1?.ownerId,
      match.pet2?.ownerId,
      match.adopter_id,
    ].filter(Boolean);
    ownerIds.forEach((userId) => {
      matchesByUser.set(userId, (matchesByUser.get(userId) || 0) + 1);
    });
  });

  state.data.events.forEach((event) => {
    if (event.created_by) {
      eventsByCreator.set(
        event.created_by,
        (eventsByCreator.get(event.created_by) || 0) + 1,
      );
    }
  });

  state.data.users = state.data.users.map((user) => ({
    ...user,
    petsCount: petsByOwner.get(user.user_id) || 0,
    matchesCount: matchesByUser.get(user.user_id) || 0,
    createdEvents: eventsByCreator.get(user.user_id) || 0,
    last_active: user.last_active || user.created_at,
  }));
}

async function requestJson(path, options = {}) {
  const base = state.apiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || response.statusText);
  }

  return payload;
}

function filteredUsers() {
  return state.data.users.filter((user) => {
    const queryMatch = [user.username, user.email, user.location]
      .join(" ")
      .toLowerCase()
      .includes(state.query);

    return queryMatch;
  });
}

function filteredPets() {
  return state.data.pets.filter((pet) => {
    const queryMatch = [
      pet.name,
      pet.species,
      pet.breed,
      pet.ownerName,
      pet.location,
    ]
      .join(" ")
      .toLowerCase()
      .includes(state.query);

    return queryMatch;
  });
}

function filteredMatches() {
  return state.data.matches.filter((match) => {
    const queryMatch = [
      match.pet1.name,
      match.pet2.name,
      match.adopter_name,
      match.lastMessage,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(state.query);

    return queryMatch;
  });
}

function getMatchTutorName(match) {
  const adopter = match?.adopter_id
    ? state.data.users.find((user) => user.user_id === match.adopter_id)
    : null;

  return match?.adopter_name || adopter?.username || adopter?.name || "Tutor";
}

function filteredEvents() {
  return state.data.events.filter((event) => {
    const queryMatch = [event.title, event.location, event.creatorName]
      .join(" ")
      .toLowerCase()
      .includes(state.query);

    return queryMatch;
  });
}

function filteredGroups() {
  return state.data.groups.filter((group) => {
    const queryMatch = [group.title, group.location, group.creatorName]
      .join(" ")
      .toLowerCase()
      .includes(state.query);

    return queryMatch;
  });
}

function activeStats() {
  const users = state.data.users;
  const pets = state.data.pets;
  const matches = state.data.matches;
  const events = state.data.events;
  const groups = state.data.groups;
  const unreadMessages = state.data.messages.filter(
    (message) => !message.read,
  ).length;

  return [
    {
      label: "Users",
      value: users.length,
      delta: `${users.filter((user) => !user.isBanned).length} active`,
    },
    {
      label: "Pets for adoption",
      value: pets.filter((pet) => pet.forAdoption).length,
      delta: `${pets.length} total pets`,
    },
    {
      label: "Matches",
      value: matches.length,
      delta: `${matches.filter((match) => !match.unmatched).length} open`,
    },
    {
      label: "Events",
      value: events.length,
      delta: `${events.filter((event) => getEventStatus(event) === "upcoming").length} upcoming`,
    },
    {
      label: "Unread messages",
      value: unreadMessages,
      delta: `${state.data.messages.length} total messages`,
    },
  ];
}

function renderKpis() {
  if (
    state.syncState === "loading" &&
    !state.data.users.length &&
    !state.data.pets.length
  ) {
    kpiGrid.innerHTML = Array.from({ length: 6 })
      .map(
        () => `
          <article class="kpi-card kpi-card-loading">
            <div class="skeleton skeleton-line skeleton-label"></div>
            <div class="skeleton skeleton-line skeleton-value"></div>
            <div class="skeleton skeleton-line skeleton-delta"></div>
          </article>
        `,
      )
      .join("");
    return;
  }

  kpiGrid.innerHTML = activeStats()
    .map(
      (item) => `
        <article class="kpi-card">
          <p class="eyebrow">${item.label}</p>
          <div class="value">${item.value}</div>
          <div class="delta">${item.delta}</div>
        </article>
      `,
    )
    .join("");
}

function renderHeader(title, description, chips = []) {
  const syncLabel =
    state.syncState === "live"
      ? "Live sync ready"
      : state.syncState === "partial"
        ? "Partial live data"
        : state.syncState === "loading"
          ? "Loading live data"
          : "Live data unavailable";

  return `
    <div>
      <p class="eyebrow">${syncLabel}</p>
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
    <div class="chip-row">${chips.map((chip) => `<span class="chip ${chip.className || ""}">${chip.label}</span>`).join("")}</div>
  `;
}

function renderOverview() {
  const upcomingEvents = state.data.events
    .slice()
    .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at))
    .slice(0, 3);

  const riskyUsers = state.data.users.filter(
    (user) => user.isBanned || user.matchesCount === 0,
  );
  const hotPets = state.data.pets.filter((pet) => pet.forAdoption).slice(0, 4);

  sectionHeader.innerHTML = renderHeader(
    "Operations overview",
    "A quick view of activity, queue pressure and the most important moderation signals in the platform.",
    [
      {
        label: `${state.data.pets.filter((pet) => pet.forAdoption).length} adoption pets`,
        className: "accent",
      },
      {
        label: `${state.data.events.filter((event) => !event.cancelled).length} active events`,
      },
      {
        label: `${state.data.matches.filter((match) => match.is_adoption).length} adoption chats`,
        className: "accent",
      },
    ],
  );

  if (
    state.syncState === "loading" &&
    !state.data.users.length &&
    !state.data.pets.length
  ) {
    primaryContent.innerHTML = `
      <div class="card-grid">
        ${[1, 2, 3, 4]
          .map(
            () => `
              <article class="entity-card entity-card-loading">
                <div class="entity-foot">
                  <div class="skeleton skeleton-line skeleton-label"></div>
                  <div class="skeleton skeleton-pill"></div>
                </div>
                <div class="skeleton skeleton-line skeleton-title"></div>
                <div class="skeleton skeleton-block"></div>
                <div class="timeline">
                  <div class="timeline-item skeleton-tile"></div>
                  <div class="timeline-item skeleton-tile"></div>
                  <div class="timeline-item skeleton-tile"></div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  } else {
    primaryContent.innerHTML = `
      <div class="card-grid">
        <article class="entity-card featured">
          <div class="entity-foot">
            <div>
              <p class="eyebrow">Priority queue</p>
              <h4>Moderation and health checks</h4>
            </div>
            <span class="status ${state.data.users.some((user) => user.isBanned) ? "red" : "green"}">
              ${state.data.users.some((user) => user.isBanned) ? "Needs review" : "Healthy"}
            </span>
          </div>
          <p>
            Users flagged, cancelled events and unresolved match states should be reviewed before they
            create support overhead.
          </p>
          <div class="timeline">
            ${[
              {
                title: "Banned users",
                value: state.data.users.filter((user) => user.isBanned).length,
                status: "red",
              },
              {
                title: "Cancelled events",
                value: state.data.events.filter((event) => event.cancelled)
                  .length,
                status: "orange",
              },
              {
                title: "Unmatched conversations",
                value: state.data.matches.filter((match) => match.unmatched)
                  .length,
                status: "blue",
              },
            ]
              .map(
                (item) => `
                  <div class="timeline-item">
                    <strong>${item.title}</strong>
                    <span class="status ${item.status}">${item.value}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>

        <article class="entity-card">
          <div class="entity-foot">
            <div>
              <p class="eyebrow">Hot pets</p>
              <h4>Pets currently open for adoption</h4>
            </div>
            <span class="tag green">${state.data.pets.filter((pet) => pet.forAdoption).length}</span>
          </div>
          ${hotPets
            .map(
              (pet) => `
                <div class="timeline-item">
                  <strong>${pet.name}</strong>
                  <span class="muted">${pet.species} · ${pet.breed}</span>
                  <span class="muted">Owner: ${pet.ownerName}</span>
                </div>
              `,
            )
            .join("")}
        </article>

        <article class="entity-card">
          <div class="entity-foot">
            <div>
              <p class="eyebrow">Upcoming events</p>
              <h4>Next event windows</h4>
            </div>
            <span class="tag blue">${upcomingEvents.length}</span>
          </div>
          ${upcomingEvents
            .map(
              (event) => `
                <div class="timeline-item">
                  <strong>${event.title}</strong>
                  <span class="muted">${formatDate(event.starts_at)} · ${event.location}</span>
                  <span class="muted">${event.attendee_count}/${event.max_attendees || "?"} attendees</span>
                </div>
              `,
            )
            .join("")}
        </article>

        <article class="entity-card">
          <div class="entity-foot">
            <div>
              <p class="eyebrow">User attention</p>
              <h4>Accounts that deserve a look</h4>
            </div>
            <span class="tag orange">${riskyUsers.length}</span>
          </div>
          ${riskyUsers
            .map(
              (user) => `
                <div class="timeline-item">
                  <strong>${user.username}</strong>
                  <span class="muted">${user.email}</span>
                  <span class="muted">${user.isBanned ? "Banned" : "Low activity"}</span>
                </div>
              `,
            )
            .join("")}
        </article>
      </div>
    `;
  }

  insightHeader.innerHTML = renderHeader(
    "Admin playbook",
    "The backend exposes reads for users, pets, matches, messages and events, plus safe actions like cancel, unmatch and delete.",
    [
      {
        label:
          state.syncState === "live"
            ? "Synced"
            : state.syncState === "partial"
              ? "Partial"
              : state.syncState === "loading"
                ? "Loading"
                : "Offline",
        className:
          state.syncState === "live"
            ? "green"
            : state.syncState === "partial"
              ? "orange"
              : state.syncState === "loading"
                ? "accent"
                : "red",
      },
    ],
  );

  insightContent.innerHTML = `
    <div class="insight-block">
      <div class="route-card">
        <h4>Available control routes</h4>
        <ul class="route-list">
          <li><span>Users</span><span>GET /users, PUT /users/:id</span></li>
          <li><span>Pets</span><span>GET /pets, DELETE /pets/:id</span></li>
          <li><span>Matches</span><span>GET /matches, PUT /matches/:id</span></li>
          <li><span>Events</span><span>GET /events/:id, PATCH /events/:id/cancel</span></li>
          <li><span>Messages</span><span>GET /messages/:matchId</span></li>
        </ul>
      </div>

      <div class="tip-card">
        <h4>What the admin mode should watch</h4>
        <ul class="bullet-list">
          <li>Match state consistency for adoption conversations.</li>
          <li>Pets marked for adoption but without recent activity.</li>
          <li>Cancelled or over-capacity events.</li>
          <li>Banned users and accounts with no engagement.</li>
        </ul>
      </div>
    </div>
  `;
}

function renderUsers() {
  const users = filteredUsers();

  sectionHeader.innerHTML = renderHeader(
    "User management",
    "Review account health, contact points, adoption activity and simple trust signals.",
    [{ label: `${users.length} visible users`, className: "blue" }],
  );

  primaryContent.innerHTML = users.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>User</th>
            <th>Location</th>
            <th>Status</th>
            <th>Pets</th>
            <th>Matches</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (user) => `
                <tr class="row-clickable" data-select='${JSON.stringify({ type: "user", id: user.user_id })}'>
                  <td>
                    <div class="stack">
                      <strong>${user.username}</strong>
                      <span class="muted">${user.email}</span>
                    </div>
                  </td>
                  <td>${user.location}</td>
                  <td><span class="status ${user.isBanned ? "red" : "green"}">${user.isBanned ? "Banned" : "Active"}</span></td>
                  <td>${user.petsCount}</td>
                  <td>${user.matchesCount}</td>
                  <td>${formatRelative(user.last_active)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `
    : renderEmpty(
        "No users match the current filter.",
        "Clear the search term or switch section.",
      );

  insightHeader.innerHTML = renderHeader(
    "Selected user",
    "Click a row to inspect one account in detail.",
    [],
  );
  insightContent.innerHTML = renderDetailPanel(
    state.data.users.find((user) => user.user_id === state.selected?.id) ||
      users[0] ||
      null,
    "user",
  );
}

function renderPets() {
  const pets = filteredPets();

  sectionHeader.innerHTML = renderHeader(
    "Pet operations",
    "Track adoption availability, ownership and content lifecycle for each pet profile.",
    [
      {
        label: `${pets.filter((pet) => pet.forAdoption).length} available`,
        className: "green",
      },
    ],
  );

  primaryContent.innerHTML = pets.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>Pet</th>
            <th>Species</th>
            <th>Breed</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Location</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          ${pets
            .map(
              (pet) => `
                <tr class="row-clickable" data-select='${JSON.stringify({ type: "pet", id: pet.pet_id })}'>
                  <td>
                    <div class="stack">
                      <strong>${pet.name}</strong>
                      <span class="muted">Energy ${pet.energy}/10 · ${pet.gender} · ${pet.size}</span>
                    </div>
                  </td>
                  <td>${pet.species}</td>
                  <td>${pet.breed}</td>
                  <td><span class="status ${pet.forAdoption ? "green" : "orange"}">${pet.forAdoption ? "Adoption" : "Owned"}</span></td>
                  <td>${pet.ownerName}</td>
                  <td>${pet.location}</td>
                  <td>${getPetAgeLabel(pet.age)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `
    : renderEmpty("No pets match the current filter.", "Try a broader search.");

  insightHeader.innerHTML = renderHeader(
    "Selected pet",
    "Use this panel to inspect ownership and adoption state.",
    [],
  );
  insightContent.innerHTML = renderDetailPanel(
    state.data.pets.find((pet) => pet.pet_id === state.selected?.id) ||
      pets[0] ||
      null,
    "pet",
  );
}

function renderMatches() {
  const matches = filteredMatches();

  sectionHeader.innerHTML = renderHeader(
    "Matches",
    "A compact view of matches that already happened, with a quick action to undo them if needed.",
    [
      {
        label: `${matches.filter((match) => match.unmatched).length} closed`,
        className: "red",
      },
    ],
  );

  primaryContent.innerHTML = matches.length
    ? `
      <div class="timeline">
        ${matches
          .map(
            (match) => `
              <article class="timeline-item" data-select='${JSON.stringify({ type: "match", id: match.match_id })}'>
                <div class="entity-foot">
                  <div>
                    <strong>${match.pet1.name} x ${match.pet2.name}</strong>
                    <p class="muted">${match.is_adoption ? "Adoption" : "Match"} · ${formatDateTime(match.timestamp)}</p>
                  </div>
                  <span class="status ${match.unmatched ? "red" : match.is_adoption ? "green" : "blue"}">${match.unmatched ? "Unmatched" : match.is_adoption ? "Adoption" : "Open"}</span>
                </div>
                <div class="button-row">
                  <button class="button button-small" data-action="select-match" data-id="${match.match_id}" data-entity="match">Inspect</button>
                  <button class="button button-small button-danger" data-action="unmatch" data-id="${match.match_id}" data-entity="match">Unmatch</button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `
    : renderEmpty(
        "No matches found.",
        "Clear the search field to show all matches.",
      );

  insightHeader.innerHTML = renderHeader(
    "Selected match",
    "Use this panel to review the match and undo it if needed.",
    [],
  );
  insightContent.innerHTML = renderDetailPanel(
    state.data.matches.find((match) => match.match_id === state.selected?.id) ||
      matches[0] ||
      null,
    "match",
  );
}

function renderEvents() {
  const events = filteredEvents();

  sectionHeader.innerHTML = renderHeader(
    "Event control",
    "Monitor community events, attendance pressure and cancellation status.",
    [
      {
        label: `${events.filter((event) => !event.cancelled).length} active`,
        className: "green",
      },
    ],
  );

  primaryContent.innerHTML = events.length
    ? `
      <div class="timeline">
        ${events
          .map((event) => {
            const status = getEventStatus(event);
            const percentage = event.max_attendees
              ? Math.round((event.attendee_count / event.max_attendees) * 100)
              : 0;
            return `
              <article class="timeline-item" data-select='${JSON.stringify({ type: "event", id: event.event_id })}'>
                <div class="entity-foot">
                  <div>
                    <strong>${event.title}</strong>
                    <p class="muted">${event.location} · ${formatDate(event.starts_at)} · ${event.creatorName}</p>
                  </div>
                  <span class="status ${status === "cancelled" ? "red" : status === "live" ? "green" : status === "finished" ? "orange" : "blue"}">${status}</span>
                </div>
                <p>${event.description}</p>
                <div class="meter"><span style="width: ${Math.min(100, percentage)}%"></span></div>
                <div class="meta-row">
                  <span class="tag">${event.attendee_count}/${event.max_attendees || "?"} attendees</span>
                  <span class="tag">Created by ${event.creatorName}</span>
                </div>
                <div class="button-row">
                  <button class="button button-small" data-action="select-event" data-id="${event.event_id}" data-entity="event">Inspect</button>
                  <button class="button button-small button-danger" data-action="cancel-event" data-id="${event.event_id}" data-entity="event">Cancel event</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `
    : renderEmpty(
        "No events match the current filter.",
        "Reset search to review all upcoming and archived events.",
      );

  insightHeader.innerHTML = renderHeader(
    "Selected event",
    "Understand attendance, lifecycle and admin status.",
    [],
  );
  insightContent.innerHTML = renderDetailPanel(
    state.data.events.find((event) => event.event_id === state.selected?.id) ||
      events[0] ||
      null,
    "event",
  );
}

function renderGroups() {
  const groups = filteredGroups();

  sectionHeader.innerHTML = renderHeader(
    "Group management",
    "This area is meant for local communities and recurring meetups around adoption and social walks.",
    [{ label: `${groups.length} groups`, className: "blue" }],
  );

  primaryContent.innerHTML = groups.length
    ? `
      <div class="card-grid">
        ${groups
          .map(
            (group) => `
              <article class="entity-card" data-select='${JSON.stringify({ type: "group", id: group.group_id })}'>
                <div class="entity-foot">
                  <div>
                    <p class="eyebrow">Community group</p>
                    <h4>${group.title}</h4>
                  </div>
                  <span class="status ${group.attendeeCount >= group.max_attendees ? "orange" : "green"}">${group.attendeeCount}/${group.max_attendees || "?"}</span>
                </div>
                <p>${group.location} · ${formatDate(group.date)} · ${group.creatorName}</p>
                <div class="meta-row">
                  <span class="tag">Created by ${group.creatorName}</span>
                  <span class="tag">${group.time}</span>
                </div>
                <div class="button-row">
                  <button class="button button-small" data-action="select-group" data-id="${group.group_id}" data-entity="group">Inspect</button>
                  <button class="button button-small button-danger" data-action="delete-group" data-id="${group.group_id}" data-entity="group">Delete group</button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `
    : renderEmpty(
        "No groups match the current filter.",
        "Search for a broader term.",
      );

  insightHeader.innerHTML = renderHeader(
    "Selected group",
    "See attendance pressure and ownership details.",
    [],
  );
  insightContent.innerHTML = renderDetailPanel(
    state.data.groups.find((group) => group.group_id === state.selected?.id) ||
      groups[0] ||
      null,
    "group",
  );
}

function renderModeration() {
  const queue = buildModerationQueue();

  sectionHeader.innerHTML = renderHeader(
    "Moderation queue",
    "A compact list of the platform conditions that deserve manual review from an operator.",
    [{ label: `${queue.length} items`, className: "orange" }],
  );

  primaryContent.innerHTML = queue.length
    ? `
      <div class="timeline">
        ${queue
          .map(
            (item) => `
              <article class="timeline-item">
                <div class="entity-foot">
                  <div>
                    <strong>${item.title}</strong>
                    <p class="muted">${item.context}</p>
                  </div>
                  <span class="status ${item.severity === "high" ? "red" : item.severity === "medium" ? "orange" : "blue"}">${item.severity}</span>
                </div>
                <p>${item.detail}</p>
                <div class="button-row">
                  ${
                    item.action
                      ? `<button class="button button-small ${item.actionDanger ? "button-danger" : ""}" data-action="${item.action}" data-id="${item.targetId}" data-entity="${item.entity}">${item.actionLabel}</button>`
                      : ""
                  }
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `
    : renderEmpty(
        "No moderation items right now.",
        "That means the platform is in a healthy state.",
      );

  insightHeader.innerHTML = renderHeader(
    "Moderation notes",
    "This queue is derived from the current in-memory snapshot.",
    [],
  );
  insightContent.innerHTML = `
    <div class="insight-block">
      <div class="detail-card">
        <h4>Rules of thumb</h4>
        <ul class="bullet-list">
          <li>Prioritize banned accounts and abandoned adoption chats.</li>
          <li>Cancel over-capacity or stale events before they become support issues.</li>
          <li>Keep adoption conversations visible until both sides confirm.</li>
          <li>Use delete with care on pets and events because it is destructive.</li>
        </ul>
      </div>
      <div class="detail-card">
        <h4>Snapshot metrics</h4>
        <ul class="detail-list">
          <li><span>Users under review</span><span>${state.data.users.filter((user) => user.isBanned).length}</span></li>
          <li><span>Open adoption matches</span><span>${state.data.matches.filter((match) => match.is_adoption && !match.unmatched).length}</span></li>
          <li><span>Live events</span><span>${state.data.events.filter((event) => getEventStatus(event) === "live").length}</span></li>
          <li><span>Adoption pets</span><span>${state.data.pets.filter((pet) => pet.forAdoption).length}</span></li>
        </ul>
      </div>
    </div>
  `;
}

function renderDetailPanel(item, type) {
  if (!item) {
    return renderEmpty(
      "No item selected.",
      "Click a row or card to inspect it here.",
    );
  }

  if (type === "user") {
    return `
      <div class="detail-card">
        <img class="pet-thumb large" src="${item.photo}" alt="${item.username}" />
        <h4>${item.username}</h4>
        <p>${item.email}</p>
        <ul class="detail-list">
          <li><span>Location</span><span>${item.location}</span></li>
          <li><span>Status</span><span>${item.isBanned ? "Banned" : "Active"}</span></li>
          <li><span>Pets</span><span>${item.petsCount}</span></li>
          <li><span>Matches</span><span>${item.matchesCount}</span></li>
          <li><span>Created events</span><span>${item.createdEvents}</span></li>
          <li><span>Last active</span><span>${formatRelative(item.last_active)}</span></li>
        </ul>
        <div class="button-row">
          <button class="button button-small ${item.isBanned ? "" : "button-danger"}" data-action="toggle-user-ban" data-id="${item.user_id}" data-entity="user">${item.isBanned ? "Unban" : "Ban"}</button>
        </div>
      </div>
    `;
  }

  if (type === "pet") {
    return `
      <div class="detail-card">
        <img class="pet-thumb large" src="${item.main_photo}" alt="${item.name}" />
        <h4>${item.name}</h4>
        <p>${item.species} · ${item.breed}</p>
        <ul class="detail-list">
          <li><span>Owner</span><span>${item.ownerName}</span></li>
          <li><span>Location</span><span>${item.location}</span></li>
          <li><span>Age</span><span>${getPetAgeLabel(item.age)}</span></li>
          <li><span>Gender</span><span>${item.gender}</span></li>
          <li><span>Size</span><span>${item.size}</span></li>
          <li><span>Energy</span><span>${item.energy}/10</span></li>
          <li><span>Adoption</span><span>${item.forAdoption ? "Open" : "Closed"}</span></li>
        </ul>
        <div class="button-row">
          <button class="button button-small" data-action="toggle-pet" data-id="${item.pet_id}" data-entity="pet">Toggle adoption</button>
          <button class="button button-small button-danger" data-action="delete-pet" data-id="${item.pet_id}" data-entity="pet">Delete pet</button>
        </div>
      </div>
    `;
  }

  if (type === "match") {
    const primaryPet = item.pet1?.name ? item.pet1 : item.pet2;
    const secondaryPet = item.is_adoption ? primaryPet : item.pet2;
    const adopterName = getMatchTutorName(item);
    const tutorInitials =
      adopterName
        .split(/[\s._-]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "TU";

    const renderMiniCard = ({
      title,
      name,
      meta,
      image,
      imageAlt,
      initials,
      details,
    }) => `
      <div class="match-mini-card">
        <div class="match-mini-head">
          ${
            image
              ? `<img class="pet-thumb" src="${image}" alt="${imageAlt}" />`
              : `<div class="match-mini-avatar">${initials}</div>`
          }
          <div class="match-mini-meta">
            <p class="eyebrow">${title}</p>
            <h4>${name}</h4>
            <p>${meta}</p>
          </div>
        </div>
        <ul class="detail-list">
          ${details.map(([label, value]) => `<li><span>${label}</span><span>${value}</span></li>`).join("")}
        </ul>
      </div>
    `;

    const leftCard = item.is_adoption
      ? renderMiniCard({
          title: "Tutor",
          name: adopterName,
          meta: "Adoption contact",
          initials: tutorInitials,
          details: [
            ["Role", "Tutor"],
            ["Type", "Adoption"],
          ],
        })
      : renderMiniCard({
          title: "Pet 1",
          name: item.pet1?.name || "Unknown",
          meta: `${item.pet1?.species || "Unknown"} · ${item.pet1?.breed || "Unknown"}`,
          image: item.pet1?.main_photo,
          imageAlt: item.pet1?.name || "Pet 1",
          initials: "P1",
          details: [
            ["Owner", item.pet1?.ownerName || "Unknown"],
            ["Location", item.pet1?.location || "Unknown"],
          ],
        });

    const rightCard = item.is_adoption
      ? renderMiniCard({
          title: "Pet",
          name: primaryPet?.name || "Unknown",
          meta: `${primaryPet?.species || "Unknown"} · ${primaryPet?.breed || "Unknown"}`,
          image: primaryPet?.main_photo,
          imageAlt: primaryPet?.name || "Pet",
          initials: "PT",
          details: [
            ["Owner", primaryPet?.ownerName || "Unknown"],
            ["Location", primaryPet?.location || "Unknown"],
          ],
        })
      : renderMiniCard({
          title: "Pet 2",
          name: secondaryPet?.name || "Unknown",
          meta: `${secondaryPet?.species || "Unknown"} · ${secondaryPet?.breed || "Unknown"}`,
          image: secondaryPet?.main_photo,
          imageAlt: secondaryPet?.name || "Pet 2",
          initials: "P2",
          details: [
            ["Owner", secondaryPet?.ownerName || "Unknown"],
            ["Location", secondaryPet?.location || "Unknown"],
          ],
        });

    return `
      <div class="detail-card">
        <h4>${item.is_adoption ? "Tutor x Pet" : "Pet x Pet"}</h4>
        <p>${item.is_adoption ? "Adoption match" : "General match"}</p>
        <ul class="detail-list">
          <li><span>Status</span><span>${item.unmatched ? "Unmatched" : "Open"}</span></li>
          <li><span>Last update</span><span>${formatDateTime(item.timestamp)}</span></li>
        </ul>
        <div class="match-pair-grid">
          ${leftCard}
          ${rightCard}
        </div>
        <div class="button-row">
          <button class="button button-small button-danger" data-action="unmatch" data-id="${item.match_id}" data-entity="match">Unmatch</button>
        </div>
      </div>
    `;
  }

  if (type === "event") {
    return `
      <div class="detail-card">
        <h4>${item.title}</h4>
        <p>${item.description}</p>
        <ul class="detail-list">
          <li><span>Location</span><span>${item.location}</span></li>
          <li><span>Start</span><span>${formatDateTime(item.starts_at)}</span></li>
          <li><span>Status</span><span>${getEventStatus(item)}</span></li>
          <li><span>Attendance</span><span>${item.attendee_count}/${item.max_attendees || "?"}</span></li>
          <li><span>Created by</span><span>${item.creatorName}</span></li>
        </ul>
        <div class="button-row">
          <button class="button button-small button-danger" data-action="cancel-event" data-id="${item.event_id}" data-entity="event">Cancel event</button>
        </div>
      </div>
    `;
  }

  if (type === "group") {
    return `
      <div class="detail-card">
        <h4>${item.title}</h4>
        <p>${item.location}</p>
        <ul class="detail-list">
          <li><span>Date</span><span>${formatDate(item.date)}</span></li>
          <li><span>Time</span><span>${item.time}</span></li>
          <li><span>Creator</span><span>${item.creatorName}</span></li>
          <li><span>Attendance</span><span>${item.attendeeCount}/${item.max_attendees || "?"}</span></li>
        </ul>
        <div class="button-row">
          <button class="button button-small button-danger" data-action="delete-group" data-id="${item.group_id}" data-entity="group">Delete group</button>
        </div>
      </div>
    `;
  }

  return renderEmpty("Unknown item type.", "Select another record.");
}

function buildModerationQueue() {
  const queue = [];

  state.data.users
    .filter((user) => user.isBanned)
    .forEach((user) => {
      queue.push({
        title: `Banned account: ${user.username}`,
        context: user.email,
        detail:
          "Keep this account under review until the trust team confirms the status or removes the restriction.",
        severity: "high",
        action: "toggle-user-ban",
        actionLabel: "Unban",
        targetId: user.user_id,
        entity: "user",
      });
    });

  state.data.matches
    .filter(
      (match) =>
        match.is_adoption &&
        !match.unmatched &&
        !match.adoption_confirmed_by_owner &&
        !match.adoption_confirmed_by_adopter,
    )
    .forEach((match) => {
      queue.push({
        title: `Pending adoption: ${match.pet1.name} and ${match.pet2.name}`,
        context: match.adopter_name || "Adoption conversation",
        detail:
          "Two-sided confirmation is still pending. Keep the thread visible to both parties.",
        severity: "medium",
        action: "unmatch",
        actionLabel: "Close match",
        actionDanger: true,
        targetId: match.match_id,
        entity: "match",
      });
    });

  state.data.events
    .filter((event) => event.cancelled || getEventStatus(event) === "finished")
    .forEach((event) => {
      queue.push({
        title: `Event lifecycle: ${event.title}`,
        context: event.location,
        detail: event.cancelled
          ? "This event is already cancelled and should stay archived."
          : "This event has already ended and may be moved into the archive view.",
        severity: event.cancelled ? "medium" : "low",
        action: event.cancelled ? null : "cancel-event",
        actionLabel: "Cancel",
        targetId: event.event_id,
        entity: "event",
      });
    });

  state.data.pets
    .filter((pet) => pet.forAdoption && pet.energy >= 8)
    .forEach((pet) => {
      queue.push({
        title: `High-energy adoption pet: ${pet.name}`,
        context: pet.ownerName,
        detail:
          "This profile is active and may benefit from surfacing in moderation or feature rotations.",
        severity: "low",
        action: "toggle-pet",
        actionLabel: "Toggle adoption",
        targetId: pet.pet_id,
        entity: "pet",
      });
    });

  return queue.slice(0, 10);
}

function renderEmpty(title, description) {
  return `
    <div class="empty-state">
      <strong>${title}</strong>
      <span>${description}</span>
    </div>
  `;
}

async function handleAction(action, id) {
  if (action === "select-match") {
    state.selected = { type: "match", id };
    render();
    return;
  }

  if (action === "select-event") {
    state.selected = { type: "event", id };
    render();
    return;
  }

  if (action === "select-group") {
    state.selected = { type: "group", id };
    render();
    return;
  }

  try {
    if (action === "toggle-user-ban") {
      const user = state.data.users.find((entry) => entry.user_id === id);
      if (!user) {
        return;
      }

      await requestJson(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isBanned: !user.isBanned }),
      });
    } else if (action === "toggle-pet") {
      const pet = state.data.pets.find((entry) => entry.pet_id === id);
      if (!pet) {
        return;
      }

      await requestJson(`/pets/${id}`, {
        method: "PUT",
        body: JSON.stringify({ forAdoption: !pet.forAdoption }),
      });
    } else if (action === "cancel-event") {
      await requestJson(`/events/${id}/cancel`, {
        method: "PATCH",
      });
    } else if (action === "unmatch") {
      await requestJson(`/matches/${id}`, {
        method: "PUT",
        body: JSON.stringify({ unmatched_by: "admin" }),
      });
    } else if (action === "delete-pet") {
      const pet = state.data.pets.find((entry) => entry.pet_id === id);
      if (!pet) {
        return;
      }

      const confirmed = window.confirm(
        `Delete ${pet.name}? This also removes local cards that reference the pet.`,
      );
      if (!confirmed) {
        return;
      }

      await requestJson(`/pets/${id}`, {
        method: "DELETE",
      });
    } else if (action === "delete-group") {
      await requestJson(`/groups/${id}?admin=true`, {
        method: "DELETE",
      });
    }

    if (action === "delete-pet" || action === "delete-group") {
      state.selected = null;
    }

    await hydrateFromApi();
    state.syncState = "live";
    render();
  } catch (error) {
    alert(`Action failed: ${error.message}`);
  }
}

function syncNav() {
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === state.section);
  });
}

function render() {
  syncNav();
  renderKpis();

  if (state.section === "overview") {
    renderOverview();
  } else if (state.section === "users") {
    renderUsers();
  } else if (state.section === "pets") {
    renderPets();
  } else if (state.section === "matches") {
    renderMatches();
  } else if (state.section === "events") {
    renderEvents();
  } else if (state.section === "moderation") {
    renderModeration();
  }
}

render();
