import React, { useState, useEffect } from 'react'
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
    Button
} from '@mui/material'
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import { AddForm } from './institute-lecture-props/add-form'
import { EditForm } from './institute-lecture-props/edit-form'
import { ConfirmDelete } from '../events-props/confirm-delete'
import ViewDetailsModal from '../view-details-modal'

const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A'
    const date = new Date(parseInt(dateValue, 10))
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-GB')
}

const InstituteLectureRow = ({ detail, onUpdate }) => {
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const { data: session } = useSession()

    const hasPerm = (session?.user?.specialPermissions || []).some(
        (p) => String(p).toLowerCase() === 'institute-lectures'
    )
    const canModify = session?.user?.role === 'SUPER_ADMIN' || 
                      session?.user?.role === 'ACADEMIC_ADMIN' || 
                      session?.user?.role === 'DEPT_ADMIN' ||
                      hasPerm

    return (
        <>
            <TableRow hover>
                <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {detail.lecture_title}
                    </Typography>
                </TableCell>
                <TableCell>{detail.lecturer_name}</TableCell>
                <TableCell>{formatDate(detail.date)} {detail.time}</TableCell>
                <TableCell>{detail.venue || 'N/A'}</TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => setViewModal(true)} color="info">
                                <VisibilityIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {canModify && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => setEditModal(true)} color="primary">
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton size="small" onClick={() => setDeleteModal(true)} color="error">
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Box>
                </TableCell>
            </TableRow>

            <EditForm 
                open={editModal} 
                handleClose={() => setEditModal(false)} 
                data={detail} 
                refresh={onUpdate} 
            />
            
            <ConfirmDelete 
                open={deleteModal} 
                handleClose={() => setDeleteModal(false)} 
                id={detail.id} 
                type="institute_lecture"
                refresh={onUpdate} 
            />
            
            <ViewDetailsModal 
                open={viewModal} 
                handleClose={() => setViewModal(false)} 
                detail={{
                    title: detail.lecture_title,
                    ...detail
                }} 
            />
        </>
    )
}

export default function DisplayInstituteLectures() {
    const [instituteLectures, setInstituteLectures] = useState([])
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [total, setTotal] = useState(0)
    const [addModal, setAddModal] = useState(false)
    const { data: session } = useSession()

    const fetchLectures = async () => {
        try {
            const res = await fetch(`/api/institute-lectures?page=${page + 1}&limit=${rowsPerPage}`)
            const data = await res.json()
            if (data && data.data) {
                setInstituteLectures(data.data)
                setTotal(data.total)
            }
        } catch (error) {
            console.error('Error fetching institute lectures:', error)
        }
    }

    useEffect(() => {
        fetchLectures()
    }, [page, rowsPerPage])

    const hasPerm = (session?.user?.specialPermissions || []).some(
        (p) => String(p).toLowerCase() === 'institute-lectures'
    )
    const canAdd = session?.user?.role === 'SUPER_ADMIN' || 
                   session?.user?.role === 'ACADEMIC_ADMIN' || 
                   session?.user?.role === 'DEPT_ADMIN' ||
                   hasPerm

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" component="div">
                    Institute Lectures
                </Typography>
                {canAdd && (
                    <Button variant="contained" color="primary" onClick={() => setAddModal(true)} sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#9a0000' }}}>
                        Add Institute Lecture
                    </Button>
                )}
            </Box>

            <TableContainer>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Lecture Title</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Lecturer Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Date & Time</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Venue</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {instituteLectures.map((lecture) => (
                            <InstituteLectureRow 
                                key={lecture.id} 
                                detail={lecture} 
                                onUpdate={fetchLectures} 
                            />
                        ))}
                        {instituteLectures.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    No institute lectures found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10))
                    setPage(0)
                }}
            />

            <AddForm 
                open={addModal} 
                handleClose={() => setAddModal(false)} 
                refresh={fetchLectures} 
            />
        </Paper>
    )
}
