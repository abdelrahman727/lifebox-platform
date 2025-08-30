import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '@lifebox/database';

/**
 * {{NAME_PASCAL}} E2E Tests
 * Generated on {{DATE}}
 */
describe('{{NAME_PASCAL}} (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authToken: string;
  let testClientId: string;
  let testUserId: string;

  const testUser = {
    email: 'test@example.com',
    password: 'testpassword',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaClient);
    
    await app.init();

    // Create test client and user
    const client = await prisma.client.create({
      data: {
        name: 'Test Client',
        email: 'client@test.com',
        isActive: true,
      },
    });
    testClientId = client.id;

    const user = await prisma.user.create({
      data: {
        ...testUser,
        clientId: testClientId,
        role: 'ADMIN',
        isActive: true,
      },
    });
    testUserId = user.id;

    // Get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.{{NAME_CAMEL}}.deleteMany({ where: { clientId: testClientId } });
    await prisma.user.deleteMany({ where: { clientId: testClientId } });
    await prisma.client.delete({ where: { id: testClientId } });
    
    await app.close();
  });

  describe('POST /{{NAME_KEBAB}}', () => {
    it('should create a new {{NAME}}', async () => {
      const create{{NAME_PASCAL}}Dto = {
        name: 'Test {{NAME_PASCAL}}',
        description: 'Test description',
        isActive: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/{{NAME_KEBAB}}')
        .set('Authorization', `Bearer ${authToken}`)
        .send(create{{NAME_PASCAL}}Dto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: create{{NAME_PASCAL}}Dto.name,
        description: create{{NAME_PASCAL}}Dto.description,
        isActive: create{{NAME_PASCAL}}Dto.isActive,
        clientId: testClientId,
        createdById: testUserId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 400 for invalid data', async () => {
      const invalid{{NAME_PASCAL}}Dto = {
        name: '', // Invalid: empty name
        description: 'Test description',
      };

      await request(app.getHttpServer())
        .post('/api/v1/{{NAME_KEBAB}}')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalid{{NAME_PASCAL}}Dto)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      const create{{NAME_PASCAL}}Dto = {
        name: 'Test {{NAME_PASCAL}}',
        description: 'Test description',
      };

      await request(app.getHttpServer())
        .post('/api/v1/{{NAME_KEBAB}}')
        .send(create{{NAME_PASCAL}}Dto)
        .expect(401);
    });
  });

  describe('GET /{{NAME_KEBAB}}', () => {
    let test{{NAME_PASCAL}}Id: string;

    beforeEach(async () => {
      // Create a test {{NAME}} for each test
      const {{NAME_CAMEL}} = await prisma.{{NAME_CAMEL}}.create({
        data: {
          name: 'Test {{NAME_PASCAL}} for GET',
          description: 'Test description',
          isActive: true,
          clientId: testClientId,
          createdById: testUserId,
        },
      });
      test{{NAME_PASCAL}}Id = {{NAME_CAMEL}}.id;
    });

    afterEach(async () => {
      // Clean up test {{NAME}}
      await prisma.{{NAME_CAMEL}}.deleteMany({
        where: { clientId: testClientId },
      });
    });

    it('should return paginated {{NAME}}s', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/{{NAME_KEBAB}}')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: test{{NAME_PASCAL}}Id,
            name: 'Test {{NAME_PASCAL}} for GET',
            clientId: testClientId,
          }),
        ]),
        meta: {
          total: expect.any(Number),
          page: 1,
          limit: 10,
          totalPages: expect.any(Number),
        },
      });
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/{{NAME_KEBAB}}?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });

    it('should handle search parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/{{NAME_KEBAB}}?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Test'),
          }),
        ])
      );
    });
  });

  describe('GET /{{NAME_KEBAB}}/:id', () => {
    let test{{NAME_PASCAL}}Id: string;

    beforeEach(async () => {
      const {{NAME_CAMEL}} = await prisma.{{NAME_CAMEL}}.create({
        data: {
          name: 'Test {{NAME_PASCAL}} for GET by ID',
          description: 'Test description',
          isActive: true,
          clientId: testClientId,
          createdById: testUserId,
        },
      });
      test{{NAME_PASCAL}}Id = {{NAME_CAMEL}}.id;
    });

    afterEach(async () => {
      await prisma.{{NAME_CAMEL}}.deleteMany({
        where: { clientId: testClientId },
      });
    });

    it('should return a specific {{NAME}}', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/{{NAME_KEBAB}}/${test{{NAME_PASCAL}}Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: test{{NAME_PASCAL}}Id,
        name: 'Test {{NAME_PASCAL}} for GET by ID',
        description: 'Test description',
        clientId: testClientId,
      });
    });

    it('should return 404 for non-existent {{NAME}}', async () => {
      const nonExistentId = 'non-existent-id';

      await request(app.getHttpServer())
        .get(`/api/v1/{{NAME_KEBAB}}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /{{NAME_KEBAB}}/:id', () => {
    let test{{NAME_PASCAL}}Id: string;

    beforeEach(async () => {
      const {{NAME_CAMEL}} = await prisma.{{NAME_CAMEL}}.create({
        data: {
          name: 'Test {{NAME_PASCAL}} for UPDATE',
          description: 'Original description',
          isActive: true,
          clientId: testClientId,
          createdById: testUserId,
        },
      });
      test{{NAME_PASCAL}}Id = {{NAME_CAMEL}}.id;
    });

    afterEach(async () => {
      await prisma.{{NAME_CAMEL}}.deleteMany({
        where: { clientId: testClientId },
      });
    });

    it('should update a {{NAME}}', async () => {
      const update{{NAME_PASCAL}}Dto = {
        name: 'Updated {{NAME_PASCAL}} Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/{{NAME_KEBAB}}/${test{{NAME_PASCAL}}Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update{{NAME_PASCAL}}Dto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: test{{NAME_PASCAL}}Id,
        name: update{{NAME_PASCAL}}Dto.name,
        description: update{{NAME_PASCAL}}Dto.description,
        updatedById: testUserId,
      });
    });

    it('should return 404 for non-existent {{NAME}}', async () => {
      const nonExistentId = 'non-existent-id';
      const update{{NAME_PASCAL}}Dto = {
        name: 'Updated Name',
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/{{NAME_KEBAB}}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update{{NAME_PASCAL}}Dto)
        .expect(404);
    });
  });

  describe('DELETE /{{NAME_KEBAB}}/:id', () => {
    let test{{NAME_PASCAL}}Id: string;

    beforeEach(async () => {
      const {{NAME_CAMEL}} = await prisma.{{NAME_CAMEL}}.create({
        data: {
          name: 'Test {{NAME_PASCAL}} for DELETE',
          description: 'Test description',
          isActive: true,
          clientId: testClientId,
          createdById: testUserId,
        },
      });
      test{{NAME_PASCAL}}Id = {{NAME_CAMEL}}.id;
    });

    it('should delete a {{NAME}}', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/{{NAME_KEBAB}}/${test{{NAME_PASCAL}}Id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify the {{NAME}} was deleted
      const deleted{{NAME_PASCAL}} = await prisma.{{NAME_CAMEL}}.findUnique({
        where: { id: test{{NAME_PASCAL}}Id },
      });
      expect(deleted{{NAME_PASCAL}}).toBeNull();
    });

    it('should return 404 for non-existent {{NAME}}', async () => {
      const nonExistentId = 'non-existent-id';

      await request(app.getHttpServer())
        .delete(`/api/v1/{{NAME_KEBAB}}/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});