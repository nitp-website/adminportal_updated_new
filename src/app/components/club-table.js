'use client'

import React, { useEffect, useMemo, useState } from 'react'
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
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import { AddClub } from './club_management_props/addclub'
import { EditClub } from './club_management_props/editclub'
import { ConfirmDeleteClub } from './club_management_props/confirm-delete-club'
import { readClubs, upsertClub, writeClubs } from './club-storage'

const columns = [
  { id: 'club_name', label: 'Club Name', minWidth: 190 },
  { id: 'club_email', label: 'Club Email', minWidth: 220 },
  { id: 'category', label: 'Category', minWidth: 160 },
  { id: 'club_pi', label: 'Club PI', minWidth: 180 },
  { id: 'club_president', label: 'Club President', minWidth: 180 },
  { id: 'status', label: 'Status', minWidth: 120 },
  { id: 'actions', label: 'Actions', minWidth: 160 },
]

export function ClubTable() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rows, setRows] = useState([])
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedClub, setSelectedClub] = useState(null)
  const [clubToDelete, setClubToDelete] = useState(null)
  const [nameSearch, setNameSearch] = useState('')
  const [emailSearch, setEmailSearch] = useState('')

  useEffect(() => {
    setRows(readClubs())
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const nameMatch = row.club_name?.toLowerCase().includes(nameSearch.toLowerCase())
      const emailMatch = row.club_email?.toLowerCase().includes(emailSearch.toLowerCase())
      return nameMatch && emailMatch
    })
  }, [rows, nameSearch, emailSearch])

  const visibleRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  useEffect(() => {
    setPage(0)
  }, [nameSearch, emailSearch])

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  const handleEdit = (club) => {
    setSelectedClub(club)
    setOpenEdit(true)
  }

  const handleDelete = (club) => {
    setClubToDelete(club)
    setOpenDelete(true)
  }

  const handleDeleteFromEdit = (club) => {
    setClubToDelete(club)
    setOpenEdit(false)
    setOpenDelete(true)
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Club Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Search by Club Name"
            variant="outlined"
            size="small"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
            }}
          />
          <TextField
            label="Search by Club Email"
            variant="outlined"
            size="small"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            style={{ backgroundColor: '#830001', color: 'white' }}
          >
            Add Club
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader aria-label="club management table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  style={{ minWidth: column.minWidth, fontWeight: 'bold' }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow hover tabIndex={-1} key={row.id}>
                  <TableCell>{row.club_name}</TableCell>
                  <TableCell>{row.club_email}</TableCell>
                  <TableCell>{row.category || 'N/A'}</TableCell>
                  <TableCell>{row.club_pi || 'N/A'}</TableCell>
                  <TableCell>{row.club_president || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status || 'Active'}
                      color={row.status === 'Inactive' ? 'default' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleEdit(row)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(row)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  No clubs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <AddClub
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={(newClub) => {
          const nextRows = upsertClub({ ...newClub, id: Date.now() })
          setRows(nextRows)
          setOpenAdd(false)
        }}
      />

      {selectedClub && openEdit && (
        <EditClub
          open={openEdit}
          club={selectedClub}
          onClose={() => {
            setOpenEdit(false)
            setSelectedClub(null)
          }}
          onSuccess={(updatedClub) => {
            const nextRows = upsertClub(updatedClub)
            setRows(nextRows)
            setOpenEdit(false)
            setSelectedClub(null)
          }}
          onDelete={handleDeleteFromEdit}
        />
      )}

      {openDelete && clubToDelete && (
        <ConfirmDeleteClub
          open={openDelete}
          onClose={() => {
            setOpenDelete(false)
            setClubToDelete(null)
          }}
          club={clubToDelete}
          onConfirm={(deletedClub) => {
            const nextRows = rows.filter((row) => row.id !== deletedClub.id)
            writeClubs(nextRows)
            setRows(nextRows)
            setOpenDelete(false)
            setClubToDelete(null)
          }}
        />
      )}
    </Paper>
  )
}
