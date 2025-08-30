import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import 'multer';
import { FilesService } from './files.service';
import { FileUploadDto, FileUpdateDto, FileQueryDto, FileCategory, FileVisibility } from './dto/file-upload.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Upload a file
   */
  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file',
    description: 'Upload a file with metadata and categorization',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            fileId: { type: 'string' },
            filename: { type: 'string' },
            originalName: { type: 'string' },
            filesize: { type: 'number' },
            url: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body() uploadDto: FileUploadDto,
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.filesService.uploadFile(file, uploadDto, user.id);

      return {
        success: true,
        data: result,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get files with filtering and pagination
   */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get files',
    description: 'Retrieve files with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
  })
  async getFiles(
    @Query() queryDto: FileQueryDto,
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.filesService.getFiles(queryDto, user.id);

      return {
        success: true,
        data: result.files,
        pagination: {
          page: queryDto.page,
          limit: queryDto.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / queryDto.limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve files: ${error.message}`);
    }
  }

  /**
   * Get file by ID
   */
  @Get(':fileId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get file by ID',
    description: 'Retrieve detailed information about a specific file',
  })
  @ApiParam({
    name: 'fileId',
    description: 'File ID',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
  })
  async getFileById(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    try {
      const file = await this.filesService.getFileById(fileId, user.id);

      return {
        success: true,
        data: file,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve file: ${error.message}`);
    }
  }

  /**
   * Update file metadata
   */
  @Put(':fileId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update file metadata',
    description: 'Update file metadata and properties',
  })
  @ApiParam({
    name: 'fileId',
    description: 'File ID',
  })
  @ApiResponse({
    status: 200,
    description: 'File updated successfully',
  })
  async updateFile(
    @Param('fileId') fileId: string,
    @Body() updateDto: FileUpdateDto,
    @CurrentUser() user: any,
  ) {
    try {
      const file = await this.filesService.updateFile(fileId, updateDto, user.id);

      return {
        success: true,
        data: file,
        message: 'File updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update file: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  @Delete(':fileId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete a file and its metadata',
  })
  @ApiParam({
    name: 'fileId',
    description: 'File ID',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    try {
      await this.filesService.deleteFile(fileId, user.id);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Download file by filename (supports public access)
   */
  @Get('download/:filename')
  @ApiOperation({
    summary: 'Download file',
    description: 'Download a file by filename. Public files can be accessed without authentication.',
  })
  @ApiParam({
    name: 'filename',
    description: 'Generated filename',
  })
  @ApiResponse({
    status: 200,
    description: 'File downloaded successfully',
  })
  async downloadFile(
    @Param('filename') filename: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { stream, metadata } = await this.filesService.downloadFile(filename, user?.id);

      // Set response headers
      res.set({
        'Content-Type': metadata.mimetype,
        'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
        'Content-Length': metadata.filesize.toString(),
      });

      return new StreamableFile(stream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get file statistics
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get file statistics',
    description: 'Get comprehensive file statistics (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'File statistics retrieved successfully',
  })
  async getFileStats(@CurrentUser() user: any) {
    try {
      const stats = await this.filesService.getFileStats(user.id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve file statistics: ${error.message}`);
    }
  }

  /**
   * Cleanup old files
   */
  @Post('admin/cleanup')
  @UseGuards(RolesGuard)
  @Roles('super_user', 'admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cleanup old files',
    description: 'Remove old inactive files from storage (Admin only)',
  })
  @ApiQuery({
    name: 'daysOld',
    description: 'Number of days old for files to be considered for cleanup',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'File cleanup completed successfully',
  })
  async cleanupOldFiles(
    @Query('daysOld') daysOld: number = 30,
    @CurrentUser() user: any,
  ) {
    try {
      const result = await this.filesService.cleanupOldFiles(daysOld);

      return {
        success: true,
        data: result,
        message: `Cleanup completed: ${result.deletedFiles} files deleted, ${Math.round(result.freedSpaceBytes / (1024 * 1024))}MB freed`,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to cleanup files: ${error.message}`);
    }
  }

  /**
   * Get file categories and options
   */
  @Get('options/categories')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get file options',
    description: 'Get available file categories and visibility options',
  })
  @ApiResponse({
    status: 200,
    description: 'File options retrieved successfully',
  })
  async getFileOptions() {
    return {
      success: true,
      data: {
        categories: [
          {
            value: FileCategory.PROFILE,
            name: 'Profile',
            description: 'User profile images and documents',
          },
          {
            value: FileCategory.DOCUMENT,
            name: 'Document',
            description: 'General business documents',
          },
          {
            value: FileCategory.REPORT,
            name: 'Report',
            description: 'Generated reports and analytics',
          },
          {
            value: FileCategory.DEVICE_IMAGE,
            name: 'Device Image',
            description: 'Photos and images of IoT devices',
          },
          {
            value: FileCategory.CERTIFICATE,
            name: 'Certificate',
            description: 'Certificates and official documents',
          },
          {
            value: FileCategory.MANUAL,
            name: 'Manual',
            description: 'User manuals and guides',
          },
          {
            value: FileCategory.WARRANTY,
            name: 'Warranty',
            description: 'Warranty documents and agreements',
          },
          {
            value: FileCategory.INVOICE,
            name: 'Invoice',
            description: 'Invoices and billing documents',
          },
          {
            value: FileCategory.OTHER,
            name: 'Other',
            description: 'Other files and documents',
          },
        ],
        visibility: [
          {
            value: FileVisibility.PUBLIC,
            name: 'Public',
            description: 'Accessible by anyone with the link',
          },
          {
            value: FileVisibility.PRIVATE,
            name: 'Private',
            description: 'Only accessible by the uploader',
          },
          {
            value: FileVisibility.CLIENT_ONLY,
            name: 'Client Only',
            description: 'Accessible by all users within the same client',
          },
        ],
        limits: {
          maxFileSizeMB: 50,
          maxFiles: 1000,
          allowedFileTypes: [
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
          ],
        },
      },
    };
  }

  /**
   * Bulk file operations
   */
  @Post('bulk/delete')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk delete files',
    description: 'Delete multiple files at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete completed',
  })
  async bulkDeleteFiles(
    @Body() body: { fileIds: string[] },
    @CurrentUser() user: any,
  ) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const fileId of body.fileIds) {
        try {
          await this.filesService.deleteFile(fileId, user.id);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`${fileId}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: results,
        message: `Bulk delete completed: ${results.success} successful, ${results.failed} failed`,
      };
    } catch (error) {
      throw new BadRequestException(`Bulk delete failed: ${error.message}`);
    }
  }
}