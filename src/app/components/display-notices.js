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
    Description as DescriptionIcon,
    AttachFile as AttachFileIcon
} from '@mui/icons-material'
import React, { useState, useEffect } from 'react'
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
    // Handle different date formats
    if (typeof dateValue === 'string') {
        // If it's a string timestamp, convert to number first
        const timestamp = parseInt(dateValue, 10)
        if (!isNaN(timestamp)) {
            date = new Date(timestamp)
            console.log('Parsing string timestamp:', dateValue, '-> Date:', date.toISOString())
        } else {
            // Try parsing as date string
            date = new Date(dateValue)
            console.log('Parsing date string:', dateValue, '-> Date:', date.toISOString())
        }
    } else if (typeof dateValue === 'number') {
        // If it's already a number timestamp
        date = new Date(dateValue)
        console.log('Parsing number timestamp:', dateValue, '-> Date:', date.toISOString())
    } else {
        // If it's already a Date object
        date = dateValue
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateValue)
        return 'Invalid Date'
    }
    
    const formatted = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    })
    
    console.log('Final formatted date:', formatted)
    return formatted
}

const Notice = ({ detail }) => {
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const { data: session } = useSession()
    const updatedAt = formatDate(detail.updatedAt)
    const openDate = formatDate(detail.openDate)

    return (
        <>
            <TableRow sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {detail.important && (
                            <Chip
                                icon={<StarIcon />}
                                label="Important"
                                color="error"
                                size="small"
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
                            {detail.title}
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
                    {detail.attachments?.length > 0 ? (
                        <Box display="flex" alignItems="center">
                            <AttachFileIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                {detail.attachments.length}
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
                        {(session?.user?.role === 'SUPER_ADMIN' ||
                            (session?.user?.role === 'ACADEMIC_ADMIN' && detail.notice_type === 'academics') ||
                            (session?.user?.role === 'DEPT_ADMIN' && detail.notice_type === 'department' && detail.department === session.user.department) ||
                            (session?.user?.role === 'TENDER_NOTICE_ADMIN' && detail.notice_type === 'tender')) && (
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

    useEffect(() => {
        if (!filterQuery) {
            let noticeType;
            let department;
            if (session?.user?.role === 'ACADEMIC_ADMIN') {
                noticeType = 'academics';
            } else if (session?.user?.role === 'DEPT_ADMIN') {
                noticeType = 'department';
                department = session.user.department;
            } else if (session?.user?.role === 'TENDER_NOTICE_ADMIN') {
                noticeType = 'tender';
            }

            fetch('/api/notice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: page * rowsPerPage,
                    to: (page + 1) * rowsPerPage,
                    type: 'between',
                    notice_type: noticeType,
                    notice_sub_type:filterQuery?.notice_sub_type||null,
                    department: department
                })
            })
            .then(res => res.json())
            .then(data => {
                const sortedData = [...data].sort((a, b) => 
                    new Date(b.updatedAt) - new Date(a.updatedAt)
                );
                setDetails(sortedData);
            })
            .catch(err => console.error('Error fetching notices:', err));
        } else if (filterQuery) {
            let filteredData = [...initialData];
            
            if (session?.user?.role === 'ACADEMIC_ADMIN') {
                filteredData = filteredData.filter(notice => notice.notice_type === 'academics');
            } else if (session?.user?.role === 'DEPT_ADMIN') {
                filteredData = filteredData.filter(notice => 
                    notice.notice_type === 'department' && 
                    notice.department === session.user.department
                );
            } else if (session?.user?.role === 'TENDER_NOTICE_ADMIN') {
                filteredData = filteredData.filter(notice => notice.notice_type === 'tender');
            } else if (filterQuery.notice_type && filterQuery.notice_type !== 'all') {
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
    }, [page, rowsPerPage, filterQuery, initialData, session]);

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ color: '#333', fontWeight: 600 }}>
                    {session?.user?.role === 'ACADEMIC_ADMIN' ? 'Academic Notices' : 
                     session?.user?.role === 'DEPT_ADMIN' ? `${session.user.department} Notices` :
                     session?.user?.role === 'TENDER_NOTICE_ADMIN' ? 'Tender Notices' : 
                     'Recent Notices'}
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
                    {session?.user?.role !== 'ACADEMIC_ADMIN' && session?.user?.role !== 'DEPT_ADMIN' && session?.user?.role !== 'TENDER_NOTICE_ADMIN' && (
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

export default DataDisplay
