const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

app.use(bodyParser.json());
app.locals.title = 'Palette Picker Test';

// app.set('port', process.env.PORT || 3001);

app.get('/', (request, response) => {
  response.status(200).send("We're going to test all the routes!");
});

app.post('/api/v1/users', (request, response) => {
  const { username, password } = request.body;
  try {
    if (username && password) {
      database('users')
        .where('username', username)
        .andWhere('password', password)
        .select('id', 'username', 'password')
        .then(user => {
          if (user.length) {
            return response.status(200).json(...user);
          } else {
            return response
              .status(401)
              .send({ error: 'Incorrect Username or Password.' });
          }
        });
    } else {
      return response
        .status(422)
        .send({ error: 'Username or Password not present in payload' });
    }
  } catch {
    return response.status(500).send({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/users/new', (request, response) => {
  const { username, password } = request.body;
  try {
    database('users')
      .select()
      .where('username', username)
      .then(takenUser => {
        if (takenUser.length) {
          return response
            .status(409)
            .send({ error: `Username: ${username} is already taken.` });
        } else {
          database('users')
            .insert({ username, password }, 'id')
            .then(id => response.status(201).send(id));
        }
      });
  } catch {
    return response.status(500).send({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/users/:user_id/projects', (request, response) => {
  const { user_id } = request.params;
  try {
    database('projects')
      .where('user_id', user_id)
      .select('id', 'name')
      .then(projects => response.status(200).json(projects))
      .catch(() =>
        response.status(404).json({ error: `Invalid user_id in params.` })
      );
  } catch {
    return response.status(500).send({ error: 'Internal server error.' });
  }
});

app.get('/api/v1/users/:user_id/projects/:project_id', (request, response) => {
  const { user_id, project_id } = request.params;
  const projectAttributes = ['id', 'user_id', 'name', 'description'];
  try {
    database('projects')
      .where('user_id', user_id)
      .andWhere('id', project_id)
      .select(...projectAttributes)
      .then(project => response.status(200).json(project))
      .catch(() =>
        response.status(404).json({ error: 'Invalid values within params.' })
      );
  } catch {
    return response.status(500).send({ error: 'Internal server error.' });
  }
});

app.post('/api/v1/users/projects/new', (request, response) => {
  const { id, name, description } = request.body;
  try {
    if (id) {
      database('users')
        .where('id', id)
        .select('id')
        .then(existingID => {
          if (existingID.length) {
            database('projects')
              .insert({ user_id: id, name, description }, 'id')
              .then(id => response.status(201).json(id));
          } else {
            return response
              .status(422)
              .json({ error: `${id} is NOT a valid user ID.` });
          }
        });
    } else {
      return response
        .status(422)
        .json({ error: 'User ID not present in payload.' });
    }
  } catch {
    return response.status(500).send({ error: 'Internal server error.' });
  }
});

// app.listen(app.get('port'), () => {
//   console.log(
//     `${app.locals.title} is running on http://localhost:${app.get('port')}.`
//   );
// });

module.exports = app;
