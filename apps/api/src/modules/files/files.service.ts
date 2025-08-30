import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FileUploadDto, FileUpdateDto, FileQueryDto, FileCategory, FileVisibility } from './dto/file-upload.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { Express } from 'express';
import 'multer';
import { ConfigService } from '@nestjs/config';

export interface FileUploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  filesize: number;
  url?: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  filesize: number;
  category: string;
  tags: string[];
  description?: string;
  visibility: string;
  uploadedBy: string;
  clientId?: string;
  deviceId?: string;
  path: string;
  url?: string;
  checksum?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  uploader?: any;
  client?: any;
  device?: any;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async uploadFile(
    file: any,
    uploadDto: FileUploadDto,
    userId: string,
  ): Promise<FileUploadResult> {
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const filename = `${timestamp}_${randomStr}${fileExtension}`;
    
    // Create category subdirectory
    const categoryDir = path.join(this.uploadDir, uploadDto.category);
    await fs.mkdir(categoryDir, { recursive: true });
    
    const filePath = path.join(categoryDir, filename);
    const relativePath = path.join(uploadDto.category, filename);

    try {
      // Calculate file checksum
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Check for duplicate files
      const existingFile = await this.prisma.file.findFirst({
        where: {
          checksum,
          isActive: true,
        },
      });

      if (existingFile) {
        throw new BadRequestException('File already exists in the system');
      }

      // Write file to disk
      await fs.writeFile(filePath, file.buffer);

      // Generate public URL if visibility is public
      const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
      const url = uploadDto.visibility === FileVisibility.PUBLIC 
        ? `${baseUrl}/api/files/download/${filename}`
        : undefined;

      // Save file metadata to database
      const fileRecord = await this.prisma.file.create({
        data: {
          originalName: file.originalname,
          filename,
          mimetype: file.mimetype,
          filesize: file.size,
          category: uploadDto.category,
          tags: uploadDto.tags || [],
          description: uploadDto.description,
          visibility: uploadDto.visibility,
          uploadedBy: userId,
          clientId: uploadDto.clientId,
          deviceId: uploadDto.deviceId,
          path: relativePath,
          url,
          checksum,
        },
      });

      this.logger.log(`File uploaded successfully: ${fileRecord.id} - ${file.originalname}`);

      return {
        fileId: fileRecord.id,
        filename,
        originalName: file.originalname,
        filesize: file.size,
        url,
      };
    } catch (error) {
      // Clean up file if database save fails
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        this.logger.error(`Failed to clean up file ${filePath}: ${unlinkError.message}`);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`File upload failed: ${error.message}`);
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async getFiles(queryDto: FileQueryDto, userId: string): Promise<{ files: FileMetadata[]; total: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = ['super_user', 'admin'].includes(user.role.name);
    const skip = (queryDto.page - 1) * queryDto.limit;

    const where: any = {
      isActive: queryDto.isActive !== false,
    };

    // Apply filters
    if (queryDto.category) {
      where.category = queryDto.category;
    }

    if (queryDto.clientId) {
      where.clientId = queryDto.clientId;
    }

    if (queryDto.deviceId) {
      where.deviceId = queryDto.deviceId;
    }

    if (queryDto.uploadedBy) {
      where.uploadedBy = queryDto.uploadedBy;
    }

    if (queryDto.search) {
      where.OR = [
        { originalName: { contains: queryDto.search, mode: 'insensitive' } },
        { description: { contains: queryDto.search, mode: 'insensitive' } },
      ];
    }

    if (queryDto.tags) {
      const tags = queryDto.tags.split(',').map(tag => tag.trim());
      where.tags = { hasSome: tags };
    }

    // Apply access control
    if (!isAdmin) {
      where.OR = [
        { uploadedBy: userId },
        { visibility: FileVisibility.PUBLIC },
        { 
          AND: [
            { visibility: FileVisibility.CLIENT_ONLY },
            { clientId: user.clientId },
          ]
        },
      ];
    }

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip,
        take: queryDto.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          device: {
            select: {
              id: true,
              deviceName: true,
              deviceCode: true,
            },
          },
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      files: files as FileMetadata[],
      total,
    };
  }

  async getFileById(fileId: string, userId: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check access permissions
    await this.checkFileAccess(file, userId);

    return file as FileMetadata;
  }

  async updateFile(fileId: string, updateDto: FileUpdateDto, userId: string): Promise<FileMetadata> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.checkFileAccess(file, userId);

    // Check if user can modify this file
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const isAdmin = ['super_user', 'admin'].includes(user.role.name);
    const isOwner = file.uploadedBy === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only modify files you uploaded');
    }

    // Update URL if visibility changed to/from public
    let url = file.url;
    if (updateDto.visibility !== undefined && updateDto.visibility !== file.visibility) {
      const baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
      url = updateDto.visibility === FileVisibility.PUBLIC 
        ? `${baseUrl}/api/files/download/${file.filename}`
        : null;
    }

    const updatedFile = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        ...updateDto,
        url,
      },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
          },
        },
      },
    });

    this.logger.log(`File updated: ${fileId} by user ${userId}`);
    return updatedFile as FileMetadata;
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.checkFileAccess(file, userId);

    // Check if user can delete this file
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const isAdmin = ['super_user', 'admin'].includes(user.role.name);
    const isOwner = file.uploadedBy === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete files you uploaded');
    }

    try {
      // Delete file from filesystem
      const fullPath = path.join(this.uploadDir, file.path);
      await fs.unlink(fullPath);
    } catch (error) {
      this.logger.warn(`Failed to delete physical file ${file.path}: ${error.message}`);
    }

    // Remove from database
    await this.prisma.file.delete({
      where: { id: fileId },
    });

    this.logger.log(`File deleted: ${fileId} by user ${userId}`);
    return true;
  }

  async downloadFile(filename: string, userId?: string): Promise<{ stream: Buffer; metadata: FileMetadata }> {
    const file = await this.prisma.file.findUnique({
      where: { filename },
      include: {
        uploader: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            deviceCode: true,
          },
        },
      },
    });

    if (!file || !file.isActive) {
      throw new NotFoundException('File not found');
    }

    // Check access for non-public files
    if (file.visibility !== FileVisibility.PUBLIC && userId) {
      await this.checkFileAccess(file, userId);
    }

    try {
      const fullPath = path.join(this.uploadDir, file.path);
      const buffer = await fs.readFile(fullPath);
      
      return {
        stream: buffer,
        metadata: file as FileMetadata,
      };
    } catch (error) {
      this.logger.error(`Failed to read file ${file.path}: ${error.message}`);
      throw new NotFoundException('File not accessible');
    }
  }

  async getFileStats(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const isAdmin = ['super_user', 'admin'].includes(user.role.name);

    const where: any = { isActive: true };

    if (!isAdmin) {
      where.OR = [
        { uploadedBy: userId },
        { visibility: FileVisibility.PUBLIC },
        { 
          AND: [
            { visibility: FileVisibility.CLIENT_ONLY },
            { clientId: user.clientId },
          ]
        },
      ];
    }

    const [
      totalFiles,
      totalSize,
      categoryStats,
      recentUploads,
    ] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.aggregate({
        where,
        _sum: { filesize: true },
      }),
      this.prisma.file.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
        _sum: { filesize: true },
      }),
      this.prisma.file.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          originalName: true,
          category: true,
          filesize: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalFiles,
      totalSizeBytes: totalSize._sum.filesize || 0,
      totalSizeMB: Math.round((totalSize._sum.filesize || 0) / (1024 * 1024) * 100) / 100,
      byCategory: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
        sizeBytes: stat._sum.filesize || 0,
        sizeMB: Math.round((stat._sum.filesize || 0) / (1024 * 1024) * 100) / 100,
      })),
      recentUploads,
    };
  }

  private validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
    }
  }

  private async checkFileAccess(file: any, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdmin = ['super_user', 'admin'].includes(user.role.name);
    const isOwner = file.uploadedBy === userId;
    const isPublic = file.visibility === FileVisibility.PUBLIC;
    const isClientFile = file.visibility === FileVisibility.CLIENT_ONLY && file.clientId === user.clientId;

    if (!isAdmin && !isOwner && !isPublic && !isClientFile) {
      throw new ForbiddenException('Access denied to this file');
    }
  }

  async cleanupOldFiles(daysOld: number = 30): Promise<{ deletedFiles: number; freedSpaceBytes: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldFiles = await this.prisma.file.findMany({
      where: {
        isActive: false,
        updatedAt: { lt: cutoffDate },
      },
    });

    let deletedFiles = 0;
    let freedSpaceBytes = 0;

    for (const file of oldFiles) {
      try {
        const fullPath = path.join(this.uploadDir, file.path);
        await fs.unlink(fullPath);
        await this.prisma.file.delete({ where: { id: file.id } });
        
        deletedFiles++;
        freedSpaceBytes += file.filesize;
      } catch (error) {
        this.logger.error(`Failed to cleanup file ${file.id}: ${error.message}`);
      }
    }

    this.logger.log(`Cleaned up ${deletedFiles} old files, freed ${freedSpaceBytes} bytes`);
    
    return { deletedFiles, freedSpaceBytes };
  }
}