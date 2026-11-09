'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SchoolIcon from '@mui/icons-material/School'
import { depList } from '@/lib/const'
import { OFFICIAL_DEPARTMENTS, normalizeDepartment } from '@/lib/studentConstants'

const STANDARD_COURSES = [
  'All Courses',
  'Bachelor of Technology',
  'Master of Technology',
  'Master of Computer Applications',
  'Bachelor and Master of Technology',
]

export default function StudentTable({ session }) {
  const isSuperOrAcademic =
    session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ACADEMIC_ADMIN'
  const userDept = session?.user?.department ? normalizeDepartment(session.user.department) : 'Computer Science and Engineering'

  // Filter state (defaults to 'All' for Super Admin and Academic Admin)
  const [department, setDepartment] = useState(isSuperOrAcademic ? 'All' : userDept)
  const [course, setCourse] = useState('All Courses')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)

  // Data state
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [availableCourses, setAvailableCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' })

  // Modal states
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadMode, setUploadMode] = useState('upsert')
  const [headerRows, setHeaderRows] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadErrors, setUploadErrors] = useState([])

  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    roll_no: '',
    name: '',
    department: department,
    course: 'Bachelor of Technology',
    email: '',
    specialization: '',
    enrollment_no: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: 'single', // 'single' or 'batch'
    student: null,
    batchScope: 'all_students',
  })

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch students
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      })
      if (department && department !== 'All') {
        params.append('department', department)
      }
      if (course && course !== 'All Courses') {
        params.append('course', course)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const res = await fetch(`/api/v2/admin/students?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setStudents(json.data || [])
        setTotal(json.meta?.total || 0)
        if (json.meta?.availableCourses) {
          setAvailableCourses(json.meta.availableCourses)
        }
      } else {
        setAlert({ show: true, message: json.message || 'Failed to fetch students', severity: 'error' })
      }
    } catch (err) {
      console.error('Fetch students error:', err)
      setAlert({ show: true, message: 'Network error fetching students', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [department, course, searchTerm, page, rowsPerPage])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Handle Excel/CSV upload
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setAlert({ show: true, message: 'Please select an Excel (.xlsx/.xls) or CSV file to upload.', severity: 'warning' })
      return
    }

    setUploading(true)
    setUploadErrors([])

    try {
      const data = new FormData()
      data.append('file', selectedFile)
      data.append('mode', uploadMode)
      if (department && department !== 'All') {
        data.append('department', department)
      }
      data.append('headerRows', headerRows.toString())

      const res = await fetch('/api/v2/admin/students/upload', {
        method: 'POST',
        body: data,
      })
      const result = await res.json()

      if (result.success) {
        setAlert({ show: true, message: result.message, severity: 'success' })
        setUploadOpen(false)
        setSelectedFile(null)
        fetchStudents()
      } else {
        if (result.errors && result.errors.length > 0) {
          setUploadErrors(result.errors)
        }
        setAlert({
          show: true,
          message: result.message || 'File upload failed validation.',
          severity: 'error',
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setAlert({ show: true, message: 'An unexpected error occurred during upload.', severity: 'error' })
    } finally {
      setUploading(false)
    }
  }

  // Add / Edit student submit
  const handleFormSubmit = async () => {
    if (!formData.roll_no || !formData.name || !formData.course) {
      setAlert({ show: true, message: 'Roll No, Name, and Course are required.', severity: 'warning' })
      return
    }

    setFormSubmitting(true)
    try {
      const method = formData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/v2/admin/students', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()

      if (result.success) {
        setAlert({ show: true, message: result.message, severity: 'success' })
        setFormOpen(false)
        fetchStudents()
      } else {
        setAlert({ show: true, message: result.message || 'Failed to save student.', severity: 'error' })
      }
    } catch (err) {
      console.error('Save student error:', err)
      setAlert({ show: true, message: 'Error saving student record.', severity: 'error' })
    } finally {
      setFormSubmitting(false)
    }
  }

  // Delete submit
  const handleDeleteSubmit = async () => {
    try {
      let url = '/api/v2/admin/students'
      if (deleteDialog.type === 'single') {
        url += `?roll_no=${encodeURIComponent(deleteDialog.student.roll_no)}`
      } else if (deleteDialog.type === 'graduated' || deleteDialog.batchScope === 'graduated_students') {
        url += '?graduated=true'
        if (department && department !== 'All') {
          url += `&department=${encodeURIComponent(department)}`
        }
      } else {
        const scope = deleteDialog.batchScope || 'all_students'
        if (scope === 'all_students') {
          url += '?all=true'
        } else if (scope === 'dept_all') {
          url += `?department=${encodeURIComponent(department)}`
        } else if (scope === 'course_batch') {
          url += `?department=${encodeURIComponent(department)}&course=${encodeURIComponent(course)}`
        }
      }

      const res = await fetch(url, { method: 'DELETE' })
      const result = await res.json()

      if (result.success) {
        setAlert({ show: true, message: result.message, severity: 'success' })
        setDeleteDialog({ open: false, type: 'single', student: null, batchScope: 'all_students' })
        fetchStudents()
      } else {
        setAlert({ show: true, message: result.message || 'Delete operation failed.', severity: 'error' })
      }
    } catch (err) {
      console.error('Delete error:', err)
      setAlert({ show: true, message: 'Error deleting records.', severity: 'error' })
    }
  }

  const allCourseOptions = useMemo(() => {
    const set = new Set(STANDARD_COURSES)
    availableCourses.forEach(c => set.add(c))
    return Array.from(set)
  }, [availableCourses])

  const departmentEntries = Array.from(depList.entries()).filter(
    ([k]) => k !== 'officers' && k !== 'others'
  )

  return (
    <Box sx={{ width: '100%', py: 2 }}>
      {/* Page Title & Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#830001' }}>
            Student Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, search, and bulk-upload student records for department programs
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => {
              setUploadErrors([])
              setSelectedFile(null)
              setUploadOpen(true)
            }}
            sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#5e0001' } }}
          >
            Upload Excel / CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setFormData({
                id: null,
                roll_no: '',
                name: '',
                department: department !== 'All' ? department : OFFICIAL_DEPARTMENTS[0],
                course: course !== 'All Courses' ? course : 'Bachelor of Technology',
                email: '',
                specialization: '',
                enrollment_no: '',
              })
              setFormOpen(true)
            }}
          >
            Add Student
          </Button>

          {/* Prominent Top Delete Records Button */}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setDeleteDialog({
                open: true,
                type: 'batch',
                student: null,
                batchScope: department !== 'All' ? (course !== 'All Courses' ? 'course_batch' : 'dept_all') : 'all_students',
              })
            }}
          >
            Delete Records
          </Button>

          {/* Delete Graduated Students Button */}
          <Button
            variant="outlined"
            startIcon={<SchoolIcon />}
            onClick={() => {
              setDeleteDialog({
                open: true,
                type: 'graduated',
                student: null,
                batchScope: 'graduated_students',
              })
            }}
            sx={{
              borderColor: '#ed6c02',
              color: '#c44d00',
              fontWeight: 600,
              '&:hover': { borderColor: '#b23c00', backgroundColor: '#fff8f0' },
            }}
          >
            Delete Graduated
          </Button>

          <IconButton onClick={fetchStudents} title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Alert Banner */}
      {alert.show && (
        <Alert
          severity={alert.severity}
          onClose={() => setAlert({ ...alert, show: false })}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Filters Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          {/* Department Selector */}
          <FormControl sx={{ minWidth: 260 }} size="small" disabled={!isSuperOrAcademic}>
            <InputLabel id="dept-select-label">Department</InputLabel>
            <Select
              labelId="dept-select-label"
              value={department}
              label="Department"
              onChange={(e) => {
                setDepartment(e.target.value)
                setPage(0)
              }}
            >
              <MenuItem value="All">All Departments</MenuItem>
              {OFFICIAL_DEPARTMENTS.map((deptName) => (
                <MenuItem key={deptName} value={deptName}>
                  {deptName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Course Filter */}
          <FormControl sx={{ minWidth: 260 }} size="small">
            <InputLabel id="course-select-label">Course / Program</InputLabel>
            <Select
              labelId="course-select-label"
              value={course}
              label="Course / Program"
              onChange={(e) => {
                setCourse(e.target.value)
                setPage(0)
              }}
            >
              {allCourseOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search Box */}
          <TextField
            size="small"
            placeholder="Search by name, roll no, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ flex: 1, minWidth: 220 }}
          />
        </Stack>
      </Paper>

      {/* Students Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { backgroundColor: '#830001', color: 'white', fontWeight: 600 } }}>
                <TableCell>Roll No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>NITP Email</TableCell>
                <TableCell>Specialization</TableCell>
                <TableCell>Enrollment No</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#830001', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading students...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                      No student records found.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Upload a CSV file or add individual students to populate this list.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id || student.roll_no} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{student.roll_no}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={student.course}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          backgroundColor:
                            student.course.includes('Bachelor and Master')
                              ? '#e8eaf6'
                              : student.course.includes('Bachelor')
                              ? '#e3f2fd'
                              : student.course.includes('Master of Technology')
                              ? '#f3e5f5'
                              : student.course.includes('Applications')
                              ? '#e0f2f1'
                              : '#f5f5f5',
                          color:
                            student.course.includes('Bachelor and Master')
                              ? '#283593'
                              : student.course.includes('Bachelor')
                              ? '#1565c0'
                              : student.course.includes('Master of Technology')
                              ? '#6a1b9a'
                              : student.course.includes('Applications')
                              ? '#00695c'
                              : '#424242',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      {student.department}
                    </TableCell>
                    <TableCell>
                      {student.email ? (
                        <a href={`mailto:${student.email}`} style={{ color: '#830001', textDecoration: 'none' }}>
                          {student.email}
                        </a>
                      ) : (
                        <span style={{ color: '#aaa' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>{student.specialization || '—'}</TableCell>
                    <TableCell>{student.enrollment_no || '—'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit Student">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setFormData({
                              id: student.id,
                              roll_no: student.roll_no,
                              name: student.name,
                              department: student.department,
                              course: student.course,
                              email: student.email || '',
                              specialization: student.specialization || '',
                              enrollment_no: student.enrollment_no || '',
                            })
                            setFormOpen(true)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Student">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setDeleteDialog({
                              open: true,
                              type: 'single',
                              student,
                            })
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 200]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#830001' }}>
          Bulk Upload Students via Excel (.xlsx) or CSV
        </DialogTitle>
        <DialogContent dividers>
          {/* File Format Note Box */}
          <Alert severity="info" sx={{ mb: 2.5, backgroundColor: '#f4f8fc', border: '1px solid #d0e2ff' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#004085', mb: 0.5 }}>
              Required Spreadsheet Format & Column Structure:
            </Typography>
            <Typography variant="body2" sx={{ color: '#1c3d5a', mb: 1.2 }}>
              Upload files in <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> format. Columns must follow this header order:
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
              {[
                { name: 'Department', req: true, note: 'e.g. Architecture and Planning, CSE' },
                { name: 'Course', req: true, note: 'e.g. Bachelor of Technology, M.Tech' },
                { name: 'Specialization', req: false, note: 'e.g. Material Science, Structural' },
                { name: 'Enrollment Number', req: false, note: 'e.g. 261192' },
                { name: 'Roll No', req: true, note: 'e.g. 2658013' },
                { name: 'Nitp Email', req: false, note: 'e.g. student.26ph@nitp.ac.in' },
                { name: 'Name', req: true, note: 'Student Full Name' },
              ].map((col, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={
                    <span>
                      <strong style={{ color: '#0f3c68' }}>{col.name}</strong>{' '}
                      {col.req ? <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span> : <span style={{ color: '#666', fontSize: '0.75rem' }}>(opt)</span>}
                    </span>
                  }
                  variant="outlined"
                  sx={{ backgroundColor: '#ffffff', borderColor: '#b6d4fe' }}
                />
              ))}
            </Box>

            <Typography variant="caption" sx={{ color: '#445566', display: 'block', lineHeight: 1.5 }}>
              • Columns with <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>*</span> are required. Columns are matched automatically by keyword.
              <br />
              • If your sheet has an institute title row on Row 1, column headers on Row 2, and student records starting on Row 3, leave <strong>Auto Detect</strong> selected.
            </Typography>
          </Alert>

          <Stack spacing={2.5}>
            {/* File Input Box */}
            <Box
              sx={{
                border: '2px dashed #830001',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                backgroundColor: '#fafafa',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('student-file-input').click()}
            >
              <input
                type="file"
                id="student-file-input"
                accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0])
                  }
                }}
              />
              <UploadFileIcon sx={{ fontSize: 48, color: '#830001', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {selectedFile ? selectedFile.name : 'Click to select or drag and drop a .xlsx, .xls, or .csv file'}
              </Typography>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary">
                  Size: {(selectedFile.size / 1024).toFixed(1)} KB
                </Typography>
              )}
            </Box>

            {/* Header Rows Selector */}
            <FormControl fullWidth size="small">
              <InputLabel id="header-rows-label">Header Rows in File</InputLabel>
              <Select
                labelId="header-rows-label"
                value={headerRows}
                label="Header Rows in File"
                onChange={(e) => setHeaderRows(Number(e.target.value))}
              >
                <MenuItem value={0}>
                  <strong>Auto Detect (Recommended)</strong> — Automatically detect title & header rows
                </MenuItem>
                <MenuItem value={2}>
                  <strong>2 Rows (Exclude 1st & 2nd row)</strong> — Column names/titles are in rows 1 and 2 (Data starts on Row 3)
                </MenuItem>
                <MenuItem value={1}>
                  <strong>1 Row (Exclude 1st row only)</strong> — Column names are in row 1 only (Data starts on Row 2)
                </MenuItem>
              </Select>
            </FormControl>

            {/* Upload Mode Selector */}
            <FormControl fullWidth size="small">
              <InputLabel id="upload-mode-label">Upload Mode</InputLabel>
              <Select
                labelId="upload-mode-label"
                value={uploadMode}
                label="Upload Mode"
                onChange={(e) => setUploadMode(e.target.value)}
              >
                <MenuItem value="upsert">
                  <strong>Upsert Mode (Recommended)</strong> — Insert new students and update existing records by Roll No.
                </MenuItem>
                <MenuItem value="replace_course">
                  <strong>Replace Course Mode</strong> — Wipe existing records for the courses present in the CSV and insert fresh list.
                </MenuItem>
              </Select>
            </FormControl>

            {/* Error Table if validation failed */}
            {uploadErrors.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="error" sx={{ mb: 1 }}>
                  Found {uploadErrors.length} validation issue(s). Records were not saved.
                </Alert>
                <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Roll No</TableCell>
                        <TableCell>Error Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {uploadErrors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.roll_no || '—'}</TableCell>
                          <TableCell sx={{ color: 'error.main' }}>{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={!selectedFile || uploading}
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
            sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#5e0001' } }}
          >
            {uploading ? 'Processing CSV...' : 'Process & Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add / Edit Student Dialog */}
      <Dialog open={formOpen} onClose={() => !formSubmitting && setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#830001' }}>
          {formData.id ? 'Edit Student Record' : 'Add New Student'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Roll Number"
              size="small"
              required
              fullWidth
              value={formData.roll_no}
              onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
            />
            <TextField
              label="Full Name"
              size="small"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl fullWidth size="small" required>
              <InputLabel>Department</InputLabel>
              <Select
                value={formData.department}
                label="Department"
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {OFFICIAL_DEPARTMENTS.map((deptName) => (
                  <MenuItem key={deptName} value={deptName}>
                    {deptName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" required>
              <InputLabel>Course</InputLabel>
              <Select
                value={formData.course}
                label="Course"
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              >
                <MenuItem value="Bachelor of Technology">Bachelor of Technology</MenuItem>
                <MenuItem value="Master of Technology">Master of Technology</MenuItem>
                <MenuItem value="Master of Computer Applications">Master of Computer Applications</MenuItem>
                <MenuItem value="Bachelor and Master of Technology">Bachelor and Master of Technology</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="NITP Email"
              size="small"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Specialization (Optional)"
              size="small"
              fullWidth
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            />
            <TextField
              label="Enrollment Number (Optional)"
              size="small"
              fullWidth
              value={formData.enrollment_no}
              onChange={(e) => setFormData({ ...formData, enrollment_no: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormOpen(false)} disabled={formSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={formSubmitting}
            sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#5e0001' } }}
          >
            {formSubmitting ? 'Saving...' : 'Save Student'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningAmberIcon color="error" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent dividers>
          {deleteDialog.type === 'single' ? (
            <Typography>
              Are you sure you want to delete student <strong>{deleteDialog.student?.name}</strong> (Roll No: {deleteDialog.student?.roll_no})?
            </Typography>
          ) : deleteDialog.type === 'graduated' ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Permanent Hard Delete:</strong> This will permanently delete all students who have completed their academic term based on admission year and course duration.
              </Alert>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Graduation criteria evaluated:
              </Typography>
              <Box component="ul" sx={{ pl: 2.5, m: 0, fontSize: '0.85rem', color: 'text.secondary' }}>
                <li><strong>M.Tech & MCA:</strong> 2 Years duration</li>
                <li><strong>B.Tech (General):</strong> 4 Years duration</li>
                <li><strong>Architecture & Planning:</strong> 5 Years duration</li>
                <li><strong>MnC (Mathematics & Computing):</strong> 5 Years duration</li>
                <li><strong>CST (Chemical Science & Tech):</strong> 5 Years duration</li>
                <li><strong>Dual Degree (B.Tech + M.Tech):</strong> 5 Years duration</li>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                • Admission year is determined from roll number prefix (e.g. 21xxxxx = 2021).<br />
                • Ph.D scholars are excluded and will not be affected.
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose the scope of student records you want to delete. This cannot be undone:
              </Typography>
              <RadioGroup
                value={deleteDialog.batchScope || 'all_students'}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, batchScope: e.target.value })}
              >
                <FormControlLabel
                  value="graduated_students"
                  control={<Radio color="warning" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                        Delete Graduated Students Only (Hard Delete)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hard-deletes all students who have completed their academic term (M.Tech/MCA: 2 yrs, B.Tech: 4 yrs, Architecture/Dual Degree/MnC/CST: 5 yrs).
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start' }}
                />

                <FormControlLabel
                  value="all_students"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'error.main' }}>
                        Wipe All Records (Entire Database)
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Deletes all student records across all departments and programs (Total: {total} students).
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: 'flex-start' }}
                />

                {department && department !== 'All' && (
                  <FormControlLabel
                    value="dept_all"
                    control={<Radio color="error" />}
                    label={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Delete all records in {department}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deletes all courses and batches belonging strictly to this department.
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 1, alignItems: 'flex-start' }}
                  />
                )}

                {department && department !== 'All' && course && course !== 'All Courses' && (
                  <FormControlLabel
                    value="course_batch"
                    control={<Radio color="error" />}
                    label={
                      <Box sx={{ py: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Delete only: {department} — {course}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deletes only students enrolled in this specific course program.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                )}
              </RadioGroup>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={deleteDialog.type === 'graduated' || deleteDialog.batchScope === 'graduated_students' ? 'warning' : 'error'}
            onClick={handleDeleteSubmit}
            sx={{ fontWeight: 600 }}
          >
            {deleteDialog.type === 'graduated' || deleteDialog.batchScope === 'graduated_students' ? 'Yes, Hard Delete Graduated' : 'Yes, Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

