'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  Avatar,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  ImageList,
  ImageListItem,
  Tabs,
  Tab,
  MenuItem,
  TextField
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import LanguageIcon from '@mui/icons-material/Language'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import InstagramIcon from '@mui/icons-material/Instagram'
import TwitterIcon from '@mui/icons-material/Twitter'
import YouTubeIcon from '@mui/icons-material/YouTube'
import FacebookIcon from '@mui/icons-material/Facebook'
import { ClubAdminDashboard } from './club-admin-dashboard'

export default function ClubProfileView() {
  const { data: session } = useSession()
  const [club, setClub] = useState(null)
  const [clubEvents, setClubEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedSessionKey, setSelectedSessionKey] = useState('')
  const [campusTab, setCampusTab] = useState(0)

  const fetchClub = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/club')
      const data = await res.json()
      if (res.ok) {
        setClub(data)
        const sessions = Object.keys(data.members || {}).sort().reverse()
        if (sessions.length > 0) {
          setSelectedSessionKey(sessions[0])
        }
        
        // Fetch events for this club
        const evtsRes = await fetch(`/api/club/event?club_id=${data.id}`)
        const evtsData = await evtsRes.json()
        if (evtsRes.ok) {
          setClubEvents(evtsData.data || [])
        }
      }
    } catch (err) {
      console.error('Error fetching club info:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClub()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#830001' }} />
      </Box>
    )
  }

  if (isEditing) {
    return (
      <ClubAdminDashboard
        onClose={() => {
          setIsEditing(false)
          fetchClub()
        }}
      />
    )
  }

  if (!club) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No club details found.
        </Typography>
        <Button
          variant="contained"
          onClick={() => setIsEditing(true)}
          sx={{ mt: 2, backgroundColor: '#830001', '&:hover': { backgroundColor: '#9a0000' } }}
        >
          Fill Details
        </Button>
      </Paper>
    )
  }

  const logoInitial = club.name?.charAt(0)?.toUpperCase() || 'C'
  const sessionKeys = Object.keys(club.members || {}).sort().reverse()
  const activeSession = selectedSessionKey ? club.members[selectedSessionKey] : null

  return (
    <Box>
      <Paper sx={{ p: 4, mb: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: 'center', mb: 4 }}>
          <Avatar
            src={club.logo || undefined}
            sx={{ width: 100, height: 100, bgcolor: '#830001', fontSize: '2.5rem', fontWeight: 600 }}
          >
            {!club.logo && logoInitial}
          </Avatar>
          <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              {club.name}
            </Typography>
            {club.tagline && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1.5 }}>
                "{club.tagline}"
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Chip label={`Category: ${club.category}`} variant="outlined" size="small" sx={{ borderColor: '#830001', color: '#830001' }} />
              {club.established_year && (
                <Chip label={`Est: ${club.established_year}`} variant="outlined" size="small" sx={{ borderColor: '#cbd5e1', color: '#475569' }} />
              )}
              {club.active_members && (
                <Chip label={`${club.active_members} Active Members`} variant="outlined" size="small" sx={{ borderColor: '#cbd5e1', color: '#475569' }} />
              )}
              {club.events_organized && (
                <Chip label={`${club.events_organized} Events Organized`} variant="outlined" size="small" sx={{ borderColor: '#cbd5e1', color: '#475569' }} />
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#9a0000' } }}
          >
            Edit Details
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Content Section */}
        <Grid container spacing={4}>
          {/* Left Column: About & PI Message & Gallery */}
          <Grid item xs={12} md={8}>
            {club.about && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 1.5 }}>
                  About Club
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.7, color: 'text.secondary', whiteSpace: 'pre-line' }}>
                  {club.about}
                </Typography>
              </Box>
            )}

            {club.message_from_pi && (
              <Box sx={{ mb: 4, bgcolor: '#fdf8f8', p: 3, borderRadius: 2, borderLeft: '4px solid #830001' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 1.5 }}>
                  Message from Professor-In-Charge
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.7, color: 'text.primary' }}>
                  "{club.message_from_pi}"
                </Typography>
              </Box>
            )}

            {Array.isArray(club.pictures) && club.pictures.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 2 }}>
                  Club Gallery
                </Typography>
                <ImageList cols={2} gap={8} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  {club.pictures.map((pic, index) => (
                    <ImageListItem key={index}>
                      <img src={pic} alt={`Gallery ${index}`} loading="lazy" style={{ height: 200, objectFit: 'cover' }} />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}

            {clubEvents.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 2 }}>
                  Events Organized
                </Typography>
                <Grid container spacing={3}>
                  {clubEvents.map((evt) => (
                    <Grid item xs={12} key={evt.id}>
                      <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderColor: '#e2e8f0' }}>
                        <Grid container spacing={3}>
                          {evt.poster && (
                            <Grid item xs={12} sm={4}>
                              <Box sx={{ width: '100%', height: 180, overflow: 'hidden', borderRadius: 1.5, border: '1px solid #cbd5e1' }}>
                                <img src={evt.poster} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </Box>
                            </Grid>
                          )}
                          <Grid item xs={12} sm={evt.poster ? 8 : 12}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 1 }}>
                                {evt.title}
                              </Typography>
                              
                              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Category:</strong> {evt.category}
                                  </Typography>
                                </Grid>
                                {evt.duration && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Duration:</strong> {evt.duration}
                                    </Typography>
                                  </Grid>
                                )}
                                {evt.venue && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Venue:</strong> {evt.venue}
                                    </Typography>
                                  </Grid>
                                )}
                                {evt.usually_held && (
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Usually Held:</strong> {evt.usually_held}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>

                              <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary', mb: 2, whiteSpace: 'pre-line' }}>
                                {evt.description}
                              </Typography>

                              {/* Documents & Rulebooks */}
                              {Array.isArray(evt.attachments) && evt.attachments.length > 0 && (
                                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                    Attachments:
                                  </Typography>
                                  {evt.attachments.map((att, idx) => (
                                    <Button
                                      key={idx}
                                      variant="text"
                                      size="small"
                                      href={att.url}
                                      target="_blank"
                                      sx={{
                                        color: '#830001',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        p: 0,
                                        minWidth: 0,
                                        mr: 2,
                                        textDecoration: 'underline',
                                        '&:hover': { color: '#9a0000', textDecoration: 'underline' }
                                      }}
                                    >
                                      {att.title}
                                    </Button>
                                  ))}
                                </Box>
                              )}

                              {/* Photo Gallery */}
                              {Array.isArray(evt.gallery) && evt.gallery.length > 0 && (
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                                    Event Gallery:
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {evt.gallery.map((img, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          width: 70,
                                          height: 70,
                                          overflow: 'hidden',
                                          borderRadius: 1,
                                          border: '1px solid #e2e8f0',
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s',
                                          '&:hover': { transform: 'scale(1.05)', opacity: 0.9 }
                                        }}
                                      >
                                        <a href={img} target="_blank" rel="noreferrer">
                                          <img src={img} alt="Event thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </a>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Grid>

          {/* Right Column: Socials & Session Members */}
          <Grid item xs={12} md={4}>
            {/* Social Links */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 2 }}>
                Social Connections
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {club.social_links?.website && (
                  <IconButton href={club.social_links.website} target="_blank" color="primary">
                    <LanguageIcon />
                  </IconButton>
                )}
                {club.social_links?.linkedin && (
                  <IconButton href={club.social_links.linkedin} target="_blank" color="primary">
                    <LinkedInIcon />
                  </IconButton>
                )}
                {club.social_links?.instagram && (
                  <IconButton href={club.social_links.instagram} target="_blank" color="primary">
                    <InstagramIcon />
                  </IconButton>
                )}
                {club.social_links?.twitter && (
                  <IconButton href={club.social_links.twitter} target="_blank" color="primary">
                    <TwitterIcon />
                  </IconButton>
                )}
                {club.social_links?.youtube && (
                  <IconButton href={club.social_links.youtube} target="_blank" color="primary">
                    <YouTubeIcon />
                  </IconButton>
                )}
                {club.social_links?.facebook && (
                  <IconButton href={club.social_links.facebook} target="_blank" color="primary">
                    <FacebookIcon />
                  </IconButton>
                )}
                {!club.social_links?.website && 
                 !club.social_links?.linkedin && 
                 !club.social_links?.instagram && 
                 !club.social_links?.twitter && 
                 !club.social_links?.youtube && 
                 !club.social_links?.facebook && (
                  <Typography variant="body2" color="text.secondary">
                    No social links provided.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Academic Session Selector */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001', mb: 2 }}>
                Academic Members
              </Typography>
              {sessionKeys.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No academic sessions filled.
                </Typography>
              ) : (
                <Box>
                  <TextField
                    select
                    label="Select Session"
                    fullWidth
                    size="small"
                    value={selectedSessionKey}
                    onChange={(e) => setSelectedSessionKey(e.target.value)}
                    sx={{ mb: 3 }}
                  >
                    {sessionKeys.map((key) => (
                      <MenuItem key={key} value={key}>
                        Session {key}
                      </MenuItem>
                    ))}
                  </TextField>

                  {activeSession ? (
                    <Box>
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={campusTab} onChange={(e, newValue) => setCampusTab(newValue)} aria-label="preview campus tabs">
                          <Tab label="Patna Campus" />
                          <Tab label="Bihta Campus" />
                        </Tabs>
                      </Box>

                      {/* Patna Campus Panel */}
                      {campusTab === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                          {[
                            { key: 'pi', label: 'Patna Campus PI' },
                            { key: 'president', label: 'President' },
                            { key: 'vice_president', label: 'Vice-President' },
                            { key: 'secretary', label: 'Secretary' },
                            { key: 'joint_secretary_1', label: 'Joint-Secretary 1' },
                            { key: 'joint_secretary_2', label: 'Joint-Secretary 2' },
                            { key: 'coordinator_1', label: 'Coordinator 1' },
                            { key: 'coordinator_2', label: 'Coordinator 2' },
                          ].map((role) => {
                            const member = activeSession.patna?.[role.key] || (role.key === 'pi' ? activeSession.patna_campus_pi : (role.key === 'president' ? activeSession.president : (role.key === 'secretary' ? activeSession.secretary : null)));
                            if (!member?.name) return null;
                            return (
                              <Card variant="outlined" key={role.key}>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Avatar src={member.avatar || undefined} sx={{ bgcolor: '#830001' }}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.2 }}>
                                        {member.name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        {role.label} | {member.department}
                                      </Typography>
                                      {member.email && (
                                        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                          Email: {member.email}
                                        </Typography>
                                      )}
                                      {member.contact && (
                                        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                          Contact: {member.contact}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Box>
                      )}

                      {/* Bihta Campus Panel */}
                      {campusTab === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                          {[
                            { key: 'pi', label: 'Bihta Campus PI' },
                            { key: 'president', label: 'President' },
                            { key: 'vice_president', label: 'Vice-President' },
                            { key: 'secretary', label: 'Secretary' },
                            { key: 'joint_secretary_1', label: 'Joint-Secretary 1' },
                            { key: 'joint_secretary_2', label: 'Joint-Secretary 2' },
                            { key: 'coordinator_1', label: 'Coordinator 1' },
                            { key: 'coordinator_2', label: 'Coordinator 2' },
                          ].map((role) => {
                            const member = activeSession.bihta?.[role.key] || (role.key === 'pi' ? activeSession.bihta_campus_pi : null);
                            if (!member?.name) return null;
                            return (
                              <Card variant="outlined" key={role.key}>
                                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Avatar src={member.avatar || undefined} sx={{ bgcolor: '#830001' }}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.2 }}>
                                        {member.name}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        {role.label} | {member.department}
                                      </Typography>
                                      {member.email && (
                                        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                          Email: {member.email}
                                        </Typography>
                                      )}
                                      {member.contact && (
                                        <Typography variant="body2" color="text.secondary" display="block" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                          Contact: {member.contact}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  ) : null}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
