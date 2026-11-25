import TextField from '@mui/material/TextField'
import { Checkbox, FormControlLabel } from '@mui/material'
import React from 'react'

export const MainAttachment = ({
    mainAttachment,
    setMainAttachment,
    placeholder,
}) => {
    const handleType = (e) => {
        setMainAttachment({
            ...mainAttachment,
            typeLink: !mainAttachment.typeLink,
            url: undefined,
            value: undefined,
            key: undefined,
        })
    }
    const handleChange = (e) => {
        setMainAttachment({
            ...mainAttachment,
            [e.target.name]: e.target.value,
        })
    }

    const handleChangeFile = (e) => {
        const file = e.target.files[0]
        if (file && file.size > 20 * 1024 * 1024) {
            alert('File size must be less than 20MB')
            e.target.value = ''
            return
        }
        setMainAttachment({
            ...mainAttachment,
            url: file,
            value: e.target.value,
        })
    }

    return (
        <>
            <div>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={mainAttachment.typeLink}
                            onChange={handleType}
                            name="isLink"
                            color="primary"
                        />
                    }
                    style={{ width: `20%` }}
                    label="Link"
                />
                <div style={{ display: 'flex' }}>
                    {mainAttachment.typeLink ? (
                        <TextField
                            placeholder="File Link"
                            name="url"
                            required
                            onChange={(e) => handleChange(e)}
                            style={{ margin: `8px`, width: `90%` }}
                        />
                    ) : (
                        <TextField
                            type="file"
                            name="url"
                            value={mainAttachment.value}
                            style={{ margin: `8px` }}
                            onChange={(e) => {
                                handleChangeFile(e)
                            }}
                        />
                    )}
                </div>
            </div>
        </>
    )
}

// Helper function to upload a main attachment
export const uploadMainAttachment = async (mainAttachment, onProgress = null) => {
    if (!mainAttachment || mainAttachment.typeLink) {
        // Return the URL directly for link-type attachments
        return { url: mainAttachment?.url || '', key: '' };
    }

    if (!mainAttachment.url) {
        return { url: '', key: '' };
    }

    let file = new FormData();
    file.append('file', mainAttachment.url);
    file.append('fileType', 'general');

    try {
        // Use XMLHttpRequest for progress tracking if callback provided
        if (onProgress && typeof onProgress === 'function') {
            return await uploadWithProgress(file, onProgress);
        } else {
            let response = await fetch('/api/upload', {
                method: 'POST',
                body: file,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `File upload failed with status ${response.status}`);
            }

            let data = await response.json();
            return {
                url: data.url, // S3 URL for display
                key: data.key, // S3 key for deletion
            };
        }
    } catch (error) {
        console.error('Main attachment upload error:', error);
        throw error;
    }
}

// Helper function for upload with progress
const uploadWithProgress = (formData, onProgress) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Progress tracking
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
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
        
        xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
        });
        
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
    });
};
