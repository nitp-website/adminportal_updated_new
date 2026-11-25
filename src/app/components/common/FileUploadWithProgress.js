import React, { useState } from 'react';
import {
    Button,
    LinearProgress,
    Box,
    Typography,
    Alert,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const FileUploadWithProgress = ({
    onUploadComplete,
    onUploadError,
    fileType = 'general',
    acceptedTypes = '*/*',
    maxSizeMB = 20,
    children,
    disabled = false
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const uploadFileWithProgress = async (file) => {
        if (!file) return;

        // File size validation (client-side)
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            const errorMsg = `File size must be less than ${maxSizeMB}MB`;
            setError(errorMsg);
            if (onUploadError) onUploadError(errorMsg);
            return;
        }

        setUploading(true);
        setProgress(0);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);

            // Create XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            // Promise wrapper for XMLHttpRequest
            const uploadPromise = new Promise((resolve, reject) => {
                // Progress tracking
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setProgress(percentComplete);
                    }
                });

                // Success handler
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            reject(new Error('Invalid response format'));
                        }
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.message || 'Upload failed'));
                        } catch (e) {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                });

                // Error handler
                xhr.addEventListener('error', () => {
                    reject(new Error('Network error occurred'));
                });

                // Abort handler
                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled'));
                });
            });

            // Start the upload
            xhr.open('POST', '/api/upload');
            xhr.send(formData);

            // Wait for completion
            const result = await uploadPromise;

            if (result.success) {
                setProgress(100);
                if (onUploadComplete) {
                    onUploadComplete(result.url, result.key);
                }
            } else {
                throw new Error(result.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            const errorMsg = error.message || 'Upload failed';
            setError(errorMsg);
            if (onUploadError) onUploadError(errorMsg);
        } finally {
            setUploading(false);
            // Reset progress after a short delay
            setTimeout(() => setProgress(0), 2000);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadFileWithProgress(file);
        }
    };

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <input
                accept={acceptedTypes}
                type="file"
                id="file-upload-input"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={disabled || uploading}
            />

            <label htmlFor="file-upload-input">
                {children || (
                    <Button
                        variant="outlined"
                        component="span"
                        disabled={disabled || uploading}
                        startIcon={<CloudUpload />}
                    >
                        {uploading ? 'Uploading...' : 'Choose File'}
                    </Button>
                )}
            </label>

            {uploading && (
                <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress variant="determinate" value={progress} />
                        </Box>
                        <Box sx={{ minWidth: 35 }}>
                            <Typography variant="body2" color="text.secondary">
                                {`${progress}%`}
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        Uploading... Please wait
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default FileUploadWithProgress;
