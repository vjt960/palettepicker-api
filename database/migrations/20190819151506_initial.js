exports.up = knex => {
  return Promise.all([
    knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username');
      table.string('password');
      table.timestamps(true, true);
    })
  ]);
};

exports.down = knex => {
  return Promise.all([knex.schema.dropTable('users')]);
};
