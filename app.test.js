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
        username: `NewUser`,
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

  describe('GET /api/v1/users/:user_id/projects', () => {
    it('should return a status of 200 and projects of the user', async () => {
      const expectedUser = await database('users')
        .first()
        .select();
      const response = await request(app).get(
        `/api/v1/users/${expectedUser.id}/projects`
      );
      const result = response.body;
      const expected = await database('projects')
        .where('user_id', expectedUser.id)
        .select('id', 'name');

      expect(response.status).toEqual(200);
      expect(result.id).toEqual(expected.id);
      expect(result.id).toEqual(expected.title);
    });

    it('should return a status of 404 if the request params do not match', async () => {
      const response = await request(app).get('/api/v1/users/x99/projects');
      const result = response.body;
      const expected = { error: 'Invalid user_id.' };

      expect(response.status).toBe(404);
      expect(result).toEqual(expected);
    });

    it('should return a status of 404 if the user has no projects', async () => {
      const newUserID = await database('users')
        .insert({ username: 'Kanye', password: 'genius' }, 'id')
        .then(obj => obj[0]);
      const response = await request(app).get(
        `/api/v1/users/${newUserID}/projects`
      );
      const result = response.body;
      const expected = { error: 'No projects found under user_id.' };

      expect(response.status).toBe(404);
      expect(result).toEqual(expected);
  });
  });

  describe('GET /api/v1/users/:user_id/projects/:project_id', () => {
    it('should return a status of 200 and an entire project object by project.id', async () => {
      const project = ['id', 'user_id', 'name', 'description'];
      const expected = await database('projects')
        .first()
        .select(...project);
      const response = await request(app).get(
        `/api/v1/users/${expected.user_id}/projects/${expected.id}`
      );
      const result = response.body;

      expect(response.status).toBe(200);
      expect(...result).toEqual(expected);
    });

    it('should return a status of 404 if request params do not match', async () => {
      const response = await request(app).get('/api/v1/users/x9/projects/x8');
      const result = response.body;
      const expected = { error: 'Invalid values within params.' };

      expect(response.status).toBe(404);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /api/v1/users/projects/new', () => {
    it('should return a status of 201 with the ID of the new project', async () => {
      const testUser = await database('users')
        .first()
        .select();
      const mockBody = {
        id: testUser.id,
        name: 'new_Project001',
        description: 'example description text'
      };
      const response = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody);
      const result = response.body;
      const expected = await database('projects')
        .where('id', ...result)
        .select('id')
        .then(project => project[0]);

      expect(response.status).toBe(201);
      expect(...result).toEqual(expected.id);
    });

    it('should return a status of 422 if request body is invalid', async () => {
      let invalidID = 1;
      const validIDs = await database('users')
        .select('id')
        .then(users => users.map(obj => obj.id));
      while (validIDs.includes(invalidID)) {
        invalidID++;
        return;
      }
      const mockBody1 = {
        id: invalidID,
        name: 'new_Project001',
        description: 'example description text'
      };
      const mockBody2 = {
        name: 'new_Project002',
        description: 'example description text'
      };
      const response1 = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody1);
      const response2 = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody2);
      const result1 = response1.body;
      const result2 = response2.body;
      const expected1 = { error: `${invalidID} is NOT a valid user ID.` };
      const expected2 = { error: 'User ID not present in payload.' };

      expect(response1.status).toBe(422);
      expect(result1).toEqual(expected1);
      expect(response2.status).toBe(422);
      expect(result2).toEqual(expected2);
    });
  });

  describe('PATCH /api/v1/users/projects/:id/edit', () => {
    // it should update project name by ID
    // response will be
    expect(true).toEqual(true);
  });

  describe('DELETE /api/v1/users/:user_id/projects/:id', () => {
    // it should delete all palette rows with the matching project_id
    // it should delete the selected project
    // response will be message
  });

  describe('GET /api/v1/users/:user_id/projects/:id/palettes', () => {
    // it should return all palettes of specified project
  });

  describe('GET /api/v1/users/:user_id/palettes', () => {
    // return all palettes belonging to any project of the user
  });
});
