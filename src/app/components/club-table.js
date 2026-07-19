'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  IconButton,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Skeleton,
  Switch,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import { AddClub } from './club-management-props/add-club'
import { EditClub } from './club-management-props/edit-club'
import { ConfirmDeleteClub } from './club-management-props/confirm-delete'
import { getClubPiName } from '@/lib/clubUtils'

const columns = [
  { id: 'club_login_id', label: 'Club Login ID', minWidth: 130 },
  { id: 'name', label: 'Club Name', minWidth: 150 },
  { id: 'email', label: 'Club Email', minWidth: 200 },
  { id: 'category', label: 'Category', minWidth: 110 },
  { id: 'pi', label: 'Club PI', minWidth: 160 },
  { id: 'status', label: 'Status', minWidth: 100 },
  { id: 'actions', label: 'Actions', minWidth: 100 },
]

function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {columns.map((col) => (
            <TableCell key={col.id}><Skeleton variant="text" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function ClubTable() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [nameSearch, setNameSearch] = useState('')
  const [emailSearch, setEmailSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedClub, setSelectedClub] = useState(null)
  const [clubToDelete, setClubToDelete] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = '';
      key = '';
    }
    setSortConfig({ key, direction });
  }

  const sortedClubs = React.useMemo(() => {
    if (!sortConfig.key) return clubs;
    const sorted = [...clubs];
    sorted.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sorted;
  }, [clubs, sortConfig]);

  const handleToggleStatus = async (club) => {
    const newStatus = club.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch('/api/admin/clubs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: club.id,
          status: newStatus
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      setClubs(prev => prev.map(c => c.id === club.id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to toggle status');
    }
  }

  const fetchClubs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nameSearch.trim()) params.set('name', nameSearch.trim())
      if (emailSearch.trim()) params.set('email', emailSearch.trim())
      const qs = params.toString()
      const res = await fetch(`/api/admin/clubs${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to fetch clubs')
      const data = await res.json()
      setClubs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setClubs([])
    } finally {
      setLoading(false)
    }
  }, [nameSearch, emailSearch])

  useEffect(() => {
    const t = setTimeout(fetchClubs, 300)
    return () => clearTimeout(t)
  }, [fetchClubs])

  useEffect(() => setPage(0), [nameSearch, emailSearch])

  const paginated = sortedClubs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Club Management
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          label="Search by Club Name"
          size="small"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} /> }}
        />
        <TextField
          label="Search by Club Email"
          size="small"
          value={emailSearch}
          onChange={(e) => setEmailSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{ startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} /> }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
          sx={{ backgroundColor: '#830001' }}
        >
          Add Club
        </Button>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => {
                const isSortable = col.id === 'name' || col.id === 'category';
                return (
                  <TableCell
                    key={col.id}
                    style={{
                      minWidth: col.minWidth,
                      fontWeight: 'bold',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: isSortable ? 'none' : 'auto'
                    }}
                    onClick={isSortable ? () => handleSort(col.id) : undefined}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {col.label}
                      {isSortable && (
                        sortConfig.key === col.id ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUpwardIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                          ) : (
                            <ArrowDownwardIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                          )
                        ) : (
                          <ImportExportIcon fontSize="small" sx={{ color: 'action.active', opacity: 0.5, fontSize: '1rem' }} />
                        )
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableSkeleton />
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No clubs found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow hover key={row.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {row.club_login_id || `club-${row.id}`}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{getClubPiName(row)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={row.status}
                        size="small"
                        color={row.status === 'Active' ? 'success' : 'default'}
                      />
                      <Switch
                        size="small"
                        checked={row.status === 'Active'}
                        onChange={() => handleToggleStatus(row)}
                        color="success"
                        inputProps={{ 'aria-label': 'toggle club status' }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton color="primary" size="small" onClick={() => { setSelectedClub(row); setOpenEdit(true) }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => { setClubToDelete(row); setOpenDelete(true) }}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={clubs.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
      />

      <AddClub open={openAdd} onClose={() => setOpenAdd(false)} onSuccess={() => { setOpenAdd(false); fetchClubs() }} />
      {selectedClub && (
        <EditClub
          open={openEdit}
          club={selectedClub}
          onClose={() => { setOpenEdit(false); setSelectedClub(null) }}
          onSuccess={() => { setOpenEdit(false); setSelectedClub(null); fetchClubs() }}
        />
      )}
      <ConfirmDeleteClub
        open={openDelete}
        club={clubToDelete}
        onClose={() => { setOpenDelete(false); setClubToDelete(null) }}
        onDeleted={fetchClubs}
      />
    </Paper>
  )
}
