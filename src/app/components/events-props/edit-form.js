import { 
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    IconButton,
    Grid,
    Typography,
    Divider,
    Box
} from '@mui/material'
import { Delete, Link } from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import React, { useRef, useState } from 'react'
import { dateformatter } from './../common-props/date-formatter'
import { ConfirmDelete } from './confirm-delete'
import { AddAttachments } from './../common-props/add-attachment'
import { handleNewAttachments } from './../common-props/add-attachment'

// Helper function to format dates for edit form
const formatDateForInput = (dateValue) => {
    if (!dateValue) return ''
    
    let date
    // Handle different date formats
    if (typeof dateValue === 'string') {
        // If it's a string timestamp, convert to number first
        const timestamp = parseInt(dateValue, 10)
        if (!isNaN(timestamp)) {
            date = new Date(timestamp)
        } else {
            // Try parsing as date string
            date = new Date(dateValue)
        }
    } else if (typeof dateValue === 'number') {
        // If it's already a number timestamp
        date = new Date(dateValue)
    } else {
        // If it's already a Date object
        date = dateValue
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
        return ''
    }
    
    // Return in YYYY-MM-DD format for input[type="date"]
    return date.toISOString().split('T')[0]
}

export const EditForm = ({ data, handleClose, modal }) => {
    const deleteArray = useRef([])
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [content, setContent] = useState({
        id: data.id,
        title: data.title,
        openDate: formatDateForInput(data.openDate),
        closeDate: formatDateForInput(data.closeDate),
        eventStartDate: formatDateForInput(data.eventStartDate),
        eventEndDate: formatDateForInput(data.eventEndDate),
        venue: data.venue,
        doclink: data.doclink || '',
        type: data.type || 'general',
        email: data?.email || null,
    })

    const [verifyDelete, setVerifyDelete] = useState(false)
    const handleDelete = () => {
        setVerifyDelete(true)
    }

    const [add_attach, setAdd_attach] = useState(() => {
        if (!data.attachments) return [];
        
        try {
            const attachData = typeof data.attachments === 'string' ? 
                JSON.parse(data.attachments) : 
                data.attachments;
                
            return Array.isArray(attachData) ? attachData : [];
        } catch (e) {
            console.error('Error parsing attachments data:', e);
            return [];
        }
    });

    const [new_attach, setNew_attach] = useState([]);
    const [bannerFile, setBannerFile] = useState(null);

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let attachments = [...add_attach]
            if (new_attach.length) {
                const processedAttachments = await handleNewAttachments(new_attach)
                const newAttachmentsWithIds = processedAttachments.map(attachment => ({
                    id: Date.now() + Math.random(),
                    caption: attachment.caption,
                    url: attachment.url,
                    key: attachment.key,
                    typeLink: attachment.typeLink
                }))
                attachments = [...attachments, ...newAttachmentsWithIds]
            }

            let banner_image = data.banner_image || null;
            if (bannerFile) {
                let fileData = new FormData();
                fileData.append('file', bannerFile);
                fileData.append('fileType', 'general');
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: fileData,
                });
                if (response.ok) {
                    const resData = await response.json();
                    banner_image = resData.url;
                }
            }

            const finaldata = {
                id: content.id,
                title: content.title,
                email: content.email,
                openDate: new Date(content.openDate).getTime(),
                closeDate: new Date(content.closeDate).getTime(),
                eventStartDate: new Date(content.eventStartDate).getTime(),
                eventEndDate: new Date(content.eventEndDate).getTime(),
                venue: content.venue,
                doclink: content.doclink,
                type: content.type,
                updatedAt: Date.now(),
                updatedBy: session.user.email,
                event_link: null,
                attachments: attachments,
                banner_image: banner_image,
                deleteArray: deleteArray.current
            }

            const result = await fetch('/api/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: finaldata,
                    type: "event"
                }),
            })

            if (!result.ok) {
                throw new Error('Failed to update event')
            }

            window.location.reload()
        } catch (error) {
            console.error('Error updating event:', error)
            alert('Failed to update event. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle 
                    sx={{ 
                        backgroundColor: '#830001', 
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1300
                    }}
                >
                    Edit Event
                    <IconButton
                        onClick={handleDelete}
                        sx={{
                            color: 'white',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)'
                            }
                        }}
                    >
                        <Delete />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ 
                    mt: 2, 
                    maxHeight: '70vh', 
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    },
                    scrollbarWidth: 'none',  // Firefox
                    msOverflowStyle: 'none'  // IE and Edge
                }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
                            Event Details
                        </Typography>
                        <TextField
                            margin="dense"
                            label="Event Title"
                            name="title"
                            type="text"
                            required
                            fullWidth
                            value={content.title}
                            onChange={handleChange}
                            sx={{ mb: 2 }}
                            variant="outlined"
                        />
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Venue"
                                    name="venue"
                                    type="text"
                                    required
                                    fullWidth
                                    value={content.venue}
                                    onChange={handleChange}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth margin="dense" variant="outlined">
                                    <InputLabel>Event Type</InputLabel>
                                    <Select
                                        name="type"
                                        value={content.type}
                                        onChange={handleChange}
                                        label="Event Type"
                                    >
                                        <MenuItem value="general">General</MenuItem>
                                        <MenuItem value="intranet">Intranet</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Registration Open Date"
                                    name="openDate"
                                    type="date"
                                    required
                                    fullWidth
                                    value={content.openDate}
                                    onChange={handleChange}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Registration Close Date"
                                    name="closeDate"
                                    type="date"
                                    required
                                    fullWidth
                                    value={content.closeDate}
                                    onChange={handleChange}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Event Start Date"
                                    name="eventStartDate"
                                    type="date"
                                    required
                                    fullWidth
                                    value={content.eventStartDate}
                                    onChange={handleChange}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Event End Date"
                                    name="eventEndDate"
                                    type="date"
                                    required
                                    fullWidth
                                    value={content.eventEndDate}
                                    onChange={handleChange}
                                    InputLabelProps={{
                                        shrink: true,
                                    }}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>

                        <TextField
                            margin="dense"
                            label="Registration Link (Optional)"
                            name="doclink"
                            type="url"
                            fullWidth
                            value={content.doclink}
                            onChange={handleChange}
                            variant="outlined"
                            placeholder="https://..."
                        />
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
                            Event Banner
                        </Typography>
                        <Box sx={{ 
                            p: 2, 
                            border: '2px dashed #ddd', 
                            borderRadius: 2,
                            backgroundColor: '#fafafa'
                        }}>
                            {data.banner_image && !bannerFile && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
                                        Current Banner:
                                    </Typography>
                                    <Button 
                                        href={data.banner_image} 
                                        target="_blank" 
                                        variant="outlined" 
                                        size="small"
                                        startIcon={<Link />}
                                    >
                                        View Banner
                                    </Button>
                                </Box>
                            )}
                            <Typography variant="subtitle2" sx={{ mb: 1, color: '#666' }}>
                                {data.banner_image ? 'Replace Banner:' : 'Upload Banner:'}
                            </Typography>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setBannerFile(e.target.files[0])}
                                style={{ marginBottom: '8px', width: '100%' }}
                            />
                            {bannerFile && (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Selected new banner: {bannerFile.name}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
                            Attachments
                        </Typography>
                        
                        {add_attach.length > 0 && (
                            <Box sx={{ 
                                mb: 3,
                                p: 2, 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 2,
                                backgroundColor: '#f9f9f9'
                            }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, color: '#666' }}>
                                    Current Attachments
                                </Typography>
                                <DisplayAdditionalAttach
                                    add_attach={add_attach}
                                    setAdd_attach={setAdd_attach}
                                    deleteArray={deleteArray}
                                />
                            </Box>
                        )}

                        <Box sx={{ 
                            p: 2, 
                            border: '2px dashed #ddd', 
                            borderRadius: 2,
                            backgroundColor: '#fafafa'
                        }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, color: '#666' }}>
                                Add New Attachments
                            </Typography>
                            <AddAttachments
                                attachments={new_attach}
                                setAttachments={setNew_attach}
                            />
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', position: 'sticky', bottom: 0, zIndex: 1300 }}>
                    <Button 
                        onClick={handleClose} 
                        variant="outlined"
                        sx={{ 
                            color: '#830001', 
                            borderColor: '#830001',
                            '&:hover': {
                                backgroundColor: '#830001',
                                color: 'white'
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        sx={{ 
                            backgroundColor: '#830001', 
                            color: 'white',
                            minWidth: 120,
                            '&:hover': {
                                backgroundColor: '#6a0001'
                            }
                        }}
                        disabled={submitting}
                    >
                        {submitting ? 'Updating...' : 'Update Event'}
                    </Button>
                </DialogActions>
            </form>

            <ConfirmDelete
                open={verifyDelete}
                handleClose={() => setVerifyDelete(false)}
                event={data}
            />
        </Dialog>
    )
}

function DisplayAdditionalAttach({ add_attach, setAdd_attach, deleteArray }) {
    const deleteAttachment = (idx) => {
        const values = [...add_attach]
        const attachmentToDelete = values[idx]
        
        if (attachmentToDelete.id) {
            deleteArray.current = [...deleteArray.current, {
                id: attachmentToDelete.id,
                url: attachmentToDelete.url,
                key: attachmentToDelete.key
            }]
        }
        
        values.splice(idx, 1)
        setAdd_attach(values)
    }

    return (
        <>
            {add_attach?.map((attachment, idx) => (
                <Box
                    key={idx}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        mb: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        backgroundColor: 'white',
                        '&:hover': {
                            backgroundColor: '#f5f5f5'
                        }
                    }}
                >
                    <Box sx={{ flexGrow: 1 }}>
                        <TextField
                            type="text"
                            value={attachment.caption || `Attachment ${idx + 1}`}
                            fullWidth
                            label={`Attachment ${idx + 1}`}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            variant="outlined"
                            size="small"
                            disabled
                            sx={{
                                '& .MuiInputBase-input.Mui-disabled': {
                                    WebkitTextFillColor: '#666',
                                }
                            }}
                        />
                    </Box>
                    {attachment.url && (
                        <Button
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            variant="outlined"
                            size="small"
                            startIcon={<Link />}
                            sx={{ 
                                color: '#830001',
                                borderColor: '#830001',
                                minWidth: 80,
                                '&:hover': {
                                    backgroundColor: '#830001',
                                    color: 'white'
                                }
                            }}
                        >
                            View
                        </Button>
                    )}
                    <IconButton
                        onClick={() => deleteAttachment(idx)}
                        sx={{
                            color: '#d32f2f',
                            '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.1)'
                            }
                        }}
                        size="small"
                    >
                        <Delete />
                    </IconButton>
                </Box>
            ))}
        </>
    )
}

const deleteFileFromS3 = async (key) => {
    try {
        await fetch(`/api/delete/s3-file?key=${key}`, {
            method: 'DELETE',
        })
    } catch (error) {
        console.error('Error deleting file from S3:', error)
    }
}
