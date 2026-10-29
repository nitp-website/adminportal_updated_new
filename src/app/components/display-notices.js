import {
    IconButton,
    TablePagination,
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tooltip,
    Chip
} from '@mui/material'
import Button from '@mui/material/Button'
import {
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    AttachFile as AttachFileIcon
} from '@mui/icons-material'
import React, { useState, useEffect, useMemo } from 'react'
import { AddForm } from './notices-props/add-form'
import { EditForm } from './notices-props/edit-form'
import { useSession } from 'next-auth/react'
import Filter from './common-props/filter'
import TablePaginationActions from './common-props/TablePaginationActions'
import ViewDetailsModal from './view-details-modal'
import { ConfirmDelete } from './notices-props/confirm-delete'

// Helper function to format dates safely
const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A'
    
    let date
    if (typeof dateValue === 'string') {
        const timestamp = parseInt(dateValue, 10)
        if (!isNaN(timestamp)) {
            date = new Date(timestamp)
        } else {
            date = new Date(dateValue)
        }
    } else if (typeof dateValue === 'number') {
        date = new Date(dateValue)
    } else {
        date = dateValue
    }
    
    if (isNaN(date?.getTime())) {
        return 'Invalid Date'
    }
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    })
}

// Determines whether the current user has permission to edit/delete a given notice
const canUserManageNotice = (notice, session) => {
    if (!session?.user) return false;
    if (session.user.role === 'SUPER_ADMIN') return true;

    const nType = notice.notice_type?.toLowerCase();
    const specialPerms = (session.user.specialPermissions || []).map((p) => String(p).toLowerCase());

    // 1. Granted via special permissions
    if (specialPerms.includes(nType)) return true;

    // 2. Academic Admin can manage academic notices
    if (session.user.role === 'ACADEMIC_ADMIN' && nType === 'academics') {
        return true;
    }

    // 3. Department Admin can manage department notices of their own department
    if (session.user.role === 'DEPT_ADMIN' && nType === 'department') {
        return notice.department === session.user.department;
    }

    // 4. Tender Admin
    if (session.user.role === 'TENDER_NOTICE_ADMIN' && nType === 'tender') {
        return true;
    }

    // 5. Exam Admin
    if (session.user.role === 'EXAM_ADMIN' && nType === 'exam') {
        return true;
    }

    return false;
};

const Notice = ({ detail }) => {
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const { data: session } = useSession()
    const updatedAt = formatDate(detail.updatedAt)
    const openDate = formatDate(detail.openDate)

    const canManage = canUserManageNotice(detail, session);

    return (
        <>
            <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {Boolean(detail.important) && (
                            <Chip
                                icon={<StarIcon />}
                                label="Important"
                                color="error"
                                size="small"
                            />
                        )}
                        {Boolean(detail.is_new || detail.new) && (
                            <Chip
                                label="New"
                                size="small"
                                sx={{
                                    backgroundColor: '#00796b',
                                    color: '#ffffff',
                                    fontWeight: 600
                                }}
                            />
                        )}
                        <Typography 
                            variant="subtitle2" 
                            sx={{ 
                                fontWeight: 500,
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {detail.title} {detail.additional_title ? `(${detail.additional_title})` : ''}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {updatedAt}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {openDate}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {detail.notice_type || 'General'}
                    </Typography>
                </TableCell>
                <TableCell>
                    {detail.attachments?.filter(att => Boolean(att?.url))?.length > 0 ? (
                        <Box display="flex" alignItems="center">
                            <AttachFileIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                {detail.attachments.filter(att => Boolean(att?.url)).length}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                            <IconButton 
                                size="small" 
                                onClick={() => setViewModal(true)} 
                                sx={{ color: '#830001' }}
                            >
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {canManage && (
                            <>
                                <Tooltip title="Edit Notice">
                                    <IconButton
                                        size="small" 
                                        onClick={() => setEditModal(true)} 
                                        sx={{ color: '#830001' }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Notice">
                                    <IconButton
                                        size="small" 
                                        onClick={() => setDeleteModal(true)} 
                                        sx={{ 
                                            color: '#d32f2f',
                                            '&:hover': {
                                                backgroundColor: 'rgba(211, 47, 47, 0.1)'
                                            }
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>
                </TableCell>
            </TableRow>

            <EditForm
                data={detail}
                modal={editModal}
                handleClose={() => setEditModal(false)}
            />
            <ViewDetailsModal
                open={viewModal}
                handleClose={() => setViewModal(false)}
                detail={detail}
            />
            <ConfirmDelete
                open={deleteModal}
                handleClose={() => setDeleteModal(false)}
                notice={detail}
            />
        </>
    )
}

const DataDisplay = ({ data }) => {
    const { data: session } = useSession()
    const [details, setDetails] = useState([])
    const [initialData, setInitialData] = useState(data)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(15)
    const [filterQuery, setFilterQuery] = useState(null)
    const [addModal, setAddModal] = useState(false)

    // Calculate all authorized notice types for current user
    const allowedNoticeTypes = useMemo(() => {
        if (!session?.user) return [];
        if (session.user.role === 'SUPER_ADMIN') return [];

        const baseTypes = [];
        if (session.user.role === 'ACADEMIC_ADMIN') baseTypes.push('academics');
        else if (session.user.role === 'DEPT_ADMIN') baseTypes.push('department');
        else if (session.user.role === 'TENDER_NOTICE_ADMIN') baseTypes.push('tender');
        else if (session.user.role === 'EXAM_ADMIN') baseTypes.push('exam');

        const special = (session.user.specialPermissions || []).map((p) => String(p).toLowerCase());
        return Array.from(new Set([...baseTypes, ...special]));
    }, [session]);

    useEffect(() => {
        if (data) {
            setInitialData(data);
            setDetails(data);
        }
    }, [data]);

    useEffect(() => {
        if (!filterQuery) {
            let body = {
                from: page * rowsPerPage,
                to: (page + 1) * rowsPerPage,
                type: 'between',
                notice_sub_type: filterQuery?.notice_sub_type || null,
            };

            if (session?.user?.role !== 'SUPER_ADMIN' && allowedNoticeTypes.length > 0) {
                if (allowedNoticeTypes.length === 1) {
                    body.notice_type = allowedNoticeTypes[0];
                    if (allowedNoticeTypes[0] === 'department' && session?.user?.role === 'DEPT_ADMIN') {
                        body.department = session.user.department;
                    }
                } else {
                    body.notice_types = allowedNoticeTypes;
                    if (session?.user?.role === 'DEPT_ADMIN') {
                        body.department = session.user.department;
                    }
                }
            }

            fetch('/api/notice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(fetchedData => {
                const list = Array.isArray(fetchedData) ? fetchedData : [];
                let sortedData = [...list].sort((a, b) => 
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                
                // Client-side safety filter for restricted roles
                if (session?.user?.role !== 'SUPER_ADMIN' && allowedNoticeTypes.length > 0) {
                    sortedData = sortedData.filter(notice => {
                        const nType = notice.notice_type?.toLowerCase();
                        if (!allowedNoticeTypes.includes(nType)) return false;
                        if (nType === 'department' && session?.user?.role === 'DEPT_ADMIN') {
                            return notice.department === session.user.department;
                        }
                        return true;
                    });
                }
                setDetails(sortedData);
            })
            .catch(err => console.error('Error fetching notices:', err));
        } else if (filterQuery) {
            let filteredData = [...initialData];
            
            if (session?.user?.role !== 'SUPER_ADMIN' && allowedNoticeTypes.length > 0) {
                filteredData = filteredData.filter(notice => {
                    const nType = notice.notice_type?.toLowerCase();
                    if (!allowedNoticeTypes.includes(nType)) return false;
                    if (nType === 'department' && session?.user?.role === 'DEPT_ADMIN') {
                        return notice.department === session.user.department;
                    }
                    return true;
                });
            }

            if (filterQuery.notice_type && filterQuery.notice_type !== 'all') {
                filteredData = filteredData.filter(notice => notice.notice_type === filterQuery.notice_type);
            }
            if (filterQuery?.notice_sub_type) {
                filteredData = filteredData.filter(notice => notice.notice_sub_type === filterQuery.notice_sub_type);
            }
            if (filterQuery.department && filterQuery.department !== 'all') {
                filteredData = filteredData.filter(notice => notice.department === filterQuery.department);
            }
            if (filterQuery.start_date && filterQuery.end_date) {
                filteredData = filteredData.filter(notice => {
                    return notice.openDate >= filterQuery.start_date && notice.closeDate <= filterQuery.end_date;
                });
            }
            const sortedFilterData = filteredData.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setDetails(sortedFilterData);
        }
    }, [page, rowsPerPage, filterQuery, initialData, session, allowedNoticeTypes]);

    const getHeadingTitle = () => {
        if (session?.user?.role === 'SUPER_ADMIN') return 'Recent Notices';
        
        if (allowedNoticeTypes.length === 1) {
            const t = allowedNoticeTypes[0];
            if (t === 'academics') return 'Academic Notices';
            if (t === 'department') return `${session?.user?.department || 'Department'} Notices`;
            if (t === 'tender') return 'Tender Notices';
            if (t === 'exam') return 'Exam Notices';
            if (t === 'admissions') return 'Admissions Notices';
            if (t === 'job') return 'Recruitment (Job) Notices';
            if (t === 'convocation') return 'Convocation Notices';
            return `${t.charAt(0).toUpperCase() + t.slice(1)} Notices`;
        }

        if (session?.user?.role === 'ACADEMIC_ADMIN') {
            const special = session?.user?.specialPermissions || [];
            if (special.length > 0) return 'Academic & Delegated Notices';
            return 'Academic Notices';
        }

        if (session?.user?.role === 'DEPT_ADMIN') {
            const special = session?.user?.specialPermissions || [];
            if (special.length > 0) return `${session.user.department} & Delegated Notices`;
            return `${session.user.department} Notices`;
        }

        return 'Authorized Notices';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ color: '#333', fontWeight: 600 }}>
                    {getHeadingTitle()}
                </Typography>
                
                <Box>
                    <Button
                        variant="contained"
                        onClick={() => setAddModal(true)}
                        sx={{ mr: 2 }}
                        style={{ backgroundColor: '#830001', color: 'white' }}
                    >
                        Add New Notice
                    </Button>
                    {(session?.user?.role === 'SUPER_ADMIN' || allowedNoticeTypes.length > 1) && (
                        <Filter type="notice" setEntries={setFilterQuery} style={{ color: '#830001' }}/>
                    )}
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Notice Title</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Updated Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Open Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Attachments</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {details?.length > 0 ? (
                            details.map((notice, index) => (
                                <Notice key={notice.id || index} detail={notice} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        No notices found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box mt={3}>
                <TablePagination
                    component="div"
                    count={-1}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[15, 25, 50, 100]}
                    ActionsComponent={TablePaginationActions}
                />
            </Box>

            <AddForm 
                modal={addModal}
                handleClose={() => setAddModal(false)}
            />
        </Box>
    )
}

export default DataDisplay;
