'use client'
import React from 'react'
import DisplayInstituteLectures from '../components/institute-lectures/display-institute-lectures'
import Layout from '../components/layout'
import { Container, Typography } from '@mui/material'

export default function InstituteLecturesPage() {
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
