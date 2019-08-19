module.exports = {
  development: {
    client: 'pg',
    connection: 'postgress://localhost/palettepicker',
    migrations: {
      directory: './database/migrations'
    },
    useNullAsDefault: true
  }
};
