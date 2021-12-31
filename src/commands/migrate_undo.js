import { _baseOptions } from '../core/yargs';
import { getMigrator, ensureCurrentMetaSchema } from '../core/migrator';

import helpers from '../helpers';

exports.builder = (yargs) =>
  _baseOptions(yargs)
    .option('name', {
      describe: 'Name of the migration to undo',
      type: 'string',
    })
    .option('migrations', {
      describe: 'Array of migrations to undo',
      type: 'array',
    })
    .option('step', {
      describe: 'Step of migrations to undo',
      type: 'number',
    })
    .option('to', {
      describe: 'Undo migrations upto',
      type: 'string',
    }).argv;

exports.handler = async function (args) {
  // legacy, gulp used to do this
  await helpers.config.init();

  await migrateUndo(args);

  process.exit(0);
};

function migrateUndo(args) {
  return getMigrator('migration', args)
    .then((migrator) => {
      return ensureCurrentMetaSchema(migrator)
        .then(() => migrator.executed())
        .then((migrations) => {
          const options = {};
          if (migrations.length === 0) {
            helpers.view.log('No executed migrations found.');
            process.exit(0);
          }
          if (args.name) {
            options.migrations = [args.name];
          }
          if (args.migrations) {
            options.migrations = args.migrations;
          }
          if (args.step) {
            options.step = parseInt(args.step);
          }
          if (args.to) {
            options.to = args.to;
          }
          return options;
        })
        .then((options) => {
          console.log('migrate undo options');
          console.log(options);
          return migrator.down(options);
        });
    })
    .catch((e) => helpers.view.error(e));
}
