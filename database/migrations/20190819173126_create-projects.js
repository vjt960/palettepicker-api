exports.up = knex => {
  return Promise.all([
    knex.schema.createTable('projects', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.foreign('user_id').references('users.id');
      table.string('name');
      table.text('description');
      table.timestamps(true, true);
    })
  ]);
};

exports.down = knex => {
  return Promise.all([knex.schema.dropTable('projects')]);
};
