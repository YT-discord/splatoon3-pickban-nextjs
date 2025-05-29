import {
  Table,
  Column,
  Model,
  AllowNull,
  CreatedAt,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'game_results',
  timestamps: true, // ゲーム終了時刻を記録
  updatedAt: false, // 更新時刻は不要
})
export class GameResultModel extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true, // 自動採番ID
  })
  declare id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(50), // ルームIDを記録
  })
  declare roomId: string;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER, // 選択されたステージID
  })
  declare selectedStageId: number;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER, // 選択されたルールID
  })
  declare selectedRuleId: number;

  @AllowNull(false)
  @Column({
    type: DataType.JSON, // 禁止された武器IDのリスト (例: { alpha: [1, 5], bravo: [10, 12] })
  })
  declare bannedWeapons: { alpha: number[], bravo: number[] };

  @AllowNull(false)
  @Column({
    type: DataType.JSON, // 選択された武器IDのリスト (例: { alpha: [20, 21], bravo: [30, 31] })
  })
  declare pickedWeapons: { alpha: number[], bravo: number[] };

  @CreatedAt
  @Column // createdAt カラム (ゲーム終了時刻として使用)
  declare createdAt: Date;

  // 必要に応じて、ゲームの勝敗や最終スコアなどを追加
  // @Column({ type: DataType.STRING(10) })
  // declare winnerTeam: 'alpha' | 'bravo' | 'draw' | null;
}