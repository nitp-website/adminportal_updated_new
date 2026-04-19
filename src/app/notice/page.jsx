"use client"
import Layout from '../components/layout'
import styled from 'styled-components'
import DataDisplay from '../components/display-notices'
import LoadAnimation from '../components/loading'
import { useSession } from 'next-auth/react'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'
import { useEffect, useState } from 'react'

const Wrap = styled.div`
    width: 90%;
    margin: auto;
    margin-top: 60px;
`

export default function Page() {
    const [isLoading, setIsLoading] = useState(true)
    const [entries, setEntries] = useState([])
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status === 'authenticated') {
            const userRole = session?.user?.role;
            const userDepartment = session?.user?.department;

            let body = { from: 0, to: 15, type: "between" };

            if (userRole === "DEPT_ADMIN") {
                body = { 
                    ...body, 
                    type: 'between',
                    notice_type: 'department',
                    department: userDepartment 
                };
            } else if (userRole === "TENDER_NOTICE_ADMIN") {
                body = { 
                    ...body, 
                    type: 'between',
                    notice_type: 'tender'
                };
            }

            fetch('/api/notice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
            })
                .then((res) => res.json())
                .then((data) => {
                    setEntries(data)
                    setIsLoading(false)
                })
                .catch((err) => {
                    console.error(err)
                    setIsLoading(false)
                })
        }
    }, [status])

    // Handle loading state
    if (status === 'loading') {
        return <Loading />
    }

    // Handle unauthenticated state
    if (status === 'unauthenticated') {
        return <Sign />
    }

    // Handle authenticated state
    if (session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ACADEMIC_ADMIN" || session?.user?.role === "DEPT_ADMIN" || session?.user?.role === "TENDER_NOTICE_ADMIN") {
        return (
            <Layout>
                <Wrap>
                    {isLoading ? (
                        <LoadAnimation />
                    ) : (
                        <DataDisplay data={entries} />
                    )}
                </Wrap>
            </Layout>
        )
    }

    // Handle unauthorized role
    return <Unauthorise />
}
