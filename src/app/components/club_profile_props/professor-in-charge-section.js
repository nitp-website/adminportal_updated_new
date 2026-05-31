import { Grid } from '@mui/material'
import ClubProfileSection from './club-profile-section'
import PiFieldsCard from './pi-fields-card'

export default function ProfessorInChargeSection({ formData, isEditing, onFieldChange }) {
  return (
    <ClubProfileSection title="Professor In Charge Details" sx={{ mb: 0 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <PiFieldsCard
            campus="Patna"
            prefix="patna"
            formData={formData}
            isEditing={isEditing}
            onFieldChange={onFieldChange}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <PiFieldsCard
            campus="Bihta"
            prefix="bihta"
            formData={formData}
            isEditing={isEditing}
            onFieldChange={onFieldChange}
          />
        </Grid>
      </Grid>
    </ClubProfileSection>
  )
}

