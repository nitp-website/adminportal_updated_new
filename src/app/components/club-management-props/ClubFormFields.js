'use client'

import { TextField, MenuItem, Grid, Typography, Divider, Box } from '@mui/material'
import { CLUB_CATEGORIES, CLUB_STATUSES } from '@/lib/clubConstants'

function CampusPiFields({ label, value, onChange }) {
  const pi = value || { name: '', email: '', phone: '', department: '' }
  const handle = (field) => (e) => onChange({ ...pi, [field]: e.target.value })

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: '#830001', fontWeight: 600 }}>
        {label}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Professor In Charge"
            fullWidth
            size="small"
            value={pi.name}
            onChange={handle('name')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Email" fullWidth size="small" value={pi.email} onChange={handle('email')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Phone" fullWidth size="small" value={pi.phone} onChange={handle('phone')} />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Department"
            fullWidth
            size="small"
            value={pi.department}
            onChange={handle('department')}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export function ClubFormFields({ formData, onChange, showExtended = false, superAdminAdd = false }) {
  const handle = (field) => (e) => onChange({ ...formData, [field]: e.target.value })

  const categories = CLUB_CATEGORIES

  if (superAdminAdd) {
    return (
      <>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#830001', mb: 1 }}>
          Club Information
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12}>
            <TextField label="Club Name" required fullWidth value={formData.name} onChange={handle('name')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Club Email"
              required
              fullWidth
              type="email"
              value={formData.email}
              onChange={handle('email')}
              helperText="Do not use an email registered for another role (e.g., Faculty)."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select label="Category" required fullWidth value={formData.category} onChange={handle('category')}>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </>
    )
  }

  return (
    <>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#830001', mb: 1 }}>
        Club Information
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Club Login ID"
            required
            fullWidth
            value={formData.club_login_id || ''}
            onChange={handle('club_login_id')}
            helperText="Unique id for this club admin login (e.g. coding-club). Auto-generated if empty."
            placeholder="coding-club"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Club Name" required fullWidth value={formData.name} onChange={handle('name')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Club Email"
            required
            fullWidth
            type="email"
            value={formData.email}
            onChange={handle('email')}
            helperText="Do not use an email registered for another role (e.g., Faculty)."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField select label="Category" required fullWidth value={formData.category} onChange={handle('category')}>
            {CLUB_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField select label="Status" required fullWidth value={formData.status} onChange={handle('status')}>
            {CLUB_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#830001', mb: 1 }}>
        Coordinator Details
      </Typography>
      <Grid container spacing={2}>
        {!showExtended && (
          <Grid item xs={12} sm={4}>
            <TextField
              label="Club PI"
              fullWidth
              value={formData.patna_campus_pi?.name || ''}
              onChange={(e) =>
                onChange({
                  ...formData,
                  patna_campus_pi: { ...(formData.patna_campus_pi || {}), name: e.target.value },
                })
              }
            />
          </Grid>
        )}
        <Grid item xs={12} sm={4}>
          <TextField
            label="Club President"
            fullWidth
            value={formData.club_president}
            onChange={handle('club_president')}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Club Secretary"
            fullWidth
            value={formData.club_secretary}
            onChange={handle('club_secretary')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            value={formData.description || ''}
            onChange={handle('description')}
          />
        </Grid>
      </Grid>

      {showExtended && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#830001', mb: 1 }}>
            Campus PI Details
          </Typography>
          <CampusPiFields
            label="Patna Campus PI"
            value={formData.patna_campus_pi}
            onChange={(val) => onChange({ ...formData, patna_campus_pi: val })}
          />
          <CampusPiFields
            label="Bihta Campus PI"
            value={formData.bihta_campus_pi}
            onChange={(val) => onChange({ ...formData, bihta_campus_pi: val })}
          />
          <TextField
            label="Logo URL"
            fullWidth
            sx={{ mb: 2 }}
            value={formData.logo || ''}
            onChange={handle('logo')}
          />
          <TextField
            label="About"
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2 }}
            value={formData.about || ''}
            onChange={handle('about')}
          />
          <TextField
            label="Picture URLs (one per line)"
            fullWidth
            multiline
            minRows={3}
            value={formData.picturesInput || ''}
            onChange={(e) => onChange({ ...formData, picturesInput: e.target.value })}
          />
        </>
      )}
    </>
  )
}
