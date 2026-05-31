import { Grid, TextField } from '@mui/material'
import ClubProfileSection from './club-profile-section'
import ClubLogoUploader from './club-logo-uploader'

export default function ClubIdentitySection({
  formData,
  clubEmail,
  clubPresident,
  clubSecretary,
  isEditing,
  isClubAdmin,
  logo,
  onFieldChange,
  onClubEmailChange,
  onClubPresidentChange,
  onClubSecretaryChange,
  onLogoChange,
  onRemoveLogo,
}) {
  return (
    <ClubProfileSection title="Club Identity">
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} md={3}>
          <ClubLogoUploader
            logo={logo}
            title={formData.title}
            isEditing={isEditing}
            onLogoChange={onLogoChange}
            onRemoveLogo={onRemoveLogo}
          />
        </Grid>
        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Club Title"
                value={formData.title}
                onChange={onFieldChange('title')}
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
                onChange={onClubEmailChange}
                disabled={!isEditing || isClubAdmin}
                placeholder="Enter club email..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="About Club"
                value={formData.about}
                onChange={onFieldChange('about')}
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
                onChange={onFieldChange('description')}
                disabled={!isEditing}
                placeholder="Write the full club description..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Club President"
                value={clubPresident}
                onChange={onClubPresidentChange}
                disabled={!isEditing}
                placeholder="Enter club president..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Club Secretary"
                value={clubSecretary}
                onChange={onClubSecretaryChange}
                disabled={!isEditing}
                placeholder="Enter club secretary..."
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </ClubProfileSection>
  )
}

