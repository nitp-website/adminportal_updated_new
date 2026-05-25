"use client"

import Layout from '../components/layout'
import { useSession } from 'next-auth/react'
import ClubProfile from '../components/ClubProfile'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'

export default function ClubAdminPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Loading />
  }

  if (!session) {
    return <Sign />
  }

  if (session.user.role !== 'CLUB_ADMIN') {
    return <Unauthorise />
  }

  return (
    <Layout>
      <ClubProfile />
    </Layout>
  )
}
