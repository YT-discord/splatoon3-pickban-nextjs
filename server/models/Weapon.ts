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

  // ▼▼▼ selectedBy カラム削除 ▼▼▼
  // @AllowNull(true)
  // @Default(null)
  // @Column({ type: DataType.STRING(5), })
  // declare selectedBy: 'alpha' | 'bravo' | null;
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // ▼▼▼ bannedBy カラム削除 ▼▼▼
  // @AllowNull(true)
  // @Default('[]') // デフォルトは空のJSON配列文字列
  // @Column({ type: DataType.JSON, })
  // declare bannedBy: ('alpha' | 'bravo')[];
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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
    type: DataType.STRING(50), // 属性名は少し長めでもOK
  })
  declare attribute: string;
}