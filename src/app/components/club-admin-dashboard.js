'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  MenuItem,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import axios from 'axios'
import { CLUB_CATEGORIES } from '@/lib/clubConstants'
import Toast from '@/app/components/common/Toast'

const createEmptySession = () => ({
  patna: {
    pi: { name: '', email: '', department: '', contact: '', avatar: '' },
    president: { name: '', email: '', department: '', contact: '', avatar: '' },
    vice_president: { name: '', email: '', department: '', contact: '', avatar: '' },
    secretary: { name: '', email: '', department: '', contact: '', avatar: '' },
    joint_secretary_1: { name: '', email: '', department: '', contact: '', avatar: '' },
    joint_secretary_2: { name: '', email: '', department: '', contact: '', avatar: '' },
    coordinator_1: { name: '', email: '', department: '', contact: '', avatar: '' },
    coordinator_2: { name: '', email: '', department: '', contact: '', avatar: '' },
  },
  bihta: {
    pi: { name: '', email: '', department: '', contact: '', avatar: '' },
    president: { name: '', email: '', department: '', contact: '', avatar: '' },
    vice_president: { name: '', email: '', department: '', contact: '', avatar: '' },
    secretary: { name: '', email: '', department: '', contact: '', avatar: '' },
    joint_secretary_1: { name: '', email: '', department: '', contact: '', avatar: '' },
    joint_secretary_2: { name: '', email: '', department: '', contact: '', avatar: '' },
    coordinator_1: { name: '', email: '', department: '', contact: '', avatar: '' },
    coordinator_2: { name: '', email: '', department: '', contact: '', avatar: '' },
  }
})

function MemberEditCard({ title, value, onChange, onAvatarUpload, uploading, showContact = false, setToast }) {
  const m = value || { name: '', email: '', department: '', contact: '', avatar: '' }
  const fileInputRef = useRef(null)
  const [fetching, setFetching] = useState(false)

  const handle = (field) => (e) => onChange({ ...m, [field]: e.target.value })

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar src={m.avatar || undefined} sx={{ width: 56, height: 56, bgcolor: '#1e293b' }}>
          {m.name ? m.name.charAt(0).toUpperCase() : '?'}
        </Avatar>
        <Box>
          <input
            type="file"
            accept="image/*"
            hidden
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onAvatarUpload(file)
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            sx={{
              borderColor: '#475569',
              color: '#475569',
              '&:hover': { borderColor: '#1e293b', bgcolor: 'rgba(71,85,105,0.04)' },
            }}
          >
            {uploading ? <CircularProgress size={16} /> : 'Upload Profile Pic'}
          </Button>
        </Box>
      </Box>
      <TextField
        label="Name"
        fullWidth
        size="small"
        sx={{ mb: 1.5 }}
        value={m.name || ''}
        onChange={handle('name')}
      />
      {title?.toLowerCase().includes('pi') ? (
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
          <TextField
            label="Email"
            fullWidth
            size="small"
            value={m.email || ''}
            onChange={handle('email')}
          />
          <Button
            variant="contained"
            size="small"
            disabled={fetching}
            onClick={async () => {
              const email = m.email?.trim()
              if (!email) {
                if (setToast) setToast({ open: true, severity: 'warning', message: 'Please enter the PI\'s email first.' })
                return
              }
              setFetching(true)
              try {
                const res = await fetch(`/api/faculty?type=${encodeURIComponent(email)}`)
                if (!res.ok) {
                  if (setToast) setToast({ open: true, severity: 'error', message: 'Faculty member not found. Enter details manually.' })
                  return
                }
                const data = await res.json()
                if (data && data.profile) {
                  onChange({
                    ...m,
                    name: data.profile.name || m.name,
                    department: data.profile.department || m.department,
                    contact: data.profile.ext_no || m.contact,
                    avatar: data.profile.image || m.avatar
                  })
                  if (setToast) setToast({ open: true, severity: 'success', message: 'Faculty details loaded successfully!' })
                } else {
                  if (setToast) setToast({ open: true, severity: 'error', message: 'Faculty profile details not found.' })
                }
              } catch (err) {
                console.error('Fetch PI error:', err)
                if (setToast) setToast({ open: true, severity: 'error', message: 'Error fetching faculty details.' })
              } finally {
                setFetching(false)
              }
            }}
            sx={{
              whiteSpace: 'nowrap',
              height: 40,
              backgroundColor: '#1e293b',
              '&:hover': { backgroundColor: '#334155' }
            }}
          >
            {fetching ? <CircularProgress size={16} color="inherit" /> : 'Fetch Info'}
          </Button>
        </Box>
      ) : (
        <TextField
          label="Email"
          fullWidth
          size="small"
          sx={{ mb: 1.5 }}
          value={m.email || ''}
          onChange={handle('email')}
        />
      )}
      {showContact && (
        <TextField
          label="Contact Number"
          fullWidth
          size="small"
          sx={{ mb: 1.5 }}
          value={m.contact || ''}
          onChange={handle('contact')}
        />
      )}
      <TextField
        select
        label="Department"
        fullWidth
        size="small"
        sx={{ mb: 1.5 }}
        SelectProps={{ native: true }}
        value={m.department || ''}
        onChange={handle('department')}
      >
        <option value="">Select Department</option>
        {[
          'Computer Science and Engineering',
          'Electronics and Communication Engineering',
          'Electrical Engineering',
          'Mechatronics and Automation Engineering',
          'Chemical Science and Technology',
          'Civil Engineering',
          'Mathematics and Computing Technology',
          'Mechanical Engineering'
        ].map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </TextField>
      <TextField
        label="Profile Pic URL (Optional)"
        fullWidth
        size="small"
        value={m.avatar || ''}
        onChange={handle('avatar')}
      />
    </Paper>
  )
}

export function ClubAdminDashboard({ onClose }) {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState(0)
  const [campusTab, setCampusTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [uploadingAvatars, setUploadingAvatars] = useState({})

  const [form, setForm] = useState({
    club_login_id: '',
    name: '',
    category: '',
    about: '',
    logo: '',
    pictures: [],
    tagline: '',
    established_year: '',
    active_members: '',
    events_organized: '',
    message_from_pi: '',
    social_links: {
      website: '',
      linkedin: '',
      instagram: '',
      twitter: '',
      youtube: '',
      facebook: '',
    },
    members: {},
  })

  const [selectedSessionKey, setSelectedSessionKey] = useState('')
  const [newSessionName, setNewSessionName] = useState('')
  const [toast, setToast] = useState({ open: false, severity: 'success', message: '' })
  const logoInputRef = useRef(null)
  const picturesInputRef = useRef(null)

  // Events Management States
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState({
    id: '',
    title: '',
    poster: '',
    description: '',
    category: 'Competition',
    usually_held: 'July',
    duration: '',
    venue: '',
    gallery: [],
    attachments: []
  })

  const fetchClub = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/club')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load club')
      setForm({
        club_login_id: data.club_login_id || session?.user?.clubLoginId || '',
        name: data.name || '',
        category: data.category || '',
        about: data.about || '',
        logo: data.logo || '',
        pictures: Array.isArray(data.pictures) ? data.pictures : [],
        tagline: data.tagline || '',
        established_year: data.established_year || '',
        active_members: data.active_members || '',
        events_organized: data.events_organized || '',
        message_from_pi: data.message_from_pi || '',
        social_links: data.social_links || { website: '', linkedin: '', instagram: '', twitter: '', youtube: '', facebook: '' },
        members: data.members || {},
      })
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch('/api/club/event')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch events')
      setEvents(data.data || [])
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message })
    } finally {
      setLoadingEvents(false)
    }
  }

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      setToast({ open: true, severity: 'error', message: 'Event title is required' })
      return
    }
    const finalForm = {
      ...eventForm,
      id: editingEvent ? eventForm.id : `${slugify(eventForm.title)}-${Math.floor(1000 + Math.random() * 9000)}`
    }
    try {
      const url = '/api/club/event'
      const method = editingEvent ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save event')
      setToast({ open: true, severity: 'success', message: 'Event saved successfully' })
      setEventModalOpen(false)
      fetchEvents()
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message })
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      const res = await fetch(`/api/club/event?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete event')
      setToast({ open: true, severity: 'success', message: 'Event deleted successfully' })
      fetchEvents()
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message })
    }
  }

  useEffect(() => {
    fetchClub()
  }, [])

  useEffect(() => {
    if (activeTab === 4) {
      fetchEvents()
    }
  }, [activeTab])

  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', 'general')
    const res = await axios.post('/api/upload', formData)
    return res.data.url
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const url = await uploadFile(file)
      setForm((prev) => ({ ...prev, logo: url }))
    } catch {
      setToast({ open: true, severity: 'error', message: 'Logo upload failed' })
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handlePictureUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingPicture(true)
    try {
      const urls = await Promise.all(files.map(uploadFile))
      setForm((prev) => ({ ...prev, pictures: [...prev.pictures, ...urls] }))
    } catch {
      setToast({ open: true, severity: 'error', message: 'Picture upload failed' })
    } finally {
      setUploadingPicture(false)
      e.target.value = ''
    }
  }

  const removePicture = (index) => {
    setForm((prev) => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }))
  }

  const handleAvatarUpload = async (campus, role, file) => {
    const key = `${campus}_${role}`
    setUploadingAvatars((prev) => ({ ...prev, [key]: true }))
    try {
      const url = await uploadFile(file)
      setForm((prev) => {
        const sessionData = prev.members[selectedSessionKey] || createEmptySession()
        const campusData = sessionData[campus] || createEmptySession()[campus]
        const updatedRoleData = { ...campusData[role], avatar: url }
        return {
          ...prev,
          members: {
            ...prev.members,
            [selectedSessionKey]: {
              ...sessionData,
              [campus]: {
                ...campusData,
                [role]: updatedRoleData,
              }
            },
          },
        }
      })
      setToast({ open: true, severity: 'success', message: 'Avatar uploaded' })
    } catch {
      setToast({ open: true, severity: 'error', message: 'Avatar upload failed' })
    } finally {
      setUploadingAvatars((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setToast({ open: true, severity: 'error', message: 'Club title is required' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/club', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setToast({ open: true, severity: 'success', message: 'Changes saved successfully' })
      if (data.club) {
        setForm({
          club_login_id: data.club.club_login_id || session?.user?.clubLoginId || '',
          name: data.club.name || '',
          category: data.club.category || '',
          about: data.club.about || '',
          logo: data.club.logo || '',
          pictures: data.club.pictures || [],
          tagline: data.club.tagline || '',
          established_year: data.club.established_year || '',
          active_members: data.club.active_members || '',
          events_organized: data.club.events_organized || '',
          message_from_pi: data.club.message_from_pi || '',
          social_links: data.club.social_links || { website: '', linkedin: '', instagram: '', twitter: '', youtube: '', facebook: '' },
          members: data.club.members || {},
        })
      }
    } catch (err) {
      setToast({ open: true, severity: 'error', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleAddSession = () => {
    const trimmed = newSessionName.trim()
    if (!trimmed) return
    if (form.members[trimmed]) {
      setToast({ open: true, severity: 'warning', message: 'Session already exists' })
      return
    }
    setForm((prev) => ({
      ...prev,
      members: {
        ...prev.members,
        [trimmed]: createEmptySession(),
      },
    }))
    setSelectedSessionKey(trimmed)
    setNewSessionName('')
  }

  const handleDeleteSession = (key) => {
    setForm((prev) => {
      const copy = { ...prev.members }
      delete copy[key]
      return { ...prev, members: copy }
    })
    if (selectedSessionKey === key) {
      setSelectedSessionKey('')
    }
  }

  const updateSessionMember = (campus, role, val) => {
    setForm((prev) => {
      const sessionData = prev.members[selectedSessionKey] || createEmptySession()
      const campusData = sessionData[campus] || createEmptySession()[campus]
      return {
        ...prev,
        members: {
          ...prev.members,
          [selectedSessionKey]: {
            ...sessionData,
            [campus]: {
              ...campusData,
              [role]: val,
            },
          },
        },
      }
    })
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#1e293b' }} />
      </Box>
    )
  }

  const logoInitial = form.name?.charAt(0)?.toUpperCase() || 'C'
  const sessionKeys = Object.keys(form.members).sort().reverse()

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Club Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Fill and update your club details, tagline, social links, gallery, and academic sessions.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {onClose && (
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ borderColor: '#475569', color: '#475569', '&:hover': { borderColor: '#1e293b', bgcolor: 'rgba(71,85,105,0.04)' } }}
            >
              Back to Profile
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={async () => {
              await handleSave()
            }}
            disabled={saving}
            sx={{ backgroundColor: '#1e293b', '&:hover': { backgroundColor: '#334155' } }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { backgroundColor: '#1e293b' },
          '& .MuiTab-root.Mui-selected': { color: '#1e293b' },
        }}
      >
        <Tab label="Club Information" />
        <Tab label="Gallery & PI Message" />
        <Tab label="Social Links" />
        <Tab label="Academic Sessions & Members" />
        <Tab label="Club Events" />
      </Tabs>

      {/* Tab 1: Club Information */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Avatar
                src={form.logo || undefined}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: '#830001', fontSize: '2.5rem' }}
              >
                {!form.logo && logoInitial}
              </Avatar>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              <Button
                variant="outlined"
                size="small"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                sx={{ borderColor: '#830001', color: '#830001', '&:hover': { borderColor: '#9a0000' } }}
              >
                Upload Logo
              </Button>
            </Grid>
            <Grid item xs={12} md={9}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Club Title"
                    required
                    fullWidth
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Club Category"
                    required
                    fullWidth
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CLUB_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Club Tagline"
                    fullWidth
                    value={form.tagline}
                    placeholder="e.g. Code, Compile, Conquer"
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Established Year"
                    fullWidth
                    select
                    SelectProps={{ native: true }}
                    value={form.established_year}
                    onChange={(e) => setForm({ ...form, established_year: e.target.value })}
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: new Date().getFullYear() - 1950 + 1 }, (_, i) => {
                      const yr = new Date().getFullYear() - i;
                      return <option key={yr} value={yr}>{yr}</option>;
                    })}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Active Members Count"
                    fullWidth
                    type="number"
                    value={form.active_members}
                    onChange={(e) => setForm({ ...form, active_members: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Events Organized Count"
                    fullWidth
                    type="number"
                    value={form.events_organized}
                    onChange={(e) => setForm({ ...form, events_organized: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="About Club"
                    fullWidth
                    multiline
                    minRows={6}
                    value={form.about}
                    onChange={(e) => setForm({ ...form, about: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 2: Gallery & PI Message */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 4 }}>
            <TextField
              label="Message From Professor-In-Charge"
              fullWidth
              multiline
              minRows={4}
              value={form.message_from_pi}
              placeholder="Write a message representing the values, goals, and invitation of the club PI..."
              onChange={(e) => setForm({ ...form, message_from_pi: e.target.value })}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Club Gallery Pictures
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload image assets that showcase workshops, contests, and achievements.
              </Typography>
            </Box>
            <input ref={picturesInputRef} type="file" accept="image/*" multiple hidden onChange={handlePictureUpload} />
            <Button
              variant="outlined"
              startIcon={uploadingPicture ? <CircularProgress size={16} /> : <AddPhotoAlternateIcon />}
              onClick={() => picturesInputRef.current?.click()}
              disabled={uploadingPicture}
              sx={{ borderColor: '#475569', color: '#475569', '&:hover': { borderColor: '#1e293b', bgcolor: 'rgba(71,85,105,0.04)' } }}
            >
              Add Pictures
            </Button>
          </Box>

          {form.pictures.length === 0 ? (
            <Alert severity="info">
              No gallery pictures added yet. Use &quot;Add Pictures&quot; to upload images.
            </Alert>
          ) : (
            <ImageList cols={4} rowHeight={140} sx={{ gap: 8 }}>
              {form.pictures.map((url, index) => (
                <ImageListItem key={`${url}-${index}`}>
                  <img src={url} alt={`Club ${index + 1}`} loading="lazy" style={{ objectFit: 'cover', height: 140 }} />
                  <ImageListItemBar
                    actionIcon={
                      <IconButton sx={{ color: 'white' }} onClick={() => removePicture(index)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </Box>
      )}

      {/* Tab 3: Social Links */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
            Social Links
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Website URL"
                fullWidth
                value={form.social_links?.website || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, website: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="LinkedIn Company URL"
                fullWidth
                value={form.social_links?.linkedin || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, linkedin: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Instagram Account URL"
                fullWidth
                value={form.social_links?.instagram || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, instagram: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Twitter Account URL"
                fullWidth
                value={form.social_links?.twitter || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, twitter: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="YouTube Channel URL"
                fullWidth
                value={form.social_links?.youtube || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, youtube: e.target.value } })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Facebook Page URL"
                fullWidth
                value={form.social_links?.facebook || ''}
                onChange={(e) =>
                  setForm({ ...form, social_links: { ...form.social_links, facebook: e.target.value } })
                }
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 4: Academic Sessions & Members */}
      {activeTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField
              select
              label="New Academic Session"
              size="small"
              sx={{ minWidth: 220 }}
              SelectProps={{ native: true }}
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
            >
              <option value="">Select Session</option>
              {Array.from({ length: 11 }, (_, i) => {
                const currentYear = new Date().getFullYear();
                const start = currentYear - 5 + i;
                const end = (start + 1) % 100;
                const endStr = end < 10 ? `0${end}` : `${end}`;
                const val = `${start}-${endStr}`;
                return <option key={val} value={val}>{val}</option>;
              })}
            </TextField>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddSession}
              sx={{ backgroundColor: '#1e293b', '&:hover': { backgroundColor: '#334155' } }}
            >
              Add Session
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#1e293b' }}>
                Academic Years
              </Typography>
              {sessionKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No sessions created yet. Add a session above.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {sessionKeys.map((key) => (
                    <Box
                      key={key}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: selectedSessionKey === key ? 'rgba(30,41,59,0.08)' : 'transparent',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: selectedSessionKey === key ? '#1e293b' : 'divider',
                      }}
                      onClick={() => setSelectedSessionKey(key)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: selectedSessionKey === key ? 600 : 400 }}>
                        {key}
                      </Typography>
                      <IconButton size="small" color="error" onClick={() => handleDeleteSession(key)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={9}>
              {selectedSessionKey ? (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Members details for Session {selectedSessionKey}
                  </Typography>

                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                      <Tabs value={campusTab} onChange={(e, newValue) => setCampusTab(newValue)} aria-label="campus bearer tabs">
                        <Tab label="Patna Campus Office Bearers" />
                        <Tab label="Bihta Campus Office Bearers" />
                      </Tabs>
                    </Box>

                    {/* Patna Campus Tab */}
                    {campusTab === 0 && (
                      <Grid container spacing={3}>
                        {[
                          { key: 'pi', title: 'Patna Campus PI', showContact: true },
                          { key: 'president', title: 'President', showContact: true },
                          { key: 'vice_president', title: 'Vice-President', showContact: true },
                          { key: 'secretary', title: 'Secretary', showContact: true },
                          { key: 'joint_secretary_1', title: 'Joint-Secretary 1', showContact: true },
                          { key: 'joint_secretary_2', title: 'Joint-Secretary 2', showContact: true },
                          { key: 'coordinator_1', title: 'Coordinator 1', showContact: true },
                          { key: 'coordinator_2', title: 'Coordinator 2', showContact: true },
                        ].map((role) => (
                          <Grid item xs={12} sm={6} key={role.key}>
                            <MemberEditCard
                              title={role.title}
                              value={form.members[selectedSessionKey]?.patna?.[role.key]}
                              onChange={(val) => updateSessionMember('patna', role.key, val)}
                              uploading={uploadingAvatars[`patna_${role.key}`]}
                              onAvatarUpload={(file) => handleAvatarUpload('patna', role.key, file)}
                              showContact={role.showContact}
                              setToast={setToast}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    )}

                    {/* Bihta Campus Tab */}
                    {campusTab === 1 && (
                      <Grid container spacing={3}>
                        {[
                          { key: 'pi', title: 'Bihta Campus PI', showContact: true },
                          { key: 'president', title: 'President', showContact: true },
                          { key: 'vice_president', title: 'Vice-President', showContact: true },
                          { key: 'secretary', title: 'Secretary', showContact: true },
                          { key: 'joint_secretary_1', title: 'Joint-Secretary 1', showContact: true },
                          { key: 'joint_secretary_2', title: 'Joint-Secretary 2', showContact: true },
                          { key: 'coordinator_1', title: 'Coordinator 1', showContact: true },
                          { key: 'coordinator_2', title: 'Coordinator 2', showContact: true },
                        ].map((role) => (
                          <Grid item xs={12} sm={6} key={role.key}>
                            <MemberEditCard
                              title={role.title}
                              value={form.members[selectedSessionKey]?.bihta?.[role.key]}
                              onChange={(val) => updateSessionMember('bihta', role.key, val)}
                              uploading={uploadingAvatars[`bihta_${role.key}`]}
                              onAvatarUpload={(file) => handleAvatarUpload('bihta', role.key, file)}
                              showContact={role.showContact}
                              setToast={setToast}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <Typography variant="body2" color="text.secondary">
                    Please select or add an academic session to manage member roles.
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 5: Club Events */}
      {activeTab === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Manage Club Events
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEvent(null)
                setEventForm({
                  id: '',
                  title: '',
                  poster: '',
                  description: '',
                  category: 'Competition',
                  usually_held: 'July',
                  duration: '',
                  venue: '',
                  gallery: [],
                  attachments: []
                })
                setEventModalOpen(true)
              }}
              sx={{ backgroundColor: '#1e293b', '&:hover': { backgroundColor: '#334155' } }}
            >
              Add New Event
            </Button>
          </Box>

          {loadingEvents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#1e293b' }} />
            </Box>
          ) : events.length === 0 ? (
            <Alert severity="info">No events found for this club. Click "Add New Event" to create one.</Alert>
          ) : (
            <Grid container spacing={3}>
              {events.map((evt) => (
                <Grid item xs={12} sm={6} md={4} key={evt.id}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box>
                      {evt.poster && (
                        <Box sx={{ width: '100%', height: 180, overflow: 'hidden', borderRadius: 1, mb: 1.5 }}>
                          <img src={evt.poster} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      )}
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {evt.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        ID: {evt.id} | Category: {evt.category}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2
                      }}>
                        {evt.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, borderTop: '1px solid #eee', pt: 1.5 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          setEditingEvent(evt)
                          setEventForm(evt)
                          setEventModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteEvent(evt.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Dialog Modal for Add/Edit Event */}
          <Dialog open={eventModalOpen} onClose={() => setEventModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ backgroundColor: '#830001', color: 'white' }}>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Event Title"
                    fullWidth
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Category"
                    fullWidth
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    placeholder="e.g. Competition, Workshop, Seminar"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Usually Held"
                    fullWidth
                    value={eventForm.usually_held}
                    onChange={(e) => setEventForm({ ...eventForm, usually_held: e.target.value })}
                    placeholder="e.g. July, October"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Duration"
                    fullWidth
                    value={eventForm.duration}
                    onChange={(e) => setEventForm({ ...eventForm, duration: e.target.value })}
                    placeholder="e.g. 36 Hours, 2 Days"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Venue"
                    fullWidth
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    placeholder="e.g. Seminar Hall, NIT Patna"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Event Description"
                    fullWidth
                    multiline
                    minRows={3}
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="Poster Image URL"
                      fullWidth
                      value={eventForm.poster}
                      onChange={(e) => setEventForm({ ...eventForm, poster: e.target.value })}
                    />
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PhotoCameraIcon />}
                      sx={{ whiteSpace: 'nowrap', borderColor: '#475569', color: '#475569', '&:hover': { borderColor: '#1e293b' } }}
                    >
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const url = await uploadFile(file)
                              setEventForm({ ...eventForm, poster: url })
                            } catch {
                              setToast({ open: true, severity: 'error', message: 'Poster upload failed' })
                            }
                          }
                        }}
                      />
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Gallery Images (one URL per line)"
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Paste image URLs here..."
                    value={Array.isArray(eventForm.gallery) ? eventForm.gallery.join('\n') : ''}
                    onChange={(e) => setEventForm({ ...eventForm, gallery: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Attachments (PDFs / Rule books)
                  </Typography>
                  {eventForm.attachments.map((att, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Document Title"
                        value={att.title}
                        onChange={(e) => {
                          const copy = [...eventForm.attachments]
                          copy[index].title = e.target.value
                          setEventForm({ ...eventForm, attachments: copy })
                        }}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="URL"
                        value={att.url}
                        onChange={(e) => {
                          const copy = [...eventForm.attachments]
                          copy[index].url = e.target.value
                          setEventForm({ ...eventForm, attachments: copy })
                        }}
                      />
                      <IconButton
                        color="error"
                        onClick={() => {
                          setEventForm({ ...eventForm, attachments: eventForm.attachments.filter((_, i) => i !== index) })
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEventForm({ ...eventForm, attachments: [...eventForm.attachments, { title: '', url: '' }] })
                    }}
                  >
                    Add Attachment
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEventModalOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveEvent}
                sx={{ backgroundColor: '#1e293b', '&:hover': { backgroundColor: '#334155' } }}
              >
                Save Event
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        handleClose={() => setToast({ ...toast, open: false })}
      />
    </Paper>
  )
}
