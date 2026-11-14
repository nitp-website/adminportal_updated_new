"use client"
import Layout from '../components/layout'
import styled from 'styled-components'
import DataDisplay from '../components/display-events'
import LoadAnimation from '../components/loading'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Loading from '../components/loading'
import Sign from '../components/signin'
import Unauthorise from '../components/unauthorise'
import { useEffect, useState } from 'react'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '../api/auth/[...nextauth]/route'
const Wrap = styled.div`
    width: 90%;
    margin: auto;
    margin-top: 60px;
`

export default function Page() {
    // const { entries, isLoading } = useEntries('/api/events/all');
    // const session = getServerSession(authOptions)
    const [isLoading, setIsLoading] = useState(true)
    const [entries, setEntries] = useState({})
    useEffect(() => {
        fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                from: 0,
                to: 15,
                type:"between"
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setEntries(data)
                setIsLoading(false)
            })
            .catch((err) => console.log(err))
    }, [])
    const {data:session,status} = useSession()
    const router = useRouter()
    
    if (typeof window !== 'undefined' && status==="loading") return <Loading />

    if (session) {
        const hasEventPerm = (session?.user?.specialPermissions || []).some(
            (p) => String(p).toLowerCase() === 'events'
        );
        return (
            <>
                {session.user.role === "SUPER_ADMIN" || 
                  session.user.role === "ACADEMIC_ADMIN" || 
                  session.user.role === "DEPT_ADMIN" ||
                  hasEventPerm ? (
                    <Layout>
                        <Wrap>
                            {isLoading ? (
                                <LoadAnimation />
                            ) : (
                                <DataDisplay data={entries} />
                            )}
                        </Wrap>
                    </Layout>
                ) : (
                    <Unauthorise />
                )}
            </>
        )
    }
    return <Sign />
}
