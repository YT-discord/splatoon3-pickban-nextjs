import { 
  Table, 
  Column, 
  Model,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'weapons',
  timestamps: true,
})
export class WeaponModel extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: false,
  })
  declare id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50),
  })
  declare name: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    type: DataType.STRING(36),
  })
  declare selectedBy: string | null;

  @AllowNull(true)
  @Default(null)
  @Column({
    type: DataType.STRING(36),
  })
  declare bannedBy: string | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  declare createdAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  declare updatedAt: Date;
}