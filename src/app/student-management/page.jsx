"use client"

import Layout from '../components/layout'
import styled from 'styled-components'
import StudentTable from '../components/student-management/StudentTable'
import { useSession } from 'next-auth/react'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'

const Container = styled.div`
  padding: 1.5rem 2rem;
  min-height: calc(100vh - 120px);
  background-color: #fdfdfd;
`

export default function StudentManagementPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <Loading />
  }

  if (!session) {
    return <Sign />
  }

  const role = session.user.role
  const isAllowed =
    role === 'SUPER_ADMIN' ||
    role === 'ACADEMIC_ADMIN' ||
    role === 'DEPT_ADMIN'

  if (!isAllowed) {
    return <Unauthorise />
  }

  return (
    <Layout>
      <Container>
        <StudentTable session={session} />
      </Container>
    </Layout>
  )
}

