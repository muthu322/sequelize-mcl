import { Umzug, SequelizeStorage } from 'umzug';
import _ from 'lodash';

import helpers from '../helpers/index';

const Sequelize = helpers.generic.getSequelize();

export function logMigrator(s) {
  if (s.indexOf('Executing') !== 0) {
    helpers.view.log(s);
  }
}

function getSequelizeInstance() {
  let config = null;

  try {
    config = helpers.config.readConfig();
  } catch (e) {
    helpers.view.error(e);
  }

  config = _.defaults(config, { logging: logMigrator });

  try {
    return new Sequelize(config);
  } catch (e) {
    helpers.view.error(e);
  }
}

export async function getMigrator(type, args) {
  if (!(helpers.config.configFileExists() || args.url)) {
    helpers.view.error(
      `Cannot find "${helpers.config.getConfigFile()}". Have you run "sequelize init"?`
    );
    process.exit(1);
  }

  const sequelize = getSequelizeInstance();
  console.log(helpers.path.getPath(type) + '/*.js');
  const migrator = new Umzug({
    storage: new SequelizeStorage({ sequelize }),
    // storage: helpers.umzug.getStorage(type),
    // storageOptions: helpers.umzug.getStorageOptions(type, { sequelize }),
    // logging: helpers.view.log,
    logger: console,
    // context: [sequelize.getQueryInterface(), Sequelize],

    migrations: {
      glob: helpers.path.getPath(type) + '/*.js',
      resolve: ({ name, path, context }) => {
        // Adjust the migration from the new signature to the v2 signature, making easier to upgrade to v3
        const migration = require(path);
        return {
          name,
          up: async () =>
            migration.up(sequelize.getQueryInterface(), Sequelize),
          down: async () =>
            migration.down(sequelize.getQueryInterface(), Sequelize),
        };
      },
      // path: helpers.path.getPath(type),
      // pattern: /^(?!.*\.d\.ts$).*\.(cjs|js|ts)$/,
    },
  });

  return sequelize
    .authenticate()
    .then(() => {
      // Check if this is a PostgreSQL run and if there is a custom schema specified, and if there is, check if it's
      // been created. If not, attempt to create it.
      if (helpers.version.getDialectName() === 'pg') {
        const customSchemaName = helpers.umzug.getSchema('migration');
        if (customSchemaName && customSchemaName !== 'public') {
          return sequelize.createSchema(customSchemaName);
        }
      }
    })
    .then(() => migrator)
    .catch((e) => helpers.view.error(e));
}

export function ensureCurrentMetaSchema(migrator) {
  const queryInterface = migrator.options.storage.sequelize.getQueryInterface();
  const tableName = migrator.options.storage.tableName;
  const columnName = migrator.options.storage.columnName;

  return ensureMetaTable(queryInterface, tableName)
    .then((table) => {
      const columns = Object.keys(table);

      if (columns.length === 1 && columns[0] === columnName) {
        return;
      } else if (columns.length === 3 && columns.indexOf('createdAt') >= 0) {
        // If found createdAt - indicate we have timestamps enabled
        helpers.umzug.enableTimestamps();
        return;
      }
    })
    .catch(() => {});
}

function ensureMetaTable(queryInterface, tableName) {
  return queryInterface.showAllTables().then((tableNames) => {
    if (tableNames.indexOf(tableName) === -1) {
      throw new Error('No MetaTable table found.');
    }
    return queryInterface.describeTable(tableName);
  });
}

/**
 * Add timestamps
 *
 * @return {Promise}
 */
export function addTimestampsToSchema(migrator) {
  const sequelize = migrator.options.storage.sequelize;
  const queryInterface = sequelize.getQueryInterface();
  const tableName = migrator.options.storage.tableName;

  return ensureMetaTable(queryInterface, tableName).then((table) => {
    if (table.createdAt) {
      return;
    }

    return ensureCurrentMetaSchema(migrator)
      .then(() => queryInterface.renameTable(tableName, tableName + 'Backup'))
      .then(() => {
        const queryGenerator =
          queryInterface.QueryGenerator || queryInterface.queryGenerator;
        const sql = queryGenerator.selectQuery(tableName + 'Backup');
        return helpers.generic.execQuery(sequelize, sql, {
          type: 'SELECT',
          raw: true,
        });
      })
      .then((result) => {
        const SequelizeMeta = sequelize.define(
          tableName,
          {
            name: {
              type: Sequelize.STRING,
              allowNull: false,
              unique: true,
              primaryKey: true,
              autoIncrement: false,
            },
          },
          {
            tableName,
            timestamps: true,
            schema: helpers.umzug.getSchema(),
          }
        );

        return SequelizeMeta.sync().then(() => {
          return SequelizeMeta.bulkCreate(result);
        });
      });
  });
}
