import React from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    IconButton,
    Divider,
    Link as MuiLink,
    Paper
} from '@mui/material'
import {
    Close as CloseIcon,
    OpenInNew as OpenInNewIcon,
    AttachFile as AttachFileIcon,
    CalendarToday as CalendarIcon,
    Person as PersonIcon,
    Business as BusinessIcon
} from '@mui/icons-material'
import { depList } from '@/lib/const'

export const ViewAchievementModal = ({ open, handleClose, data }) => {
    if (!data) return null

    const deptName = depList.get(data.department) || data.department?.toUpperCase() || 'General'

    const formatDate = (val) => {
        if (!val) return 'N/A'
        try {
            let date
            if (typeof val === 'string') {
                if (/^\d{11,}$/.test(val.trim())) {
                    date = new Date(parseInt(val.trim(), 10))
                } else {
                    date = new Date(val)
                }
            } else if (typeof val === 'number') {
                date = new Date(val)
            } else {
                date = new Date(val)
            }

            if (isNaN(date?.getTime())) return 'N/A'
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        } catch (e) {
            return 'N/A'
        }
    }

    const attachmentsList = Array.isArray(data.attachments) ? data.attachments : []

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#830001' }}>
                        {data.title}
                    </Typography>
                    <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                        <Chip label={deptName} size="small" sx={{ bgcolor: 'rgba(131, 0, 1, 0.08)', color: '#830001', fontWeight: 600 }} />
                        <Chip label={data.category || 'Departmental Milestone'} size="small" color="primary" variant="outlined" />
                        {data.recipient_type && (
                            <Chip label={data.recipient_type} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                {/* Banner Image Preview */}
                {data.banner_image && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                        <img
                            src={data.banner_image}
                            alt={data.title}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '350px',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                border: '1px solid #eee'
                            }}
                        />
                    </Box>
                )}

                {/* Achiever and Date Info */}
                <Box display="flex" gap={3} mb={2} flexWrap="wrap">
                    {data.achieved_by && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                                <strong>Achieved by:</strong> {data.achieved_by}
                            </Typography>
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            <strong>Date:</strong> {formatDate(data.achievement_date || data.createdAt)}
                        </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <BusinessIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                            <strong>Department:</strong> {deptName}
                        </Typography>
                    </Box>
                </Box>

                {/* Description */}
                {data.description && (
                    <Box mb={3}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                            Details & Summary:
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            <Typography variant="body2" color="text.primary">
                                {data.description}
                            </Typography>
                        </Paper>
                    </Box>
                )}

                {/* External Link */}
                {data.external_link && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            External Announcement / Verification:
                        </Typography>
                        <MuiLink
                            href={data.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}
                        >
                            {data.external_link}
                            <OpenInNewIcon fontSize="small" />
                        </MuiLink>
                    </Box>
                )}

                {/* Attachments */}
                {attachmentsList.length > 0 && (
                    <Box mt={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            Attachments ({attachmentsList.length}):
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1}>
                            {attachmentsList.map((att, i) => (
                                <Box
                                    key={i}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    sx={{ p: 1, border: '1px solid #eee', borderRadius: 1, bgcolor: '#fbfbfb' }}
                                >
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <AttachFileIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {att.title || att.caption || `Document #${i + 1}`}
                                        </Typography>
                                    </Box>
                                    {att.url && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            startIcon={<OpenInNewIcon />}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            View File
                                        </Button>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5 }}>
                <Button onClick={handleClose} variant="contained" sx={{ bgcolor: '#830001', '&:hover': { bgcolor: '#690001' } }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}
