import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import Sign from './components/signin'
import ClientLayout from './components/layout'
import Profilepage from './components/profile'
import ClubProfile from './components/ClubProfile'

export default async function Page() {
    const session = await getServerSession(authOptions)
    
    if (!session) {
        return <Sign />
    }

    // Let the FacultyDataContext handle all data fetching
    // Remove server-side data fetching to prevent duplicate calls
    if (session.user.role === 'CLUB_ADMIN') {
        return (
            <ClientLayout>
                <ClubProfile />
            </ClientLayout>
        )
    }

    return (
        <ClientLayout>
            <Profilepage />
        </ClientLayout>
    )
}
