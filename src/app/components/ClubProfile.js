'use client'

import React, { useEffect, useState } from 'react'
import { Alert, Box, CircularProgress } from '@mui/material'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { deleteS3File, extractS3KeyFromUrl, replaceFileInS3, uploadFileToS3 } from '@/lib/utils'
import { findClubForSession, normalizeClub, updateClub } from '../../lib/clubs/club-storage'
import ClubBannersSection from './club_profile_props/club-banners-section'
import ClubIdentitySection from './club_profile_props/club-identity-section'
import ClubProfileHeader from './club_profile_props/club-profile-header'
import ProfessorInChargeSection from './club_profile_props/professor-in-charge-section'
import { emptyClubProfile, mapBannersFromClub, mapClubToFormData, mapLogoFromClub } from './club_profile_props/club-profile-utils'

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [removedImageKeys, setRemovedImageKeys] = useState([])

  useEffect(() => {
    if (!session?.user) return

    let mounted = true

    async function loadClub() {
      try {
        setLoading(true)
        setError('')
        const club = await findClubForSession(session, selectedClubEmail)
        const assignedClubName = session.user.administration || ''
        const normalizedClub = normalizeClub(club || {
          club_name: assignedClubName || 'My Club',
          club_email: session.user.email || '',
          status: 'Active',
        })

        if (!mounted) return

        setClubId(normalizedClub.id)
        setClubEmail(normalizedClub.club_email)
        setCategory(normalizedClub.category)
        setStatus(normalizedClub.status)
        setClubPresident(normalizedClub.club_president)
        setClubSecretary(normalizedClub.club_secretary)
        setLogo(mapLogoFromClub(normalizedClub))
        setPictures(mapBannersFromClub(normalizedClub))
        setRemovedImageKeys([])
        setFormData(mapClubToFormData(normalizedClub))
        setIsEditing(!club)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load club profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadClub()

    return () => {
      mounted = false
    }
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
      file,
      isPreview: true,
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
      file,
      isPreview: true,
      previousKey: logo?.key || extractS3KeyFromUrl(logo?.url),
    })
    event.target.value = ''
  }

  const handleRemoveLogo = () => {
    if (logo?.isPreview && logo?.url) {
      URL.revokeObjectURL(logo.url)
    }
    if (!logo?.file) {
      const key = logo?.key || extractS3KeyFromUrl(logo?.url)
      if (key) setRemovedImageKeys((prev) => [...prev, key])
    }
    setLogo(null)
  }

  const handleRemovePicture = (pictureId) => {
    setPictures((prev) => {
      const picture = prev.find((item) => item.id === pictureId)
      if (picture?.isPreview && picture?.url) {
        URL.revokeObjectURL(picture.url)
      }
      if (picture && !picture.file) {
        const key = picture.key || extractS3KeyFromUrl(picture.url)
        if (key) setRemovedImageKeys((keys) => [...keys, key])
      }
      return prev.filter((item) => item.id !== pictureId)
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      const savedLogo = logo?.file
        ? await replaceFileInS3(logo.file, logo.previousKey, 'club-logo')
        : null

      if (logo?.file && !savedLogo?.url) {
        throw new Error('Logo upload failed')
      }

      const savedBanners = []
      for (const picture of pictures) {
        if (picture.file) {
          const upload = await uploadFileToS3(picture.file, 'club-banner')
          if (!upload?.url) {
            throw new Error(`Banner upload failed: ${picture.name}`)
          }
          savedBanners.push({
            id: picture.id,
            name: picture.name,
            url: upload.url,
            key: upload.key,
          })
        } else {
          savedBanners.push(picture)
        }
      }

      await Promise.all(
        removedImageKeys
          .filter((key) => key && key !== savedLogo?.key)
          .map((key) => deleteS3File(key))
      )

      const savedClub = await updateClub(normalizeClub({
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
        logo_url: savedLogo?.url || logo?.url || '',
        banners: savedBanners,
        patnaPiName: formData.patnaPiName,
        patnaPiEmail: formData.patnaPiEmail,
        patnaPiPhone: formData.patnaPiPhone,
        patnaPiDepartment: formData.patnaPiDepartment,
        bihtaPiName: formData.bihtaPiName,
        bihtaPiEmail: formData.bihtaPiEmail,
        bihtaPiPhone: formData.bihtaPiPhone,
        bihtaPiDepartment: formData.bihtaPiDepartment,
      }))

      setClubId(savedClub.id)
      setLogo(mapLogoFromClub(savedClub))
      setPictures(mapBannersFromClub(savedClub))
      setRemovedImageKeys([])
      setFormData(mapClubToFormData(savedClub))
      setCategory(savedClub.category || '')
      setStatus(savedClub.status || 'Active')
      setClubPresident(savedClub.club_president || '')
      setClubSecretary(savedClub.club_secretary || '')
      setIsEditing(false)
    } catch (err) {
      setError(err.message || 'Failed to save club profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: '#830001' }} />
        </Box>
      ) : (
      <>
      <ClubProfileHeader
        isEditing={isEditing}
        saving={saving}
        onAction={() => (isEditing ? handleSave() : setIsEditing(true))}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <ClubIdentitySection
        formData={formData}
        clubEmail={clubEmail}
        clubPresident={clubPresident}
        clubSecretary={clubSecretary}
        isEditing={isEditing}
        isClubAdmin={session?.user?.role === 'CLUB_ADMIN'}
        logo={logo}
        onFieldChange={handleChange}
        onClubEmailChange={(event) => setClubEmail(event.target.value)}
        onClubPresidentChange={(event) => setClubPresident(event.target.value)}
        onClubSecretaryChange={(event) => setClubSecretary(event.target.value)}
        onLogoChange={handleLogoChange}
        onRemoveLogo={handleRemoveLogo}
      />
      <ClubBannersSection
        pictures={pictures}
        isEditing={isEditing}
        onPictureChange={handlePictureChange}
        onRemovePicture={handleRemovePicture}
      />
      <ProfessorInChargeSection
        formData={formData}
        isEditing={isEditing}
        onFieldChange={handleChange}
      />
      </>
      )}
    </Box>
  )
}
