# sequelize/mli 

The [Sequelize](https://sequelize.org) Command Line Interface (CLI)

Derived from sequelize-cli package

Based on umzug latest version 3

## Installation

Make sure you have [Sequelize](https://sequelize.org) installed. Then install the Sequelize CLI to be used in your project with

```bash
npm install --save-dev sequelize-mli
```

And then you should be able to run the CLI with

```bash
npx sequelize-mli --help
```

### Usage

```bash
Sequelize CLI [Node: 10.21.0, CLI: 6.0.0, ORM: 6.1.0]

sequelize <command>

Commands:
  sequelize db:migrate                        Run pending migrations
  sequelize db:migrate --step=N               Run N number of pending migrations
  sequelize db:migrate --name="migration.js"  Run specific migration file .js
  sequelize db:migrate --migrations["migration1.js","migration2"]  Run array of migration files
  sequelize db:migrate:undo                   Reverts a migration
  sequelize db:migrate:undo --step=N          Reverts N number of migrations
  sequelize db:migrate:undo --name="migration.js"  Reverts specific migration file .js
  sequelize db:migrate:undo --migrations["migration1.js","migration2"]  Reverts array of migration file .js
  sequelize db:migrate:undo:all               Revert all migrations ran
  sequelize db:migrate:status                 List the status of all migrations
Please specify a command
```
