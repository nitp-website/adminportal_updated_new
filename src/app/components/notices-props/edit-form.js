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
    Checkbox,
    FormControlLabel,
    Box,
    Typography,
    Divider,
    Grid,
    Chip
} from '@mui/material'
import { Delete, Link, Warning } from '@mui/icons-material'
import { useSession } from 'next-auth/react'
import React, { useRef, useState, useMemo } from 'react'
import { dateformatter } from './../common-props/date-formatter'
import { ConfirmDelete } from './confirm-delete'
import { AddAttachments } from './../common-props/add-attachment'
import { handleNewAttachments } from './../common-props/add-attachment'
import { administrationList, depList, notice_sub_types } from '@/lib/const'

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
        isVisible: 1,
        openDate: formatDateForInput(data.openDate),
        closeDate: formatDateForInput(data.closeDate),
        type: data.notice_type || 'general',
        department: data.department || null,
        important: data.important || false,
        isDept: data.isDept || 0,
        email: data?.email || null,
        // Support notice sub types in content state (default or predefined)
        notice_sub_type: data.notice_sub_type || ''
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

    // If selected notice type or predefined data has sub types, this returns the subtypes or null/undefined (Array or undefined).
    const currentNoticeSubTypes = useMemo(() => {
        if (!content.type) return undefined;
     
        let key = content.type;
       
        if (typeof key === 'string') {
            key = key.toUpperCase();
        }
        const rawSubTypes = notice_sub_types[key];
        if (Array.isArray(rawSubTypes)) {
           
            return rawSubTypes.map(arr => arr[1]);
        }
        return undefined;
    }, [content.type]);

    const handleChange = (e) => {
        const { name, type, value, checked } = e.target;
        const fieldValue = type === 'checkbox' ? (checked ? 1 : 0) : value;
        setContent((prev) => ({ ...prev, [name]: fieldValue }));
    };

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

            // For payload: pass notice_sub_type as 'notice_sub_type' property
            const finaldata = {
                id: content.id,
                title: content.title,
                email: content.email,
                openDate: new Date(content.openDate).getTime(),
                closeDate: new Date(content.closeDate).getTime(),
                notice_type: content.type,
                notice_sub_type: currentNoticeSubTypes?(content.notice_sub_type || undefined):undefined,
                category: content.category,
                updatedAt: Date.now(),
                updatedBy: session.user.email,
                attachments: attachments,
                deleteArray: deleteArray.current,
                important: content.important,
                department: content.department || null,
                isDept: content.type === 'department' ? 1 : 0
            }

            const result = await fetch('/api/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: finaldata,
                    type: "notice"
                }),
            })

            if (!result.ok) {
                throw new Error('Failed to update notice')
            }

            for (const item of deleteArray.current) {
                if (item.key) {
                    await deleteFileFromS3(item.key)
                }
            }

            window.location.reload()
        } catch (error) {
            console.error('Error updating notice:', error)
            alert('Failed to update notice. Please try again.')
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
                    Edit Notice
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
                                        label="Notice Type"
                                        disabled={session?.user?.role === 'DEPT_ADMIN'}
                                        required
                                    >
                                        {session?.user?.role === 'DEPT_ADMIN' ? (
                                            <MenuItem value="department">Department</MenuItem>
                                        ) : [
                                            <MenuItem value="general" key="general">General</MenuItem>,
                                            <MenuItem value="department" key="department">Department</MenuItem>,
                                            ...Array.from(administrationList).map(
                                                ([key, value]) => (
                                                    <MenuItem key={key} value={key}>
                                                        {value}
                                                    </MenuItem>
                                            ))
                                        ]}
                                    </Select>
                                </FormControl>
                            </Grid>
                        
                            {/* Department list select as before */}
                            {content.type === 'department' && (
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>Department</InputLabel>
                                        <Select
                                            name="department"
                                            value={session?.user?.role === 'DEPT_ADMIN' ? session.user.department : content.department}
                                            onChange={handleChange}
                                            label="Department"
                                            disabled={session?.user?.role === 'DEPT_ADMIN'}
                                            required
                                        >
                                            {session?.user?.role === 'DEPT_ADMIN' ? (
                                                <MenuItem value={session.user.department}>{session.user.department}</MenuItem>
                                            ) : (
                                                Array.from(depList).map(([key, value]) => (
                                                    <MenuItem key={value} value={value}>{value}</MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {/* If current type supports sub-types, show sub-type select */}
                            {Array.isArray(currentNoticeSubTypes) && currentNoticeSubTypes.length > 0 && (
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth margin="dense" variant="outlined">
                                        <InputLabel>Sub-Type</InputLabel>
                                        <Select
                                            name="notice_sub_type"
                                            value={content.notice_sub_type || ""}
                                            onChange={handleChange}
                                            label="Sub-Type"
                                            required
                                        >
                                            <MenuItem value="">
                                                <em>Select Sub-Type</em>
                                            </MenuItem>
                                            {currentNoticeSubTypes.map(subType =>
                                                <MenuItem key={subType} value={subType}>{subType}</MenuItem>
                                            )}
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
                        {submitting ? 'Updating...' : 'Update Notice'}
                    </Button>
                </DialogActions>
            </form>
            <ConfirmDelete
                open={verifyDelete}
                handleClose={() => setVerifyDelete(false)}
                notice={data}
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
