import { Sequelize } from 'sequelize-typescript';
import "reflect-metadata";
import { WeaponModel } from '../models/Weapon';
import { GameResultModel } from '../models/GameResult';
import { MasterWeapon } from '../../common/types/game';
import { CreationAttributes } from 'sequelize';


export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  models: [WeaponModel, GameResultModel], // 新しいモデルを追加
  logging: false, // SQLログが不要なら false に
});

// ★ DBからマスター武器リストを取得する関数 (ルーム初期化などで使う)
export const getMasterWeapons = async (): Promise<MasterWeapon[]> => {
    try {
        const weapons = await WeaponModel.findAll({
            attributes: ['id', 'name', 'imageUrl', 'attribute', 'subWeapon', 'specialWeapon','subWeaponImageName','specialWeaponImageName'],
            order: [['id', 'ASC']],
            raw: true, // ★ モデルインスタンスではなく単純なオブジェクトとして取得
        });
        // 必要であればここで型のバリデーションを行う
        return weapons as MasterWeapon[];
    } catch (error) {
        console.error("Error fetching master weapons:", error);
        throw error; // エラーを再スロー
    }
};

export const initializeDB = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synchronized.');

    // ★ 既にマスター武器データが存在するか確認
    const existingWeaponsCount = await WeaponModel.count();
    if (existingWeaponsCount > 0) {
      console.log('Master weapons already exist in the database. Skipping initialization.');
      return; // データが存在すれば初期化処理をスキップ
    }

    const masterWeaponsData: CreationAttributes<WeaponModel>[] = [
      // --- シューター ---
      {"id":1, "name":"ボールドマーカー","attribute":"シューター","imageUrl":"ボールドマーカー.webp", "subWeapon":"カーリングボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":2, "name":"ボールドマーカーネオ","attribute":"シューター","imageUrl":"ボールドマーカーネオ.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":3, "name":"わかばシューター","attribute":"シューター","imageUrl":"わかばシューター.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"グレートバリア"},
      {"id":4, "name":"もみじシューター","attribute":"シューター","imageUrl":"もみじシューター.webp", "subWeapon":"トーピード", "specialWeapon":"ホップソナー", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ホップソナー"},
      {"id":5, "name":"シャープマーカー","attribute":"シューター","imageUrl":"シャープマーカー.webp", "subWeapon":"クイックボム", "specialWeapon":"カニタンク", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"カニタンク"},
      {"id":6, "name":"シャープマーカーネオ","attribute":"シューター","imageUrl":"シャープマーカーネオ.webp", "subWeapon":"キューバンボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":7, "name":"シャープマーカーGECK","attribute":"シューター","imageUrl":"シャープマーカーGECK.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"アメフラシ"},
      {"id":8, "name":"プロモデラーMG","attribute":"シューター","imageUrl":"プロモデラーMG.webp", "subWeapon":"タンサンボム", "specialWeapon":"サメライド", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"サメライド"},
      {"id":9, "name":"プロモデラーRG","attribute":"シューター","imageUrl":"プロモデラーRG.webp", "subWeapon":"スプリンクラー", "specialWeapon":"ナイスダマ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ナイスダマ"},
      {"id":10, "name":"プロモデラー彩","attribute":"シューター","imageUrl":"プロモデラー彩.webp", "subWeapon":"クイックボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"スミナガシート"},
      {"id":11, "name":"スプラシューター","attribute":"シューター","imageUrl":"スプラシューター.webp", "subWeapon":"キューバンボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":12, "name":"スプラシューターコラボ","attribute":"シューター","imageUrl":"スプラシューターコラボ.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":13, "name":"スプラシューター煌","attribute":"シューター","imageUrl":"スプラシューター煌.webp", "subWeapon":"クイックボム", "specialWeapon":"テイオウイカ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"テイオウイカ"},
      {"id":14, "name":"52ガロン","attribute":"シューター","imageUrl":"52ガロン.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":15, "name":"52ガロンデコ","attribute":"シューター","imageUrl":"52ガロンデコ.webp", "subWeapon":"カーリングボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"スミナガシート"},
      {"id":16, "name":"N-ZAP85","attribute":"シューター","imageUrl":"N-ZAP85.webp", "subWeapon":"キューバンボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":17, "name":"N-ZAP89","attribute":"シューター","imageUrl":"N-ZAP89.webp", "subWeapon":"ロボットボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":18, "name":"プライムシューター","attribute":"シューター","imageUrl":"プライムシューター.webp", "subWeapon":"ラインマーカー", "specialWeapon":"カニタンク", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"カニタンク"},
      {"id":19, "name":"プライムシューターコラボ","attribute":"シューター","imageUrl":"プライムシューターコラボ.webp", "subWeapon":"キューバンボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":20, "name":"プライムシューターFRZN","attribute":"シューター","imageUrl":"プライムシューターFRZN.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"マルチミサイル", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"マルチミサイル"},
      {"id":21, "name":"96ガロン","attribute":"シューター","imageUrl":"96ガロン.webp", "subWeapon":"スプリンクラー", "specialWeapon":"キューインキ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"キューインキ"},
      {"id":22, "name":"96ガロンデコ","attribute":"シューター","imageUrl":"96ガロンデコ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"テイオウイカ"},
      {"id":23, "name":"96ガロン爪","attribute":"シューター","imageUrl":"96ガロン爪.webp", "subWeapon":"ラインマーカー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"エナジースタンド"},
      {"id":24, "name":"ジェットスイーパー","attribute":"シューター","imageUrl":"ジェットスイーパー.webp", "subWeapon":"ラインマーカー", "specialWeapon":"キューインキ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"キューインキ"},
      {"id":25, "name":"ジェットスイーパーカスタム","attribute":"シューター","imageUrl":"ジェットスイーパーカスタム.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"アメフラシ"},
      {"id":26, "name":"ジェットスイーパーCOBR","attribute":"シューター","imageUrl":"ジェットスイーパーCOBR.webp", "subWeapon":"クイックボム", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":27, "name":"スペースシューター","attribute":"シューター","imageUrl":"スペースシューター.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":28, "name":"スペースシューターコラボ","attribute":"シューター","imageUrl":"スペースシューターコラボ.webp", "subWeapon":"トラップ", "specialWeapon":"ジェットパック", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ジェットパック"},
      {"id":29, "name":"L3リールガン","attribute":"シューター","imageUrl":"L3リールガン.webp", "subWeapon":"カーリングボム", "specialWeapon":"カニタンク", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"カニタンク"},
      {"id":30, "name":"L3リールガンD","attribute":"シューター","imageUrl":"L3リールガンD.webp", "subWeapon":"クイックボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":31, "name":"L3リールガン箔","attribute":"シューター","imageUrl":"L3リールガン箔.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"ジェットパック", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ジェットパック"},
      {"id":32, "name":"H3リールガン","attribute":"シューター","imageUrl":"H3リールガン.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"エナジースタンド"},
      {"id":33, "name":"H3リールガンD","attribute":"シューター","imageUrl":"H3リールガンD.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"グレートバリア", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"グレートバリア"},
      {"id":34, "name":"H3リールガンSNAK","attribute":"シューター","imageUrl":"H3リールガンSNAK.webp", "subWeapon":"キューバンボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":35, "name":"ボトルガイザー","attribute":"シューター","imageUrl":"ボトルガイザー.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"ウルトラショット", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ウルトラショット"},
      {"id":36, "name":"ボトルガイザーフォイル","attribute":"シューター","imageUrl":"ボトルガイザーフォイル.webp", "subWeapon":"ロボットボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      // --- ローラー ---
      {"id":37, "name":"カーボンローラー","attribute":"ローラー","imageUrl":"カーボンローラー.webp", "subWeapon":"ロボットボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":38, "name":"カーボンローラーデコ","attribute":"ローラー","imageUrl":"カーボンローラーデコ.webp", "subWeapon":"クイックボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":39, "name":"カーボンローラーANGL","attribute":"ローラー","imageUrl":"カーボンローラーANGL.webp", "subWeapon":"タンサンボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":40, "name":"スプラローラー","attribute":"ローラー","imageUrl":"スプラローラー.webp", "subWeapon":"カーリングボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"グレートバリア"},
      {"id":41, "name":"スプラローラーコラボ","attribute":"ローラー","imageUrl":"スプラローラーコラボ.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":42, "name":"ダイナモローラー","attribute":"ローラー","imageUrl":"ダイナモローラー.webp", "subWeapon":"スプリンクラー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"エナジースタンド"},
      {"id":43, "name":"ダイナモローラーテスラ","attribute":"ローラー","imageUrl":"ダイナモローラーテスラ.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":44, "name":"ダイナモローラー冥","attribute":"ローラー","imageUrl":"ダイナモローラー冥.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":45, "name":"ヴァリアブルローラー","attribute":"ローラー","imageUrl":"ヴァリアブルローラー.webp", "subWeapon":"トラップ", "specialWeapon":"マルチミサイル", "subWeaponImageName":"トラップ", "specialWeaponImageName":"マルチミサイル"},
      {"id":46, "name":"ヴァリアブルローラーフォイル","attribute":"ローラー","imageUrl":"ヴァリアブルローラーフォイル.webp", "subWeapon":"キューバンボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      {"id":47, "name":"ワイドローラー","attribute":"ローラー","imageUrl":"ワイドローラー.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"キューインキ"},
      {"id":48, "name":"ワイドローラーコラボ","attribute":"ローラー","imageUrl":"ワイドローラーコラボ.webp", "subWeapon":"ラインマーカー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"アメフラシ"},
      {"id":49, "name":"ワイドローラー惑","attribute":"ローラー","imageUrl":"ワイドローラー惑.webp", "subWeapon":"トーピード", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ウルトラチャクチ"},
      // --- チャージャー ---
      {"id":50, "name":"スクイックリンα","attribute":"チャージャー","imageUrl":"スクイックリンα.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"グレートバリア", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"グレートバリア"},
      {"id":51, "name":"スクイックリンβ","attribute":"チャージャー","imageUrl":"スクイックリンβ.webp", "subWeapon":"ロボットボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":52, "name":"スプラチャージャー","attribute":"チャージャー","imageUrl":"スプラチャージャー.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"キューインキ"},
      {"id":53, "name":"スプラチャージャーコラボ","attribute":"チャージャー","imageUrl":"スプラチャージャーコラボ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"トリプルトルネード"},
      {"id":54, "name":"スプラチャージャーFRST","attribute":"チャージャー","imageUrl":"スプラチャージャーFRST.webp", "subWeapon":"スプリンクラー", "specialWeapon":"カニタンク", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"カニタンク"},
      {"id":55, "name":"スプラスコープ","attribute":"チャージャー","imageUrl":"スプラスコープ.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"キューインキ"},
      {"id":56, "name":"スプラスコープコラボ","attribute":"チャージャー","imageUrl":"スプラスコープコラボ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"トリプルトルネード"},
      {"id":57, "name":"スプラスコープFRST","attribute":"チャージャー","imageUrl":"スプラスコープFRST.webp", "subWeapon":"スプリンクラー", "specialWeapon":"カニタンク", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"カニタンク"},
      {"id":58, "name":"リッター4K","attribute":"チャージャー","imageUrl":"リッター4K.webp", "subWeapon":"トラップ", "specialWeapon":"ホップソナー", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ホップソナー"},
      {"id":59, "name":"リッター4Kカスタム","attribute":"チャージャー","imageUrl":"リッター4Kカスタム.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":60, "name":"4Kスコープ","attribute":"チャージャー","imageUrl":"4Kスコープ.webp", "subWeapon":"トラップ", "specialWeapon":"ホップソナー", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ホップソナー"},
      {"id":61, "name":"4Kスコープカスタム","attribute":"チャージャー","imageUrl":"4Kスコープカスタム.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":62, "name":"14式竹筒銃・甲","attribute":"チャージャー","imageUrl":"14式竹筒銃・甲.webp", "subWeapon":"ロボットボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":63, "name":"14式竹筒銃・乙","attribute":"チャージャー","imageUrl":"14式竹筒銃・乙.webp", "subWeapon":"タンサンボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":64, "name":"ソイチューバー","attribute":"チャージャー","imageUrl":"ソイチューバー.webp", "subWeapon":"トーピード", "specialWeapon":"マルチミサイル", "subWeaponImageName":"トーピード", "specialWeaponImageName":"マルチミサイル"},
      {"id":65, "name":"ソイチューバーカスタム","attribute":"チャージャー","imageUrl":"ソイチューバーカスタム.webp", "subWeapon":"タンサンボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":66, "name":"R-PEN5H","attribute":"チャージャー","imageUrl":"R-PEN5H.webp", "subWeapon":"スプリンクラー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"エナジースタンド"},
      {"id":67, "name":"R-PEN5B","attribute":"チャージャー","imageUrl":"R-PEN5B.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"アメフラシ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"アメフラシ"},
      // --- スロッシャー ---
      {"id":68, "name":"バケットスロッシャー","attribute":"スロッシャー","imageUrl":"バケットスロッシャー.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":69, "name":"バケットスロッシャーデコ","attribute":"スロッシャー","imageUrl":"バケットスロッシャーデコ.webp", "subWeapon":"ラインマーカー", "specialWeapon":"ショクワンダー", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"ショクワンダー"},
      {"id":70, "name":"ヒッセン","attribute":"スロッシャー","imageUrl":"ヒッセン.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"ジェットパック", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"ジェットパック"},
      {"id":71, "name":"ヒッセン・ヒュー","attribute":"スロッシャー","imageUrl":"ヒッセン・ヒュー.webp", "subWeapon":"タンサンボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":72, "name":"ヒッセンASH","attribute":"スロッシャー","imageUrl":"ヒッセンASH.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"スミナガシート"},
      {"id":73, "name":"スクリュースロッシャー","attribute":"スロッシャー","imageUrl":"スクリュースロッシャー.webp", "subWeapon":"タンサンボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":74, "name":"スクリュースロッシャーネオ","attribute":"スロッシャー","imageUrl":"スクリュースロッシャーネオ.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ウルトラショット"},
      {"id":75, "name":"オーバーフロッシャー","attribute":"スロッシャー","imageUrl":"オーバーフロッシャー.webp", "subWeapon":"スプリンクラー", "specialWeapon":"アメフラシ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"アメフラシ"},
      {"id":76, "name":"オーバーフロッシャーデコ","attribute":"スロッシャー","imageUrl":"オーバーフロッシャーデコ.webp", "subWeapon":"ラインマーカー", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"テイオウイカ"},
      {"id":77, "name":"エクスプロッシャー","attribute":"スロッシャー","imageUrl":"エクスプロッシャー.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"アメフラシ"},
      {"id":78, "name":"エクスプロッシャーカスタム","attribute":"スロッシャー","imageUrl":"エクスプロッシャーカスタム.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":79, "name":"モップリン","attribute":"スロッシャー","imageUrl":"モップリン.webp", "subWeapon":"キューバンボム", "specialWeapon":"サメライド", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"サメライド"},
      {"id":80, "name":"モップリンD","attribute":"スロッシャー","imageUrl":"モップリンD.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"ホップソナー", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"ホップソナー"},
      {"id":81, "name":"モップリン角","attribute":"スロッシャー","imageUrl":"モップリン角.webp", "subWeapon":"カーリングボム", "specialWeapon":"カニタンク", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"カニタンク"},
      // --- スピナー ---
      {"id":82, "name":"スプラスピナー","attribute":"スピナー","imageUrl":"スプラスピナー.webp", "subWeapon":"クイックボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":83, "name":"スプラスピナーコラボ","attribute":"スピナー","imageUrl":"スプラスピナーコラボ.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"グレートバリア", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"グレートバリア"},
      {"id":84, "name":"スプラスピナーPYTN","attribute":"スピナー","imageUrl":"スプラスピナーPYTN.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"ウルトラショット"},
      {"id":85, "name":"バレルスピナー","attribute":"スピナー","imageUrl":"バレルスピナー.webp", "subWeapon":"スプリンクラー", "specialWeapon":"ホップソナー", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ホップソナー"},
      {"id":86, "name":"バレルスピナーデコ","attribute":"スピナー","imageUrl":"バレルスピナーデコ.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"テイオウイカ"},
      {"id":87, "name":"ハイドラント","attribute":"スピナー","imageUrl":"ハイドラント.webp", "subWeapon":"ロボットボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":88, "name":"ハイドラントカスタム","attribute":"スピナー","imageUrl":"ハイドラントカスタム.webp", "subWeapon":"トラップ", "specialWeapon":"スミナガシート", "subWeaponImageName":"トラップ", "specialWeaponImageName":"スミナガシート"}, 
      {"id":89, "name":"ハイドラント圧","attribute":"スピナー","imageUrl":"ハイドラント圧.webp", "subWeapon":"スプリンクラー", "specialWeapon":"グレートバリア", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"グレートバリア"},
      {"id":90, "name":"クーゲルシュライバー","attribute":"スピナー","imageUrl":"クーゲルシュライバー.webp", "subWeapon":"タンサンボム", "specialWeapon":"ジェットパック", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ジェットパック"},
      {"id":91, "name":"クーゲルシュライバー・ヒュー","attribute":"スピナー","imageUrl":"クーゲルシュライバー・ヒュー.webp", "subWeapon":"トラップ", "specialWeapon":"キューインキ", "subWeaponImageName":"トラップ", "specialWeaponImageName":"キューインキ"},
      {"id":92, "name":"ノーチラス47","attribute":"スピナー","imageUrl":"ノーチラス47.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"アメフラシ"},
      {"id":93, "name":"ノーチラス79","attribute":"スピナー","imageUrl":"ノーチラス79.webp", "subWeapon":"キューバンボム", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":94, "name":"イグザミナー","attribute":"スピナー","imageUrl":"イグザミナー.webp", "subWeapon":"カーリングボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":95, "name":"イグザミナー・ヒュー","attribute":"スピナー","imageUrl":"イグザミナー・ヒュー.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"カニタンク", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"カニタンク"},
      // --- マニューバー ---
      {"id":96, "name":"スパッタリー","attribute":"マニューバー","imageUrl":"スパッタリー.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"エナジースタンド", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"エナジースタンド"},
      {"id":97, "name":"スパッタリー・ヒュー","attribute":"マニューバー","imageUrl":"スパッタリー・ヒュー.webp", "subWeapon":"トーピード", "specialWeapon":"サメライド", "subWeaponImageName":"トーピード", "specialWeaponImageName":"サメライド"},
      {"id":98, "name":"スパッタリーOWL","attribute":"マニューバー","imageUrl":"スパッタリーOWL.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":99, "name":"スプラマニューバー","attribute":"マニューバー","imageUrl":"スプラマニューバー.webp", "subWeapon":"キューバンボム", "specialWeapon":"カニタンク", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"カニタンク"},
      {"id":100, "name":"スプラマニューバーコラボ","attribute":"マニューバー","imageUrl":"スプラマニューバーコラボ.webp", "subWeapon":"カーリングボム", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":101, "name":"スプラマニューバー耀","attribute":"マニューバー","imageUrl":"スプラマニューバー耀.webp", "subWeapon":"タンサンボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"グレートバリア"},
      {"id":102, "name":"ケルビン525","attribute":"マニューバー","imageUrl":"ケルビン525.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"ナイスダマ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ナイスダマ"},
      {"id":103, "name":"ケルビン525デコ","attribute":"マニューバー","imageUrl":"ケルビン525デコ.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ウルトラショット"},
      {"id":104, "name":"デュアルスイーパー","attribute":"マニューバー","imageUrl":"デュアルスイーパー.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ホップソナー"},
      {"id":105, "name":"デュアルスイーパーカスタム","attribute":"マニューバー","imageUrl":"デュアルスイーパーカスタム.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"デコイチラシ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"デコイチラシ"},
      {"id":106, "name":"デュアルスイーパー蹄","attribute":"マニューバー","imageUrl":"デュアルスイーパー蹄.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"スミナガシート", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"スミナガシート"},
      {"id":107, "name":"クアッドホッパーブラック","attribute":"マニューバー","imageUrl":"クアッドホッパーブラック.webp", "subWeapon":"ロボットボム", "specialWeapon":"サメライド", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"サメライド"},
      {"id":108, "name":"クアッドホッパーホワイト","attribute":"マニューバー","imageUrl":"クアッドホッパーホワイト.webp", "subWeapon":"スプリンクラー", "specialWeapon":"ショクワンダー", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ショクワンダー"},
      {"id":109, "name":"ガエンFF","attribute":"マニューバー","imageUrl":"ガエンFF.webp", "subWeapon":"トラップ", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"トラップ", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":110, "name":"ガエンFFカスタム","attribute":"マニューバー","imageUrl":"ガエンFFカスタム.webp", "subWeapon":"クイックボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"トリプルトルネード"},
      // --- シェルター ---
      {"id":111, "name":"パラシェルター","attribute":"シェルター","imageUrl":"パラシェルター.webp", "subWeapon":"スプリンクラー", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"トリプルトルネード"},
      {"id":112, "name":"パラシェルターソレーラ","attribute":"シェルター","imageUrl":"パラシェルターソレーラ.webp", "subWeapon":"ロボットボム", "specialWeapon":"ジェットパック", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ジェットパック"},
      {"id":113, "name":"キャンピングシェルター","attribute":"シェルター","imageUrl":"キャンピングシェルター.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"キューインキ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"キューインキ"},
      {"id":114, "name":"キャンピングシェルターソレーラ","attribute":"シェルター","imageUrl":"キャンピングシェルターソレーラ.webp", "subWeapon":"トラップ", "specialWeapon":"ウルトラショット", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ウルトラショット"},
      {"id":115, "name":"キャンピングシェルターCREM","attribute":"シェルター","imageUrl":"キャンピングシェルターCREM.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"デコイチラシ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"デコイチラシ"},
      {"id":116, "name":"スパイガジェット","attribute":"シェルター","imageUrl":"スパイガジェット.webp", "subWeapon":"トラップ", "specialWeapon":"サメライド", "subWeaponImageName":"トラップ", "specialWeaponImageName":"サメライド"},
      {"id":117, "name":"スパイガジェットソレーラ","attribute":"シェルター","imageUrl":"スパイガジェットソレーラ.webp", "subWeapon":"トーピード", "specialWeapon":"スミナガシート", "subWeaponImageName":"トーピード", "specialWeaponImageName":"スミナガシート"},
      {"id":118, "name":"スパイガジェット繚","attribute":"シェルター","imageUrl":"スパイガジェット繚.webp", "subWeapon":"カーリングボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":119, "name":"24式張替傘・甲","attribute":"シェルター","imageUrl":"24式張替傘・甲.webp", "subWeapon":"ラインマーカー", "specialWeapon":"グレートバリア", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"グレートバリア"},
      {"id":120, "name":"24式張替傘・乙","attribute":"シェルター","imageUrl":"24式張替傘・乙.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"ウルトラチャクチ"},
      // --- ブラスター ---
      {"id":121, "name":"ノヴァブラスター","attribute":"ブラスター","imageUrl":"ノヴァブラスター.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":122, "name":"ノヴァブラスターネオ","attribute":"ブラスター","imageUrl":"ノヴァブラスターネオ.webp", "subWeapon":"タンサンボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":123, "name":"ホットブラスター","attribute":"ブラスター","imageUrl":"ホットブラスター.webp", "subWeapon":"ロボットボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"グレートバリア"},
      {"id":124, "name":"ホットブラスターカスタム","attribute":"ブラスター","imageUrl":"ホットブラスターカスタム.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":125, "name":"ホットブラスター艶","attribute":"ブラスター","imageUrl":"ホットブラスター艶.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"カニタンク", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"カニタンク"},
      {"id":126, "name":"ロングブラスター","attribute":"ブラスター","imageUrl":"ロングブラスター.webp", "subWeapon":"キューバンボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ホップソナー"},
      {"id":127, "name":"ロングブラスターカスタム","attribute":"ブラスター","imageUrl":"ロングブラスターカスタム.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"テイオウイカ"},
      {"id":128, "name":"クラッシュブラスター","attribute":"ブラスター","imageUrl":"クラッシュブラスター.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":129, "name":"クラッシュブラスターネオ","attribute":"ブラスター","imageUrl":"クラッシュブラスターネオ.webp", "subWeapon":"カーリングボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":130, "name":"ラピッドブラスター","attribute":"ブラスター","imageUrl":"ラピッドブラスター.webp", "subWeapon":"トラップ", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"トラップ", "specialWeaponImageName":"トリプルトルネード"},
      {"id":131, "name":"ラピッドブラスターデコ","attribute":"ブラスター","imageUrl":"ラピッドブラスターデコ.webp", "subWeapon":"トーピード", "specialWeapon":"ジェットパック", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ジェットパック"},
      {"id":132, "name":"Rブラスターエリート","attribute":"ブラスター","imageUrl":"Rブラスターエリート.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"キューインキ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"キューインキ"},
      {"id":133, "name":"Rブラスターエリートデコ","attribute":"ブラスター","imageUrl":"Rブラスターエリートデコ.webp", "subWeapon":"ラインマーカー", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":134, "name":"RブラスターエリートWNTR","attribute":"ブラスター","imageUrl":"RブラスターエリートWNTR.webp", "subWeapon":"キューバンボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":135, "name":"S-BLAST92","attribute":"ブラスター","imageUrl":"S-BLAST92.webp", "subWeapon":"スプリンクラー", "specialWeapon":"サメライド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"サメライド"},
      {"id":136, "name":"S-BLAST91","attribute":"ブラスター","imageUrl":"S-BLAST91.webp", "subWeapon":"クイックボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ナイスダマ"},
      // --- フデ ---
      {"id":137, "name":"パブロ","attribute":"フデ","imageUrl":"パブロ.webp", "subWeapon":"スプラッシュボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":138, "name":"パブロ・ヒュー","attribute":"フデ","imageUrl":"パブロ・ヒュー.webp", "subWeapon":"トラップ", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":139, "name":"ホクサイ","attribute":"フデ","imageUrl":"ホクサイ.webp", "subWeapon":"キューバンボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":140, "name":"ホクサイ・ヒュー","attribute":"フデ","imageUrl":"ホクサイ・ヒュー.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"アメフラシ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"アメフラシ"},
      {"id":141, "name":"ホクサイ彗","attribute":"フデ","imageUrl":"ホクサイ彗.webp", "subWeapon":"ロボットボム", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"テイオウイカ"},
      {"id":142, "name":"フィンセント","attribute":"フデ","imageUrl":"フィンセント.webp", "subWeapon":"カーリングボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ホップソナー"},
      {"id":143, "name":"フィンセント・ヒュー","attribute":"フデ","imageUrl":"フィンセント・ヒュー.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"マルチミサイル", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"マルチミサイル"},
      {"id":144, "name":"フィンセントBRNZ","attribute":"フデ","imageUrl":"フィンセントBRNZ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"ウルトラショット", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ウルトラショット"},
      // --- ストリンガー ---
      {"id":145, "name":"トライストリンガー","attribute":"ストリンガー","imageUrl":"トライストリンガー.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":146, "name":"トライストリンガーコラボ","attribute":"ストリンガー","imageUrl":"トライストリンガーコラボ.webp", "subWeapon":"スプリンクラー", "specialWeapon":"デコイチラシ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"デコイチラシ"},
      {"id":147, "name":"トライストリンガー燈","attribute":"ストリンガー","imageUrl":"トライストリンガー燈.webp", "subWeapon":"ラインマーカー", "specialWeapon":"ジェットパック", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"ジェットパック"},
      {"id":148, "name":"LACT-450","attribute":"ストリンガー","imageUrl":"LACT-450.webp", "subWeapon":"カーリングボム", "specialWeapon":"マルチミサイル", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"マルチミサイル"},
      {"id":149, "name":"LACT-450デコ","attribute":"ストリンガー","imageUrl":"LACT-450デコ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"サメライド", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"サメライド"},
      {"id":150, "name":"LACT-450MILK","attribute":"ストリンガー","imageUrl":"LACT-450MILK.webp", "subWeapon":"トーピード", "specialWeapon":"ナイスダマ", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ナイスダマ"},
      {"id":151, "name":"フルイドV","attribute":"ストリンガー","imageUrl":"フルイドV.webp", "subWeapon":"ロボットボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":152, "name":"フルイドVカスタム","attribute":"ストリンガー","imageUrl":"フルイドVカスタム.webp", "subWeapon":"ポイントセンサー", "specialWeapon":"ホップソナー", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ホップソナー"},
      // --- ワイパー ---
      {"id":153, "name":"ジムワイパー","attribute":"ワイパー","imageUrl":"ジムワイパー.webp", "subWeapon":"クイックボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":154, "name":"ジムワイパー・ヒュー","attribute":"ワイパー","imageUrl":"ジムワイパー・ヒュー.webp", "subWeapon":"ポイズンミスト", "specialWeapon":"カニタンク", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"カニタンク"},
      {"id":155, "name":"ジムワイパー封","attribute":"ワイパー","imageUrl":"ジムワイパー封.webp", "subWeapon":"ロボットボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":156, "name":"ドライブワイパー","attribute":"ワイパー","imageUrl":"ドライブワイパー.webp", "subWeapon":"トーピード", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":157, "name":"ドライブワイパーデコ","attribute":"ワイパー","imageUrl":"ドライブワイパーデコ.webp", "subWeapon":"ジャンプビーコン", "specialWeapon":"マルチミサイル", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"マルチミサイル"},
      {"id":158, "name":"ドライブワイパーRUST","attribute":"ワイパー","imageUrl":"ドライブワイパーRUST.webp", "subWeapon":"カーリングボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":159, "name":"デンタルワイパーミント","attribute":"ワイパー","imageUrl":"デンタルワイパーミント.webp", "subWeapon":"キューバンボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"グレートバリア"},
      {"id":160, "name":"デンタルワイパースミ","attribute":"ワイパー","imageUrl":"デンタルワイパースミ.webp", "subWeapon":"スプラッシュシールド", "specialWeapon":"ジェットパック", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ジェットパック"}
    ];


    // MasterWeapon[] 型として扱うことで型チェック
    const weaponsToCreate: CreationAttributes<WeaponModel>[] = masterWeaponsData.map(w => ({
      // MasterWeapon のプロパティを WeaponModel のカラムに合わせてマッピング
      // この場合、MasterWeapon と CreationAttributes<WeaponModel> (必要な部分) は一致するはず
      id: w.id,
      name: w.name,
      imageUrl: w.imageUrl, // DBに保存するパス/URL
      attribute: w.attribute,
      subWeapon: w.subWeapon,
      specialWeapon: w.specialWeapon,
      subWeaponImageName: w.subWeaponImageName,
      specialWeaponImageName: w.specialWeaponImageName
      // createdAt, updatedAt は Sequelize が自動で処理するので含めない
  }));

    await WeaponModel.bulkCreate(weaponsToCreate);

    console.log(`Database initialized with ${masterWeaponsData.length} master weapons.`);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};
