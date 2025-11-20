/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';

jest.setTimeout(20000);

describe('Happy Path Optimizado (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const { AppModule } = await import('../../src/app.module');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('debe completar el flujo completo optimizado', async () => {
    const timestamp = Date.now();

    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `test_${timestamp}@example.com`,
        password: 'Test123!',
      })
      .expect(201);

    authToken = registerRes.body.access_token;

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    const petRes = await request(app.getHttpServer())
      .post('/api/pets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'TestPet',
        species: 'Dog',
        breed: 'Test Breed',
        birthDate: '2020-01-01',
        sex: 'male',
      })
      .expect(201);

    const petId = petRes.body.id;

    const healthRes = await request(app.getHttpServer())
      .post('/api/health')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        petId,
        type: 'vaccine',
        date: '2023-01-01',
        title: 'Test Vaccine',
        description: 'Test',
      })
      .expect(201);

    const healthRecordId = healthRes.body.id;

    await request(app.getHttpServer())
      .post('/api/media/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('test'), 'test.png')
      .field('entityType', 'health')
      .field('entityId', healthRecordId)
      .field('healthRecordId', healthRecordId)
      .expect(201);

    const verifyRes = await request(app.getHttpServer())
      .get(`/api/health/${healthRecordId}`)
      .expect(200);

    expect(verifyRes.body.mediaIds).toBeDefined();
    expect(verifyRes.body.mediaIds.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
