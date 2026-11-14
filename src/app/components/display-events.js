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
    LocationOn as LocationIcon,
    Event as EventIcon,
    Star as StarIcon
} from '@mui/icons-material'
import React, { useState, useEffect } from 'react'
import { AddForm } from './events-props/add-form'
import { EditForm } from './events-props/edit-form'
import { ConfirmDelete } from './events-props/confirm-delete'
import { useSession } from 'next-auth/react'
import Filter from './common-props/filter'
import TablePaginationActions from './common-props/TablePaginationActions'
import ViewDetailsModal from './view-details-modal'

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
        } else {
            // Try parsing as date string
            date = new Date(dateValue)
        }
    } else if (typeof dateValue === 'number') {
        // If it's already a number timestamp
        date = new Date(dateValue)
    } else {
        // If it's already a Date object
        date = dateValue
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date'
    }
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    })
}

const Event = ({ detail }) => {
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const { data: session } = useSession()
    const startDate = formatDate(detail.eventStartDate)
    const endDate = formatDate(detail.eventEndDate)

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
                        {startDate}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {endDate}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            {detail.venue || 'TBD'}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                            <IconButton 
                                size="small" 
                                onClick={() => setViewModal(true)} 
                                color="info"
                            >
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {((session?.user?.role === 'SUPER_ADMIN') || 
                          (session?.user?.role === 'ACADEMIC_ADMIN' && detail.category === 'academics') ||
                          (session?.user?.role === 'DEPT_ADMIN') ||
                          (session?.user?.specialPermissions || []).some((p) => String(p).toLowerCase() === 'events')) && (
                            <>
                                <Tooltip title="Edit Event">
                                    <IconButton
                                        size="small" 
                                        onClick={() => setEditModal(true)}
                                        color="primary"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Event">
                                    <IconButton
                                        size="small" 
                                        onClick={() => setDeleteModal(true)}
                                        color="error"
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
                event={detail}
            />
        </>
    )
}

const DataDisplay = ({ data }) => {
    const { data: session,status } = useSession()
    const [details, setDetails] = useState([])
    const [initialData, setInitialData] = useState(data)
    const [filterQuery, setFilterQuery] = useState(null)
    const [addModal, setAddModal] = useState(false)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(15)
    
    useEffect(() => {
        if (!filterQuery) {
            fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    from: page * rowsPerPage,
                    to: (page + 1) * rowsPerPage,
                    type: 'all'
                })
            })
            .then(res => res.json())
            .then((data) => {
                    // console.log(data.data);
                     setDetails(data.data)
            })
            .catch(err => console.error('Error fetching events:', err));
        } else if (filterQuery && initialData.length > 0) {
            let filteredData = [...initialData];
            
            if (filterQuery.category && filterQuery.category !== 'all') {
                filteredData = filteredData.filter(event => event.category === filterQuery.category);
            }
            if (filterQuery.start_date && filterQuery.end_date) {
                filteredData = filteredData.filter(event => {
                    return event.startDate >= filterQuery.start_date && event.endDate <= filterQuery.end_date;
                });
            }
            const sortedFilterData = filteredData.sort((a, b) => new Date(b.updatedAt || b.timestamp) - new Date(a.updatedAt || a.timestamp));
            setDetails(sortedFilterData);
        }
    }, [page, rowsPerPage, filterQuery, initialData, session]); // Remove initialData from dependencies

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" sx={{ color: '#333', fontWeight: 600 }}>
                    Recent Events
                </Typography>
                
                <Box>
                    {(session?.user?.role === 'SUPER_ADMIN' || 
                      session?.user?.role === 'ACADEMIC_ADMIN' || 
                      session?.user?.role === 'DEPT_ADMIN' ||
                      (session?.user?.specialPermissions || []).some((p) => String(p).toLowerCase() === 'events')) && (
                        <Button
                            variant="contained"
                            onClick={() => setAddModal(true)}
                            sx={{ mr: 2 }}
                            style={{ backgroundColor: '#830001', color: 'white' }}
                        >
                            Add New Event
                        </Button>
                    )}
                    <Filter type="events" setEntries={setFilterQuery} style={{ color: '#830001' }}/>
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Event Title</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Start Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>End Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Venue</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {details?.length > 0 ? (
                            details.map((event, index) => (
                                <Event key={event.id || index} detail={event} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <Typography variant="body1" color="text.secondary">
                                        No events found
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
