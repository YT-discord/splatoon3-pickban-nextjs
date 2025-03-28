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
    type: DataType.STRING(5), // 'alpha' | 'bravo' | null を格納するため、最大5文字
  })
  declare selectedBy: 'alpha' | 'bravo' | null; // 変更: 型を string から 'alpha' | 'bravo' | null に変更

  @AllowNull(true)
  @Default([])
  @Column({
    type: DataType.JSON, // 'alpha' | 'bravo' | null を格納するため、最大5文字
  })
  declare bannedBy: ('alpha' | 'bravo' | null)[];

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

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50),
  })
  declare imageUrl: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(10),
  })
  declare attribute: string;
}