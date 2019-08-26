const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const environment = process.env.NODE_ENV || 'development';
const configuration = require('./knexfile')[environment];
const database = require('knex')(configuration);

app.use(bodyParser.json());
app.locals.title = 'Palette Picker Test';

// app.set('port', process.env.PORT || 3001);

app.post('/api/v1/users', async (request, response) => {
  const { username, password } = request.body;
  try {
    if (username && password) {
      const user = await database('users')
        .where('username', username)
        .andWhere('password', password)
        .select('id', 'username', 'password');
      if (user.length) {
        return response.status(200).json(...user);
      } else {
        return response
          .status(401)
          .send({ error: 'Incorrect Username or Password.' });
      }
    } else {
      return response
        .status(422)
        .send({ error: 'Username or Password not present in payload' });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.post('/api/v1/users/new', async (request, response) => {
  const { username, password } = request.body;
  try {
    const takenUser = await database('users')
      .select()
      .where('username', username);
    if (takenUser.length) {
      return response
        .status(409)
        .send({ error: `Username: ${username} is already taken.` });
    } else {
      const id = await database('users').insert({ username, password }, 'id');
      response.status(201).send({ id: id[0] });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.get('/api/v1/users/:user_id/projects', async (request, response) => {
  const { user_id } = request.params;
  try {
    const data = await database.raw(
      `
      SELECT projects.id, projects.name AS title, projects.description, 
      json_agg(json_build_object('id', palettes.id, 'name', palettes.name, 'colors', palettes.colors)) 
      AS palettes 
      FROM projects 
      INNER JOIN palettes ON projects.id = palettes.project_id 
      WHERE projects.user_id = ${user_id} 
      GROUP BY projects.id
    `
    );
    // .catch(() => response.status(404).json({ error: 'Invalid user_id.' }));
    if (data.rows.length) {
      response.status(200).json(data.rows);
    } else {
      response.status(404).json({ error: 'No projects found under user_id.' });
    }
  } catch {
    // return response.sendStatus(500);
    return response.status(404).json({ error: 'Invalid user_id.' });
  }
});

app.get(
  '/api/v1/users/:user_id/projects/:project_id',
  async (request, response) => {
    const { user_id, project_id } = request.params;
    const projectAttributes = ['id', 'user_id', 'name', 'description'];
    try {
      const project = await database('projects')
        .where('user_id', user_id)
        .andWhere('id', project_id)
        .select(...projectAttributes);
      // .catch(() =>
      //   response.status(404).json({ error: 'Invalid values within params.' })
      // );
      response.status(200).json(project);
    } catch {
      // return response.sendStatus(500);
      return response
        .status(404)
        .json({ error: 'Invalid values within params.' });
    }
  }
);

app.post('/api/v1/users/projects/new', async (request, response) => {
  const { id, name, description } = request.body;
  try {
    if (id) {
      const activeID = await database('users')
        .where('id', id)
        .select('id');
      if (activeID.length) {
        const existngName = await database('projects')
          .where('user_id', id)
          .andWhere('name', name)
          .select();
        if (!existngName.length) {
          const newID = await database('projects').insert(
            { user_id: id, name, description },
            'id'
          );
          response.status(201).json(newID);
        } else {
          response.status(409).json({
            error: `${name} already exists. Choose a different name.`
          });
        }
      } else {
        return response
          .status(422)
          .json({ error: `${id} is NOT a valid user ID.` });
      }
    } else {
      return response
        .status(404)
        .json({ error: 'User ID not present in payload.' });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.patch('/api/v1/users/projects/:id/edit', async (request, response) => {
  const { id } = request.params;
  const { name, description } = request.body;
  try {
    if (name) {
      const projectObj = await database('projects')
        .where('id', id)
        .update({ name, description }, ['id', 'name']);
      if (projectObj.length) {
        return response.status(202).json(...projectObj);
      } else {
        return response
          .status(404)
          .json({ error: `Project id: ${id} not found.` });
      }
    } else {
      return response
        .status(422)
        .json({ error: 'Project name not found in payload.' });
    }
  } catch {
    return response.sendStatus(500);
  }
});

app.delete('/api/v1/users/:user_id/projects/:id', async (request, response) => {
  const { user_id, id } = request.params;
  try {
    await database('palettes')
      .where('project_id', id)
      .del();
    await database('projects')
      .where('user_id', user_id)
      .andWhere('id', id)
      .del();
    response.status(202).json(Number(id));
  } catch {
    return response.sendStatus(500);
  }
});

app.get('/api/v1/users/:user_id/palettes', async (request, response) => {
  const { user_id } = request.params;
  try {
    const palettes = await database('palettes')
      .join('projects', 'palettes.project_id', 'projects.id')
      .select('palettes.*')
      .where('projects.user_id', user_id);
    response.status(200).json(palettes);
  } catch {
    return response.sendStatus(500);
  }
});

app.post(
  '/api/v1/users/projects/:project_id/palettes',
  async (request, response) => {
    const { project_id } = request.params;
    const { name, colors } = request.body;
    try {
      if (name && colors) {
        const newID = await database('palettes').insert(
          { name, colors: JSON.stringify(colors), project_id },
          'id'
        );
        response.status(201).json(newID);
      } else {
        return response
          .status(422)
          .json({ error: 'name and colors not included in payload.' });
      }
    } catch {
      return response.sendStatus(500);
    }
  }
);

app.delete(
  '/api/v1/projects/:project_id/palettes/:palette_id',
  async (request, response) => {
    const { project_id, palette_id } = request.params;
    try {
      await database('palettes')
        .where('project_id', project_id)
        .andWhere('id', palette_id)
        .del();
      response.status(202).json(Number(palette_id));
    } catch {
      return response.sendStatus(500);
    }
  }
);

// app.listen(app.get('port'), () => {
//   console.log(
//     `${app.locals.title} is running SHIT on http://localhost:${app.get(
//       'port'
//     )}.`
//   );
// });

module.exports = app;
