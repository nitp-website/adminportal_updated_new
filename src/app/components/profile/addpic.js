import { Button, IconButton, CircularProgress, LinearProgress, Box, Typography, Alert } from '@mui/material'
import { Delete } from '@mui/icons-material'
import React, { useState } from 'react'

export const AddPic = ({
    attachments,
    setAttachments,
    attachmentTypes = "image/*",
    onUploadComplete
}) => {
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState({})
    const [errors, setErrors] = useState({})

    async function handleChangeFile(i, event) {
        const file = event.target.files[0]
        if (!file) return

        // File size validation (1MB for images, 20MB for others)
        const maxSize = attachmentTypes.includes('image') ? 1024 * 1024 : 20 * 1024 * 1024
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024)
            const errorMsg = `File size must be less than ${maxSizeMB}MB`
            setErrors(prev => ({ ...prev, [i]: errorMsg }))
            return
        }

        setUploading(true)
        setUploadProgress(prev => ({ ...prev, [i]: 0 }))
        setErrors(prev => ({ ...prev, [i]: '' }))

        const values = [...attachments]
        values[i].value = event.target.value

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('fileType', attachmentTypes.includes('image') ? 'profile' : 'general')

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest()

            const uploadPromise = new Promise((resolve, reject) => {
                // Progress tracking
                xhr.upload.addEventListener('progress', (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100)
                        setUploadProgress(prev => ({ ...prev, [i]: percentComplete }))
                    }
                })

                // Success handler
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText)
                            resolve(response)
                        } catch (e) {
                            reject(new Error('Invalid response format'))
                        }
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText)
                            reject(new Error(response.message || 'Upload failed'))
                        } catch (e) {
                            reject(new Error(`Upload failed with status ${xhr.status}`))
                        }
                    }
                })

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error occurred'))
                })
            })

            // Start the upload
            xhr.open('POST', '/api/upload')
            xhr.send(formData)

            const data = await uploadPromise

            if (data.success) {
                values[i].url = data.url
                values[i].key = data.key
                setAttachments(values)
                
                if (onUploadComplete) {
                    onUploadComplete(data.url, data.key)
                }
                
                // Clear progress after success
                setTimeout(() => {
                    setUploadProgress(prev => {
                        const newProgress = { ...prev }
                        delete newProgress[i]
                        return newProgress
                    })
                }, 2000)
            } else {
                throw new Error(data.message || 'Upload failed')
            }
        } catch (error) {
            console.error('Upload error:', error)
            const errorMsg = error.message || 'Failed to upload file'
            setErrors(prev => ({ ...prev, [i]: errorMsg }))
            
            // Clear progress on error
            setUploadProgress(prev => {
                const newProgress = { ...prev }
                delete newProgress[i]
                return newProgress
            })
        } finally {
            setUploading(false)
        }
    }

    function handleRemove(i) {
        const values = [...attachments]
        
        if (values[i].key) {
            deleteFileFromS3(values[i].key)
        }
        
        // Clear any progress or error for this item
        setUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[i]
            return newProgress
        })
        setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors[i]
            return newErrors
        })
        
        values.splice(i, 1)
        setAttachments(values)
    }
    
    async function deleteFileFromS3(key) {
        try {
            const response = await fetch(`/api/delete/s3-file?key=${key}`, {
                method: 'DELETE',
            })
            
            if (response.ok) {
                console.log(`File deleted successfully: ${key}`)
            } else {
                const errorData = await response.json()
                console.error('Delete failed:', errorData.message)
            }
        } catch (error) {
            console.error('Error deleting file from S3:', error)
        }
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            {attachments.map((attachment, idx) => (
                <Box key={`${attachment}-${idx}`} sx={{ mb: 2 }}>
                    {/* Error display */}
                    {errors[idx] && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {errors[idx]}
                        </Alert>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Button
                            variant="outlined"
                            component="label"
                            size="small"
                            disabled={uploading}
                        >
                            {uploading && uploadProgress[idx] !== undefined ? 
                                <CircularProgress size={20} /> : 'Choose File'
                            }
                            <input
                                type="file"
                                hidden
                                accept={attachmentTypes}
                                onChange={(e) => handleChangeFile(idx, e)}
                            />
                        </Button>
                        
                        {attachment.value && (
                            <span style={{ marginLeft: '8px', fontSize: '0.875rem' }}>
                                {attachment.value.split('\\').pop()}
                            </span>
                        )}

                        <IconButton
                            onClick={() => handleRemove(idx)}
                            color="error"
                            size="small"
                            disabled={uploading}
                        >
                            <Delete />
                        </IconButton>
                    </div>
                    
                    {/* Progress bar */}
                    {uploadProgress[idx] !== undefined && (
                        <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box sx={{ width: '100%', mr: 1 }}>
                                    <LinearProgress variant="determinate" value={uploadProgress[idx]} />
                                </Box>
                                <Box sx={{ minWidth: 35 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {`${uploadProgress[idx]}%`}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            ))}
        </div>
    )
}
