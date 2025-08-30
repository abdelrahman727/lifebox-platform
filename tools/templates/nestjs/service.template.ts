import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, User } from '@lifebox/database';
import { Create{{NAME_PASCAL}}Dto } from './dto/create-{{NAME_KEBAB}}.dto';
import { Update{{NAME_PASCAL}}Dto } from './dto/update-{{NAME_KEBAB}}.dto';

/**
 * {{NAME_PASCAL}} Service
 * 
 * Handles business logic for {{NAME}} operations
 * Generated on {{DATE}}
 */
@Injectable()
export class {{NAME_PASCAL}}Service {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new {{NAME}}
   */
  async create(create{{NAME_PASCAL}}Dto: Create{{NAME_PASCAL}}Dto, user: User) {
    try {
      const {{NAME_CAMEL}} = await this.prisma.{{NAME_CAMEL}}.create({
        data: {
          ...create{{NAME_PASCAL}}Dto,
          createdById: user.id,
          clientId: user.clientId,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return {{NAME_CAMEL}};
    } catch (error) {
      throw new BadRequestException('Failed to create {{NAME}}');
    }
  }

  /**
   * Find all {{NAME}}s with pagination and filtering
   */
  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    user: User;
  }) {
    const { page, limit, search, user } = options;
    const offset = (page - 1) * limit;

    const where = {
      clientId: user.clientId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [{{NAME_CAMEL}}s, total] = await Promise.all([
      this.prisma.{{NAME_CAMEL}}.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.{{NAME_CAMEL}}.count({ where }),
    ]);

    return {
      data: {{NAME_CAMEL}}s,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a specific {{NAME}} by ID
   */
  async findOne(id: string, user: User) {
    const {{NAME_CAMEL}} = await this.prisma.{{NAME_CAMEL}}.findFirst({
      where: {
        id,
        clientId: user.clientId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!{{NAME_CAMEL}}) {
      throw new NotFoundException('{{NAME_PASCAL}} not found');
    }

    return {{NAME_CAMEL}};
  }

  /**
   * Update a {{NAME}}
   */
  async update(id: string, update{{NAME_PASCAL}}Dto: Update{{NAME_PASCAL}}Dto, user: User) {
    // First check if the {{NAME}} exists and user has access
    await this.findOne(id, user);

    try {
      const updated{{NAME_PASCAL}} = await this.prisma.{{NAME_CAMEL}}.update({
        where: { id },
        data: {
          ...update{{NAME_PASCAL}}Dto,
          updatedById: user.id,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return updated{{NAME_PASCAL}};
    } catch (error) {
      throw new BadRequestException('Failed to update {{NAME}}');
    }
  }

  /**
   * Delete a {{NAME}}
   */
  async remove(id: string, user: User) {
    // First check if the {{NAME}} exists and user has access
    await this.findOne(id, user);

    try {
      await this.prisma.{{NAME_CAMEL}}.delete({
        where: { id },
      });

      return { message: '{{NAME_PASCAL}} deleted successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to delete {{NAME}}');
    }
  }

  /**
   * Check if {{NAME}} exists and user has access
   */
  async exists(id: string, user: User): Promise<boolean> {
    const count = await this.prisma.{{NAME_CAMEL}}.count({
      where: {
        id,
        clientId: user.clientId,
      },
    });

    return count > 0;
  }
}