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
    InputLabel,
    InputAdornment,
    Typography
} from '@mui/material'
import { useSession } from 'next-auth/react'
import { enGB } from 'date-fns/locale';

import React, { useEffect, useState } from 'react'
import useRefreshData from '@/custom-hooks/refresh'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import AddIcon from '@mui/icons-material/Add'
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

// Add Form Component
export const AddForm = ({ handleClose, modal }) => {
    const { data: session } = useSession()
    const initialState = {
        project_title: '',
        funding_agency: '',
        financial_outlay: '',
        start_date: null,
        end_date: null,
        investigators: '',
        pi_institute: '',
        status: 'Ongoing',
        funds_received: '',
        role:""
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
            const adjustDate = (date) => {
                if (!date) return null;
                const newDate = new Date(date);
                newDate.setDate(newDate.getDate() + 1); // Increment by 1 day
                return newDate.toISOString().split('T')[0];
            };
    
            const result = await fetch('/api/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'sponsored_projects',
                    ...content,
                    start_date: adjustDate(content.start_date),
                    end_date: isContinuing ? null : adjustDate(content.end_date),
                    id: Date.now().toString(),
                    email: session?.user?.email
                }),
            });
    
            if (!result.ok) throw new Error('Failed to create');
    
            handleClose();
            refreshData();
            setContent(initialState);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            window.location.reload();
            setSubmitting(false);
        }
    };
    
        const [isContinuing, setIsContinuing] = useState(false);
            const handleContinueToggle = () => {
                setIsContinuing((prev) => !prev);
                if (!isContinuing) {
                    setContent((prev) => ({ ...prev, end_date: null }));
                }
            };

    return (
        <Dialog open={modal} onClose={handleClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Add Sponsored Project</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Project Title"
                        name="project_title"
                        fullWidth
                        required
                        value={content.project_title}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Funding Agency"
                        name="funding_agency"
                        fullWidth
                        required
                        value={content.funding_agency}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Financial Outlay (₹)"
                        name="financial_outlay"
                        type="number"
                        fullWidth
                        required
                        value={content.financial_outlay}
                        onChange={handleChange}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
                            disabled={isContinuing}
                            format="dd/MM/yyyy"
                            Consultancy
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                        />
                    </LocalizationProvider>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isContinuing}
                                onChange={handleContinueToggle}
                                color="primary"
                            />
                        }
                        label="Currently Working"
                        style={{ marginTop: '10px' }}
                    />
                    <TextField
                        margin="dense"
                        label="Investigators"
                        name="investigators"
                        fullWidth
                        value={content.investigators}
                        onChange={handleChange}
                        helperText="Enter names separated by commas"
                    />
                    <TextField
                        margin="dense"
                        label="PI Institute"
                        name="pi_institute"
                        fullWidth
                        value={content.pi_institute}
                        onChange={handleChange}
                    />
                    <InputLabel id="status">Project Status</InputLabel>
                    <Select
                        labelId="status"
                        name="status"
                        value={content.status}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Ongoing">Ongoing</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                        <MenuItem value="Terminated">Terminated</MenuItem>
                    </Select>
                    <TextField
                        margin="dense"
                        label="Funds Received (₹)"
                        name="funds_received"
                        type="number"
                        fullWidth
                        value={content.funds_received}
                        onChange={handleChange}
                    />
                    <InputLabel id="status">Role</InputLabel>
                    <Select
                        labelId="role"
                        name="role"
                        value={content.role}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Principal Investigator">Principal Investigator</MenuItem>
                        <MenuItem value="Co Principal Investigator">Co Principal Investigator</MenuItem>
                        <MenuItem value="Research">Research</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        {/* <MenuItem value="Terminated">Terminated</MenuItem> */}
                    </Select>
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
    const [content, setContent] = useState(values)
    const refreshData = useRefreshData(false)
    const [submitting, setSubmitting] = useState(false)

    const handleChange = (e) => {
        setContent({ ...content, [e.target.name]: e.target.value })
    }

    useEffect(()=>{
        setIsContinuing(content.end_date === null)
    },[])
    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const result = await fetch('/api/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'sponsored_projects',
                    ...content,
                    start_date:new Date(content.start_date).toISOString().split('T')[0],
                    email: session?.user?.email,
                    end_date: isContinuing ? null : new Date(content.end_date).toISOString().split('T')[0]
                }),
        })

            if (!result.ok) throw new Error('Failed to update')

            handleClose()
            refreshData()
            window.location.reload()
        } catch (error) {
            console.error('Error:', error)
        } finally {
            window.location.href()
            setSubmitting(false)
        }
    }

     const [isContinuing, setIsContinuing] = useState(false);
        const handleContinueToggle = () => {
            setIsContinuing((prev) => !prev);
            if (!isContinuing) {
                setContent((prev) => ({ ...prev, end_date: null }));
            }
        };

    return (
        <Dialog
            open={modal}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            disableBackdropClick
            disableEscapeKeyDown
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle>Edit Sponsored Project</DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Project Title"
                        name="project_title"
                        fullWidth
                        required
                        value={content.project_title}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Funding Agency"
                        name="funding_agency"
                        fullWidth
                        required
                        value={content.funding_agency}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Financial Outlay"
                        name="financial_outlay"
                        type="number"
                        fullWidth
                        required
                        value={content.financial_outlay}
                        onChange={handleChange}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
                        <DatePicker
                            label="Start Date"
                            value={new Date(content.start_date)}
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
                            value={content.end_date ?new Date(content.end_date):""}
                            onChange={(newValue) =>
                                setContent({ ...content, end_date: newValue })
                            }
                            disabled={isContinuing}
                            renderInput={(params) => (
                                <TextField {...params} fullWidth margin="dense" />
                            )}
                        />
                    </LocalizationProvider>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isContinuing}
                                onChange={handleContinueToggle}
                                color="primary"
                            />
                        }
                        label="Currently Working"
                        style={{ marginTop: '10px' }}
                    />
                    <TextField
                        margin="dense"
                        label="Duration (months)"
                        name="period_months"
                        type="number"
                        fullWidth
                        // required
                        value={content.period_months}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        label="Co-Investigators"
                        name="investigators"
                        fullWidth
                        multiline
                        rows={2}
                        value={content.investigators}
                        onChange={handleChange}
                        helperText="Enter names separated by commas"
                    />
                    <InputLabel id="status">Project Status</InputLabel>
                    <Select
                        labelId="status"
                        name="status"
                        value={content.status}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Ongoing">Ongoing</MenuItem>
                        <MenuItem value="Completed">Completed</MenuItem>
                        <MenuItem value="Terminated">Terminated</MenuItem>
                    </Select>

                    <InputLabel id="status">Role</InputLabel>
                    <Select
                        labelId="role"
                        name="role"
                        value={content.role}
                        onChange={handleChange}
                        fullWidth
                        required
                    >
                        <MenuItem value="Principal Investigator">Principal Investigator</MenuItem>
                        <MenuItem value="Co Principal Investigator">Co Principal Investigator</MenuItem>
                        <MenuItem value="Research">Research</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        {/* <MenuItem value="Terminated">Terminated</MenuItem> */}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
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

// Main Component
export default function SponsoredProjectManagement() {
    const { data: session } = useSession()
    const [projects, setProjects] = useState([])
    const [openAdd, setOpenAdd] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)
    const [loading, setLoading] = useState(true)
    const refreshData = useRefreshData(false)

    // Fetch data
    React.useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`/api/faculty?type=${session?.user?.email}`)
                if (!response.ok) throw new Error('Failed to fetch')
                const data = await response.json()
                setProjects(data.sponsored_projects || [])
            } catch (error) {
                console.error('Error:', error)
            } finally {
                setLoading(false)
            }
        }

        if (session?.user?.email) {
            fetchProjects()
        }
    }, [session, refreshData])

    const handleEdit = (project) => {
        setSelectedProject(project)
        setOpenEdit(true)
    }

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                const response = await fetch('/api/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'sponsored_projects',
                        id,
                        email: session?.user?.email,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to delete');
                }

                setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id));
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to delete the project. Please try again.');
            }
        }
    };

    if (loading) return <div>Loading...</div>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <Typography variant="h6">Sponsored Projects</Typography>
                <Button
                    startIcon={<AddIcon />}
                    variant="contained"
                    onClick={() => setOpenAdd(true)}
                >
                    Add Sponsored Project
                </Button>
            </div>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Title</TableCell>
                            <TableCell>Agency</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Outlay (₹)</TableCell>
                            <TableCell>Duration</TableCell>
                            <TableCell>PI Institute</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Funds Received</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {projects?.map((project) => (
                            <TableRow key={project.id}>
                                <TableCell>{project.project_title}</TableCell>
                                <TableCell>{project.funding_agency}</TableCell>
                                <TableCell>{project.role? project.role:"-"}</TableCell>
                                <TableCell>{project.financial_outlay}</TableCell>
                                <TableCell>
                                    {new Date(project.start_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })} - {project.end_date ? new Date(project.end_date).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        }):"continue"}
                                </TableCell>
                                <TableCell>{project.pi_institute}</TableCell>
                                <TableCell>{project.status}</TableCell>
                                <TableCell>{project.funds_received}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        onClick={() => handleEdit(project)}
                                        color="primary"
                                        size="small"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleDelete(project.id)}
                                        color="error"
                                        size="small"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {projects?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No projects found
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

            {selectedProject && (
                <EditForm
                    modal={openEdit}
                    handleClose={() => {
                        setOpenEdit(false)
                        setSelectedProject(null)
                    }}
                    values={selectedProject}
                />
            )}
        </div>
    )
}