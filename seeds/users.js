const users_data = require('../database/default_data/users_data.js');

exports.seed = knex => {
  return knex('palettes')
    .del()
    .then(() =>
      knex('projects')
        .del()
        .then(() =>
          knex('users')
            .del()
            .then(() => {
              return Promise.all([
                knex('users')
                  .insert(...users_data, 'id')
                  .then(id => {
                    return knex('projects')
                      .insert(
                        {
                          user_id: id[0],
                          name: 'New Project',
                          description: 'This is an example description'
                        },
                        'id'
                      )
                      .then(id => {
                        return knex('palettes')
                          .insert({
                            project_id: id[0],
                            name: 'Example palette',
                            colors: JSON.stringify([
                              '#000000',
                              '#888888',
                              '#ffffff'
                            ])
                          })
                          .catch(error =>
                            console.log(`Error seeding data: ${error}`)
                          );
                      });
                  })
              ]);
            })
        )
    )
    .catch(error => console.log(`Error seeding data: ${error}`));
};
