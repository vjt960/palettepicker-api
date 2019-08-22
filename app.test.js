const request = require('supertest');
const app = require('./app');
const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

describe('Palette Picker API', () => {
  beforeEach(async () => {
    await database.seed.run();
  });

  describe('POST /api/v1/users', () => {
    it('should return a status of 200 and a registered user', async () => {
      const expectedUser = await database('users').first(
        'id',
        'username',
        'password'
      );
      const mockBody = {
        username: expectedUser.username,
        password: expectedUser.password
      };
      const response = await request(app)
        .post('/api/v1/users')
        .send(mockBody);
      const result = response.body;

      expect(response.status).toBe(200);
      expect(result).toEqual(expectedUser);
    });

    it('should return a 404 status if username or password is not in the body', async () => {
      const mockBody = {
        unacceptableKey: 'yeet'
      };
      const response = await request(app)
        .post('/api/v1/users')
        .send(mockBody);
      const result = response.body;
      const expected = { error: 'Username or Password not present in payload' };

      expect(response.status).toBe(422);
      expect(result).toEqual(expected);
    });

    it('should return a 401 status if username or password are incorrect', async () => {
      const mockBody = {
        username: 'wrong_username',
        password: 'wrong_password'
      };
      const response = await request(app)
        .post('/api/v1/users')
        .send(mockBody);
      const result = response.body;
      const expected = { error: 'Incorrect Username or Password.' };

      expect(response.status).toBe(401);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /api/v1/users/new', () => {
    it('should return a status of 201 and userID when creating a new user', async () => {
      const mockBody = {
        username: `NewUser ${Date.now()}`,
        password: 'password'
      };
      const response = await request(app)
        .post('/api/v1/users/new')
        .send(mockBody);
      const result = response.body;
      const expected = await database('users')
        .where('id', ...result)
        .select()
        .then(user => user[0]);

      expect(response.status).toBe(201);
      expect(...result).toEqual(expected.id);
    });

    it('should return a status of 409 if a username is already taken', async () => {
      const testUser = await database('users')
        .first()
        .select();
      const mockBody = {
        username: testUser.username,
        password: 'fake_password'
      };
      const response = await request(app)
        .post('/api/v1/users/new')
        .send(mockBody);
      const result = response.body;
      const expected = {
        error: `Username: ${testUser.username} is already taken.`
      };

      expect(response.status).toBe(409);
      expect(result).toEqual(expected);
    });
  });
