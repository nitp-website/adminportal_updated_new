import { Avatar, Box, Button, IconButton } from '@mui/material'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon from '@mui/icons-material/Delete'

export default function ClubLogoUploader({ logo, title, isEditing, onLogoChange, onRemoveLogo }) {
  return (
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
            alt={title || 'Club logo'}
            sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', p: 1 }}
          />
        ) : (
          <Avatar
            variant="rounded"
            sx={{ width: '100%', height: '100%', bgcolor: '#830001', fontSize: '3rem', borderRadius: 0 }}
          >
            {(title || 'C').charAt(0).toUpperCase()}
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
          <input hidden accept="image/*" type="file" onChange={onLogoChange} />
        </Button>
        {isEditing && logo && (
          <IconButton
            color="error"
            onClick={onRemoveLogo}
            sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'divider' }}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

