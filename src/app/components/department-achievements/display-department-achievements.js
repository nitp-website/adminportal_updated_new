import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Tooltip,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Checkbox,
    Avatar
} from '@mui/material'
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Add as AddIcon,
    EmojiEvents as EmojiEventsIcon,
    AttachFile as AttachFileIcon,
    Warning as WarningIcon,
    Image as ImageIcon
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import { depList } from '@/lib/const'
import { AddAchievementForm } from './achievement-props/add-form'
import { EditAchievementForm } from './achievement-props/edit-form'
import { ViewAchievementModal } from './achievement-props/view-modal'

const CATEGORIES = [
    'Student Achievement',
    'Faculty Achievement',
    'Research & Innovation',
    'Departmental Milestone',
    'Sports & Cultural',
    'Placements & Internships',
    'Other'
]

const categoryColors = {
    'Student Achievement': { bg: '#e3f2fd', color: '#1565c0' },
    'Faculty Achievement': { bg: '#ede7f6', color: '#512da8' },
    'Research & Innovation': { bg: '#e8f5e9', color: '#2e7d32' },
    'Departmental Milestone': { bg: '#fff3e0', color: '#e65100' },
    'Sports & Cultural': { bg: '#fce4ec', color: '#c2185b' },
    'Placements & Internships': { bg: '#e0f2f1', color: '#00695c' },
    'Other': { bg: '#eceff1', color: '#455a64' },
}

export default function DisplayDepartmentAchievements() {
    const { data: session } = useSession()

    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
    const isDeptAdmin = session?.user?.role === 'DEPT_ADMIN'
    const userDept = session?.user?.department || 'cse'

    // Department filter: Super admin starts with 'all' or first dept; Dept admin is locked to their own dept
    const [selectedDept, setSelectedDept] = useState(isDeptAdmin ? userDept : 'all')
    const [selectedCategory, setSelectedCategory] = useState('all')

    const [achievements, setAchievements] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    // Modal states
    const [addModal, setAddModal] = useState(false)
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [activeItem, setActiveItem] = useState(null)

    // Delete confirmation modal states
    const [deleteModal, setDeleteModal] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState([])
    const [batchDeleteModal, setBatchDeleteModal] = useState(false)
    const [isBatchDeleting, setIsBatchDeleting] = useState(false)

    const canUserManageItem = useCallback((item) => {
        if (!session?.user) return false
        if (session.user.role === 'SUPER_ADMIN') return true
        if (session.user.role === 'DEPT_ADMIN') {
            return !item.department || item.department.toLowerCase() === (session.user.department || '').toLowerCase()
        }
        const specialPerms = (session.user.specialPermissions || []).map((p) => String(p).toLowerCase())
        return specialPerms.includes('department-achievements') || specialPerms.includes('achievements')
    }, [session])

    const fetchAchievements = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('page', String(page + 1))
            params.set('limit', String(rowsPerPage))
            if (selectedDept && selectedDept !== 'all') {
                params.set('department', selectedDept)
            }
            if (selectedCategory && selectedCategory !== 'all') {
                params.set('category', selectedCategory)
            }

            const res = await fetch(`/api/department-achievements?${params.toString()}`)
            const data = await res.json()
            if (data && Array.isArray(data.data)) {
                setAchievements(data.data)
                setTotal(data.total || 0)
            } else {
                setAchievements([])
                setTotal(0)
            }
        } catch (err) {
            console.error('[Achievements Fetch Error]:', err)
        } finally {
            setLoading(false)
        }
    }, [page, rowsPerPage, selectedDept, selectedCategory])

    useEffect(() => {
        fetchAchievements()
    }, [fetchAchievements])

    const formatDate = (val) => {
        if (!val) return 'N/A'
        try {
            let date
            if (typeof val === 'string') {
                if (/^\d{11,}$/.test(val.trim())) {
                    date = new Date(parseInt(val.trim(), 10))
                } else {
                    date = new Date(val)
                }
            } else if (typeof val === 'number') {
                date = new Date(val)
            } else {
                date = new Date(val)
            }

            if (isNaN(date?.getTime())) return 'N/A'
            return date.toLocaleDateString('en-GB')
        } catch (e) {
            return 'N/A'
        }
    }

    // Selection handlers
    const manageableAchievements = useMemo(() => {
        return achievements.filter(item => canUserManageItem(item))
    }, [achievements, canUserManageItem])

    const isAllSelected = manageableAchievements.length > 0 && manageableAchievements.every(a => selectedIds.includes(a.id))
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(manageableAchievements.map(a => a.id))
        } else {
            setSelectedIds([])
        }
    }

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    // Single delete
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return
        setIsDeleting(true)
        try {
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'department_achievement',
                    id: itemToDelete.id
                })
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || 'Failed to delete achievement')
            }
            setDeleteModal(false)
            setItemToDelete(null)
            fetchAchievements()
        } catch (err) {
            console.error('[Delete Achievement Error]:', err)
            alert(err.message || 'Error deleting achievement')
        } finally {
            setIsDeleting(false)
        }
    }

    // Batch delete
    const handleConfirmBatchDelete = async () => {
        if (selectedIds.length === 0) return
        setIsBatchDeleting(true)
        try {
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'department_achievement',
                    ids: selectedIds
                })
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.message || 'Failed to delete achievements')
            }
            setBatchDeleteModal(false)
            setSelectedIds([])
            fetchAchievements()
        } catch (err) {
            console.error('[Batch Delete Error]:', err)
            alert(err.message || 'Error deleting achievements')
        } finally {
            setIsBatchDeleting(false)
        }
    }

    return (
        <Box sx={{ width: '100%' }}>
            {/* Top Toolbar */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <EmojiEventsIcon sx={{ fontSize: 36, color: '#830001' }} />
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, color: '#222' }}>
                            Department Achievements
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Showcase student, faculty, and departmental awards and milestones
                        </Typography>
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddModal(true)}
                    sx={{
                        bgcolor: '#830001',
                        color: 'white',
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 2.5,
                        py: 1,
                        '&:hover': { bgcolor: '#690001' }
                    }}
                >
                    Add Achievement
                </Button>
            </Box>

            {/* Filter Bar */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                    {/* Department Filter */}
                    {isSuperAdmin ? (
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                            <InputLabel id="filter-dept-label">Department</InputLabel>
                            <Select
                                labelId="filter-dept-label"
                                value={selectedDept}
                                label="Department"
                                onChange={(e) => {
                                    setSelectedDept(e.target.value)
                                    setPage(0)
                                }}
                            >
                                <MenuItem value="all">All Departments</MenuItem>
                                {Array.from(depList.entries()).map(([code, name]) => (
                                    <MenuItem key={code} value={code}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                Department:
                            </Typography>
                            <Chip
                                label={depList.get(userDept) || userDept.toUpperCase()}
                                sx={{ bgcolor: 'rgba(131, 0, 1, 0.08)', color: '#830001', fontWeight: 600 }}
                            />
                        </Box>
                    )}

                    {/* Category Filter */}
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="filter-category-label">Category</InputLabel>
                        <Select
                            labelId="filter-category-label"
                            value={selectedCategory}
                            label="Category"
                            onChange={(e) => {
                                setSelectedCategory(e.target.value)
                                setPage(0)
                            }}
                        >
                            <MenuItem value="all">All Categories</MenuItem>
                            {CATEGORIES.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                    {cat}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {(selectedDept !== 'all' || selectedCategory !== 'all') && isSuperAdmin && (
                        <Button
                            size="small"
                            onClick={() => {
                                setSelectedDept('all')
                                setSelectedCategory('all')
                                setPage(0)
                            }}
                            sx={{ color: '#830001', textTransform: 'none' }}
                        >
                            Reset Filters
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* Batch Action Toolbar */}
            {selectedIds.length > 0 && (
                <Box
                    sx={{
                        mb: 2,
                        p: 1.5,
                        bgcolor: 'rgba(131, 0, 1, 0.06)',
                        borderRadius: 2,
                        border: '1px solid rgba(131, 0, 1, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Chip
                            label={`${selectedIds.length} Selected`}
                            size="small"
                            sx={{ bgcolor: '#830001', color: '#fff', fontWeight: 600 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {selectedIds.length === 1 ? '1 item selected' : `${selectedIds.length} items selected for bulk deletion`}
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedIds([])}
                            sx={{ color: '#555', borderColor: '#ccc', textTransform: 'none' }}
                        >
                            Clear Selection
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setBatchDeleteModal(true)}
                            sx={{ bgcolor: '#d32f2f', textTransform: 'none' }}
                        >
                            Delete Selected ({selectedIds.length})
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Achievements Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 6px rgba(0,0,0,0.06)' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={isIndeterminate}
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    disabled={manageableAchievements.length === 0}
                                    sx={{
                                        color: '#830001',
                                        '&.Mui-checked': { color: '#830001' },
                                        '&.MuiCheckbox-indeterminate': { color: '#830001' },
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Achievement Title & Details</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Department</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Photo</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Files</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <CircularProgress size={32} sx={{ color: '#830001' }} />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Loading achievements...
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : achievements.length > 0 ? (
                            achievements.map((item) => {
                                const canManage = canUserManageItem(item)
                                const isSelected = selectedIds.includes(item.id)
                                const catStyle = categoryColors[item.category] || categoryColors['Other']
                                const deptName = depList.get(item.department) || item.department?.toUpperCase() || '-'

                                return (
                                    <TableRow
                                        key={item.id}
                                        hover
                                        sx={{
                                            backgroundColor: isSelected ? 'rgba(131, 0, 1, 0.04)' : 'inherit',
                                            '&:hover': { backgroundColor: isSelected ? 'rgba(131, 0, 1, 0.08)' : '#f9f9f9' }
                                        }}
                                    >
                                        <TableCell padding="checkbox">
                                            {canManage ? (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(item.id)}
                                                    sx={{
                                                        color: '#830001',
                                                        '&.Mui-checked': { color: '#830001' }
                                                    }}
                                                />
                                            ) : (
                                                <Tooltip title="You do not have permission to delete this achievement">
                                                    <span>
                                                        <Checkbox disabled sx={{ opacity: 0.3 }} />
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#222' }}>
                                                {item.title}
                                            </Typography>
                                            {item.achieved_by && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    <strong>By:</strong> {item.achieved_by} {item.recipient_type ? `(${item.recipient_type})` : ''}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {deptName}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.category || 'Milestone'}
                                                size="small"
                                                sx={{
                                                    backgroundColor: catStyle.bg,
                                                    color: catStyle.color,
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem'
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(item.achievement_date || item.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {item.banner_image ? (
                                                <Avatar
                                                    src={item.banner_image}
                                                    variant="rounded"
                                                    sx={{ width: 44, height: 32, cursor: 'pointer', border: '1px solid #ddd' }}
                                                    onClick={() => {
                                                        setActiveItem(item)
                                                        setViewModal(true)
                                                    }}
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.attachments && item.attachments.length > 0 ? (
                                                <Box display="flex" alignItems="center" gap={0.5}>
                                                    <AttachFileIcon fontSize="small" color="action" />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.attachments.length}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                    -
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                <Tooltip title="View Details">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setActiveItem(item)
                                                            setViewModal(true)
                                                        }}
                                                        sx={{ color: '#830001' }}
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                {canManage && (
                                                    <>
                                                        <Tooltip title="Edit Achievement">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setActiveItem(item)
                                                                    setEditModal(true)
                                                                }}
                                                                sx={{ color: '#830001' }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Achievement">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => {
                                                                    setItemToDelete(item)
                                                                    setDeleteModal(true)
                                                                }}
                                                                sx={{
                                                                    color: '#d32f2f',
                                                                    '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' }
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
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <EmojiEventsIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                                    <Typography variant="body1" color="text.secondary">
                                        No department achievements found.
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Click &quot;Add Achievement&quot; above to publish new recognitions and milestones.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            <Box mt={2}>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10))
                        setPage(0)
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                />
            </Box>

            {/* Add Modal */}
            <AddAchievementForm
                open={addModal}
                handleClose={() => setAddModal(false)}
                refresh={fetchAchievements}
                initialDepartment={selectedDept !== 'all' ? selectedDept : (isDeptAdmin ? userDept : 'cse')}
            />

            {/* Edit Modal */}
            {activeItem && (
                <EditAchievementForm
                    open={editModal}
                    handleClose={() => {
                        setEditModal(false)
                        setActiveItem(null)
                    }}
                    data={activeItem}
                    refresh={fetchAchievements}
                />
            )}

            {/* View Details Modal */}
            {activeItem && (
                <ViewAchievementModal
                    open={viewModal}
                    handleClose={() => {
                        setViewModal(false)
                        setActiveItem(null)
                    }}
                    data={activeItem}
                />
            )}

            {/* Single Delete Confirmation Dialog */}
            <Dialog
                open={deleteModal}
                onClose={() => !isDeleting && setDeleteModal(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f' }}>
                    <WarningIcon color="error" />
                    Delete Achievement
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Are you sure you want to delete this achievement?
                    </Typography>
                    {itemToDelete && (
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                            &quot;{itemToDelete.title}&quot;
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        This action cannot be undone and will permanently remove associated photos and files.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteModal(false)} disabled={isDeleting} sx={{ color: '#555' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                        sx={{ bgcolor: '#d32f2f' }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Batch Delete Confirmation Dialog */}
            <Dialog
                open={batchDeleteModal}
                onClose={() => !isBatchDeleting && setBatchDeleteModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f' }}>
                    <WarningIcon color="error" />
                    Confirm Bulk Deletion
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                        Are you sure you want to delete <strong>{selectedIds.length}</strong> selected achievements?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        All associated banner images and file attachments will be permanently deleted.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setBatchDeleteModal(false)} disabled={isBatchDeleting} sx={{ color: '#555' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmBatchDelete}
                        disabled={isBatchDeleting}
                        startIcon={isBatchDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                        sx={{ bgcolor: '#d32f2f' }}
                    >
                        {isBatchDeleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
