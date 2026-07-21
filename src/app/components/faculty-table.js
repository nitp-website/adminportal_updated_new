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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import { AddFaculty } from './faculty-management-props/addfaculty'
import { EditFaculty } from './faculty-management-props/editfaculty'
import { ConfirmDelete } from './faculty-management-props/confirm-delete'
import Loading from './common/Loading'
import { depList } from '@/lib/const'

const DEPARTMENT_OPTIONS = Array.from(new Set(Array.from(depList.values())))

const ROLE_OPTIONS = [
  { value: 'All', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ACADEMIC_ADMIN', label: 'Academic Admin' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'OFFICER', label: 'Officer' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'DEPT_ADMIN', label: 'Department Admin' },
  { value: 'TENDER_NOTICE_ADMIN', label: 'Tender Notice Admin' },
  { value: 'CLUB_ADMIN', label: 'Club Admin' },
]

const columns = [
  { id: 'name', label: 'Name', minWidth: 170 },
  { id: 'email', label: 'Email', minWidth: 200 },
  { id: 'department', label: 'Department', minWidth: 170 },
  { id: 'designation', label: 'Designation', minWidth: 170 },
  { id: 'academic_responsibility', label: 'Academic Responsibility', minWidth: 180 },
  { id: 'role', label: 'Role', minWidth: 150 },
  { id: 'status', label: 'Status', minWidth: 120 },
  { id: 'actions', label: 'Actions', minWidth: 120 },
]

export function FacultyTable() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [facultyToDelete, setFacultyToDelete] = useState(null)
  const [nameSearch, setNameSearch] = useState('')
  const [emailSearch, setEmailSearch] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' })
  const [searchTimeout, setSearchTimeout] = useState(null)

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

  // Fetch faculty data function
  const fetchFaculty = useCallback(async (targetPage = page, targetRowsPerPage = rowsPerPage) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'all',
        page: targetPage + 1,
        limit: targetRowsPerPage,
      })
      if (nameSearch.trim()) params.set('name', nameSearch.trim())
      if (emailSearch.trim()) params.set('email', emailSearch.trim())
      if (departmentFilter && departmentFilter !== 'All') params.set('department', departmentFilter)
      if (roleFilter && roleFilter !== 'All') params.set('role', roleFilter)
      if (sortConfig.key) {
        params.set('sortBy', sortConfig.key)
        params.set('sortOrder', sortConfig.direction || 'asc')
      }

      const res = await fetch(`/api/faculty?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRows(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []))
      setTotal(Number(data?.total) || 0)
    } catch (error) {
      console.error('Error fetching faculty:', error)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, nameSearch, emailSearch, departmentFilter, roleFilter, sortConfig])

  // Fetch faculty data when pagination, search, filter, or sorting changes
  useEffect(() => {
    fetchFaculty()
  }, [fetchFaculty])

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value)
    setPage(0)
  }

  const handleEdit = async (faculty) => {
    try {
      const res = await fetch(`/api/faculty?type=${faculty.email}`)
      const fullFacultyData = await res.json()
      setSelectedFaculty(fullFacultyData)
      setOpenEdit(true)
    } catch (error) {
      console.error('Error fetching faculty details:', error)
      alert('Failed to load faculty details')
    }
  }

  const handleDelete = async (facultyRow) => {
    try {
      const res = await fetch(`/api/faculty?type=${facultyRow.email}`)
      const fullFacultyData = await res.json()
      setFacultyToDelete(fullFacultyData)
      setOpenDelete(true)
    } catch (error) {
      console.error('Error fetching faculty details:', error)
      const facultyData = {
        profile: {
          name: facultyRow.name,
          email: facultyRow.email,
          department: facultyRow.department,
          designation: facultyRow.designation,
          role: facultyRow.role,
          ext_no: facultyRow.ext_no,
          research_interest: facultyRow.research_interest,
          academic_responsibility: facultyRow.academic_responsibility,
          is_retired: facultyRow.is_retired,
          retirement_date: facultyRow.retirement_date,
          image: facultyRow.image
        }
      }
      setFacultyToDelete(facultyData)
      setOpenDelete(true)
    }
  }

  const handleDeleteFromEdit = (faculty) => {
    setFacultyToDelete(faculty)
    setOpenEdit(false)
    setOpenDelete(true)
  }

  useEffect(() => {
    setPage(0)
  }, [nameSearch, emailSearch, departmentFilter, roleFilter, sortConfig])

  const formatDate = (dateValue) => {
    if (!dateValue) return ''
    try {
      const d = new Date(dateValue)
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    } catch (e) {
      // fallthrough to fallback
    }
    if (typeof dateValue === 'string' && dateValue.includes('T')) return dateValue.split('T')[0]
    return String(dateValue)
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Faculty Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
          {loading && <Loading/>}
          <TextField
            label="Search by Name"
            variant="outlined"
            size="small"
            value={nameInput}
            onChange={(e) => {
              const value = e.target.value
              setNameInput(value)
              if (searchTimeout) clearTimeout(searchTimeout)
              const timeout = setTimeout(() => setNameSearch(value), 600)
              setSearchTimeout(timeout)
            }}
            sx={{ flexGrow: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
            }}
          />
          <TextField
            label="Search by Email"
            variant="outlined"
            size="small"
            value={emailInput}
            onChange={(e) => {
              const value = e.target.value
              setEmailInput(value)
              if (searchTimeout) clearTimeout(searchTimeout)
              const timeout = setTimeout(() => setEmailSearch(value), 600)
              setSearchTimeout(timeout)
            }}
            sx={{ flexGrow: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="dept-filter-label">Filter Department</InputLabel>
            <Select
              labelId="dept-filter-label"
              id="dept-filter"
              value={departmentFilter}
              label="Filter Department"
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <MenuItem value="All">All Departments</MenuItem>
              {DEPARTMENT_OPTIONS.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="role-filter-label">Filter Role</InputLabel>
            <Select
              labelId="role-filter-label"
              id="role-filter"
              value={roleFilter}
              label="Filter Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_OPTIONS.map(role => (
                <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAdd(true)}
            style={{ backgroundColor: '#830001', color: 'white' }}
          >
            Add Faculty
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const isSortable = ['name', 'department', 'designation', 'role', 'status'].includes(column.id);
                return (
                  <TableCell
                    key={column.id}
                    style={{
                      minWidth: column.minWidth,
                      fontWeight: 'bold',
                      cursor: isSortable ? 'pointer' : 'default',
                      userSelect: isSortable ? 'none' : 'auto'
                    }}
                    onClick={isSortable ? () => handleSort(column.id) : undefined}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {column.label}
                      {isSortable && (
                        sortConfig.key === column.id ? (
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
            {rows.map((row) => (
              <TableRow hover tabIndex={-1} key={row.email}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>{row.designation || 'N/A'}</TableCell>
                <TableCell>{row.academic_responsibility || 'N/A'}</TableCell>
                <TableCell>{row.role}</TableCell>
                <TableCell>
                  {row.is_retired ? (
                    <span>
                      <span className="text-red-600 font-semibold">Retired</span>
                      <br />
                      <span>{formatDate(row.retirement_date)}</span>
                    </span>
                  ) : (
                    <span className="text-green-500 rounded-full font-semibold">
                      Active
                    </span>
                  )}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <AddFaculty
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={(newFaculty) => {
          fetchFaculty()
          setOpenAdd(false)
        }}
      />

      {selectedFaculty && openEdit && (
        <EditFaculty
          open={openEdit}
          faculty={selectedFaculty}
          onClose={() => {
            setOpenEdit(false)
            setSelectedFaculty(null)
          }}
          onSuccess={() => {
            fetchFaculty()
            setOpenEdit(false)
            setSelectedFaculty(null)
          }}
          onDelete={handleDeleteFromEdit}
        />
      )}

      {openDelete && facultyToDelete && (
        <ConfirmDelete
          open={openDelete}
          handleClose={() => {
            setOpenDelete(false)
            setFacultyToDelete(null)
          }}
          faculty={facultyToDelete}
          refreshTable={fetchFaculty}
        />
      )}
    </Paper>
  )
}
