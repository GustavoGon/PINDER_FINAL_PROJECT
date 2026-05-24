export const seedData = {
  users: [
    {
      user_id: "u-001",
      username: "ana.costa",
      email: "ana.costa@pinder.app",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop",
      location: "Porto",
      isBanned: false,
      last_active: "2026-05-23T18:00:00.000Z",
      created_at: "2026-01-12T10:00:00.000Z",
      petsCount: 2,
      matchesCount: 3,
      createdEvents: 1,
    },
    {
      user_id: "u-002",
      username: "rui.ferreira",
      email: "rui.ferreira@pinder.app",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop",
      location: "Lisboa",
      isBanned: false,
      last_active: "2026-05-24T07:30:00.000Z",
      created_at: "2026-02-03T09:15:00.000Z",
      petsCount: 1,
      matchesCount: 4,
      createdEvents: 2,
    },
    {
      user_id: "u-003",
      username: "marta.silva",
      email: "marta.silva@pinder.app",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&h=240&fit=crop",
      location: "Braga",
      isBanned: false,
      last_active: "2026-05-21T20:10:00.000Z",
      created_at: "2026-03-08T13:50:00.000Z",
      petsCount: 3,
      matchesCount: 1,
      createdEvents: 0,
    },
    {
      user_id: "u-004",
      username: "joao.mendes",
      email: "joao.mendes@pinder.app",
      photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&h=240&fit=crop",
      location: "Coimbra",
      isBanned: true,
      last_active: "2026-04-17T12:20:00.000Z",
      created_at: "2025-12-19T16:00:00.000Z",
      petsCount: 0,
      matchesCount: 0,
      createdEvents: 0,
    },
    {
      user_id: "u-005",
      username: "beatriz.nova",
      email: "beatriz.nova@pinder.app",
      photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop",
      location: "Faro",
      isBanned: false,
      last_active: "2026-05-24T09:40:00.000Z",
      created_at: "2026-04-01T08:30:00.000Z",
      petsCount: 1,
      matchesCount: 2,
      createdEvents: 1,
    },
    {
      user_id: "u-006",
      username: "admin.pinder",
      email: "admin@pinder.app",
      photo: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=240&h=240&fit=crop",
      location: "Remote",
      isBanned: false,
      last_active: "2026-05-24T10:15:00.000Z",
      created_at: "2025-11-11T07:00:00.000Z",
      petsCount: 0,
      matchesCount: 0,
      createdEvents: 0,
    },
  ],
  pets: [
    {
      pet_id: "p-001",
      name: "Luna",
      species: "Dog",
      breed: "Labrador",
      ownerId: "u-001",
      ownerName: "ana.costa",
      location: "Porto",
      gender: "Female",
      size: "Large",
      energy: 8,
      age: 4,
      forAdoption: true,
      main_photo: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-002",
      name: "Milo",
      species: "Cat",
      breed: "European Shorthair",
      ownerId: "u-002",
      ownerName: "rui.ferreira",
      location: "Lisboa",
      gender: "Male",
      size: "Small",
      energy: 5,
      age: 2,
      forAdoption: true,
      main_photo: "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-003",
      name: "Kira",
      species: "Dog",
      breed: "Border Collie",
      ownerId: "u-003",
      ownerName: "marta.silva",
      location: "Braga",
      gender: "Female",
      size: "Medium",
      energy: 10,
      age: 3,
      forAdoption: false,
      main_photo: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-004",
      name: "Pipoca",
      species: "Rabbit",
      breed: "Netherland Dwarf",
      ownerId: "u-005",
      ownerName: "beatriz.nova",
      location: "Faro",
      gender: "Female",
      size: "Tiny",
      energy: 4,
      age: 1,
      forAdoption: true,
      main_photo: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-005",
      name: "Thor",
      species: "Dog",
      breed: "German Shepherd",
      ownerId: "u-001",
      ownerName: "ana.costa",
      location: "Porto",
      gender: "Male",
      size: "Large",
      energy: 9,
      age: 6,
      forAdoption: false,
      main_photo: "https://images.unsplash.com/photo-1558944351-c6e31f3f0c6f?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-006",
      name: "Nina",
      species: "Cat",
      breed: "Siamese",
      ownerId: "u-002",
      ownerName: "rui.ferreira",
      location: "Lisboa",
      gender: "Female",
      size: "Small",
      energy: 3,
      age: 5,
      forAdoption: true,
      main_photo: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-007",
      name: "Bento",
      species: "Dog",
      breed: "Mixed",
      ownerId: "u-003",
      ownerName: "marta.silva",
      location: "Braga",
      gender: "Male",
      size: "Medium",
      energy: 7,
      age: 2,
      forAdoption: true,
      main_photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=640&h=480&fit=crop",
    },
    {
      pet_id: "p-008",
      name: "Tico",
      species: "Bird",
      breed: "Parakeet",
      ownerId: "u-005",
      ownerName: "beatriz.nova",
      location: "Faro",
      gender: "Male",
      size: "Tiny",
      energy: 6,
      age: 1,
      forAdoption: false,
      main_photo: "https://images.unsplash.com/photo-1517502166878-35c93a0072bc?w=640&h=480&fit=crop",
    },
  ],
  matches: [
    {
      match_id: "m-001",
      pet_1_id: "p-001",
      pet_2_id: "p-002",
      is_adoption: true,
      adopter_name: "rui.ferreira",
      unmatched: false,
      adoption_confirmed_by_owner: true,
      adoption_confirmed_by_adopter: false,
      timestamp: "2026-05-20T14:10:00.000Z",
      lastMessage: "Podemos marcar visita esta semana?",
    },
    {
      match_id: "m-002",
      pet_1_id: "p-003",
      pet_2_id: "p-005",
      is_adoption: false,
      adopter_name: null,
      unmatched: false,
      adoption_confirmed_by_owner: false,
      adoption_confirmed_by_adopter: false,
      timestamp: "2026-05-18T09:00:00.000Z",
      lastMessage: "A tua cadela gosta de corridas no parque?",
    },
    {
      match_id: "m-003",
      pet_1_id: "p-004",
      pet_2_id: "p-006",
      is_adoption: true,
      adopter_name: "beatriz.nova",
      unmatched: false,
      adoption_confirmed_by_owner: true,
      adoption_confirmed_by_adopter: true,
      timestamp: "2026-05-22T11:30:00.000Z",
      lastMessage: "Obrigada, vamos preparar a documentação.",
    },
    {
      match_id: "m-004",
      pet_1_id: "p-007",
      pet_2_id: "p-001",
      is_adoption: false,
      adopter_name: null,
      unmatched: true,
      unmatched_by: "u-001",
      adoption_confirmed_by_owner: false,
      adoption_confirmed_by_adopter: false,
      timestamp: "2026-05-12T16:20:00.000Z",
      lastMessage: "Sem interesse no momento.",
    },
    {
      match_id: "m-005",
      pet_1_id: "p-008",
      pet_2_id: "p-002",
      is_adoption: true,
      adopter_name: "beatriz.nova",
      unmatched: false,
      adoption_confirmed_by_owner: false,
      adoption_confirmed_by_adopter: false,
      timestamp: "2026-05-24T08:50:00.000Z",
      lastMessage: "Adorei o perfil, vamos falar no fim de semana.",
    },
  ],
  events: [
    {
      event_id: "e-001",
      title: "Feira de Adoção Norte",
      description: "Dia de adoções com clínicas parceiras e consulta rápida.",
      starts_at: "2026-06-02T09:00:00.000Z",
      ends_at: "2026-06-02T17:00:00.000Z",
      location: "Matosinhos",
      attendee_count: 48,
      max_attendees: 80,
      cancelled: false,
      created_by: "u-001",
      creatorName: "ana.costa",
    },
    {
      event_id: "e-002",
      title: "Treino de Socialização",
      description: "Sessão para cães com energia alta e treino de recall.",
      starts_at: "2026-05-29T18:30:00.000Z",
      ends_at: "2026-05-29T20:00:00.000Z",
      location: "Lisboa",
      attendee_count: 12,
      max_attendees: 20,
      cancelled: false,
      created_by: "u-002",
      creatorName: "rui.ferreira",
    },
    {
      event_id: "e-003",
      title: "Passeio Comunitario",
      description: "Encontro mensal para tutores e pets em zona verde.",
      starts_at: "2026-05-21T10:00:00.000Z",
      ends_at: "2026-05-21T12:00:00.000Z",
      location: "Braga",
      attendee_count: 25,
      max_attendees: 25,
      cancelled: false,
      created_by: "u-003",
      creatorName: "marta.silva",
    },
    {
      event_id: "e-004",
      title: "Campanha de Adoção Algarve",
      description: "Evento cancelado por indisponibilidade do espaço.",
      starts_at: "2026-05-27T10:00:00.000Z",
      ends_at: "2026-05-27T16:00:00.000Z",
      location: "Faro",
      attendee_count: 6,
      max_attendees: 30,
      cancelled: true,
      created_by: "u-005",
      creatorName: "beatriz.nova",
    },
  ],
  groups: [
    {
      group_id: "g-001",
      title: "Passeios Porto Centro",
      date: "2026-06-08T18:00:00.000Z",
      time: "18:00",
      location: "Porto",
      attendeeCount: 34,
      max_attendees: 40,
      created_by: "u-001",
      creatorName: "ana.costa",
    },
    {
      group_id: "g-002",
      title: "Adoção Responsável Lisboa",
      date: "2026-05-30T19:30:00.000Z",
      time: "19:30",
      location: "Lisboa",
      attendeeCount: 17,
      max_attendees: 25,
      created_by: "u-002",
      creatorName: "rui.ferreira",
    },
    {
      group_id: "g-003",
      title: "Cuidadores do Norte",
      date: "2026-06-12T20:00:00.000Z",
      time: "20:00",
      location: "Braga",
      attendeeCount: 9,
      max_attendees: 15,
      created_by: "u-003",
      creatorName: "marta.silva",
    },
  ],
  messages: [
    {
      message_id: "msg-001",
      match_id: "m-001",
      sender_id: "u-002",
      content: "Podemos marcar visita esta semana?",
      timestamp: "2026-05-20T14:10:00.000Z",
      read: true,
    },
    {
      message_id: "msg-002",
      match_id: "m-001",
      sender_id: "u-001",
      content: "Claro, terça depois das 18h funciona.",
      timestamp: "2026-05-20T14:16:00.000Z",
      read: true,
    },
    {
      message_id: "msg-003",
      match_id: "m-005",
      sender_id: "u-005",
      content: "Adorei o perfil, vamos falar no fim de semana.",
      timestamp: "2026-05-24T08:50:00.000Z",
      read: false,
    },
    {
      message_id: "msg-004",
      match_id: "m-003",
      sender_id: "u-005",
      content: "Obrigada, vamos preparar a documentação.",
      timestamp: "2026-05-22T11:30:00.000Z",
      read: true,
    },
  ],
};

export function getEventStatus(event) {
  const now = new Date();
  const startsAt = new Date(event.starts_at);
  const endsAt = event.ends_at ? new Date(event.ends_at) : null;

  if (event.cancelled) {
    return "cancelled";
  }

  if (now < startsAt) {
    return "upcoming";
  }

  if (now >= startsAt && (!endsAt || now <= endsAt)) {
    return "live";
  }

  return "finished";
}

export function formatDate(dateLike) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateLike));
}

export function formatDateTime(dateLike) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateLike));
}

export function formatRelative(dateLike) {
  const diff = Date.now() - new Date(dateLike).getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) {
    return "agora";
  }

  if (minutes < 60) {
    return `há ${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `há ${hours}h`;
  }

  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

export function getPetAgeLabel(age) {
  return age === 1 ? "1 ano" : `${age} anos`;
}

export function deepClone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}