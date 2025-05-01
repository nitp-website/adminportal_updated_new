import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    InputLabel
} from '@mui/material'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { enGB } from 'date-fns/locale';

import useRefreshData from '@/custom-hooks/refresh'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import Loading from '../common/Loading'
import { Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

// Add Form Component
export const AddForm = ({ handleClose, modal }) => {
    const { data: session } = useSession()
    const initialState = {
        event_type: '',
        role: '',
        event_name: '',
        sponsored_by: '',
        start_date: null,
        end_date: null,
        participants_count: ''
    }
    const [content, setContent] = useState(initialState)
    const refreshData = useRefreshData(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        setSubmitting(true);
        e.preventDefault();
        if (!content.start_date) {
            alert('Start date is required');
            setSubmitting(false);
            return;
        }

        if (!content.end_date && content.end_date !== "Continue") {
            alert('End date or "Continue" must be selected');
            setSubmitting(false);
            return;
        }
        try {
            console.log('Sending data:', {
                type: 'workshops_conferences',
                ...content,
                start_date: content.start_date
                    ? new Date(content.start_date).toLocaleDateString('en-CA') // YYYY-MM-DD
                    : null,
                end_date: content.end_date
                    ? new Date(content.end_date).toLocaleDateString('en-CA')
                    : null,
                id: Date.now().toString(),
                email: session?.user?.email,
            });
    
            const result = await fetch('/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'workshops_conferences',
                    ...content,
                    start_date: content.start_date
                        ? new Date(content.start_date).toLocaleDateString('en-CA')
                        : null,
                    end_date: content.end_date
                        ? new Date(content.end_date).toLocaleDateString('en-CA')
                        : null,
                    id: Date.now().toString(),
                    email: session?.user?.email,
                }),
            });
    
            if (!result.ok) throw new Error('Failed to create');
    
            handleClose();
            refreshData();
            setContent(initialState);
            alert('Workshop/Conference added successfully');
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setSubmitting(false);
        }
    };
    
    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Add Workshop/Conference</DialogTitle>
                <DialogContent>
                    <InputLabel id="event-type">Event Type</InputLabel>
                    <Select
                        labelId="event-type"
                        name="event_type"
                        value={content.event_type}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Faculty Development Programme">Faculty Development Programme</MenuItem>
                        <MenuItem value="Workshop">Workshop</MenuItem>
                        <MenuItem value="Conference">Conference</MenuItem>
                        <MenuItem value="Seminar">Seminar</MenuItem>
                        <MenuItem value="Symposium">Symposium</MenuItem>
                        <MenuItem value="National">National</MenuItem>
                        <MenuItem value="International">International</MenuItem>
                    </Select>
                    <InputLabel id="role">Role</InputLabel>
                    <Select
                        labelId="role"
                        name="role"
                        value={content.role}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Organizer">Organizer</MenuItem>
                        <MenuItem value="Coordinator">Coordinator</MenuItem>
                        <MenuItem value="Speaker">Speaker</MenuItem>
                        <MenuItem value="Chairman">Chairman</MenuItem>
                        <MenuItem value="Secretary">Secretary</MenuItem>
                        <MenuItem value="Participant">Participant</MenuItem>
                    </Select>
                    <TextField
                        margin="dense"
                        label="Event Name"
                        name="event_name"
                        fullWidth
                        required
                        value={content.event_name}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Sponsored By"
                        name="sponsored_by"
                        fullWidth
                        value={content.sponsored_by}
                        onChange={handleChange}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                        <DatePicker
                            label="Start Date"
                            value={content.start_date}
                            onChange={(newValue) =>
                                setContent({ ...content, start_date: newValue })
                            }
                             format="dd/MM/yyyy"
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                            required={true}
                        />
                        <DatePicker
                            label="End Date"
                            value={content.end_date}
                            onChange={(newValue) =>
                                setContent({ ...content, end_date: newValue })
                            }
                             format="dd/MM/yyyy"
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                        />
                    </LocalizationProvider>
                    <TextField
                        margin="dense"
                        label="Number of Participants"
                        name="participants_count"
                        type="number"
                        fullWidth
                        required
                        value={content.participants_count}
                        onChange={handleChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        type="submit"
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

// Edit Form Component
export const EditForm = ({ handleClose, modal, values }) => {
    const { data: session } = useSession()
    // Parse dates when initializing content
    const [content, setContent] = useState({
        ...values,
        start_date: values.start_date ? new Date(values.start_date) : null,
        end_date: values.end_date ? new Date(values.end_date) : null
    })
    const refreshData = useRefreshData(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        setSubmitting(true)
        e.preventDefault()

        try {
            const result = await fetch('/api/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'workshops_conferences',
                    ...content,
                    // Format dates before sending to API
                    start_date: content.start_date 
                        ? new Date(content.start_date).toISOString().split('T')[0]
                        : null,
                    end_date: content.end_date
                        ? new Date(content.end_date).toISOString().split('T')[0]
                        : null,
                    email: session?.user?.email
                }),
            })

            if (!result.ok) throw new Error('Failed to update')
            
            handleClose()
            refreshData()
            window.location.reload()
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Edit Workshop/Conference</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Event Type"
                        name="event_type"
                        select
                        fullWidth
                        required
                        value={content.event_type}
                        onChange={handleChange}
                    >
                        <MenuItem value="Faculty Development Programme">Faculty Development Programme</MenuItem>
                        <MenuItem value="Workshop">Workshop</MenuItem>
                        <MenuItem value="Conference">Conference</MenuItem>
                        <MenuItem value="Seminar">Seminar</MenuItem>
                        <MenuItem value="National">National</MenuItem>
                        <MenuItem value="International">International</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Role"
                        name="role"
                        select
                        fullWidth
                        required
                        value={content.role}
                        onChange={handleChange}
                    >
                        <MenuItem value="Organizer">Organizer</MenuItem>
                        <MenuItem value="Participant">Participant</MenuItem>
                        <MenuItem value="Speaker">Speaker</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                    </TextField>
                    <TextField
                        margin="dense"
                        label="Event Name"
                        name="event_name"
                        fullWidth
                        required
                        value={content.event_name}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Sponsored By"
                        name="sponsored_by"
                        fullWidth
                        value={content.sponsored_by}
                        onChange={handleChange}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                        <DatePicker
                            label="Start Date"
                            value={content.start_date}
                            onChange={(newValue) => {
                                setContent(prev => ({
                                    ...prev,
                                    start_date: newValue
                                }))
                            }}
                             format="dd/MM/yyyy"
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                            required={true}
                        />
                        <DatePicker
                            label="End Date"
                            value={content.end_date}
                            onChange={(newValue) => {
                                setContent(prev => ({
                                    ...prev,
                                    end_date: newValue
                                }))
                            }}
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                        />
                    </LocalizationProvider>
                    <TextField
                        margin="dense"
                        label="Number of Participants"
                        name="participants_count"
                        type="number"
                        fullWidth
                        value={content.participants_count}
                        onChange={handleChange}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        type="submit"
                        color="primary"
                        disabled={submitting}
                    >
                        {submitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

// Helper function to format dates
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (error) {
        console.error('Date parsing error:', error);
        return '';
    }
};

// Main Component
export default function WorkshopConferenceManagement() {
    const { data: session } = useSession()
    const [events, setEvents] = useState([])
    const [openAdd, setOpenAdd] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const refreshData = useRefreshData(false)
    const [toast, setToast] = useState({
        open: false,
        severity: 'success',
        message: ''
    })

    // Fetch data
    React.useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`/api/faculty?type=${session?.user?.email}`)
                if (!response.ok) throw new Error('Failed to fetch')
                const data = await response.json()
                setEvents(data.workshops_conferences || [])
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.email) {
            fetchEvents()
        }
    }, [session, refreshData])

    const handleEdit = (event) => {
        setSelectedEvent(event)
        setOpenEdit(true)
    }

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this event?')) {
            try {
                const response = await fetch('/api/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'workshops_conferences',
                        id,
                        email: session?.user?.email
                    }),
                })

                if (!response.ok) throw new Error('Failed to delete')
                setToast({
                    open: true,
                    severity: 'success',
                    message: 'Workshop/Conference deleted successfully!'
                  })
                window.location.reload()
                refreshData()
            } catch (error) {
                console.error('Error:', error)
            }
        }
    }

    if (loading) return <div>
        <Loading />
    </div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <Typography variant="h6">Workshop/Conference</Typography>
                <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => setOpenAdd(true)}
                >
                    Add Workshop/Conference
                </Button>
            </div>
            
                
          

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Event Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>Sponsored By</TableCell>
                            <TableCell>Participants</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {events?.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell>{event.event_name}</TableCell>
                                <TableCell>{event.event_type}</TableCell>
                                <TableCell>{event.role}</TableCell>
                                <TableCell>
                                    {new Date(event.start_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })} - {new Date(event.end_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                </TableCell>
                                <TableCell>{event.sponsored_by}</TableCell>
                                <TableCell>{event.participants_count}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        onClick={() => handleEdit(event)}
                                        color="primary"
                                        size="small"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleDelete(event.id)}
                                        color="error"
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {events?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No workshops/conferences found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <AddForm
                modal={openAdd}
                handleClose={() => setOpenAdd(false)}
            />

            {selectedEvent && (
                <EditForm
                    modal={openEdit}
                    handleClose={() => {
                        setOpenEdit(false)
                        setSelectedEvent(null)
                    }}
                    values={selectedEvent}
                />
            )}
        </div>
    )
} 