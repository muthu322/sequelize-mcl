import { _baseOptions } from '../core/yargs';
import { getMigrator, ensureCurrentMetaSchema } from '../core/migrator';

import helpers from '../helpers';

exports.builder = (yargs) =>
  _baseOptions(yargs).option('name', {
    describe: 'Name of the migration to execute',
    type: 'string',
  }).argv;

exports.handler = async function (args) {
  // legacy, gulp used to do this
  await helpers.config.init();

  await migrateOne(args);

  process.exit(0);
};

function migrateOne(args) {
  return getMigrator('migration', args)
    .then((migrator) => {
      return ensureCurrentMetaSchema(migrator)
        .then(() => migrator.pending())
        .then((migrations) => {
          if (migrations.length === 0) {
            helpers.view.log('No migrations were executed, database schema was already up to date.');
            process.exit(0);
          }
        })
        .then(() => {
          if (args.name) {
            return migrator.up(args.name);
          } else {
            return migrator.up();
          }
        });
    })
    .catch((e) => helpers.view.error(e));
}
