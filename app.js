const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

app.use(bodyParser.json());
app.locals.title = 'Palette Picker Test';

// app.set('port', process.env.PORT || 3001);

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
    return response.sendStatus(500);
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
    return response.sendStatus(500);
  }
});

app.get('/api/v1/users/:user_id/projects', (request, response) => {
  const { user_id } = request.params;
  try {
    database
      .raw(
        `
      SELECT projects.id, projects.name AS title, projects.description, 
      json_agg(json_build_object('id', palettes.id, 'name', palettes.name, 'colors', palettes.colors)) 
      AS palettes 
      FROM projects 
      INNER JOIN palettes ON projects.id = palettes.project_id 
      WHERE projects.user_id = ${user_id} 
      GROUP BY projects.id
    `
      )
      .then(data => {
        if (data.rows.length) {
          response.status(200).json(data.rows);
        } else {
          response
            .status(404)
            .json({ error: 'No projects found under user_id.' });
        }
      })
      .catch(() => response.status(404).json({ error: 'Invalid user_id.' }));
  } catch {
    return response.sendStatus(500);
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
    return response.sendStatus(500);
  }
});

app.post('/api/v1/users/projects/new', (request, response) => {
  const { id, name, description } = request.body;
  try {
    if (id) {
      database('users')
        .where('id', id)
        .select('id')
        .then(activeID => {
          if (activeID.length) {
            database('projects')
              .where('user_id', id)
              .andWhere('name', name)
              .select()
              .then(existngName => {
                if (!existngName.length) {
                  database('projects')
                    .insert({ user_id: id, name, description }, 'id')
                    .then(id => response.status(201).json(id));
                } else {
                  response.status(409).json({
                    error: `${name} already exists. Choose a different name.`
                  });
                }
              });
          } else {
            return response
              .status(422)
              .json({ error: `${id} is NOT a valid user ID.` });
          }
        });
    } else {
      return response
        .status(404)
        .json({ error: 'User ID not present in payload.' });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.patch('/api/v1/users/projects/:id/edit', (request, response) => {
  const { id } = request.params;
  const { name, description } = request.body;
  try {
    if (name) {
      database('projects')
        .where('id', id)
        .update({ name, description }, ['id', 'name'])
        .then(obj => {
          if (obj.length) {
            return response.status(202).json(...obj);
          } else {
            return response
              .status(404)
              .json({ error: `Project id: ${id} not found.` });
          }
        });
    } else {
      return response
        .status(422)
        .json({ error: 'Project name not found in payload.' });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.delete('/api/v1/users/:user_id/projects/:id', (request, response) => {
  const { user_id, id } = request.params;
  try {
    database('palettes')
      .where('project_id', id)
      .del()
      .then(() =>
        database('projects')
          .where('user_id', user_id)
          .andWhere('id', id)
          .del()
          .then(() => response.status(202).json(Number(id)))
      );
  } catch {
    return response.sendStatus(500);
  }
});

app.get('/api/v1/users/:user_id/palettes', (request, response) => {
  const { user_id } = request.params;
  try {
    database('palettes')
      .join('projects', 'palettes.project_id', 'projects.id')
      .select('palettes.*')
      .where('projects.user_id', user_id)
      .then(palettes => response.status(200).json(palettes));
  } catch {
    return response.sendStatus(500);
  }
});

// app.listen(app.get('port'), () => {
//   console.log(
//     `${app.locals.title} is running SHIT on http://localhost:${app.get(
//       'port'
//     )}.`
//   );
// });

module.exports = app;
