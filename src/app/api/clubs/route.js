import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { buildClubPayload, preserveMissingClubPayloadFields, validateClubPayload } from '@/lib/clubs/club-payload'
import { canAccessClub, deleteClubAdminUserByEmail, deleteClubById, ensureClubTable, findClubByEmail, findClubById, findClubForSession, hasClubEmail, insertClub, listClubs, syncClubAdminUser, updateClubById } from '@/lib/clubs/club-db'

function badRequest(errors) {
  return NextResponse.json(
    {
      message: errors[0]?.message || 'Validation failed',
      errors,
    },
    { status: 400 }
  )
}

function paginate(items, page, limit) {
  const total = items.length
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset,
    total,
    totalPages: Math.ceil(total / limit),
    data: items.slice(offset, offset + limit),
  }
}

function serverError(label, error) {
  console.error(`Club API ${label} error:`, error)
  return NextResponse.json({ message: error.message }, { status: 500 })
}

async function verifyClubAdminIsActive(session) {
  if (session?.user?.role !== 'CLUB_ADMIN') {
    return null
  }

  const club = await findClubForSession(session)
  if (club?.status === 'Inactive') {
    return NextResponse.json({ message: 'Your club is inactive' }, { status: 403 })
  }

  return null
}

export async function GET(request) {
  try {
    await ensureClubTable()

    const session = await getServerSession(authOptions)
    const statusCheckResponse = await verifyClubAdminIsActive(session)
    if (statusCheckResponse) return statusCheckResponse

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit')) || 20))
    const type = searchParams.get('type')
    const id = searchParams.get('id')
    const email = searchParams.get('email')
    const mine = searchParams.get('mine') === 'true'

    if (session && session.user.role === 'SUPER_ADMIN' && !mine) {
      if (id) {
        const club = await findClubById(id)
        return club
          ? NextResponse.json(club)
          : NextResponse.json({ message: 'Club not found' }, { status: 404 })
      }

      if (email) {
        const club = await findClubByEmail(email)
        return club
          ? NextResponse.json(club)
          : NextResponse.json({ message: 'Club not found' }, { status: 404 })
      }

      return NextResponse.json(await listClubs())
    }

    if (session && mine) {
      if (session.user.role !== 'CLUB_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
      }

      const club = email && session.user.role === 'SUPER_ADMIN'
        ? await findClubByEmail(email)
        : await findClubForSession(session)

      if (!club) {
        return NextResponse.json(null)
      }

      if (!canAccessClub(session, club)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
      }

      return NextResponse.json(club)
    }

    if (type && type !== 'all') {
      const club = await findClubByEmail(type)
      return club
        ? NextResponse.json(club)
        : NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    if (email) {
      const club = await findClubByEmail(email)
      return club
        ? NextResponse.json(club)
        : NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const clubs = await listClubs()
    return NextResponse.json(paginate(clubs, page, limit))
  } catch (error) {
    return serverError('GET', error)
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    await ensureClubTable()

    const payload = buildClubPayload(await request.json())
    const validationErrors = validateClubPayload(payload, { requireCategory: true })
    if (validationErrors.length > 0) {
      return badRequest(validationErrors)
    }

    if (await hasClubEmail(payload.club_email)) {
      return NextResponse.json({ message: 'Club email already exists' }, { status: 400 })
    }

    const club = await insertClub(payload)
    try {
      await syncClubAdminUser(club)
    } catch (error) {
      await deleteClubById(club.id)
      throw new Error(`Failed to create admin user: ${error.message}`)
    }

    return NextResponse.json(club, { status: 201 })
  } catch (error) {
    return serverError('POST', error)
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
    }

    await ensureClubTable()

    const statusCheckResponse = await verifyClubAdminIsActive(session)
    if (statusCheckResponse) return statusCheckResponse

    const body = await request.json()
    let payload = buildClubPayload(body)
    const id = body.id

    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ message: 'Club ID is required' }, { status: 400 })
    }

    const existingClub = await findClubById(id)
    if (!existingClub) {
      if (session.user.role !== 'CLUB_ADMIN') {
        return NextResponse.json({ message: 'Club not found' }, { status: 404 })
      }

      payload.club_email = session.user.email?.trim().toLowerCase()
      payload.club_name = payload.club_name || session.user.administration || 'My Club'

      const validationErrors = validateClubPayload(payload)
      if (validationErrors.length > 0) {
        return badRequest(validationErrors)
      }

      const club = await insertClub(payload)
      return NextResponse.json(club, { status: 201 })
    }

    if (!canAccessClub(session, existingClub)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    payload = preserveMissingClubPayloadFields(payload, existingClub, body)

    if (session.user.role !== 'SUPER_ADMIN') {
      payload.club_email = existingClub.club_email
      payload.category = existingClub.category
      payload.status = existingClub.status
    }

    const validationErrors = validateClubPayload(payload, { requireCategory: session.user.role === 'SUPER_ADMIN' })
    if (validationErrors.length > 0) {
      return badRequest(validationErrors)
    }

    if (session.user.role === 'SUPER_ADMIN' && await hasClubEmail(payload.club_email, id)) {
      return badRequest([{ field: 'club_email', message: 'Club email already exists' }])
    }

    const club = await updateClubById(id, payload)
    if (session.user.role === 'SUPER_ADMIN') {
      await syncClubAdminUser(club)
    }

    return NextResponse.json(club)
  } catch (error) {
    return serverError('PUT', error)
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    await ensureClubTable()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ message: 'Club ID is required' }, { status: 400 })
    }

    const club = await findClubById(id)
    if (!club) {
      return NextResponse.json({ message: 'Club not found' }, { status: 404 })
    }

    const result = await deleteClubById(id)
    if (result.affectedRows === 0) {
      console.error(`[Club DELETE] Club record present but delete affected 0 rows for id=${id}, actor=${session.user.email}`)
      return NextResponse.json({ message: 'Failed to delete club' }, { status: 500 })
    }

    console.log(`[Club DELETE] Club ${club.club_email || club.club_name} deleted by ${session.user.email}`)

    try {
      await deleteClubAdminUserByEmail(club.club_email)
    } catch (cleanupError) {
      console.error(`[Club DELETE] Club deleted but failed to remove admin user for ${club.club_email}:`, cleanupError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError('DELETE', error)
  }
}

