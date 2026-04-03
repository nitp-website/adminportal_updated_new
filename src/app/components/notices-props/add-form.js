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
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    Divider,
    Grid
} from '@mui/material'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { AddAttachments } from './../common-props/add-attachment'
import { handleNewAttachments } from './../common-props/add-attachment'
import { administrationList, depList } from './../../../lib/const'

// Helper function to get default close date (1 month from now)
const getDefaultCloseDate = () => {
    const now = new Date()
    const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    return oneMonthLater.toISOString().split('T')[0]
}

// Helper function to get today's date
const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
}

export const AddForm = ({ handleClose, modal }) => {
    const { data: session } = useSession()
    const [submitting, setSubmitting] = useState(false)
    const [content, setContent] = useState({
        title: '',
        openDate: getTodayDate(),
        closeDate: getDefaultCloseDate(),
        
        type: session?.user?.role === 'ACADEMIC_ADMIN' ? 'academics' : 
              session?.user?.role === 'DEPT_ADMIN' ? 'department' :
              session?.user?.role === 'TENDER_NOTICE_ADMIN' ? 'tender' : 'general',
        category: session?.user?.role === 'ACADEMIC_ADMIN' ? 'academics' : 
                 session?.user?.role === 'DEPT_ADMIN' ? 'department' :
                 session?.user?.role === 'TENDER_NOTICE_ADMIN' ? 'tender' : 'general',
        important: false,
        department: session?.user?.role === 'DEPT_ADMIN' ? session.user.department : null,
        isDept: session?.user?.role === 'DEPT_ADMIN' ? 1 : 0
    })

    const [new_attach, setNew_attach] = useState([])

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? 
            e.target.checked ? 1 : 0 : 
            e.target.value;
            
        setContent({ ...content, [e.target.name]: value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let attachments = []
            if (new_attach.length) {
                const processedAttachments = await handleNewAttachments(new_attach)
                attachments = processedAttachments.map(attachment => ({
                    // id: Date.now() + Math.random(),
                    caption: attachment.caption,
                    url: attachment.url,
                    // typeLink: attachment.typeLink
                }))
            }

            const finaldata = {
                id: Date.now(),
                title: content.title,
                openDate: new Date(content.openDate).getTime(),
                closeDate: new Date(content.closeDate).getTime(),
                isVisible: 1,
                notice_type: content.type,
                category: content.category,
                timestamp: Date.now(),
                email: session.user.email,
                author: session.user.name,
                attachments:attachments,
                important: content.important,
                department: content.department || null,
                isDept: content.type === 'department' ? 1 : 0
            }

            const result = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: finaldata,
                    type: "notice"
                }),
            })

            if (!result.ok) {
                throw new Error('Failed to create notice')
            }

            window.location.reload()
        } catch (error) {
            console.error('Error creating notice:', error)
            alert('Failed to create notice. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const getNoticeTypeOptions = () => {
        if (session?.user?.role === 'ACADEMIC_ADMIN') {
            return [
                <MenuItem key="academics" value="academics">Academics</MenuItem>
            ];
        }

        if (session?.user?.role === 'DEPT_ADMIN') {
            return [
                <MenuItem key="department" value="department">Department</MenuItem>
            ];
        }

        if (session?.user?.role === 'TENDER_NOTICE_ADMIN') {
            return [
                <MenuItem key="tender" value="tender">Tender</MenuItem>
            ];
        }

        // Create array of menu items including administration list items
        return [
            <MenuItem key="general" value="general">General</MenuItem>,
            <MenuItem key="department" value="department">Department</MenuItem>,
            <MenuItem key="tender" value="tender">Tender</MenuItem>,
            ...Array.from(administrationList).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
            ))
        ];
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
                    Create New Notice
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
                            Notice Details
                        </Typography>
                        <TextField
                            margin="dense"
                            label="Notice Title"
                            name="title"
                            type="text"
                            required
                            fullWidth
                            value={content.title}
                            onChange={handleChange}
                            sx={{ mb: 2 }}
                            variant="outlined"
                            placeholder="Enter notice title..."
                        />
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    margin="dense"
                                    label="Open Date"
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
                                    label="Close Date"
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

                        <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="important"
                                        checked={Boolean(content.important)}
                                        onChange={handleChange}
                                        sx={{ 
                                            color: '#830001',
                                            '&.Mui-checked': {
                                                color: '#830001',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        Mark as Important
                                    </Typography>
                                }
                            />
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={content.type === 'department' ? 6 : 12}>
                                <FormControl fullWidth margin="dense" variant="outlined">
                                    <InputLabel>Notice Type</InputLabel>
                                    <Select
                                        name="type"
                                        value={content.type}
                                        onChange={handleChange}
                                        defaultValue={session?.user?.role === 'ACADEMIC_ADMIN' ? 'academics' : 'general'}
                                        label="Notice Type"
                                        disabled={session?.user?.role === 'DEPT_ADMIN'}
                                    >
                                        {getNoticeTypeOptions()}
                                    </Select>
                                </FormControl>
                            </Grid>
                            {content.type === 'department' && (
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>Department</InputLabel>
                                        <Select
                                            name="department"
                                            value={content.department}
                                            onChange={handleChange}
                                            label="Department"
                                            disabled={session?.user?.role === 'DEPT_ADMIN'}
                                        >
                                            {Array.from(depList).map(([key, value]) => (
                                                <MenuItem key={value} value={value}>{value}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    <Divider sx={{ my: 3 }} />

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
                        {submitting ? 'Creating...' : 'Create Notice'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}
