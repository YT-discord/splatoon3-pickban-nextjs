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
export class Weapon extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: false,
  })
  

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50),
  })
  name!: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    type: DataType.STRING(36),
  })
  selectedBy!: string | null;

  @AllowNull(true)
  @Default(null)
  @Column({
    type: DataType.STRING(36),
  })
  bannedBy!: string | null;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })

  // 静的メソッドの実装
  static async initializeWeapons(): Promise<void> {
    const weapons = Array.from({ length: 130 }, (_, i) => ({
      id: i + 1,
      name: `Weapon ${i + 1}`,
    }));
    
    await this.bulkCreate(weapons);
  }
}