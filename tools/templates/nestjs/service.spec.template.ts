import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { {{NAME_PASCAL}}Service } from './{{NAME_KEBAB}}.service';
import { PrismaClient } from '@lifebox/database';

/**
 * {{NAME_PASCAL}} Service Tests
 * Generated on {{DATE}}
 */
describe('{{NAME_PASCAL}}Service', () => {
  let service: {{NAME_PASCAL}}Service;
  let prisma: PrismaClient;

  const mockPrismaClient = {
    {{NAME_CAMEL}}: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    clientId: 'client-id',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {{NAME_PASCAL}}Service,
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    service = module.get<{{NAME_PASCAL}}Service>({{NAME_PASCAL}}Service);
    prisma = module.get<PrismaClient>(PrismaClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a {{NAME}}', async () => {
      const create{{NAME_PASCAL}}Dto = {
        name: 'Test {{NAME_PASCAL}}',
        description: 'Test description',
        isActive: true,
      };

      const created{{NAME_PASCAL}} = {
        id: '{{NAME_KEBAB}}-id',
        ...create{{NAME_PASCAL}}Dto,
        clientId: 'client-id',
        createdById: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      mockPrismaClient.{{NAME_CAMEL}}.create.mockResolvedValue(created{{NAME_PASCAL}});

      const result = await service.create(create{{NAME_PASCAL}}Dto, mockUser as any);

      expect(prisma.{{NAME_CAMEL}}.create).toHaveBeenCalledWith({
        data: {
          ...create{{NAME_PASCAL}}Dto,
          createdById: mockUser.id,
          clientId: mockUser.clientId,
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
      expect(result).toEqual(created{{NAME_PASCAL}});
    });

    it('should throw BadRequestException on creation failure', async () => {
      const create{{NAME_PASCAL}}Dto = {
        name: 'Test {{NAME_PASCAL}}',
        description: 'Test description',
        isActive: true,
      };

      mockPrismaClient.{{NAME_CAMEL}}.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(create{{NAME_PASCAL}}Dto, mockUser as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated {{NAME}}s', async () => {
      const {{NAME_CAMEL}}s = [
        {
          id: '{{NAME_KEBAB}}-1',
          name: 'Test {{NAME_PASCAL}} 1',
          clientId: 'client-id',
        },
      ];

      mockPrismaClient.{{NAME_CAMEL}}.findMany.mockResolvedValue({{NAME_CAMEL}}s);
      mockPrismaClient.{{NAME_CAMEL}}.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        user: mockUser as any,
      });

      expect(result).toEqual({
        data: {{NAME_CAMEL}}s,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      expect(prisma.{{NAME_CAMEL}}.findMany).toHaveBeenCalledWith({
        where: {
          clientId: mockUser.clientId,
        },
        take: 10,
        skip: 0,
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
      });
    });

    it('should handle search parameter', async () => {
      const searchTerm = 'test';
      mockPrismaClient.{{NAME_CAMEL}}.findMany.mockResolvedValue([]);
      mockPrismaClient.{{NAME_CAMEL}}.count.mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        search: searchTerm,
        user: mockUser as any,
      });

      expect(prisma.{{NAME_CAMEL}}.findMany).toHaveBeenCalledWith({
        where: {
          clientId: mockUser.clientId,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        take: 10,
        skip: 0,
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
      });
    });
  });

  describe('findOne', () => {
    it('should return a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const {{NAME_CAMEL}} = {
        id: {{NAME_KEBAB}}Id,
        name: 'Test {{NAME_PASCAL}}',
        clientId: 'client-id',
      };

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue({{NAME_CAMEL}});

      const result = await service.findOne({{NAME_KEBAB}}Id, mockUser as any);

      expect(prisma.{{NAME_CAMEL}}.findFirst).toHaveBeenCalledWith({
        where: {
          id: {{NAME_KEBAB}}Id,
          clientId: mockUser.clientId,
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
      expect(result).toEqual({{NAME_CAMEL}});
    });

    it('should throw NotFoundException when {{NAME}} not found', async () => {
      const {{NAME_KEBAB}}Id = 'non-existent-id';

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue(null);

      await expect(service.findOne({{NAME_KEBAB}}Id, mockUser as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const update{{NAME_PASCAL}}Dto = {
        name: 'Updated {{NAME_PASCAL}}',
      };

      const existing{{NAME_PASCAL}} = {
        id: {{NAME_KEBAB}}Id,
        name: 'Test {{NAME_PASCAL}}',
        clientId: 'client-id',
      };

      const updated{{NAME_PASCAL}} = {
        ...existing{{NAME_PASCAL}},
        ...update{{NAME_PASCAL}}Dto,
        updatedAt: new Date(),
      };

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue(existing{{NAME_PASCAL}});
      mockPrismaClient.{{NAME_CAMEL}}.update.mockResolvedValue(updated{{NAME_PASCAL}});

      const result = await service.update({{NAME_KEBAB}}Id, update{{NAME_PASCAL}}Dto, mockUser as any);

      expect(result).toEqual(updated{{NAME_PASCAL}});
    });

    it('should throw NotFoundException when {{NAME}} not found for update', async () => {
      const {{NAME_KEBAB}}Id = 'non-existent-id';
      const update{{NAME_PASCAL}}Dto = {
        name: 'Updated {{NAME_PASCAL}}',
      };

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue(null);

      await expect(service.update({{NAME_KEBAB}}Id, update{{NAME_PASCAL}}Dto, mockUser as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const existing{{NAME_PASCAL}} = {
        id: {{NAME_KEBAB}}Id,
        name: 'Test {{NAME_PASCAL}}',
        clientId: 'client-id',
      };

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue(existing{{NAME_PASCAL}});
      mockPrismaClient.{{NAME_CAMEL}}.delete.mockResolvedValue(existing{{NAME_PASCAL}});

      const result = await service.remove({{NAME_KEBAB}}Id, mockUser as any);

      expect(prisma.{{NAME_CAMEL}}.delete).toHaveBeenCalledWith({
        where: { id: {{NAME_KEBAB}}Id },
      });
      expect(result).toEqual({ message: '{{NAME_PASCAL}} deleted successfully' });
    });

    it('should throw NotFoundException when {{NAME}} not found for deletion', async () => {
      const {{NAME_KEBAB}}Id = 'non-existent-id';

      mockPrismaClient.{{NAME_CAMEL}}.findFirst.mockResolvedValue(null);

      await expect(service.remove({{NAME_KEBAB}}Id, mockUser as any))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('should return true when {{NAME}} exists', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';

      mockPrismaClient.{{NAME_CAMEL}}.count.mockResolvedValue(1);

      const result = await service.exists({{NAME_KEBAB}}Id, mockUser as any);

      expect(result).toBe(true);
      expect(prisma.{{NAME_CAMEL}}.count).toHaveBeenCalledWith({
        where: {
          id: {{NAME_KEBAB}}Id,
          clientId: mockUser.clientId,
        },
      });
    });

    it('should return false when {{NAME}} does not exist', async () => {
      const {{NAME_KEBAB}}Id = 'non-existent-id';

      mockPrismaClient.{{NAME_CAMEL}}.count.mockResolvedValue(0);

      const result = await service.exists({{NAME_KEBAB}}Id, mockUser as any);

      expect(result).toBe(false);
    });
  });
});