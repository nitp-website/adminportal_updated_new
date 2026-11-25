import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    CircularProgress,
    Alert,
    IconButton,
    Chip
} from '@mui/material'
import {
    CloudUpload as CloudUploadIcon,
    Delete as DeleteIcon,
    AttachFile as AttachFileIcon,
    Add as AddIcon
} from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import { depList } from '@/lib/const'

const CATEGORIES = [
    'Student Achievement',
    'Faculty Achievement',
    'Research & Innovation',
    'Departmental Milestone',
    'Sports & Cultural',
    'Placements & Internships',
    'Other'
]

const RECIPIENT_TYPES = [
    'Student',
    'Faculty',
    'Staff',
    'Department',
    'Alumni'
]

export const AddAchievementForm = ({ open, handleClose, refresh, initialDepartment }) => {
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const isDeptAdmin = session?.user?.role === 'DEPT_ADMIN'
    const defaultDept = initialDepartment || session?.user?.department || 'cse'

    const [form, setForm] = useState({
        department: defaultDept,
        title: '',
        category: 'Student Achievement',
        achieved_by: '',
        recipient_type: 'Student',
        achievement_date: new Date().toISOString().split('T')[0],
        description: '',
        external_link: '',
    })

    const [bannerFile, setBannerFile] = useState(null)
    const [bannerPreview, setBannerPreview] = useState(null)
    const [attachments, setAttachments] = useState([])

    useEffect(() => {
        if (open) {
            setForm({
                department: isDeptAdmin ? (session?.user?.department || 'cse') : (initialDepartment || 'cse'),
                title: '',
                category: 'Student Achievement',
                achieved_by: '',
                recipient_type: 'Student',
                achievement_date: new Date().toISOString().split('T')[0],
                description: '',
                external_link: '',
            })
            setBannerFile(null)
            setBannerPreview(null)
            setAttachments([])
            setError(null)
        }
    }, [open, initialDepartment, isDeptAdmin, session])

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleBannerChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 20 * 1024 * 1024) {
                setError('Banner image size must be less than 20MB')
                return
            }
            setBannerFile(file)
            setBannerPreview(URL.createObjectURL(file))
        }
    }

    const handleAddAttachment = () => {
        setAttachments([...attachments, { title: '', file: null, url: '' }])
    }

    const handleAttachmentChange = (index, field, value) => {
        const updated = [...attachments]
        updated[index][field] = value
        setAttachments(updated)
    }

    const handleRemoveAttachment = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index))
    }

    const uploadFileToS3 = async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', 'general')
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        })
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.message || 'File upload failed')
        }
        const data = await res.json()
        return data.url
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (!form.title.trim()) {
            setError('Achievement title is required')
            return
        }

        if (!form.department) {
            setError('Department is required')
            return
        }

        setSubmitting(true)

        try {
            // 1. Upload banner image if provided
            let banner_image = null
            if (bannerFile) {
                banner_image = await uploadFileToS3(bannerFile)
            }

            // 2. Upload attachments if provided
            const processedAttachments = []
            for (const att of attachments) {
                if (att.file) {
                    const url = await uploadFileToS3(att.file)
                    processedAttachments.push({
                        title: att.title || att.file.name,
                        url,
                    })
                } else if (att.url?.trim()) {
                    processedAttachments.push({
                        title: att.title || 'Attachment',
                        url: att.url.trim(),
                    })
                }
            }

            // 3. Prepare payload
            const payload = {
                type: 'department_achievement',
                data: {
                    department: form.department,
                    title: form.title.trim(),
                    description: form.description?.trim() || null,
                    category: form.category,
                    achieved_by: form.achieved_by?.trim() || null,
                    recipient_type: form.recipient_type,
                    achievement_date: form.achievement_date || null,
                    banner_image,
                    attachments: processedAttachments,
                    external_link: form.external_link?.trim() || null,
                }
            }

            const response = await fetch('/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.message || 'Failed to create department achievement')
            }

            if (refresh) refresh()
            handleClose()
        } catch (err) {
            console.error('[Add Achievement Error]:', err)
            setError(err.message || 'An error occurred while saving the achievement')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onClose={() => !submitting && handleClose()} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ fontWeight: 600, color: '#830001', borderBottom: '1px solid #eee' }}>
                    Add Department Achievement
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        {/* Department selection */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="dept-label">Department *</InputLabel>
                                <Select
                                    labelId="dept-label"
                                    name="department"
                                    value={form.department}
                                    label="Department *"
                                    onChange={handleChange}
                                    disabled={isDeptAdmin}
                                >
                                    {Array.from(depList.entries()).map(([code, name]) => (
                                        <MenuItem key={code} value={code}>
                                            {name} ({code.toUpperCase()})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Category */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="category-label">Category *</InputLabel>
                                <Select
                                    labelId="category-label"
                                    name="category"
                                    value={form.category}
                                    label="Category *"
                                    onChange={handleChange}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Title */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Achievement Title *"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="e.g. 1st Prize in Smart India Hackathon 2024"
                                required
                            />
                        </Grid>

                        {/* Achieved By */}
                        <Grid item xs={12} sm={8}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Achieved By (Names / Team)"
                                name="achieved_by"
                                value={form.achieved_by}
                                onChange={handleChange}
                                placeholder="e.g. Aarav Sharma, Priya Singh & Team / Dr. Rajesh Kumar"
                            />
                        </Grid>

                        {/* Recipient Type */}
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="recipient-type-label">Recipient Type</InputLabel>
                                <Select
                                    labelId="recipient-type-label"
                                    name="recipient_type"
                                    value={form.recipient_type}
                                    label="Recipient Type"
                                    onChange={handleChange}
                                >
                                    {RECIPIENT_TYPES.map((type) => (
                                        <MenuItem key={type} value={type}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Date */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Achievement Date"
                                name="achievement_date"
                                value={form.achievement_date}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        {/* External Link */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="External Link (News / Verification URL)"
                                name="external_link"
                                value={form.external_link}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </Grid>

                        {/* Description */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description & Details"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Provide comprehensive details about the recognition, organizer, cash prize, or milestone..."
                            />
                        </Grid>

                        {/* Banner Image Upload */}
                        <Grid item xs={12}>
                            <Box sx={{ border: '1px dashed #ccc', p: 2, borderRadius: 1, bgcolor: '#fafafa' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Banner / Award Photo (Optional)
                                </Typography>
                                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        size="small"
                                        startIcon={<CloudUploadIcon />}
                                        sx={{ color: '#830001', borderColor: '#830001' }}
                                    >
                                        Upload Image
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={handleBannerChange}
                                        />
                                    </Button>
                                    {bannerFile && (
                                        <Typography variant="body2" color="text.secondary">
                                            {bannerFile.name} ({(bannerFile.size / 1024).toFixed(1)} KB)
                                        </Typography>
                                    )}
                                    {bannerPreview && (
                                        <Box sx={{ position: 'relative', mt: 1 }}>
                                            <img
                                                src={bannerPreview}
                                                alt="Banner preview"
                                                style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setBannerFile(null)
                                                    setBannerPreview(null)
                                                }}
                                                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                                            >
                                                <DeleteIcon fontSize="small" color="error" />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Grid>

                        {/* Attachments Section */}
                        <Grid item xs={12}>
                            <Box sx={{ border: '1px solid #e0e0e0', p: 2, borderRadius: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                        Supporting Documents / Certificates (Optional)
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddAttachment}
                                        sx={{ color: '#830001' }}
                                    >
                                        Add File / Link
                                    </Button>
                                </Box>

                                {attachments.map((att, idx) => (
                                    <Box
                                        key={idx}
                                        display="flex"
                                        gap={1}
                                        alignItems="center"
                                        mb={1}
                                        sx={{ bgcolor: '#f9f9f9', p: 1, borderRadius: 1 }}
                                    >
                                        <TextField
                                            size="small"
                                            placeholder="Caption / File Title"
                                            value={att.title}
                                            onChange={(e) => handleAttachmentChange(idx, 'title', e.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            size="small"
                                            startIcon={<AttachFileIcon />}
                                            sx={{ whiteSpace: 'nowrap' }}
                                        >
                                            {att.file ? att.file.name.substring(0, 15) + '...' : 'Upload File'}
                                            <input
                                                type="file"
                                                hidden
                                                onChange={(e) => handleAttachmentChange(idx, 'file', e.target.files[0])}
                                            />
                                        </Button>
                                        <Typography variant="caption" color="text.secondary">
                                            OR
                                        </Typography>
                                        <TextField
                                            size="small"
                                            placeholder="Paste URL"
                                            value={att.url}
                                            onChange={(e) => handleAttachmentChange(idx, 'url', e.target.value)}
                                            sx={{ flex: 1 }}
                                        />
                                        <IconButton size="small" onClick={() => handleRemoveAttachment(idx)} color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={handleClose} disabled={submitting} sx={{ color: '#555' }}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{ bgcolor: '#830001', '&:hover': { bgcolor: '#690001' } }}
                    >
                        {submitting ? 'Saving...' : 'Save Achievement'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
