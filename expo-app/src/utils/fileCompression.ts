/**
 * File compression utilities for images and documents
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Compression settings
const IMAGE_COMPRESSION_QUALITY = 0.6; // 60% quality - good balance of size and quality
const MAX_IMAGE_DIMENSION = 1200; // Max width/height for images
const PDF_MAX_SIZE_MB = 5; // Max PDF size in MB before warning

export interface CompressedFile {
    uri: string;
    name: string;
    type: string;
    size: number;
    originalSize: number;
    compressionRatio: number;
}

export interface CompressionOptions {
    quality?: number; // 0-1, default 0.6
    maxWidth?: number;
    maxHeight?: number;
}

/**
 * Compress an image file
 */
export async function compressImage(
    uri: string,
    options: CompressionOptions = {}
): Promise<CompressedFile> {
    const {
        quality = IMAGE_COMPRESSION_QUALITY,
        maxWidth = MAX_IMAGE_DIMENSION,
        maxHeight = MAX_IMAGE_DIMENSION,
    } = options;

    try {
        // Get original file info
        const originalInfo = await FileSystem.getInfoAsync(uri);
        const originalSize = originalInfo.exists ? (originalInfo as any).size || 0 : 0;

        // Compress and resize
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [
                {
                    resize: {
                        width: maxWidth,
                        height: maxHeight,
                    },
                },
            ],
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        // Get compressed file info
        const compressedInfo = await FileSystem.getInfoAsync(result.uri);
        const compressedSize = compressedInfo.exists ? (compressedInfo as any).size || 0 : 0;

        // Extract filename
        const filename = uri.split('/').pop() || 'image.jpg';
        const baseName = filename.replace(/\.[^/.]+$/, '');

        return {
            uri: result.uri,
            name: `${baseName}_compressed.jpg`,
            type: 'image/jpeg',
            size: compressedSize,
            originalSize,
            compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
        };
    } catch (error) {
        console.error('Image compression failed:', error);
        throw new Error('Failed to compress image');
    }
}

/**
 * Compress a profile/avatar image (smaller, square)
 */
export async function compressProfileImage(uri: string): Promise<CompressedFile> {
    return compressImage(uri, {
        quality: 0.7,
        maxWidth: 500,
        maxHeight: 500,
    });
}

/**
 * Compress a document image (certificate, ID, etc.)
 */
export async function compressDocumentImage(uri: string): Promise<CompressedFile> {
    return compressImage(uri, {
        quality: 0.65,
        maxWidth: 1500,
        maxHeight: 2000,
    });
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
}

/**
 * Check if file is a PDF
 */
export function isPdfFile(mimeType: string): boolean {
    return mimeType === 'application/pdf';
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(bytes: number): number {
    return bytes / (1024 * 1024);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Process a file for upload - compresses images, passes through PDFs
 */
export async function processFileForUpload(
    uri: string,
    mimeType: string,
    filename: string
): Promise<CompressedFile> {
    // Get original file info
    const originalInfo = await FileSystem.getInfoAsync(uri);
    const originalSize = originalInfo.exists ? (originalInfo as any).size || 0 : 0;

    // If it's an image, compress it
    if (isImageFile(mimeType)) {
        return compressDocumentImage(uri);
    }

    // If it's a PDF, just return as-is (PDF compression is complex)
    // But warn if too large
    if (isPdfFile(mimeType)) {
        const sizeMB = getFileSizeMB(originalSize);
        if (sizeMB > PDF_MAX_SIZE_MB) {
            console.warn(`PDF is ${sizeMB.toFixed(2)}MB, which exceeds recommended ${PDF_MAX_SIZE_MB}MB`);
        }

        return {
            uri,
            name: filename,
            type: mimeType,
            size: originalSize,
            originalSize,
            compressionRatio: 1,
        };
    }

    // For other file types, return as-is
    return {
        uri,
        name: filename,
        type: mimeType,
        size: originalSize,
        originalSize,
        compressionRatio: 1,
    };
}

/**
 * Create FormData with compressed file
 */
export async function createCompressedFormData(
    fieldName: string,
    uri: string,
    mimeType: string,
    filename: string
): Promise<{ formData: FormData; compressed: CompressedFile }> {
    const compressed = await processFileForUpload(uri, mimeType, filename);

    const formData = new FormData();
    formData.append(fieldName, {
        uri: compressed.uri,
        name: compressed.name,
        type: compressed.type,
    } as any);

    return { formData, compressed };
}

export default {
    compressImage,
    compressProfileImage,
    compressDocumentImage,
    processFileForUpload,
    createCompressedFormData,
    isImageFile,
    isPdfFile,
    getFileSizeMB,
    formatFileSize,
};
