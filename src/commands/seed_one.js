import { _baseOptions } from '../core/yargs';
import { getMigrator } from '../core/migrator';

import helpers from '../helpers';
import path from 'path';
import _ from 'lodash';

exports.builder = (yargs) =>
  _baseOptions(yargs).option('seed', {
    describe: 'List of seed files',
    type: 'array',
  }).argv;

exports.handler = async function (args) {
  const command = args._[0];

  // legacy, gulp used to do this
  await helpers.config.init();

  switch (command) {
    case 'db:seed':
      try {
        console.log('seed one runs');
        console.log(args);
        const migrator = await getMigrator('seeder', args);
        // filter out cmd names
        // for case like --seeders-path seeders --seed seedPerson.js db:seed
        const seeds = (args.seed || [])
          .filter((name) => name !== 'db:seed' && name !== 'db:seed:undo')
          .map((file) => path.basename(file));

        await migrator.up({ migrations: seeds, rerun: 'ALLOW' });
      } catch (e) {
        helpers.view.error(e);
      }
      break;

    case 'db:seed:undo':
      try {
        console.log('seed Undo one runs');
        const migrator = await getMigrator('seeder', args);
        let seeders =
          helpers.umzug.getStorage('seeder') === 'none'
            ? await migrator.pending()
            : await migrator.executed();

        if (args.seed) {
          seeders = seeders.filter((seed) => {
            return args.seed.includes(seed.name);
          });
        }

        if (seeders.length === 0) {
          helpers.view.log('No seeders found.');
          return;
        }

        if (!args.seed) {
          seeders = seeders.slice(-1);
        }

        await migrator.down({
          migrations: _.chain(seeders).map('file').reverse().value(),
        });
      } catch (e) {
        helpers.view.error(e);
      }
      break;
  }

  process.exit(0);
};
