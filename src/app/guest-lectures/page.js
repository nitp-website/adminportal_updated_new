'use client'
import React from 'react'
import DisplayGuestLectures from '../components/guest-lectures/display-guest-lectures'
import Layout from '../components/layout'
import { Container, Typography } from '@mui/material'

export default function GuestLecturesPage() {
    return (
        <Layout>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#830001' }}>
                    Guest Lectures Management
                </Typography>
                <DisplayGuestLectures />
            </Container>
        </Layout>
    )
}
