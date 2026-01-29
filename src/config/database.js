/**
 * Database Configuration
 * 
 * Abstraction layer: Currently SQLite for development,
 * designed for easy switch to PostgreSQL in production.
 * 
 * To switch to PostgreSQL:
 * 1. Set DB_DIALECT=postgres in .env
 * 2. Configure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 * 3. Install pg and pg-hstore: npm install pg pg-hstore
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration based on dialect
const getSequelizeConfig = () => {
  const dialect = process.env.DB_DIALECT || 'sqlite';

  const baseConfig = {
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
    },
  };

  if (dialect === 'sqlite') {
    const storagePath = process.env.DB_STORAGE || './data/insightops.db';
    return {
      ...baseConfig,
      dialect: 'sqlite',
      storage: path.resolve(process.cwd(), storagePath),
    };
  }

  // PostgreSQL configuration for production
  if (dialect === 'postgres') {
    return {
      ...baseConfig,
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'insightops',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };
  }

  throw new Error(`Unsupported database dialect: ${dialect}`);
};

const sequelize = new Sequelize(getSequelizeConfig());

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
};
