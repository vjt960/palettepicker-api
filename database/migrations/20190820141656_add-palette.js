exports.up = knex => {
  return Promise.all([
    knex.schema.createTable('palettes', table => {
      table.increments('id').primary();
      table.integer('project_id').unsigned();
      table.foreign('project_id').references('projects.id');
      table.string('name');
      table.json('colors');
      table.timestamps(true, true);
    })
  ]);
};

exports.down = knex => {
  return Promise.all([knex.schema.dropTable('palettes')]);
};
