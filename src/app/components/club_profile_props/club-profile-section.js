import { Paper, Typography } from '@mui/material'

export default function ClubProfileSection({ title, children, sx }) {
  return (
    <Paper sx={{ p: 3, mb: 3, ...sx }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      {children}
    </Paper>
  )
}

