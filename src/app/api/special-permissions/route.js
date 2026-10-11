import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import {
  getAllSpecialPermissions,
  saveFacultySpecialPermissions,
  deleteFacultySpecialPermissions,
  getFacultySpecialPermissions
} from '@/lib/specialPermissions';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    // If an email query parameter is passed, allow checking permissions for that user
    if (emailParam) {
      const perms = await getFacultySpecialPermissions(emailParam);
      return NextResponse.json({ email: emailParam, permissions: perms });
    }

    // Only SUPER_ADMIN can list all delegations
    if (session.user.role !== 'SUPER_ADMIN') {
      const perms = await getFacultySpecialPermissions(session.user.email);
      return NextResponse.json({ email: session.user.email, permissions: perms });
    }

    const data = await getAllSpecialPermissions();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/special-permissions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, permissions } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 });
    }

    const result = await saveFacultySpecialPermissions(email, permissions);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /api/special-permissions POST:', error);
    return NextResponse.json({ error: 'Failed to save permissions' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let email = searchParams.get('email');

    if (!email) {
      const body = await request.json().catch(() => ({}));
      email = body.email;
    }

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    await deleteFacultySpecialPermissions(email);
    return NextResponse.json({ success: true, message: `Permissions revoked for ${email}` });
  } catch (error) {
    console.error('Error in /api/special-permissions DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete permissions' }, { status: 500 });
  }
}
