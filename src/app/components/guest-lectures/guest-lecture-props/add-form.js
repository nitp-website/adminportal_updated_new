import React, { useState, useEffect } from 'react'
import { 
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    TextField, Grid, Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material'
import { useSession } from 'next-auth/react'

export const AddForm = ({ handleClose, open, refresh }) => {
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [faculties, setFaculties] = useState([])
    const [loadingFaculties, setLoadingFaculties] = useState(false)
    
    const [content, setContent] = useState({
        seminar_name: '',
        lecturer_name: '',
        description: '',
        supervisor_email: '',
        venue: '',
        subject: '',
        date: '',
        time: '',
        abstract: '',
    })

    const [photoFile, setPhotoFile] = useState(null)

    useEffect(() => {
        if (open) {
            fetchFaculties()
        }
    }, [open])

    const fetchFaculties = async () => {
        setLoadingFaculties(true)
        try {
            // Fetch all faculties (assuming a reasonable number, or we might need a search input for scale)
            const res = await fetch('/api/faculty?type=all&limit=1000')
            const data = await res.json()
            if (data && data.data) {
                setFaculties(data.data)
            }
        } catch (error) {
            console.error('Error fetching faculties:', error)
        } finally {
            setLoadingFaculties(false)
        }
    }

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let lecturer_photo = null
            if (photoFile) {
                let fileData = new FormData()
                fileData.append('file', photoFile)
                fileData.append('fileType', 'profile')
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: fileData,
                })
                if (response.ok) {
                    const data = await response.json()
                    lecturer_photo = data.url
                } else {
                    throw new Error('Image upload failed')
                }
            }

            const finaldata = {
                id: Date.now(),
                ...content,
                date: content.date ? new Date(content.date).getTime() : null,
                lecturer_photo
            }

            const result = await fetch('/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: finaldata,
                    type: "guest_lecture"
                }),
            })

            if (!result.ok) {
                throw new Error('Failed to create guest lecture')
            }

            if (refresh) refresh()
            handleClose()
        } catch (error) {
            console.error('Error creating guest lecture:', error)
            alert('Failed to create guest lecture. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle sx={{ backgroundColor: '#830001', color: 'white', fontWeight: 600 }}>
                    Create New Guest Lecture
                </DialogTitle>
                <DialogContent sx={{ mt: 2, maxHeight: '70vh', overflowY: 'auto' }}>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Seminar Name" name="seminar_name" required value={content.seminar_name} onChange={handleChange} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Lecturer Name" name="lecturer_name" required value={content.lecturer_name} onChange={handleChange} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <Typography variant="caption" sx={{ mb: 1, color: 'text.secondary' }}>Lecturer Photo (Max 1MB)</Typography>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => setPhotoFile(e.target.files[0])} 
                                    style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </FormControl>
                        </Grid>
                        
                        <Grid item xs={12}>
                            <TextField fullWidth label="Description" name="description" multiline rows={3} value={content.description} onChange={handleChange} />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel id="supervisor-label">Supervisor (Faculty)</InputLabel>
                                <Select
                                    labelId="supervisor-label"
                                    name="supervisor_email"
                                    value={content.supervisor_email}
                                    onChange={handleChange}
                                    label="Supervisor (Faculty)"
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {loadingFaculties ? (
                                        <MenuItem disabled><CircularProgress size={20} /> Loading...</MenuItem>
                                    ) : (
                                        faculties.map((faculty) => (
                                            <MenuItem key={faculty.email} value={faculty.email}>
                                                {faculty.name} ({faculty.department})
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Subject" name="subject" value={content.subject} onChange={handleChange} />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth type="date" label="Date" name="date" InputLabelProps={{ shrink: true }} value={content.date} onChange={handleChange} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth type="time" label="Time" name="time" InputLabelProps={{ shrink: true }} value={content.time} onChange={handleChange} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth label="Venue" name="venue" value={content.venue} onChange={handleChange} />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField fullWidth label="Abstract" name="abstract" multiline rows={4} value={content.abstract} onChange={handleChange} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid #eee' }}>
                    <Button onClick={handleClose} variant="outlined" sx={{ color: '#666', borderColor: '#ccc' }} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" sx={{ backgroundColor: '#830001', '&:hover': { backgroundColor: '#9a0000' }}} disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Guest Lecture'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
