import { Box, Button, CircularProgress, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'

export default function ClubProfileHeader({ isEditing, saving, onAction }) {
  return (
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
        startIcon={saving ? <CircularProgress size={18} color="inherit" /> : isEditing ? <SaveIcon /> : <EditIcon />}
        onClick={onAction}
        disabled={saving}
        sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#6a0001' }, flexShrink: 0 }}
      >
        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Details'}
      </Button>
    </Box>
  )
}

