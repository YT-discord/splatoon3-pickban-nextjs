import {
  Table,
  Column,
  Model,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'weapons',
  timestamps: true, // createdAt, updatedAt を有効にする場合
})
// ★ export class WeaponModel extends Model<MasterWeapon> { // MasterWeapon を型引数に指定 (任意)
export class WeaponModel extends Model { // 型引数なしでも可
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: false, // IDは初期データで指定するため false
  })
  declare id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50),
    unique: true, // 武器名はユニークのはず
  })
  declare name: string;

  @CreatedAt
  @Column // createdAt カラム (Timestamps が true なら自動で追加されるが明示)
  declare createdAt: Date;

  @UpdatedAt
  @Column // updatedAt カラム (Timestamps が true なら自動で追加されるが明示)
  declare updatedAt: Date;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255), // URLは長くなる可能性
  })
  declare imageUrl: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(10), // 属性名は少し長めでもOK
  })
  declare attribute: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(20),
    defaultValue: '', // デフォルト値を設定しておくと安心
  })
  declare subWeapon: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(20),
    defaultValue: '', // デフォルト値を設定しておくと安心
  })
  declare specialWeapon: string;

  @AllowNull(false) 
  @Column({ 
    type: DataType.STRING(255),
    defaultValue: ''
  })
  declare subWeaponImageName: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
    defaultValue: ''
  })
  declare specialWeaponImageName: string;
}