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
import React, { useState, useMemo, useEffect } from 'react'
import { AddAttachments } from './../common-props/add-attachment'
import { handleNewAttachments } from './../common-props/add-attachment'
import { administrationList, depList, notice_sub_types } from './../../../lib/const'

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
        // category is not used in API - left as is for now
        type: session?.user?.role === 'ACADEMIC_ADMIN' ? 'academics' : 
              session?.user?.role === 'DEPT_ADMIN' ? 'department' :
              session?.user?.role === 'TENDER_NOTICE_ADMIN' ? 'tender' :
              session?.user?.role === 'EXAM_ADMIN' ? 'exam' : 
              session?.user?.specialPermissions?.length > 0 ? session.user.specialPermissions[0] : 'general',
        category: session?.user?.role === 'ACADEMIC_ADMIN' ? 'academics' : 
                 session?.user?.role === 'DEPT_ADMIN' ? 'department' :
                 session?.user?.role === 'TENDER_NOTICE_ADMIN' ? 'tender' :
                 session?.user?.role === 'EXAM_ADMIN' ? 'exam' : 
                 session?.user?.specialPermissions?.length > 0 ? session.user.specialPermissions[0] : 'general',
        important: false,
        is_new: false,
        department: session?.user?.role === 'DEPT_ADMIN' ? session.user.department : null,
        isDept: session?.user?.role === 'DEPT_ADMIN' ? 1 : 0,
        notice_sub_type: '',
        additional_title: ''
    })

    const [new_attach, setNew_attach] = useState([])
    
    // File Management State
    const [directories, setDirectories] = useState([]);
    const [mappings, setMappings] = useState([]);

    useEffect(() => {
        // Fetch active directories and mappings
        const fetchFileManagementData = async () => {
            try {
                const [dirRes, mapRes] = await Promise.all([
                    fetch('/api/file-management/directories'),
                    fetch('/api/file-management/mappings')
                ]);
                if (dirRes.ok && mapRes.ok) {
                    const dirs = await dirRes.json();
                    const maps = await mapRes.json();
                    const activeDirs = dirs.filter(d => d.is_active);
                    setDirectories(activeDirs);
                    setMappings(maps);
                }
            } catch (err) {
                console.error("Failed to load file management config:", err);
            }
        };
        fetchFileManagementData();
    }, []);

    // Get the available sub-types for the currently selected notice type
    const availableSubTypes = useMemo(() => {
        const typeKey = content.type?.toUpperCase()
        if (typeKey && notice_sub_types?.hasOwnProperty(typeKey)) {
            return notice_sub_types[typeKey]
        }
        return null
    }, [content.type])

    const handleChange = (e) => {
        const { name, type, checked, value } = e.target
        let v = type === 'checkbox' ? (checked ? 1 : 0) : value

        // If user selects a new notice type, reset sub_type
        if (name === "type") {
            setContent({ ...content, [name]: v, notice_sub_type: '' })
        } else {
            setContent({ ...content, [name]: v })
        }
    }

    // Filter available directories based on type and sub_type
    const availableDirectories = useMemo(() => {
        if (!directories.length) return [];
        
        return directories.filter(dir => {
            if (dir.slug === 'default') return true; // Default is always available
            
            // Check mappings
            const dirMappings = mappings.filter(m => m.directory_id === dir.id);
            if (dirMappings.length === 0) return false;
            
            return dirMappings.some(m => {
                const typeMatches = m.notice_type === content.type;
                if (!typeMatches) return false;
                
                // If mapping has no sub_type, it's valid for all sub_types of this type
                if (!m.notice_sub_type) return true;
                
                // Otherwise exact match required
                return m.notice_sub_type === content.notice_sub_type;
            });
        });
    }, [directories, mappings, content.type, content.notice_sub_type]);



    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            let attachments = []
            let fileMetadata = []
            if (new_attach.length) {
                const processedAttachments = await handleNewAttachments(new_attach, null)
                attachments = processedAttachments.map(attachment => ({
                    caption: attachment.caption,
                    url: attachment.url
                }))
                // Extract rich metadata if available
                fileMetadata = processedAttachments
                    .filter(att => att.fileMetadata)
                    .map(att => att.fileMetadata)
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
                attachments,
                important: content.important,
                is_new: content.is_new,
                department: content.department || null,
                isDept: content.type === 'department' ? 1 : 0,
                notice_sub_type: content.notice_sub_type ? content.notice_sub_type: undefined,
                additional_title: content.additional_title?.trim() || null
            }

            // Remove notice_sub_type if not needed
            if (!content.notice_sub_type) {
                delete finaldata.notice_sub_type
            }

            const result = await fetch('/api/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: finaldata,
                    fileMetadata: fileMetadata.length > 0 ? fileMetadata : undefined,
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
        if (session?.user?.role === 'TENDER_NOTICE_ADMIN') {
            return [
                <MenuItem key="tender" value="tender">Tender</MenuItem>
            ];
        }
        if (session?.user?.role === 'EXAM_ADMIN') {
            return [
                <MenuItem key="exam" value="exam">Examination Section</MenuItem>
            ];
        }
        if (session?.user?.specialPermissions?.length > 0) {
            const items = [];
            if (session.user.specialPermissions.includes('admissions')) {
                items.push(<MenuItem key="admissions" value="admissions">Admissions</MenuItem>);
            }
            if (session.user.specialPermissions.includes('job')) {
                items.push(<MenuItem key="job" value="job">JOB / Recruitment</MenuItem>);
            }
            return items;
        }
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
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
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
                        <TextField
                            margin="dense"
                            label="Additional Title (Optional)"
                            name="additional_title"
                            type="text"
                            fullWidth
                            value={content.additional_title}
                            onChange={handleChange}
                            sx={{ mb: 2 }}
                            variant="outlined"
                            placeholder="Enter additional title (optional)..."
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

                        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
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
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="is_new"
                                        checked={Boolean(content.is_new)}
                                        onChange={handleChange}
                                        sx={{ 
                                            color: '#00796b',
                                            '&.Mui-checked': {
                                                color: '#00796b',
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        Mark as New
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
                                        disabled={session?.user?.role === 'DEPT_ADMIN' || session?.user?.role === 'ACADEMIC_ADMIN' || session?.user?.role === 'TENDER_NOTICE_ADMIN' || session?.user?.role === 'EXAM_ADMIN' || (session?.user?.specialPermissions?.length === 1)}
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
                            {availableSubTypes && (
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>Sub Notice Type</InputLabel>
                                        <Select
                                            name="notice_sub_type"
                                            value={content.notice_sub_type}
                                            onChange={handleChange}
                                            label="Sub Notice Type"
                                            required
                                        >
                                            {availableSubTypes.map(([id, label]) => {
                                                const val = content.type?.toLowerCase() === 'admissions' ? id : label;
                                                return <MenuItem key={id} value={val}>{label}</MenuItem>;
                                            })}
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
                                showDirectorySelector={true}
                                directories={availableDirectories}
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
