import { Test, TestingModule } from '@nestjs/testing';
import { {{NAME_PASCAL}}Controller } from './{{NAME_KEBAB}}.controller';
import { {{NAME_PASCAL}}Service } from './{{NAME_KEBAB}}.service';
import { PrismaClient } from '@lifebox/database';

/**
 * {{NAME_PASCAL}} Controller Tests
 * Generated on {{DATE}}
 */
describe('{{NAME_PASCAL}}Controller', () => {
  let controller: {{NAME_PASCAL}}Controller;
  let service: {{NAME_PASCAL}}Service;

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

  const mock{{NAME_PASCAL}}Service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    clientId: 'client-id',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [{{NAME_PASCAL}}Controller],
      providers: [
        {
          provide: {{NAME_PASCAL}}Service,
          useValue: mock{{NAME_PASCAL}}Service,
        },
        {
          provide: PrismaClient,
          useValue: mockPrismaClient,
        },
      ],
    }).compile();

    controller = module.get<{{NAME_PASCAL}}Controller>({{NAME_PASCAL}}Controller);
    service = module.get<{{NAME_PASCAL}}Service>({{NAME_PASCAL}}Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a {{NAME}}', async () => {
      const create{{NAME_PASCAL}}Dto = {
        name: 'Test {{NAME_PASCAL}}',
        description: 'Test description',
        isActive: true,
      };

      const expected{{NAME_PASCAL}} = {
        id: '{{NAME_KEBAB}}-id',
        ...create{{NAME_PASCAL}}Dto,
        clientId: 'client-id',
        createdById: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mock{{NAME_PASCAL}}Service.create.mockResolvedValue(expected{{NAME_PASCAL}});

      const result = await controller.create(create{{NAME_PASCAL}}Dto, mockUser as any);

      expect(service.create).toHaveBeenCalledWith(create{{NAME_PASCAL}}Dto, mockUser);
      expect(result).toEqual(expected{{NAME_PASCAL}});
    });
  });

  describe('findAll', () => {
    it('should return paginated {{NAME}}s', async () => {
      const expectedResult = {
        data: [
          {
            id: '{{NAME_KEBAB}}-1',
            name: 'Test {{NAME_PASCAL}} 1',
            clientId: 'client-id',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mock{{NAME_PASCAL}}Service.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(1, 10, undefined, mockUser as any);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        user: mockUser,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should handle search parameter', async () => {
      const searchTerm = 'test';
      const expectedResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mock{{NAME_PASCAL}}Service.findAll.mockResolvedValue(expectedResult);

      await controller.findAll(1, 10, searchTerm, mockUser as any);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: searchTerm,
        user: mockUser,
      });
    });
  });

  describe('findOne', () => {
    it('should return a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const expected{{NAME_PASCAL}} = {
        id: {{NAME_KEBAB}}Id,
        name: 'Test {{NAME_PASCAL}}',
        clientId: 'client-id',
      };

      mock{{NAME_PASCAL}}Service.findOne.mockResolvedValue(expected{{NAME_PASCAL}});

      const result = await controller.findOne({{NAME_KEBAB}}Id, mockUser as any);

      expect(service.findOne).toHaveBeenCalledWith({{NAME_KEBAB}}Id, mockUser);
      expect(result).toEqual(expected{{NAME_PASCAL}});
    });
  });

  describe('update', () => {
    it('should update a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const update{{NAME_PASCAL}}Dto = {
        name: 'Updated {{NAME_PASCAL}}',
        description: 'Updated description',
      };

      const expected{{NAME_PASCAL}} = {
        id: {{NAME_KEBAB}}Id,
        ...update{{NAME_PASCAL}}Dto,
        clientId: 'client-id',
        updatedAt: new Date(),
      };

      mock{{NAME_PASCAL}}Service.update.mockResolvedValue(expected{{NAME_PASCAL}});

      const result = await controller.update({{NAME_KEBAB}}Id, update{{NAME_PASCAL}}Dto, mockUser as any);

      expect(service.update).toHaveBeenCalledWith({{NAME_KEBAB}}Id, update{{NAME_PASCAL}}Dto, mockUser);
      expect(result).toEqual(expected{{NAME_PASCAL}});
    });
  });

  describe('remove', () => {
    it('should delete a {{NAME}}', async () => {
      const {{NAME_KEBAB}}Id = '{{NAME_KEBAB}}-id';
      const expectedResult = { message: '{{NAME_PASCAL}} deleted successfully' };

      mock{{NAME_PASCAL}}Service.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove({{NAME_KEBAB}}Id, mockUser as any);

      expect(service.remove).toHaveBeenCalledWith({{NAME_KEBAB}}Id, mockUser);
      expect(result).toEqual(expectedResult);
    });
  });
});