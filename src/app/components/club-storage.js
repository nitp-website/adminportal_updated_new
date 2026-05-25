'use client'

export const CLUB_STORAGE_KEY = 'nitp_admin_clubs'

export const defaultClubs = [
  {
    id: 1,
    club_name: 'Coding Club',
    club_email: 'coding@nitp.ac.in',
    category: 'Technical',
    club_pi: 'Dr. Rajesh Kumar',
    club_president: 'Aman Singh',
    club_secretary: 'Priyanshu Kumar',
    status: 'Active',
    description: 'Programming, competitive coding, and software development activities.',
    about: 'Programming, competitive coding, and software development activities.',
    patnaPiName: 'Dr. Rajesh Kumar',
  },
  {
    id: 2,
    club_name: 'Robotics Club',
    club_email: 'robotics@nitp.ac.in',
    category: 'Technical',
    club_pi: 'Dr. Neha Sharma',
    club_president: 'Priya Kumari',
    club_secretary: 'Rahul Raj',
    status: 'Inactive',
    description: 'Robotics projects, workshops, and institute-level competitions.',
    about: 'Robotics projects, workshops, and institute-level competitions.',
    patnaPiName: 'Dr. Neha Sharma',
  },
]

export function normalizeClub(club = {}) {
  return {
    ...club,
    id: club.id || Date.now(),
    club_name: club.club_name || club.title || '',
    title: club.title || club.club_name || '',
    club_email: club.club_email || '',
    category: club.category || '',
    club_pi: club.club_pi || club.patnaPiName || '',
    patnaPiName: club.patnaPiName || club.club_pi || '',
    club_president: club.club_president || '',
    club_secretary: club.club_secretary || '',
    status: club.status || 'Active',
    about: club.about || club.description || '',
    description: club.description || club.about || '',
  }
}

export function readClubs() {
  if (typeof window === 'undefined') return defaultClubs.map(normalizeClub)

  try {
    const saved = window.localStorage.getItem(CLUB_STORAGE_KEY)
    if (!saved) return defaultClubs.map(normalizeClub)

    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.map(normalizeClub) : defaultClubs.map(normalizeClub)
  } catch (error) {
    console.error('Failed to read clubs from local storage:', error)
    return defaultClubs.map(normalizeClub)
  }
}

export function writeClubs(clubs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLUB_STORAGE_KEY, JSON.stringify(clubs.map(normalizeClub)))
}

export function upsertClub(club) {
  const normalizedClub = normalizeClub(club)
  const clubs = readClubs()
  const existingIndex = clubs.findIndex((item) => (
    item.id === normalizedClub.id ||
    (normalizedClub.club_email && item.club_email === normalizedClub.club_email)
  ))

  const nextClubs = existingIndex >= 0
    ? clubs.map((item, index) => (index === existingIndex ? { ...item, ...normalizedClub } : item))
    : [...clubs, normalizedClub]

  writeClubs(nextClubs)
  return nextClubs
}

export function findClubForSession(session, clubEmail) {
  const clubs = readClubs()
  const requestedEmail = clubEmail?.trim().toLowerCase()
  const sessionEmail = session?.user?.email?.trim().toLowerCase()
  const assignedClubName = (
    session?.user?.administration ||
    session?.user?.club ||
    ''
  ).trim().toLowerCase()

  if (requestedEmail && session?.user?.role === 'SUPER_ADMIN') {
    return clubs.find((club) => club.club_email?.toLowerCase() === requestedEmail) || null
  }

  return clubs.find((club) => (
    club.club_email?.toLowerCase() === sessionEmail ||
    (assignedClubName && club.club_name?.toLowerCase() === assignedClubName)
  )) || null
}
