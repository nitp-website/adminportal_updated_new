import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { randomBytes } from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log('Upload attempt - Not authenticated');
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const fileType = formData.get('fileType') || 'general'; // 'profile', 'general', etc.
    const directoryId = formData.get('directoryId');

    if (!file) {
      console.log('Upload attempt - No file provided');
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // File size validation
    const maxSize = fileType === 'profile' ? 1024 * 1024 : 20 * 1024 * 1024; // 1MB for profile, 20MB for others
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      console.log(`Upload attempt - File too large: ${file.size} bytes (max: ${maxSize} bytes)`);
      return NextResponse.json(
        { message: `File size must be less than ${maxSizeMB}MB` },
        { status: 400 }
      );
    }

    // File type validation for profile images
    if (fileType === 'profile' && !file.type.startsWith('image/')) {
      console.log(`Upload attempt - Invalid file type for profile: ${file.type}`);
      return NextResponse.json(
        { message: 'Profile pictures must be image files' },
        { status: 400 }
      );
    }

    console.log(`Upload started - File: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}, User: ${session.user.email}`);

    // Resolve directory and s3_prefix
    const { query } = require('@/lib/db');
    let s3Prefix = 'notices/default/';
    let resolvedDirectoryId = null;

    if (directoryId) {
      try {
        const dirResult = await query('SELECT id, s3_prefix FROM file_directories WHERE id = ? AND is_active = TRUE', [directoryId]);
        if (dirResult && dirResult.length > 0) {
          s3Prefix = dirResult[0].s3_prefix;
          resolvedDirectoryId = dirResult[0].id;
        } else {
          console.log(`Upload warning: directoryId ${directoryId} not found or inactive. Falling back to default.`);
        }
      } catch (e) {
        console.error('Error fetching directory prefix:', e);
      }
    }

    // Fallback to default directory if not resolved
    if (!resolvedDirectoryId) {
      try {
        const defaultResult = await query('SELECT id FROM file_directories WHERE slug = ?', ['default']);
        if (defaultResult && defaultResult.length > 0) {
          resolvedDirectoryId = defaultResult[0].id;
        }
      } catch (e) {
        console.error('Error fetching default directory:', e);
      }
    }

    // Convert file to buffer and generate unique key
    const buffer = await file.arrayBuffer();
    const originalFilename = file.name;
    const fileExtension = originalFilename.split('.').pop();
    const storedFilename = `${Date.now()}-${randomBytes(8).toString('hex')}${fileExtension ? '.' + fileExtension : ''}`;
    const uniqueKey = `${s3Prefix}${storedFilename}`;

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueKey,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Generate public URL
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueKey}`;

    console.log(`Upload successful - Key: ${uniqueKey}, URL: ${fileUrl}`);

    return NextResponse.json({
      success: true,
      s3Key: uniqueKey,
      s3Url: fileUrl,
      url: fileUrl, // Backwards compatibility for existing UI
      originalFilename: originalFilename,
      storedFilename: storedFilename,
      mimeType: file.type,
      fileSize: file.size,
      directoryId: resolvedDirectoryId
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}

// Configure size limits
export const config = {
  api: {
    bodyParser: false
  }
};