import { _baseOptions } from '../core/yargs';
import {
  getMigrator,
  ensureCurrentMetaSchema,
  addTimestampsToSchema,
} from '../core/migrator';

import helpers from '../helpers';
import _ from 'lodash';

exports.builder = (yargs) =>
  _baseOptions(yargs)
    .option('to', {
      describe: 'Migration name to run migrations until',
      type: 'string',
    })
    .option('step', {
      describe: 'Number of Migration step to run until',
      type: 'string',
    })
    .option('rerun', {
      describe: 'Rerun Migration',
      type: 'string',
    })
    .option('name', {
      describe: 'Run specific Migration File',
      type: 'string',
    })
    .option('migrations', {
      describe: 'Run array of specific Migration File',
      type: 'arrat',
    }).argv;

exports.handler = async function (args) {
  const command = args._[0];

  // legacy, gulp used to do this
  await helpers.config.init();

  switch (command) {
    case 'db:migrate':
      await migrate(args);
      break;
    case 'db:migrate:schema:timestamps:add':
      await migrateSchemaTimestampAdd(args);
      break;
    case 'db:migrate:status':
      await migrationStatus(args);
      break;
  }

  process.exit(0);
};

function migrate(args) {
  return getMigrator('migration', args)
    .then((migrator) => {
      return ensureCurrentMetaSchema(migrator)
        .then(() => migrator.pending())
        .then((migrations) => {
          const options = {};
          if (migrations.length === 0) {
            helpers.view.log(
              'No migrations were executed, database schema was already up to date.'
            );
            process.exit(0);
          }
          if (args.step) {
            options.step = parseInt(args.step);
          }
          if (args.name) {
            options.migrations = [args.name];
            options.rerun = 'ALLOW';
          }
          if (args.migrations) {
            options.migrations = args.migrations;
            options.rerun = 'ALLOW';
          }
          if (args.to) {
            if (
              migrations.filter((migration) => migration.name === args.to)
                .length === 0
            ) {
              helpers.view.log(
                'No migrations were executed, database schema was already up to date.'
              );
              process.exit(0);
            }
            options.to = args.to;
          }

          if (args.rerun) {
            options.rerun = args.rerun;
          }

          return options;
        })
        .then((options) => {
          return migrator.up(options);
        });
    })
    .catch((e) => helpers.view.error(e));
}

function migrationStatus(args) {
  return getMigrator('migration', args)
    .then((migrator) => {
      let upStep = 0;
      let downStep = 0;
      return ensureCurrentMetaSchema(migrator)
        .then(() => migrator.executed())
        .then((migrations) => {
          _.forEach(migrations, (migration) => {
            helpers.view.log('up', migration.name);
            ++upStep;
          });
        })
        .then(() => migrator.pending())
        .then((migrations) => {
          _.forEach(migrations, (migration) => {
            helpers.view.log('down', migration.name);
            ++downStep;
          });
        })
        .then(() => {
          helpers.view.log('Total Up steps:', upStep);
          helpers.view.log('Total Down steps', downStep);
        });
    })
    .catch((e) => helpers.view.error(e));
}

function migrateSchemaTimestampAdd(args) {
  return getMigrator('migration', args)
    .then((migrator) => {
      return addTimestampsToSchema(migrator).then((items) => {
        if (items) {
          helpers.view.log('Successfully added timestamps to MetaTable.');
        } else {
          helpers.view.log('MetaTable already has timestamps.');
        }
      });
    })
    .catch((e) => helpers.view.error(e));
}
