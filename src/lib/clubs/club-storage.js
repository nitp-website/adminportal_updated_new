'use client'

export function normalizeClub(club = {}) {
  const banners = Array.isArray(club.banners) ? club.banners : []
  return {
    ...club,
    id: club.id || Date.now(),
    club_name: club.club_name || club.title || '',
    title: club.title || club.club_name || '',
    club_email: club.club_email || '',
    category: club.category || '',
    // `club_pi` deprecated; prefer explicit patna PI fields
    club_president: club.club_president || '',
    club_secretary: club.club_secretary || '',
    status: club.status || 'Active',
    about: club.about || '',
    description: club.description || '',
    logo_url: club.logo_url || '',
    banners,
    patnaPiName: club.patnaPiName || club.patna_pi_name || '',
    patnaPiEmail: club.patnaPiEmail || club.patna_pi_email || '',
    patnaPiPhone: club.patnaPiPhone || club.patna_pi_phone || '',
    patnaPiDepartment: club.patnaPiDepartment || club.patna_pi_department || '',
    bihtaPiName: club.bihtaPiName || club.bihta_pi_name || '',
    bihtaPiEmail: club.bihtaPiEmail || club.bihta_pi_email || '',
    bihtaPiPhone: club.bihtaPiPhone || club.bihta_pi_phone || '',
    bihtaPiDepartment: club.bihtaPiDepartment || club.bihta_pi_department || '',
  }
}

async function parseClubResponse(response) {
  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      data = null
    }
  }

  if (!response.ok) {
    throw new Error(
      (data && (data.message || data.error)) ||
      text ||
      'Club request failed'
    )
  }

  return data !== null ? data : text
}

export async function readClubs() {
  const data = await parseClubResponse(await fetch('/api/clubs?type=all&limit=50', {
    cache: 'no-store',
    credentials: 'include',
  }))
  const clubs = Array.isArray(data) ? data : data.data || []
  return clubs.map(normalizeClub)
}

export async function findClubForSession(session, clubEmail) {
  const params = new URLSearchParams()

  if (clubEmail && session?.user?.role === 'SUPER_ADMIN') {
    params.set('email', clubEmail)
  } else {
    params.set('mine', 'true')
  }

  const data = await parseClubResponse(
    await fetch(`/api/clubs?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'include',
    })
  )

  return data ? normalizeClub(data) : null
}

export async function createClub(club) {
  const data = await parseClubResponse(await fetch('/api/clubs', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(club),
  }))

  return normalizeClub(data)
}

export async function updateClub(club) {
  const data = await parseClubResponse(await fetch('/api/clubs', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(club),
  }))

  return normalizeClub(data)
}

export async function upsertClub(club) {
  return club.id ? updateClub(club) : createClub(club)
}

export async function deleteClub(id) {
  await parseClubResponse(await fetch(`/api/clubs?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  }))

  return true
}
