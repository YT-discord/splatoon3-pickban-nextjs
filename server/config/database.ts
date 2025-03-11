import { Sequelize } from 'sequelize-typescript';
import { Weapon } from '../models/Weapon';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  models: [Weapon], // モデルを明示的に登録
  logging: console.log,
});

export const initializeDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    await Weapon.initializeWeapons();
    console.log('Database ready');
  } catch (error) {
    console.error('Database failed:', error);
    process.exit(1);
  }
};