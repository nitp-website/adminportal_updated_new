import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { query } from '@/lib/db';
import { formatClubRow, stringifyJsonField } from '@/lib/clubUtils';
import { populateClubsWithPiDetails } from '@/lib/clubDbUtils';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}

async function requireClubAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'CLUB_ADMIN') {
    return { session: null, error: unauthorized() }
  }
  if (!session.user.clubId) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'No club linked to your login. Contact Super Admin.' },
        { status: 403 }
      ),
    }
  }
  return { session, error: null }
}

async function getClubById(id) {
  const rows = await query('SELECT * FROM clubs WHERE id = ? LIMIT 1', [id])
  if (!rows[0]) return null
  const formatted = formatClubRow(rows[0])
  return await populateClubsWithPiDetails(formatted)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || searchParams.get('id') || searchParams.get('clubId'); // e.g., 'all', coding-club, or club ID

    // 1. PUBLIC: Fetch ALL clubs
    if (type === 'all') {
      const rows = await query('SELECT * FROM clubs ORDER BY name ASC');
      const formatted = rows.map(formatClubRow).map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        category: c.category,
        status: c.status,
        logo: c.logo,
        about: c.about,
        pictures: c.pictures,
        tagline: c.tagline,
        established_year: c.established_year,
        active_members: c.active_members,
        events_organized: c.events_organized,
        message_from_pi: c.message_from_pi,
        social_links: c.social_links,
        members: c.members
      }));
      console.log("All data : ", formatted);
      const populated = await populateClubsWithPiDetails(formatted);
      return NextResponse.json(populated);
    }

    // 2. PUBLIC: Fetch ONE club by slug or ID
    if (type) {
      const rows = await query(
        'SELECT * FROM clubs WHERE club_login_id = ? OR id = ? LIMIT 1',
        [type, type]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 });
      }

      const c = formatClubRow(rows[0]);
      const formatted = {
        id: c.id,
        name: c.name,
        email: c.email,
        category: c.category,
        status: c.status,
        logo: c.logo,
        about: c.about,
        pictures: c.pictures,
        tagline: c.tagline,
        established_year: c.established_year,
        active_members: c.active_members,
        events_organized: c.events_organized,
        message_from_pi: c.message_from_pi,
        social_links: c.social_links,
        members: c.members
      };
      console.log("One club data : ", formatted);
      const populated = await populateClubsWithPiDetails(formatted);
      return NextResponse.json(populated);
    }

    // 3. ADMIN ONLY: Fetch current admin's club
    const { session, error } = await requireClubAdmin();
    if (error) return error;

    const rows = await query('SELECT * FROM clubs WHERE id = ? LIMIT 1', [session.user.clubId]);
    if (!rows[0]) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }
    const formatted = formatClubRow(rows[0]);
    const populated = await populateClubsWithPiDetails(formatted);
    return NextResponse.json(populated);

  } catch (err) {
    console.error('GET /api/club:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { session, error } = await requireClubAdmin()
    if (error) return error

    const clubId = session.user.clubId
    const existing = await getClubById(clubId)
    if (!existing) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      category,
      about,
      logo,
      pictures,
      tagline,
      established_year,
      active_members,
      events_organized,
      message_from_pi,
      social_links,
      members
    } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Club title is required' }, { status: 400 })
    }
    if (!category?.trim()) {
      return NextResponse.json({ error: 'Club category is required' }, { status: 400 })
    }

    // Derive Patna PI, Bihta PI, President and Secretary from the latest session for backward compatibility
    let patnaPi = null
    let bihtaPi = null
    let president = null
    let secretary = null

    if (existing.members && typeof existing.members === 'object') {
      const sessionKeys = Object.keys(existing.members).sort().reverse()
      if (sessionKeys.length > 0) {
        const latest = existing.members[sessionKeys[0]]
        if (latest.patna?.pi) patnaPi = latest.patna.pi
        else if (latest.patna_campus_pi) patnaPi = latest.patna_campus_pi

        if (latest.bihta?.pi) bihtaPi = latest.bihta.pi
        else if (latest.bihta_campus_pi) bihtaPi = latest.bihta_campus_pi

        if (latest.patna?.president?.name) president = latest.patna.president.name
        else if (latest.president?.name) president = latest.president.name

        if (latest.patna?.secretary?.name) secretary = latest.patna.secretary.name
        else if (latest.secretary?.name) secretary = latest.secretary.name
      }
    }

    if (members && typeof members === 'object') {
      const sessionsKeys = Object.keys(members).sort().reverse()
      if (sessionsKeys.length > 0) {
        const latestSession = members[sessionsKeys[0]]
        if (latestSession.patna?.pi) patnaPi = latestSession.patna.pi
        else if (latestSession.patna_campus_pi) patnaPi = latestSession.patna_campus_pi

        if (latestSession.bihta?.pi) bihtaPi = latestSession.bihta.pi
        else if (latestSession.bihta_campus_pi) bihtaPi = latestSession.bihta_campus_pi

        if (latestSession.patna?.president?.name) president = latestSession.patna.president.name
        else if (latestSession.president?.name) president = latestSession.president.name

        if (latestSession.patna?.secretary?.name) secretary = latestSession.patna.secretary.name
        else if (latestSession.secretary?.name) secretary = latestSession.secretary.name
      }
    }

    await query(
      `UPDATE clubs SET
        name = ?, category = ?, about = ?, logo = ?,
        pictures = ?, patna_campus_pi = ?, bihta_campus_pi = ?,
        tagline = ?, established_year = ?, active_members = ?, events_organized = ?,
        message_from_pi = ?, social_links = ?, sessions = ?,
        club_president = ?, club_secretary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        name.trim(),
        category.trim(),
        about ?? null,
        logo ?? null,
        pictures !== undefined ? stringifyJsonField(pictures) : stringifyJsonField(existing.pictures),
        stringifyJsonField(patnaPi),
        stringifyJsonField(bihtaPi),
        tagline ?? null,
        established_year ? parseInt(established_year, 10) : null,
        active_members ? parseInt(active_members, 10) : null,
        events_organized ? parseInt(events_organized, 10) : null,
        message_from_pi ?? null,
        social_links !== undefined ? stringifyJsonField(social_links) : null,
        members !== undefined ? stringifyJsonField(members) : null,
        president ?? null,
        secretary ?? null,
        clubId,
      ]
    )

    await query('UPDATE user SET name = ? WHERE club_id = ?', [name.trim(), clubId])

    const updated = await getClubById(clubId)
    return NextResponse.json({ club: updated })
  } catch (err) {
    console.error('PUT /api/club:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
