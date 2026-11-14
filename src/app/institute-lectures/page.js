'use client'
import React from 'react'
import DisplayInstituteLectures from '../components/institute-lectures/display-institute-lectures'
import Layout from '../components/layout'
import { Container, Typography } from '@mui/material'
import { useSession } from 'next-auth/react'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'

export default function InstituteLecturesPage() {
    const { data: session, status } = useSession()

    if (typeof window !== 'undefined' && status === "loading") return <Loading />

    if (session) {
        const hasPerm = (session?.user?.specialPermissions || []).some(
            (p) => String(p).toLowerCase() === 'institute-lectures'
        );
        const canAccess = session.user.role === "SUPER_ADMIN" || 
                          session.user.role === "ACADEMIC_ADMIN" || 
                          session.user.role === "DEPT_ADMIN" ||
                          hasPerm;

        if (!canAccess) {
            return <Unauthorise />
        }

        return (
            <Layout>
                <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                    <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#830001' }}>
                        Institute Lectures Management
                    </Typography>
                    <DisplayInstituteLectures />
                </Container>
            </Layout>
        )
    }

    return <Sign />
}
