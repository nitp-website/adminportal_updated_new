'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Box,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { StaffdepList, officerDesignations } from '@/lib/const'
import Toast from '@/app/components/common/Toast'


const emptyForm = {
  // user table fields
  name: '',
  email: '',
  gender: '',
  category: '',

  // staff table fields
  employee_code: '',
  date_of_joining: '',
  date_of_birth : '',
  cadre: '',
  department: '',
  designation: '',
  pay_level : '',
}

const PAY_LEVEL_OPTIONS = Array.from({ length: 14 }, (_, i) => `Level-${i + 1}`)

export function AddStaff({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [toast, setToast] = useState({
    open: false,
    severity: 'success',
    message: '',
  })
  const [dynamicDesignations, setDynamicDesignations] = useState(officerDesignations)

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const response = await fetch('/api/designation-priority')
        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            const orderedDesignations = data
              .sort((a, b) => a.priority_order - b.priority_order)
              .map((item) => item.designation)
            setDynamicDesignations(orderedDesignations)
          }
        }
      } catch (error) {
        console.error('Error fetching designation priorities:', error)
      }
    }

    fetchDesignations()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/staff2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          gender: formData.gender || null,
          category: formData.category || null,
          employee_code: formData.employee_code,
          date_of_joining: formData.date_of_joining,
          date_of_birth : formData.date_of_birth || null,
          cadre: formData.cadre,
          department: formData.department,
          designation: formData.designation,
          pay_level : formData.pay_level
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || 'Failed to add staff')
      }

      const newStaff = await res.json()
      onSuccess(newStaff)
      setFormData(emptyForm)
      setToast({
        open: true,
        severity: 'success',
        message: 'Staff added successfully!',
      })
      window.location.reload()
    } catch (error) {
      console.error('Error adding staff:', error)
      setToast({
        open: true,
        severity: 'error',
        message: error.message || 'Failed to add staff',
      })
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            backgroundColor: '#830001',
            color: 'white',
            fontWeight: 600,
            fontSize: '1.25rem',
            position: 'sticky',
            top: 0,
            zIndex: 1300,
          }}
        >
          Add New Staff
        </DialogTitle>
        <DialogContent
          sx={{
            mt: 2,
            maxHeight: '70vh',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Basic user info */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
              Basic Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  variant="outlined"
                  placeholder="Enter full name..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  variant="outlined"
                  placeholder="Enter email address..."
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                  variant="outlined"
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  variant="outlined"
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="GEN">General</MenuItem>
                  <MenuItem value="OBC">OBC</MenuItem>
                  <MenuItem value="SC">SC</MenuItem>
                  <MenuItem value="ST">ST</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          {/* Employment details */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
              Employment Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Employee Code"
                  required
                  value={formData.employee_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, employee_code: e.target.value }))}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Joining"
                  required
                  value={formData.date_of_joining}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_of_joining: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Department"
                  required
                  value={(formData.department)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                  variant="outlined"
                >
                  {[...StaffdepList].map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                  {/* <MenuItem value="developer">Developer</MenuItem> */}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                {formData.department === 'Officers' ? (
                  <TextField
                    fullWidth
                    select
                    label="Designation"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                    variant="outlined"
                  >
                    {dynamicDesignations.map((designation) => (
                      <MenuItem key={designation} value={designation}>
                        {designation}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    select
                    label="Designation"
                    value={formData.designation || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                    variant="outlined"
                  >
                    <MenuItem value="Technical Assistant">Technical Assistant</MenuItem>
                    <MenuItem value="Technical Assistant (SG-I)">Technical Assistant (SG-I)</MenuItem>
                    <MenuItem value="Technical Assistant (SG-II)">Technical Assistant (SG-II)</MenuItem>
                    <MenuItem value="Sr Technical Assistant">Sr Technical Assistant</MenuItem>
                    <MenuItem value="Technician">Technician</MenuItem>
                    <MenuItem value="Technician (SG-I)">Technician (SG-I)</MenuItem>
                    <MenuItem value="Technician (SG-II)">Technician (SG-II)</MenuItem>
                    <MenuItem value="Sr Technician">Sr Technician</MenuItem>
                    <MenuItem value="Assistant Technician">Assistant Technician</MenuItem>
                    <MenuItem value="Jr Engineer">Jr Engineer</MenuItem>
                    <MenuItem value="Assistant Engineer">Assistant Engineer</MenuItem>
                    <MenuItem value="Assistant Engineer (SG-I)">Assistant Engineer (SG-I)</MenuItem>
                    <MenuItem value="Assistant Engineer (SG-II)">Assistant Engineer (SG-II)</MenuItem>
                    <MenuItem value="Office Attendant">Office Attendant</MenuItem>
                    <MenuItem value="Sr Office Attendant">Sr Office Attendant</MenuItem>
                    <MenuItem value="Jr Office Attendant">Jr Office Attendant</MenuItem>
                    <MenuItem value="Superintendent">Superintendent</MenuItem>
                    <MenuItem value="Superintendent (SG-I)">Superintendent (SG-I)</MenuItem>
                    <MenuItem value="Superintendent (SG-II)">Superintendent (SG-II)</MenuItem>
                    <MenuItem value="Jr Assistant Superintendent">Jr Assistant Superintendent</MenuItem>
                    <MenuItem value="Senior Assistant">Senior Assistant</MenuItem>
                  </TextField>
                )}
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Cadre"
                  value={formData.cadre || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cadre: e.target.value }))}
                  variant="outlined"
                >
                    <MenuItem value="Technical Higher" >Technical Higher</MenuItem>
                    <MenuItem value="Technical Lower">Technical Lower</MenuItem>
                    <MenuItem value="Supporting Staff">Supporting Staff</MenuItem>
                    <MenuItem value="Ministerial Higher">Ministerial Higher</MenuItem>
                    <MenuItem value="Ministerial Lower">Ministerial Lower</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Pay Level"
                  value={formData.pay_level || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pay_level: e.target.value }))}
                  variant="outlined"
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {PAY_LEVEL_OPTIONS.map((level) => (
                    <MenuItem key={level} value={level}>{level}</MenuItem>
                  ))}
                </TextField>
            </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', position: 'sticky', bottom: 0, zIndex: 1300 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              color: '#830001',
              borderColor: '#830001',
              '&:hover': {
                backgroundColor: '#830001',
                color: 'white',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              backgroundColor: '#830001',
              color: 'white',
              minWidth: 120,
              '&:hover': {
                backgroundColor: '#6a0001',
              },
            }}
          >
            {loading ? 'Adding...' : 'Add Staff'}
          </Button>
        </DialogActions>
      </form>
      <Toast
        open={toast.open}
        severity={toast.severity}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Dialog>
  )
}