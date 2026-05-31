import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import Sign from './components/signin'
import ClientLayout from './components/layout'
import Profilepage from './components/profile'

export default async function Page({ searchParams }) {
    const session = await getServerSession(authOptions)
    const signinError = searchParams?.signinError
    
    if (!session) {
        // Forward auth query errors to the shared sign-in component.
        return <Sign signinError={signinError} />
    }

    if (session.user.role === 'CLUB_ADMIN') {
        redirect('/club-profile')
    }

    // Let the FacultyDataContext handle all data fetching
    // Remove server-side data fetching to prevent duplicate calls

    return (
        <ClientLayout>
            <Profilepage />
        </ClientLayout>
    )
}
