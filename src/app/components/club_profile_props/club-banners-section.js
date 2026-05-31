import { Avatar, Box, Button, Divider, Grid, IconButton, Typography } from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'
import ClubProfileSection from './club-profile-section'

function EmptyBannerState() {
  return (
    <Grid item xs={12}>
      <Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 1, textAlign: 'center' }}>
        <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: '#830001' }}>
          <AddPhotoAlternateIcon />
        </Avatar>
        <Typography color="text.secondary">No club banners added yet</Typography>
      </Box>
    </Grid>
  )
}

function BannerPreview({ picture, isEditing, onRemovePicture }) {
  return (
    <Grid item xs={12}>
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
          sx={{ width: '100%', height: { xs: 160, sm: 220, md: 260 }, objectFit: 'cover', display: 'block' }}
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
            onClick={() => onRemovePicture(picture.id)}
            sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'white' }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
    </Grid>
  )
}

export default function ClubBannersSection({ pictures, isEditing, onPictureChange, onRemovePicture }) {
  return (
    <ClubProfileSection>
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
          <input hidden multiple accept="image/*" type="file" onChange={onPictureChange} />
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {pictures.length > 0 ? (
          pictures.map((picture) => (
            <BannerPreview
              key={picture.id}
              picture={picture}
              isEditing={isEditing}
              onRemovePicture={onRemovePicture}
            />
          ))
        ) : (
          <EmptyBannerState />
        )}
      </Grid>
    </ClubProfileSection>
  )
}

