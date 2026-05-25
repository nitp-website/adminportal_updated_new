'use client'

import React, { useEffect, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { findClubForSession, normalizeClub, upsertClub } from './club-storage'

const emptyClubProfile = {
  title: '',
  about: '',
  description: '',
  patnaPiName: '',
  patnaPiEmail: '',
  patnaPiPhone: '',
  patnaPiDepartment: '',
  bihtaPiName: '',
  bihtaPiEmail: '',
  bihtaPiPhone: '',
  bihtaPiDepartment: '',
}

export default function ClubProfile() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const selectedClubEmail = searchParams.get('clubEmail')
  const [isEditing, setIsEditing] = useState(true)
  const [formData, setFormData] = useState(emptyClubProfile)
  const [pictures, setPictures] = useState([])
  const [logo, setLogo] = useState(null)
  const [clubId, setClubId] = useState(null)
  const [clubEmail, setClubEmail] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('Active')
  const [clubPresident, setClubPresident] = useState('')
  const [clubSecretary, setClubSecretary] = useState('')

  useEffect(() => {
    if (!session?.user) return

    const club = findClubForSession(session, selectedClubEmail)
    const assignedClubName = session.user.administration || ''
    const normalizedClub = normalizeClub(club || {
      club_name: assignedClubName || 'My Club',
      club_email: session.user.email || '',
      status: 'Active',
    })

    setClubId(normalizedClub.id)
    setClubEmail(normalizedClub.club_email)
    setCategory(normalizedClub.category)
    setStatus(normalizedClub.status)
    setClubPresident(normalizedClub.club_president)
    setClubSecretary(normalizedClub.club_secretary)
    setFormData({
      title: normalizedClub.title,
      about: normalizedClub.about,
      description: normalizedClub.description,
      patnaPiName: normalizedClub.patnaPiName || normalizedClub.club_pi || '',
      patnaPiEmail: normalizedClub.patnaPiEmail || '',
      patnaPiPhone: normalizedClub.patnaPiPhone || '',
      patnaPiDepartment: normalizedClub.patnaPiDepartment || '',
      bihtaPiName: normalizedClub.bihtaPiName || '',
      bihtaPiEmail: normalizedClub.bihtaPiEmail || '',
      bihtaPiPhone: normalizedClub.bihtaPiPhone || '',
      bihtaPiDepartment: normalizedClub.bihtaPiDepartment || '',
    })
    setIsEditing(!club)
  }, [session, selectedClubEmail])

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }))
  }

  const handlePictureChange = (event) => {
    const files = Array.from(event.target.files || [])
    const nextPictures = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))

    setPictures((prev) => [...prev, ...nextPictures])
    event.target.value = ''
  }

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (logo?.url) {
      URL.revokeObjectURL(logo.url)
    }

    setLogo({
      name: file.name,
      url: URL.createObjectURL(file),
    })
    event.target.value = ''
  }

  const handleRemoveLogo = () => {
    if (logo?.url) {
      URL.revokeObjectURL(logo.url)
    }
    setLogo(null)
  }

  const handleRemovePicture = (pictureId) => {
    setPictures((prev) => {
      const picture = prev.find((item) => item.id === pictureId)
      if (picture?.url) {
        URL.revokeObjectURL(picture.url)
      }
      return prev.filter((item) => item.id !== pictureId)
    })
  }

  const handleSave = () => {
    const savedClub = normalizeClub({
      id: clubId,
      club_name: formData.title,
      title: formData.title,
      club_email: clubEmail || session?.user?.email || '',
      category,
      status,
      club_pi: formData.patnaPiName,
      club_president: clubPresident,
      club_secretary: clubSecretary,
      about: formData.about,
      description: formData.description,
      patnaPiName: formData.patnaPiName,
      patnaPiEmail: formData.patnaPiEmail,
      patnaPiPhone: formData.patnaPiPhone,
      patnaPiDepartment: formData.patnaPiDepartment,
      bihtaPiName: formData.bihtaPiName,
      bihtaPiEmail: formData.bihtaPiEmail,
      bihtaPiPhone: formData.bihtaPiPhone,
      bihtaPiDepartment: formData.bihtaPiDepartment,
    })

    upsertClub(savedClub)
    setClubId(savedClub.id)
    setIsEditing(false)
  }

  const renderPiFields = (campus, prefix) => (
    <Box
      sx={{
        p: 2,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 600 }}>
        {campus} Campus PI
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Professor In Charge"
            value={formData[`${prefix}PiName`]}
            onChange={handleChange(`${prefix}PiName`)}
            disabled={!isEditing}
            placeholder="Enter PI name..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData[`${prefix}PiEmail`]}
            onChange={handleChange(`${prefix}PiEmail`)}
            disabled={!isEditing}
            placeholder="Enter PI email..."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={formData[`${prefix}PiPhone`]}
            onChange={handleChange(`${prefix}PiPhone`)}
            disabled={!isEditing}
            placeholder="Enter phone..."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Department"
            value={formData[`${prefix}PiDepartment`]}
            onChange={handleChange(`${prefix}PiDepartment`)}
            disabled={!isEditing}
            placeholder="Enter department..."
          />
        </Grid>
      </Grid>
    </Box>
  )

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3, alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Club Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 760 }}>
            Manage the club title, logo, pictures, description, and professor in charge details for both campuses.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#6a0001' }, flexShrink: 0 }}
        >
          {isEditing ? 'Save Changes' : 'Edit Details'}
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Club Identity
        </Typography>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box
                sx={{
                  width: 150,
                  height: 150,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {logo?.url ? (
                  <Box
                    component="img"
                    src={logo.url}
                    alt={formData.title || 'Club logo'}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      p: 1,
                    }}
                  />
                ) : (
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: '#830001',
                      fontSize: '3rem',
                      borderRadius: 0,
                    }}
                  >
                    {(formData.title || 'C').charAt(0).toUpperCase()}
                  </Avatar>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: logo && isEditing ? '1fr auto' : '1fr', gap: 1, width: '100%', maxWidth: 220 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<AddPhotoAlternateIcon />}
                  disabled={!isEditing}
                  sx={{
                    height: 40,
                    color: '#830001',
                    borderColor: '#830001',
                    '&:hover': { borderColor: '#830001', backgroundColor: 'rgba(131, 0, 1, 0.06)' },
                  }}
                  fullWidth
                >
                  {logo ? 'Change Logo' : 'Add Logo'}
                  <input hidden accept="image/*" type="file" onChange={handleLogoChange} />
                </Button>
                {isEditing && logo && (
                  <IconButton
                    color="error"
                    onClick={handleRemoveLogo}
                    sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Club Title"
                  value={formData.title}
                  onChange={handleChange('title')}
                  disabled={!isEditing}
                  placeholder="Enter club title..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Club Email"
                  type="email"
                  value={clubEmail}
                  onChange={(event) => setClubEmail(event.target.value)}
                  disabled={!isEditing || session?.user?.role === 'CLUB_ADMIN'}
                  placeholder="Enter club email..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="About Club"
                  value={formData.about}
                  onChange={handleChange('about')}
                  disabled={!isEditing}
                  placeholder="Write a short about section..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  label="Club Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  disabled={!isEditing}
                  placeholder="Write the full club description..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club President"
                  value={clubPresident}
                  onChange={(event) => setClubPresident(event.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter club president..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Club Secretary"
                  value={clubSecretary}
                  onChange={(event) => setClubSecretary(event.target.value)}
                  disabled={!isEditing}
                  placeholder="Enter club secretary..."
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Club Banners</Typography>
            <Typography variant="body2" color="text.secondary">
              Add wide banner images for the club page header and major highlights.
            </Typography>
          </Box>
          <Button
            component="label"
            variant="outlined"
            startIcon={<AddPhotoAlternateIcon />}
            disabled={!isEditing}
            sx={{
              color: '#830001',
              borderColor: '#830001',
              '&:hover': { borderColor: '#830001', backgroundColor: 'rgba(131, 0, 1, 0.06)' },
            }}
          >
            Add Banner
            <input hidden multiple accept="image/*" type="file" onChange={handlePictureChange} />
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {pictures.length > 0 ? (
            pictures.map((picture) => (
              <Grid item xs={12} key={picture.id}>
                <Box
                  sx={{
                    overflow: 'hidden',
                    position: 'relative',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: '#f8f9fa',
                  }}
                >
                  <Box
                    component="img"
                    src={picture.url}
                    alt={picture.name}
                    sx={{
                      width: '100%',
                      height: { xs: 160, sm: 220, md: 260 },
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      p: 1.5,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))',
                      color: 'white',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {picture.name}
                    </Typography>
                  </Box>
                  {isEditing && (
                    <IconButton
                      color="error"
                      onClick={() => handleRemovePicture(picture.id)}
                      sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'white' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 1, textAlign: 'center' }}>
                <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: '#830001' }}>
                  <AddPhotoAlternateIcon />
                </Avatar>
                <Typography color="text.secondary">No club banners added yet</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Professor In Charge Details
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {renderPiFields('Patna', 'patna')}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderPiFields('Bihta', 'bihta')}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
