module.exports = {
  development: {
    client: 'pg',
    connection: 'postgress://localhost/palettepicker',
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './seeds/dev'
    },
    useNullAsDefault: true
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL + '?ssl=true',
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './seeds/dev'
    },
    useNullAsDefault: true
  },

  test: {
    client: 'pg',
    connection: 'postgress://localhost/palettepicker_test',
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './seeds/test'
    },
    useNullAsDefault: true
  }
};
