'use client'

import React from 'react'
import Layout from '../components/layout'
import { Container, Typography } from '@mui/material'
import { useSession } from 'next-auth/react'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'
import DisplayDepartmentAchievements from '../components/department-achievements/display-department-achievements'

export default function DepartmentAchievementsPage() {
    const { data: session, status } = useSession()

    if (typeof window !== 'undefined' && status === "loading") return <Loading />

    if (session) {
        const hasPerm = (session?.user?.specialPermissions || []).some(
            (p) => String(p).toLowerCase() === 'department-achievements'
        );
        const canAccess = session.user.role === "SUPER_ADMIN" || 
                          session.user.role === "DEPT_ADMIN" ||
                          hasPerm;

        if (!canAccess) {
            return <Unauthorise />
        }

        return (
            <Layout>
                <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                    <DisplayDepartmentAchievements />
                </Container>
            </Layout>
        )
    }

    return <Sign />
}
