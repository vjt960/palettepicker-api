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
      console.log(result);
      const expected = await database('users')
        .where('id', result.id)
        .select('id')
        .then(user => {
          return { id: user[0] };
        });

      expect(response.status).toBe(201);
      expect(result).toEqual(expected.id);
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

    it('should return a status of 404 if user_id is not in payload', async () => {
      const mockBody = {
        name: 'new_Project002',
        description: 'example description text'
      };
      const response = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody);
      const result = response.body;
      const expected = { error: 'User ID not present in payload.' };

      expect(response.status).toBe(404);
      expect(result).toEqual(expected);
    });

    it('should return a status of 422 if request body is invalid', async () => {
      const invalidID = await database('users')
        .max('id')
        .then(obj => obj[0]['max'] + 1);
      const mockBody = {
        id: invalidID,
        name: 'new_Project001',
        description: 'example description text'
      };
      const response = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody);
      const result = response.body;
      const expected = { error: `${invalidID} is NOT a valid user ID.` };

      expect(response.status).toBe(422);
      expect(result).toEqual(expected);
    });

    it('should return a status of 409 if a project exists with the same name', async () => {
      const testProject = await database('projects').first();
      const mockBody = {
        id: testProject.user_id,
        name: testProject.name,
        description: 'example text...'
      };
      const response = await request(app)
        .post('/api/v1/users/projects/new')
        .send(mockBody);
      const result = response.body;
      const expected = {
        error: `${testProject.name} already exists. Choose a different name.`
      };

      expect(response.status).toBe(409);
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /api/v1/users/projects/:id/edit', () => {
    it('should edit the name of a project selected by id', async () => {
      const testProject = await database('projects').first();
      const mockBody = { name: 'BrandNewName', description: '' };
      const response = await request(app)
        .patch(`/api/v1/users/projects/${testProject.id}/edit`)
        .send(mockBody);
      const result = response.body.name;
      const expected = mockBody.name;
      expect(response.status).toBe(202);
      expect(result).toEqual(expected);
    });

    it('should return a status of 422 if the request body is invalid', async () => {
      const testProject = await database('projects').first();
      const mockBody = { description: 'yeet' };
      const response = await request(app)
        .patch(`/api/v1/users/projects/${testProject.id}/edit`)
        .send(mockBody);
      const result = response.body;
      const expected = { error: 'Project name not found in payload.' };
      expect(response.status).toBe(422);
      expect(result).toEqual(expected);
    });

    it('should return a status of 404 if the params id is invalid', async () => {
      const invalidID = await database('projects')
        .max('id')
        .then(obj => obj[0]['max'] + 1);
      const mockBody = { name: 'BrandNewName', description: '' };
      const response = await request(app)
        .patch(`/api/v1/users/projects/${invalidID}/edit`)
        .send(mockBody);
      const result = response.body;
      const expected = {
        error: `Project id: ${invalidID} not found.`
      };

      expect(response.status).toBe(404);
      expect(result).toEqual(expected);
    });
  });

  describe('DELETE /api/v1/users/:user_id/projects/:id', () => {
    it('should return a status of 202 and delete a project with associated palettes', async () => {
      const testProject = await database('projects')
        .first()
        .then(obj => obj);
      const response = await request(app).delete(
        `/api/v1/users/${testProject.user_id}/projects/${testProject.id}`
      );
      const result = response.body;
      const expected = testProject.id;

      expect(response.status).toBe(202);
      expect(result).toEqual(expected);
    });
  });

  // describe('GET /api/v1/users/:user_id/projects/:id/palettes', () => {
  //   // it should return all palettes of specified project
  // });

  describe('GET /api/v1/users/:user_id/palettes', () => {
    it('returns a status of 200 and all palettes of projects belonging to the user', async () => {
      const testUser = await database('users')
        .first()
        .then(obj => obj);
      const response = await request(app).get(
        `/api/v1/users/${testUser.id}/palettes`
      );
      const result = response.status;

      expect(result).toBe(200);
    });
  });

  describe('POST /api/v1/users/projects/:project_id/palettes', () => {
    it('returns a status of 201 and adds a new palette to a project', async () => {
      const testProject = await database('projects')
        .first()
        .then(obj => obj);
      const mockBody = {
        name: 'brandNewPalette',
        colors: ['#ffffff', '#000000', '#e7e7e7'],
        project_id: testProject.id
      };
      const response = await request(app)
        .post(`/api/v1/users/projects/${testProject.id}/palettes`)
        .send(mockBody);
      const result = response.body;
      const expected = await database('palettes')
        .where('id', ...result)
        .select('id')
        .then(palette => palette[0]);

      expect(response.status).toBe(201);
      expect(...result).toEqual(expected.id);
    });

    it('returns a status of 422 if the request body is invalid', async () => {
      const mockBody = { wrongKey: 'yeet', name: 'RubberDuck' };
      const response = await request(app)
        .post(`/api/v1/users/projects/9/palettes`)
        .send(mockBody);
      const result = response.body;
      const expected = { error: 'name and colors not included in payload.' };

      expect(response.status).toBe(422);
      expect(result).toEqual(expected);
    });
  });

  describe('DELETE /api/v1/projects/:project_id/palettes/:palette_id', () => {
    it('returns a status of 202 and deletes a selected palette from the database', async () => {
      const testPalette = await database('palettes').first();
      const response = await request(app).delete(
        `/api/v1/projects/${testPalette.project_id}/palettes/${testPalette.id}`
      );

      expect(response.status).toBe(202);
    });
  });
});
