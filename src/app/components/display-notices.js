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
    Chip,
    TableSortLabel,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    CircularProgress,
    Alert
} from '@mui/material'
import Button from '@mui/material/Button'
import {
    Edit as EditIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    AttachFile as AttachFileIcon,
    Warning as WarningIcon
} from '@mui/icons-material'
import React, { useState, useEffect, useMemo } from 'react'
import { AddForm } from './notices-props/add-form'
import { EditForm } from './notices-props/edit-form'
import { useSession } from 'next-auth/react'
import Filter from './common-props/filter'
import TablePaginationActions from './common-props/TablePaginationActions'
import ViewDetailsModal from './view-details-modal'
import { ConfirmDelete } from './notices-props/confirm-delete'

// Helper function to sort notices deterministically
const sortNotices = (noticesList, sortKey, sortDirection) => {
    if (!Array.isArray(noticesList)) return [];
    const sorted = [...noticesList];

    const parseTime = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && String(parsed).length >= 10) return parsed;
        const d = new Date(val).getTime();
        return isNaN(d) ? 0 : d;
    };

    sorted.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'updatedAt') {
            const timeA = parseTime(a.updatedAt || a.timestamp);
            const timeB = parseTime(b.updatedAt || b.timestamp);
            cmp = timeA - timeB;
        } else if (sortKey === 'openDate') {
            const timeA = parseTime(a.openDate);
            const timeB = parseTime(b.openDate);
            cmp = timeA - timeB;
        } else if (sortKey === 'closeDate') {
            const timeA = parseTime(a.closeDate);
            const timeB = parseTime(b.closeDate);
            if (!timeA && timeB) cmp = 1;
            else if (timeA && !timeB) cmp = -1;
            else cmp = timeA - timeB;
        } else if (sortKey === 'department') {
            const deptA = (a.department || '').toString().trim().toLowerCase();
            const deptB = (b.department || '').toString().trim().toLowerCase();
            if (!deptA && deptB) cmp = 1;
            else if (deptA && !deptB) cmp = -1;
            else cmp = deptA.localeCompare(deptB);
        } else if (sortKey === 'notice_type' || sortKey === 'type') {
            const typeA = (a.notice_type || '').toString().trim().toLowerCase();
            const typeB = (b.notice_type || '').toString().trim().toLowerCase();
            if (!typeA && typeB) cmp = 1;
            else if (typeA && !typeB) cmp = -1;
            else cmp = typeA.localeCompare(typeB);
        }

        if (cmp !== 0) {
            return sortDirection === 'asc' ? cmp : -cmp;
        }

        // Secondary stable sort: latest updatedAt first
        const secA = parseTime(a.updatedAt || a.timestamp);
        const secB = parseTime(b.updatedAt || b.timestamp);
        return secB - secA;
    });

    return sorted;
};

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

const Notice = ({ detail, isSelected, onToggleSelect, canManage }) => {
    const [editModal, setEditModal] = useState(false)
    const [viewModal, setViewModal] = useState(false)
    const [deleteModal, setDeleteModal] = useState(false)
    const updatedAt = formatDate(detail.updatedAt)
    const openDate = formatDate(detail.openDate)
    const closeDate = formatDate(detail.closeDate)

    return (
        <>
            <TableRow 
                sx={{ 
                    '&:hover': { backgroundColor: isSelected ? 'rgba(131, 0, 1, 0.08)' : '#f5f5f5' },
                    backgroundColor: isSelected ? 'rgba(131, 0, 1, 0.04)' : 'inherit',
                    transition: 'background-color 0.15s ease-in-out'
                }}
            >
                <TableCell padding="checkbox">
                    {canManage ? (
                        <Checkbox
                            checked={Boolean(isSelected)}
                            onChange={() => onToggleSelect(detail.id)}
                            sx={{
                                color: '#830001',
                                '&.Mui-checked': {
                                    color: '#830001',
                                },
                            }}
                        />
                    ) : (
                        <Tooltip title="You do not have permission to delete this notice">
                            <span>
                                <Checkbox disabled sx={{ opacity: 0.3 }} />
                            </span>
                        </Tooltip>
                    )}
                </TableCell>
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
                                maxWidth: '280px',
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
                    <Typography variant="body2" color="text.secondary">
                        {closeDate}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" color="text.secondary">
                        {detail.department || '-'}
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
    const [sortConfig, setSortConfig] = useState({
        key: 'updatedAt',
        direction: 'desc'
    })
    const [selectedIds, setSelectedIds] = useState([])
    const [batchDeleteModal, setBatchDeleteModal] = useState(false)
    const [isBatchDeleting, setIsBatchDeleting] = useState(false)
    const [batchDeleteError, setBatchDeleteError] = useState(null)

    const handleRequestSort = (property) => {
        if (sortConfig.key === property) {
            setSortConfig({
                key: property,
                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
            })
        } else {
            const defaultAsc = ['department', 'notice_type'].includes(property)
            setSortConfig({
                key: property,
                direction: defaultAsc ? 'asc' : 'desc'
            })
        }
    }

    // Calculate all authorized notice types for current user
    const allowedNoticeTypes = useMemo(() => {
        if (!session?.user) return [];
        if (session.user.role === 'SUPER_ADMIN') return [];

        const baseTypes = [];
        if (session.user.role === 'ACADEMIC_ADMIN') baseTypes.push('academics');
        else if (session.user.role === 'DEPT_ADMIN') baseTypes.push('department');
        else if (session.user.role === 'TENDER_NOTICE_ADMIN') baseTypes.push('tender');
        else if (session.user.role === 'EXAM_ADMIN') baseTypes.push('exam');

        const special = (session.user.specialPermissions || [])
            .map((p) => String(p).toLowerCase())
            .filter((p) => !['events', 'guest-lectures', 'institute-lectures'].includes(p));
        return Array.from(new Set([...baseTypes, ...special]));
    }, [session]);

    const manageableNotices = useMemo(() => {
        return (details || []).filter(notice => canUserManageNotice(notice, session));
    }, [details, session]);

    const manageableIds = useMemo(() => {
        return manageableNotices.map(notice => notice.id);
    }, [manageableNotices]);

    const isAllSelected = manageableIds.length > 0 && manageableIds.every(id => selectedIds.includes(id));
    const isIndeterminate = selectedIds.length > 0 && !isAllSelected;

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedIds(manageableIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleConfirmBatchDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsBatchDeleting(true);
        setBatchDeleteError(null);

        try {
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'notice',
                    ids: selectedIds
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to delete selected notices');
            }

            setBatchDeleteModal(false);
            setSelectedIds([]);
            window.location.reload();
        } catch (err) {
            console.error('[Batch Delete] Error:', err);
            setBatchDeleteError(err.message || 'An error occurred while deleting notices');
        } finally {
            setIsBatchDeleting(false);
        }
    };

    useEffect(() => {
        if (data) {
            setInitialData(data);
            setDetails(sortNotices(data, sortConfig.key, sortConfig.direction));
        }
    }, [data, sortConfig]);

    useEffect(() => {
        if (!filterQuery) {
            let body = {
                from: page * rowsPerPage,
                to: (page + 1) * rowsPerPage,
                type: 'between',
                notice_sub_type: filterQuery?.notice_sub_type || null,
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction,
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
                let sortedData = sortNotices(list, sortConfig.key, sortConfig.direction);
                
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
            const sortedFilterData = sortNotices(filteredData, sortConfig.key, sortConfig.direction);
            setDetails(sortedFilterData);
        }
    }, [page, rowsPerPage, filterQuery, initialData, session, allowedNoticeTypes, sortConfig]);

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
            const special = (session?.user?.specialPermissions || [])
                .map((p) => String(p).toLowerCase())
                .filter((p) => !['events', 'guest-lectures', 'institute-lectures'].includes(p));
            if (special.length > 0) return 'Academic & Delegated Notices';
            return 'Academic Notices';
        }

        if (session?.user?.role === 'DEPT_ADMIN') {
            const special = (session?.user?.specialPermissions || [])
                .map((p) => String(p).toLowerCase())
                .filter((p) => !['events', 'guest-lectures', 'institute-lectures'].includes(p));
            if (special.length > 0) return `${session.user.department} & Delegated Notices`;
            return `${session.user.department} Notices`;
        }

        return 'Authorized Notices';
    };

    const sortLabelSx = (key) => ({
        fontWeight: 600,
        color: sortConfig.key === key ? '#830001 !important' : '#333',
        '& .MuiTableSortLabel-icon': {
            opacity: sortConfig.key === key ? 1 : 0.45,
            color: sortConfig.key === key ? '#830001 !important' : '#555 !important'
        },
        '&:hover': {
            color: '#830001',
            '& .MuiTableSortLabel-icon': {
                opacity: 0.85,
                color: '#830001 !important'
            }
        }
    });

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4" sx={{ color: '#333', fontWeight: 600 }}>
                    {getHeadingTitle()}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                    <Button
                        variant="contained"
                        onClick={() => setAddModal(true)}
                        style={{ backgroundColor: '#830001', color: 'white' }}
                    >
                        Add New Notice
                    </Button>
                    {(session?.user?.role === 'SUPER_ADMIN' || allowedNoticeTypes.length > 1) && (
                        <Filter type="notice" setEntries={setFilterQuery} style={{ color: '#830001' }}/>
                    )}
                </Box>
            </Box>

            {/* Batch Actions Toolbar */}
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
                            sx={{
                                bgcolor: '#830001',
                                color: '#fff',
                                fontWeight: 600
                            }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {selectedIds.length === 1 ? '1 notice selected' : `${selectedIds.length} notices selected for bulk action`}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedIds([])}
                            sx={{
                                color: '#555',
                                borderColor: '#ccc',
                                textTransform: 'none',
                                '&:hover': { borderColor: '#888', bgcolor: '#f5f5f5' }
                            }}
                        >
                            Clear Selection
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setBatchDeleteModal(true)}
                            sx={{
                                bgcolor: '#d32f2f',
                                textTransform: 'none',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#b71c1c' }
                            }}
                        >
                            Delete Selected ({selectedIds.length})
                        </Button>
                    </Box>
                </Box>
            )}

            <TableContainer component={Paper} sx={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={isIndeterminate}
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    disabled={manageableIds.length === 0}
                                    sx={{
                                        color: '#830001',
                                        '&.Mui-checked': {
                                            color: '#830001',
                                        },
                                        '&.MuiCheckbox-indeterminate': {
                                            color: '#830001',
                                        },
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Notice Title</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                <TableSortLabel
                                    active={sortConfig.key === 'updatedAt'}
                                    direction={sortConfig.key === 'updatedAt' ? sortConfig.direction : 'desc'}
                                    onClick={() => handleRequestSort('updatedAt')}
                                    sx={sortLabelSx('updatedAt')}
                                >
                                    Updated Date
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                <TableSortLabel
                                    active={sortConfig.key === 'openDate'}
                                    direction={sortConfig.key === 'openDate' ? sortConfig.direction : 'desc'}
                                    onClick={() => handleRequestSort('openDate')}
                                    sx={sortLabelSx('openDate')}
                                >
                                    Open Date
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                <TableSortLabel
                                    active={sortConfig.key === 'closeDate'}
                                    direction={sortConfig.key === 'closeDate' ? sortConfig.direction : 'desc'}
                                    onClick={() => handleRequestSort('closeDate')}
                                    sx={sortLabelSx('closeDate')}
                                >
                                    Closing Date
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                <TableSortLabel
                                    active={sortConfig.key === 'department'}
                                    direction={sortConfig.key === 'department' ? sortConfig.direction : 'asc'}
                                    onClick={() => handleRequestSort('department')}
                                    sx={sortLabelSx('department')}
                                >
                                    Department
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>
                                <TableSortLabel
                                    active={sortConfig.key === 'notice_type'}
                                    direction={sortConfig.key === 'notice_type' ? sortConfig.direction : 'asc'}
                                    onClick={() => handleRequestSort('notice_type')}
                                    sx={sortLabelSx('notice_type')}
                                >
                                    Type
                                </TableSortLabel>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Attachments</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#333' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {details?.length > 0 ? (
                            details.map((notice, index) => (
                                <Notice 
                                    key={notice.id || index} 
                                    detail={notice} 
                                    isSelected={selectedIds.includes(notice.id)}
                                    onToggleSelect={handleToggleSelect}
                                    canManage={canUserManageNotice(notice, session)}
                                />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
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

            {/* Batch Delete Confirmation Dialog */}
            <Dialog
                open={batchDeleteModal}
                onClose={() => !isBatchDeleting && setBatchDeleteModal(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#d32f2f', fontWeight: 600 }}>
                    <WarningIcon color="error" />
                    Confirm Delete Multiple Notices
                </DialogTitle>
                <DialogContent>
                    {batchDeleteError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {batchDeleteError}
                        </Alert>
                    )}
                    <Typography variant="body1" sx={{ mb: 1.5 }}>
                        Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected notice{selectedIds.length > 1 ? 's' : ''}?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This action cannot be undone. All associated attachments and files will also be permanently deleted from S3 storage.
                    </Typography>
                    
                    <Box
                        sx={{
                            maxHeight: '180px',
                            overflowY: 'auto',
                            bgcolor: '#f8f9fa',
                            p: 1.5,
                            borderRadius: 1,
                            border: '1px solid #e0e0e0'
                        }}
                    >
                        {details
                            .filter(n => selectedIds.includes(n.id))
                            .map((n, idx) => (
                                <Box key={n.id || idx} sx={{ py: 0.75, borderBottom: idx < selectedIds.length - 1 ? '1px dashed #ddd' : 'none' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#333' }}>
                                        • {n.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Type: {n.notice_type || 'General'} | Updated: {formatDate(n.updatedAt)}
                                    </Typography>
                                </Box>
                            ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button
                        onClick={() => setBatchDeleteModal(false)}
                        disabled={isBatchDeleting}
                        sx={{ color: '#555' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleConfirmBatchDelete}
                        disabled={isBatchDeleting}
                        startIcon={isBatchDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
                        sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
                    >
                        {isBatchDeleting ? 'Deleting...' : `Delete (${selectedIds.length}) Notices`}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default DataDisplay;
