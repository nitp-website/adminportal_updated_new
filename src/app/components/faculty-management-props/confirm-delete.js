import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    CircularProgress,
    Box,
    Typography,
    Alert,
    Chip,
    Avatar,
    Grid,
    Divider
} from '@mui/material';
import { Warning, Delete, Person, Email, Business, Work, School } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export const ConfirmDelete = ({ open, handleClose, faculty }) => {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleConfirmDelete = async () => {
        setLoading(true);
        try {
            console.log(`[Faculty Delete] Starting deletion process for faculty: ${faculty?.profile?.email}`);
            
            const response = await fetch('/api/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'user',
                    email: faculty?.profile?.email
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete faculty');
            }

            const result = await response.json();
            console.log('[Faculty Delete] Database deletion response:', result);
            
            handleClose();
            // Force a full page reload to ensure the deleted faculty is removed from the UI
            window.location.reload();
        } catch (error) {
            console.error('[Faculty Delete] Error deleting faculty:', error);
            alert('Failed to delete faculty. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!faculty?.profile) {
        return null;
    }

    const profile = faculty.profile;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle 
                id="alert-dialog-title"
                sx={{ 
                    backgroundColor: '#d32f2f', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1300
                }}
            >
                <Warning />
                Confirm Delete Faculty
            </DialogTitle>
            <DialogContent sx={{ 
                mt: 2, 
                maxHeight: '60vh', 
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                    display: 'none'
                },
                scrollbarWidth: 'none',  // Firefox
                msOverflowStyle: 'none'  // IE and Edge
            }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    ⚠️ This action cannot be undone! All faculty data will be permanently removed.
                </Alert>
                
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#d32f2f' }}>
                        Faculty to be deleted:
                    </Typography>
                    
                    <Box sx={{ 
                        p: 3, 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: 2,
                        border: '2px solid #ffebee'
                    }}>
                        {/* Faculty Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar
                                src={profile.image}
                                sx={{ 
                                    width: 64, 
                                    height: 64,
                                    bgcolor: '#830001',
                                    fontSize: '1.5rem'
                                }}
                            >
                                {profile.name ? profile.name.charAt(0).toUpperCase() : <Person />}
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                                    {profile.name || 'Unknown Name'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {profile.designation || 'No designation specified'}
                                </Typography>
                                <Chip 
                                    label={profile.in_memoriam ? 'In Memoriam' : profile.is_retired ? 'Retired' : 'Active'}
                                    color={profile.in_memoriam ? 'default' : profile.is_retired ? 'default' : 'success'}
                                    size="small"
                                    sx={{ 
                                        mt: 0.5,
                                        ...(profile.in_memoriam && {
                                            backgroundColor: '#475569',
                                            color: '#fff',
                                            fontWeight: 500
                                        })
                                    }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        {/* Faculty Details Grid */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Email fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Email
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                                    {profile.email || 'No email provided'}
                                </Typography>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Business fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Department
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                                    {profile.department || 'No department specified'}
                                </Typography>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Work fontSize="small" color="action" />
                                    <Typography variant="body2" color="text.secondary">
                                        Role
                                    </Typography>
                                </Box>
                                <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                                    {profile.role || 'No role specified'}
                                </Typography>
                            </Grid>
                            
                            {profile.ext_no && (
                                <Grid item xs={12} sm={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            📞 Extension
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500, ml: 3 }}>
                                        {profile.ext_no}
                                    </Typography>
                                </Grid>
                            )}
                            
                            {profile.research_interest && (
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <School fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            Research Interest
                                        </Typography>
                                    </Box>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: 500, 
                                            ml: 3,
                                            fontStyle: 'italic',
                                            maxHeight: '60px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {profile.research_interest}
                                    </Typography>
                                </Grid>
                            )}
                            
                            {profile.academic_responsibility && (
                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <School fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            Academic Responsibility
                                        </Typography>
                                    </Box>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: 500, 
                                            ml: 3,
                                            color: '#830001'
                                        }}
                                    >
                                        {profile.academic_responsibility}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>

                        {profile.is_retired && profile.retirement_date && (
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Retirement Date:</strong> {new Date(profile.retirement_date).toLocaleDateString()}
                                </Typography>
                            </Box>
                        )}

                        {profile.in_memoriam && profile.service_end_date && (
                            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f1f5f9', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Service Tenure:</strong> {profile.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'N/A'} – {new Date(profile.service_end_date).toLocaleDateString()}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                <DialogContentText id="alert-dialog-description" sx={{ mt: 2 }}>
                    <strong>Are you absolutely sure?</strong> This will permanently delete all faculty information including:
                </DialogContentText>
                
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label="Personal Information" color="warning" size="small" />
                    <Chip label="Profile Data" color="warning" size="small" />
                    <Chip label="Contact Details" color="warning" size="small" />
                    <Chip label="Academic Records" color="warning" size="small" />
                    <Chip label="System Access" color="warning" size="small" />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', position: 'sticky', bottom: 0, zIndex: 1300 }}>
                <Button 
                    onClick={handleClose}
                    variant="outlined"
                    sx={{ 
                        color: '#666', 
                        borderColor: '#ddd',
                        '&:hover': {
                            backgroundColor: '#f5f5f5'
                        }
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirmDelete}
                    variant="contained"
                    color="error"
                    autoFocus
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Delete />}
                    sx={{
                        minWidth: 140,
                        '&:hover': {
                            backgroundColor: '#b71c1c'
                        }
                    }}
                >
                    {loading ? 'Deleting...' : 'Delete Faculty'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
