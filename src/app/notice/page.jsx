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
    const [hasDelegatedAccess, setHasDelegatedAccess] = useState(false)
    const { data: session, status } = useSession()

    useEffect(() => {
        if (status === 'authenticated') {
            const userRole = session?.user?.role;
            const userDepartment = session?.user?.department;

            const loadData = async () => {
                let specialPerms = Array.isArray(session?.user?.specialPermissions)
                    ? [...session.user.specialPermissions]
                    : [];

                try {
                    const permRes = await fetch('/api/special-permissions');
                    if (permRes.ok) {
                        const permData = await permRes.json();
                        if (permData && Array.isArray(permData.permissions)) {
                            specialPerms = Array.from(new Set([...specialPerms, ...permData.permissions]));
                        }
                    }
                } catch (e) {
                    console.error("Could not fetch fresh special permissions:", e);
                }

                if (specialPerms.length > 0) {
                    setHasDelegatedAccess(true);
                }

                let baseTypes = [];
                if (userRole === "SUPER_ADMIN") {
                    // Super Admin fetches all notices
                } else if (userRole === "ACADEMIC_ADMIN") {
                    baseTypes = ["academics", "department"];
                } else if (userRole === "DEPT_ADMIN") {
                    baseTypes = ["department"];
                } else if (userRole === "TENDER_NOTICE_ADMIN") {
                    baseTypes = ["tender"];
                } else if (userRole === "EXAM_ADMIN") {
                    baseTypes = ["exam"];
                }

                const combinedTypes = Array.from(
                    new Set([...baseTypes, ...specialPerms.map((p) => String(p).toLowerCase())])
                );

                let body = { from: 0, to: 15, type: "between" };

                if (userRole !== "SUPER_ADMIN" && combinedTypes.length > 0) {
                    if (combinedTypes.length === 1) {
                        body = {
                            ...body,
                            notice_type: combinedTypes[0],
                            department: (combinedTypes[0] === "department" && userRole === "DEPT_ADMIN")
                                ? userDepartment
                                : undefined,
                        };
                    } else {
                        body = {
                            ...body,
                            notice_types: combinedTypes,
                            department: userRole === "DEPT_ADMIN" ? userDepartment : undefined,
                        };
                    }
                }

                try {
                    const res = await fetch('/api/notice', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                        body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    setEntries(Array.isArray(data) ? data : []);
                } catch (err) {
                    console.error("Error fetching notices:", err);
                    setEntries([]);
                } finally {
                    setIsLoading(false);
                }
            };

            loadData();
        }
    }, [status, session]);

    // Handle loading state
    if (status === 'loading') {
        return <Loading />
    }

    // Handle unauthenticated state
    if (status === 'unauthenticated') {
        return <Sign />
    }

    const hasSpecialPerms =
        (session?.user?.specialPermissions && session.user.specialPermissions.length > 0) ||
        hasDelegatedAccess;

    // Handle authenticated state
    if (
        session?.user?.role === "SUPER_ADMIN" || 
        session?.user?.role === "ACADEMIC_ADMIN" || 
        session?.user?.role === "DEPT_ADMIN" || 
        session?.user?.role === "TENDER_NOTICE_ADMIN" || 
        session?.user?.role === "EXAM_ADMIN" ||
        hasSpecialPerms
    ) {
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
