import { Box, Grid, TextField, Typography } from '@mui/material'

export default function PiFieldsCard({ campus, prefix, formData, isEditing, onFieldChange }) {
  return (
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
            onChange={onFieldChange(`${prefix}PiName`)}
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
            onChange={onFieldChange(`${prefix}PiEmail`)}
            disabled={!isEditing}
            placeholder="Enter PI email..."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={formData[`${prefix}PiPhone`]}
            onChange={onFieldChange(`${prefix}PiPhone`)}
            disabled={!isEditing}
            placeholder="Enter phone..."
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Department"
            value={formData[`${prefix}PiDepartment`]}
            onChange={onFieldChange(`${prefix}PiDepartment`)}
            disabled={!isEditing}
            placeholder="Enter department..."
          />
        </Grid>
      </Grid>
    </Box>
  )
}

