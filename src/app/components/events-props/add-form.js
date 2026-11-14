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
    Grid,
    Typography,
    Divider,
    Box
} from '@mui/material'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { AddAttachments } from './../common-props/add-attachment'
import { handleNewAttachments } from './../common-props/add-attachment'

// Helper function to get today's date
const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
}

// Helper function to get default close date (1 month from now)
const getDefaultCloseDate = () => {
    const now = new Date()
    const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    return oneMonthLater.toISOString().split('T')[0]
}

export const AddForm = ({ handleClose, modal }) => {
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [content, setContent] = useState({
        title: '',
        openDate: getTodayDate(),
        closeDate: getDefaultCloseDate(),
        venue: '',
        doclink: '',
        eventStartDate: getTodayDate(),
        eventEndDate: getTodayDate(),
        type: 'general',
    })

    const [new_attach, setNew_attach] = useState([])
    const [bannerFile, setBannerFile] = useState(null)
   

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let attachments = []
            if (new_attach.length) {
                const processedAttachments = await handleNewAttachments(new_attach)
                attachments = processedAttachments.map(attachment => ({
                    caption: attachment.caption,
                    url: attachment.url,
                    typeLink: attachment.typeLink
                }))
            }

            let banner_image = null
            if (bannerFile) {
                let fileData = new FormData()
                fileData.append('file', bannerFile)
                fileData.append('fileType', 'general')
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: fileData,
                })
                if (response.ok) {
                    const data = await response.json()
                    banner_image = data.url
                }
            }

            const finaldata = {
                id: Date.now(),
                title: content.title,
                openDate: new Date(content.openDate).getTime(),
                closeDate: new Date(content.closeDate).getTime(),
                eventStartDate: new Date(content.eventStartDate).getTime(),
                eventEndDate: new Date(content.eventEndDate).getTime(),
                venue: content.venue,
                doclink: content.doclink,
                type: content.type,
                timestamp: Date.now(),
                email: session.user.email,
                author: session.user.name,
                event_link: null,
                attachments: attachments,
                banner_image: banner_image
            }

            const result = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: finaldata,
                    type: "event"
                }),
            })

            if (!result.ok) {
                throw new Error('Failed to create event')
            }

            window.location.reload()
        } catch (error) {
            console.error('Error creating event:', error)
            alert('Failed to create event. Please try again.')
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
                        position: 'sticky',
                        top: 0,
                        zIndex: 1300
                    }}
                >
                    Create New Event
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
                            placeholder="Enter event title..."
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
                                    placeholder="Enter venue..."
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
                                    helperText="Default: 1 month from today"
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
                            sx={{ mb: 2 }}
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
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setBannerFile(e.target.files[0])}
                                style={{ marginBottom: '8px', width: '100%' }}
                            />
                            {bannerFile && (
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Selected: {bannerFile.name}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2, color: '#333', fontWeight: 500 }}>
                            Attachments
                        </Typography>
                        <Box sx={{ 
                            p: 2, 
                            border: '2px dashed #ddd', 
                            borderRadius: 2,
                            backgroundColor: '#fafafa'
                        }}>
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
                        {submitting ? 'Creating...' : 'Create Event'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
