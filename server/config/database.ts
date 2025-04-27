import { Sequelize } from 'sequelize-typescript';
import "reflect-metadata";
import { WeaponModel } from '../models/Weapon';
import { MasterWeapon } from '../../common/types/game';
import { CreationAttributes } from 'sequelize';


export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  models: [WeaponModel],
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

    const masterWeaponsData: CreationAttributes<WeaponModel>[] = [
      // --- シューター ---
      {"id":1, "name":"ボールドマーカー","attribute":"シューター","imageUrl":"ボールドマーカー.png", "subWeapon":"カーリングボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":2, "name":"ボールドマーカーネオ","attribute":"シューター","imageUrl":"ボールドマーカーネオ.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":3, "name":"わかばシューター","attribute":"シューター","imageUrl":"わかばシューター.png", "subWeapon":"スプラッシュボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"グレートバリア"},
      {"id":4, "name":"もみじシューター","attribute":"シューター","imageUrl":"もみじシューター.png", "subWeapon":"トーピード", "specialWeapon":"ホップソナー", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ホップソナー"},
      {"id":5, "name":"シャープマーカー","attribute":"シューター","imageUrl":"シャープマーカー.png", "subWeapon":"クイックボム", "specialWeapon":"カニタンク", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"カニタンク"},
      {"id":6, "name":"シャープマーカーネオ","attribute":"シューター","imageUrl":"シャープマーカーネオ.png", "subWeapon":"キューバンボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":7, "name":"プロモデラーMG","attribute":"シューター","imageUrl":"プロモデラーMG.png", "subWeapon":"タンサンボム", "specialWeapon":"サメライド", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"サメライド"},
      {"id":8, "name":"プロモデラーRG","attribute":"シューター","imageUrl":"プロモデラーRG.png", "subWeapon":"スプリンクラー", "specialWeapon":"ナイスダマ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ナイスダマ"},
      {"id":9, "name":"スプラシューター","attribute":"シューター","imageUrl":"スプラシューター.png", "subWeapon":"キューバンボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":10, "name":"スプラシューターコラボ","attribute":"シューター","imageUrl":"スプラシューターコラボ.png", "subWeapon":"スプラッシュボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":11, "name":"52ガロン","attribute":"シューター","imageUrl":"52ガロン.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":12, "name":"52ガロンデコ","attribute":"シューター","imageUrl":"52ガロンデコ.png", "subWeapon":"カーリングボム", "specialWeapon":"テイオウイカ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"テイオウイカ"},
      {"id":13, "name":"N-ZAP85","attribute":"シューター","imageUrl":"N-ZAP85.png", "subWeapon":"キューバンボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":14, "name":"N-ZAP89","attribute":"シューター","imageUrl":"N-ZAP89.png", "subWeapon":"ロボットボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":15, "name":"プライムシューター","attribute":"シューター","imageUrl":"プライムシューター.png", "subWeapon":"ラインマーカー", "specialWeapon":"カニタンク", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"カニタンク"},
      {"id":16, "name":"プライムシューターコラボ","attribute":"シューター","imageUrl":"プライムシューターコラボ.png", "subWeapon":"キューバンボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":17, "name":"96ガロン","attribute":"シューター","imageUrl":"96ガロン.png", "subWeapon":"スプリンクラー", "specialWeapon":"キューインキ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"キューインキ"},
      {"id":18, "name":"96ガロンデコ","attribute":"シューター","imageUrl":"96ガロンデコ.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"テイオウイカ"},
      {"id":19, "name":"ジェットスイーパー","attribute":"シューター","imageUrl":"ジェットスイーパー.png", "subWeapon":"ラインマーカー", "specialWeapon":"キューインキ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"キューインキ"},
      {"id":20, "name":"ジェットスイーパーカスタム","attribute":"シューター","imageUrl":"ジェットスイーパーカスタム.png", "subWeapon":"ポイズンミスト", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"アメフラシ"},
      {"id":21, "name":"スペースシューター","attribute":"シューター","imageUrl":"スペースシューター.png", "subWeapon":"ポイントセンサー", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":22, "name":"スペースシューターコラボ","attribute":"シューター","imageUrl":"スペースシューターコラボ.png", "subWeapon":"トラップ", "specialWeapon":"ジェットパック", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ジェットパック"},
      {"id":23, "name":"L3リールガン","attribute":"シューター","imageUrl":"L3リールガン.png", "subWeapon":"カーリングボム", "specialWeapon":"カニタンク", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"カニタンク"},
      {"id":24, "name":"L3リールガンD","attribute":"シューター","imageUrl":"L3リールガンD.png", "subWeapon":"クイックボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":25, "name":"H3リールガン","attribute":"シューター","imageUrl":"H3リールガン.png", "subWeapon":"ポイントセンサー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"エナジースタンド"},
      {"id":26, "name":"H3リールガンD","attribute":"シューター","imageUrl":"H3リールガンD.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"グレートバリア", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"グレートバリア"},
      {"id":27, "name":"ボトルガイザー","attribute":"シューター","imageUrl":"ボトルガイザー.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"ウルトラショット", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ウルトラショット"},
      {"id":28, "name":"ボトルガイザーフォイル","attribute":"シューター","imageUrl":"ボトルガイザーフォイル.png", "subWeapon":"ロボットボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      // --- ローラー ---
      {"id":29, "name":"カーボンローラー","attribute":"ローラー","imageUrl":"カーボンローラー.png", "subWeapon":"ロボットボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":30, "name":"カーボンローラーデコ","attribute":"ローラー","imageUrl":"カーボンローラーデコ.png", "subWeapon":"クイックボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":31, "name":"スプラローラー","attribute":"ローラー","imageUrl":"スプラローラー.png", "subWeapon":"カーリングボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"グレートバリア"},
      {"id":32, "name":"スプラローラーコラボ","attribute":"ローラー","imageUrl":"スプラローラーコラボ.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":33, "name":"ダイナモローラー","attribute":"ローラー","imageUrl":"ダイナモローラー.png", "subWeapon":"スプリンクラー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"エナジースタンド"},
      {"id":34, "name":"ダイナモローラーテスラ","attribute":"ローラー","imageUrl":"ダイナモローラーテスラ.png", "subWeapon":"スプラッシュボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":35, "name":"ヴァリアブルローラー","attribute":"ローラー","imageUrl":"ヴァリアブルローラー.png", "subWeapon":"トラップ", "specialWeapon":"マルチミサイル", "subWeaponImageName":"トラップ", "specialWeaponImageName":"マルチミサイル"},
      {"id":36, "name":"ヴァリアブルローラーフォイル","attribute":"ローラー","imageUrl":"ヴァリアブルローラーフォイル.png", "subWeapon":"キューバンボム", "specialWeapon":"スミナガシート", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      {"id":37, "name":"ワイドローラー","attribute":"ローラー","imageUrl":"ワイドローラー.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"キューインキ"},
      {"id":38, "name":"ワイドローラーコラボ","attribute":"ローラー","imageUrl":"ワイドローラーコラボ.png", "subWeapon":"ラインマーカー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"アメフラシ"},
      // --- チャージャー ---
      {"id":39, "name":"スクイックリンα","attribute":"チャージャー","imageUrl":"スクイックリンα.png", "subWeapon":"ポイントセンサー", "specialWeapon":"グレートバリア", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"グレートバリア"},
      {"id":40, "name":"スクイックリンβ","attribute":"チャージャー","imageUrl":"スクイックリンβ.png", "subWeapon":"ロボットボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":41, "name":"スプラチャージャー","attribute":"チャージャー","imageUrl":"スプラチャージャー.png", "subWeapon":"スプラッシュボム", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"キューインキ"},
      {"id":42, "name":"スプラチャージャーコラボ","attribute":"チャージャー","imageUrl":"スプラチャージャーコラボ.png", "subWeapon":"トラップ", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"トラップ", "specialWeaponImageName":"トリプルトルネード"},
      {"id":43, "name":"スプラスコープ","attribute":"チャージャー","imageUrl":"スプラスコープ.png", "subWeapon":"スプラッシュボム", "specialWeapon":"キューインキ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"キューインキ"},
      {"id":44, "name":"スプラスコープコラボ","attribute":"チャージャー","imageUrl":"スプラスコープコラボ.png", "subWeapon":"トラップ", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"トラップ", "specialWeaponImageName":"トリプルトルネード"},
      {"id":45, "name":"リッター4K","attribute":"チャージャー","imageUrl":"リッター4K.png", "subWeapon":"トラップ", "specialWeapon":"ホップソナー", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ホップソナー"},
      {"id":46, "name":"リッター4Kカスタム","attribute":"チャージャー","imageUrl":"リッター4Kカスタム.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":47, "name":"4Kスコープ","attribute":"チャージャー","imageUrl":"4Kスコープ.png", "subWeapon":"トラップ", "specialWeapon":"ホップソナー", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ホップソナー"},
      {"id":48, "name":"4Kスコープカスタム","attribute":"チャージャー","imageUrl":"4Kスコープカスタム.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"テイオウイカ"},
      {"id":49, "name":"14式竹筒銃・甲","attribute":"チャージャー","imageUrl":"14式竹筒銃・甲.png", "subWeapon":"ロボットボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":50, "name":"14式竹筒銃・乙","attribute":"チャージャー","imageUrl":"14式竹筒銃・乙.png", "subWeapon":"タンサンボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":51, "name":"ソイチューバー","attribute":"チャージャー","imageUrl":"ソイチューバー.png", "subWeapon":"トーピード", "specialWeapon":"マルチミサイル", "subWeaponImageName":"トーピード", "specialWeaponImageName":"マルチミサイル"},
      {"id":52, "name":"ソイチューバーカスタム","attribute":"チャージャー","imageUrl":"ソイチューバーカスタム.png", "subWeapon":"タンサンボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":53, "name":"R-PEN5H","attribute":"チャージャー","imageUrl":"R-PEN5H.png", "subWeapon":"スプリンクラー", "specialWeapon":"エナジースタンド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"エナジースタンド"},
      {"id":54, "name":"R-PEN5B","attribute":"チャージャー","imageUrl":"R-PEN5B.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"アメフラシ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"アメフラシ"},
      // --- スロッシャー ---
      {"id":55, "name":"バケットスロッシャー","attribute":"スロッシャー","imageUrl":"バケットスロッシャー.png", "subWeapon":"スプラッシュボム", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"トリプルトルネード"},
      {"id":56, "name":"バケットスロッシャーデコ","attribute":"スロッシャー","imageUrl":"バケットスロッシャーデコ.png", "subWeapon":"スプリンクラー", "specialWeapon":"ショクワンダー", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ショクワンダー"},
      {"id":57, "name":"ヒッセン","attribute":"スロッシャー","imageUrl":"ヒッセン.png", "subWeapon":"ポイズンミスト", "specialWeapon":"ジェットパック", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"ジェットパック"},
      {"id":58, "name":"ヒッセン・ヒュー","attribute":"スロッシャー","imageUrl":"ヒッセン・ヒュー.png", "subWeapon":"タンサンボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":59, "name":"スクリュースロッシャー","attribute":"スロッシャー","imageUrl":"スクリュースロッシャー.png", "subWeapon":"ロボットボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":60, "name":"スクリュースロッシャーネオ","attribute":"スロッシャー","imageUrl":"スクリュースロッシャーネオ.png", "subWeapon":"ポイントセンサー", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ウルトラショット"},
      {"id":61, "name":"オーバーフロッシャー","attribute":"スロッシャー","imageUrl":"オーバーフロッシャー.png", "subWeapon":"スプリンクラー", "specialWeapon":"アメフラシ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"アメフラシ"},
      {"id":62, "name":"オーバーフロッシャーデコ","attribute":"スロッシャー","imageUrl":"オーバーフロッシャーデコ.png", "subWeapon":"ラインマーカー", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"テイオウイカ"},
      {"id":63, "name":"エクスプロッシャー","attribute":"スロッシャー","imageUrl":"エクスプロッシャー.png", "subWeapon":"ポイントセンサー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"アメフラシ"},
      {"id":64, "name":"エクスプロッシャーカスタム","attribute":"スロッシャー","imageUrl":"エクスプロッシャーカスタム.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ウルトラチャクチ"}, // ★修正
      {"id":65, "name":"モップリン","attribute":"スロッシャー","imageUrl":"モップリン.png", "subWeapon":"キューバンボム", "specialWeapon":"サメライド", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"サメライド"},
      {"id":66, "name":"モップリンD","attribute":"スロッシャー","imageUrl":"モップリンD.png", "subWeapon":"トラップ", "specialWeapon":"ホップソナー", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ホップソナー"},
      // --- スピナー ---
      {"id":67, "name":"スプラスピナー","attribute":"スピナー","imageUrl":"スプラスピナー.png", "subWeapon":"クイックボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":68, "name":"スプラスピナーコラボ","attribute":"スピナー","imageUrl":"スプラスピナーコラボ.png", "subWeapon":"ポイズンミスト", "specialWeapon":"グレートバリア", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"グレートバリア"},
      {"id":69, "name":"バレルスピナー","attribute":"スピナー","imageUrl":"バレルスピナー.png", "subWeapon":"スプリンクラー", "specialWeapon":"ホップソナー", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ホップソナー"},
      {"id":70, "name":"バレルスピナーデコ","attribute":"スピナー","imageUrl":"バレルスピナーデコ.png", "subWeapon":"ポイントセンサー", "specialWeapon":"テイオウイカ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"テイオウイカ"},
      {"id":71, "name":"ハイドラント","attribute":"スピナー","imageUrl":"ハイドラント.png", "subWeapon":"ロボットボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":72, "name":"ハイドラントカスタム","attribute":"スピナー","imageUrl":"ハイドラントカスタム.png", "subWeapon":"トラップ", "specialWeapon":"スミナガシート", "subWeaponImageName":"トラップ", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      {"id":73, "name":"クーゲルシュライバー","attribute":"スピナー","imageUrl":"クーゲルシュライバー.png", "subWeapon":"タンサンボム", "specialWeapon":"ジェットパック", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ジェットパック"},
      {"id":74, "name":"クーゲルシュライバー・ヒュー","attribute":"スピナー","imageUrl":"クーゲルシュライバー・ヒュー.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"キューインキ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"キューインキ"},
      {"id":75, "name":"ノーチラス47","attribute":"スピナー","imageUrl":"ノーチラス47.png", "subWeapon":"ポイントセンサー", "specialWeapon":"アメフラシ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"アメフラシ"},
      {"id":76, "name":"ノーチラス79","attribute":"スピナー","imageUrl":"ノーチラス79.png", "subWeapon":"キューバンボム", "specialWeapon":"ウルトラチャクチ", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ウルトラチャクチ"},
      {"id":77, "name":"イグザミナー","attribute":"スピナー","imageUrl":"イグザミナー.png", "subWeapon":"カーリングボム", "specialWeapon":"エナジースタンド", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"エナジースタンド"},
      {"id":78, "name":"イグザミナー・ヒュー","attribute":"スピナー","imageUrl":"イグザミナー・ヒュー.png", "subWeapon":"スプラッシュボム", "specialWeapon":"カニタンク", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"カニタンク"},
      // --- マニューバー ---
      {"id":79, "name":"スパッタリー","attribute":"マニューバー","imageUrl":"スパッタリー.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"エナジースタンド", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"エナジースタンド"},
      {"id":80, "name":"スパッタリー・ヒュー","attribute":"マニューバー","imageUrl":"スパッタリー・ヒュー.png", "subWeapon":"トーピード", "specialWeapon":"サメライド", "subWeaponImageName":"トーピード", "specialWeaponImageName":"サメライド"},
      {"id":81, "name":"スプラマニューバー","attribute":"マニューバー","imageUrl":"スプラマニューバー.png", "subWeapon":"キューバンボム", "specialWeapon":"カニタンク", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"カニタンク"},
      {"id":82, "name":"スプラマニューバーコラボ","attribute":"マニューバー","imageUrl":"スプラマニューバーコラボ.png", "subWeapon":"カーリングボム", "specialWeapon":"ナイスダマ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ナイスダマ"},
      {"id":83, "name":"ケルビン525","attribute":"マニューバー","imageUrl":"ケルビン525.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"ナイスダマ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ナイスダマ"},
      {"id":84, "name":"ケルビン525デコ","attribute":"マニューバー","imageUrl":"ケルビン525デコ.png", "subWeapon":"ポイントセンサー", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":85, "name":"デュアルスイーパー","attribute":"マニューバー","imageUrl":"デュアルスイーパー.png", "subWeapon":"スプラッシュボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ホップソナー"},
      {"id":86, "name":"デュアルスイーパーカスタム","attribute":"マニューバー","imageUrl":"デュアルスイーパーカスタム.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"デコイチラシ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"デコイチラシ"},
      {"id":87, "name":"クアッドホッパーブラック","attribute":"マニューバー","imageUrl":"クアッドホッパーブラック.png", "subWeapon":"ロボットボム", "specialWeapon":"サメライド", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"サメライド"},
      {"id":88, "name":"クアッドホッパーホワイト","attribute":"マニューバー","imageUrl":"クアッドホッパーホワイト.png", "subWeapon":"スプリンクラー", "specialWeapon":"ショクワンダー", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"ショクワンダー"},
      {"id":89, "name":"ガエンFF","attribute":"マニューバー","imageUrl":"ガエンFF.png", "subWeapon":"トラップ", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"トラップ", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":90, "name":"ガエンFFカスタム","attribute":"マニューバー","imageUrl":"ガエンFFカスタム.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"テイオウイカ"},
      // --- シェルター ---
      {"id":91, "name":"パラシェルター","attribute":"シェルター","imageUrl":"パラシェルター.png", "subWeapon":"スプリンクラー", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"トリプルトルネード"},
      {"id":92, "name":"パラシェルターソレーラ","attribute":"シェルター","imageUrl":"パラシェルターソレーラ.png", "subWeapon":"ロボットボム", "specialWeapon":"ジェットパック", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ジェットパック"},
      {"id":93, "name":"キャンピングシェルター","attribute":"シェルター","imageUrl":"キャンピングシェルター.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"キューインキ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"キューインキ"},
      {"id":94, "name":"キャンピングシェルターソレーラ","attribute":"シェルター","imageUrl":"キャンピングシェルターソレーラ.png", "subWeapon":"トラップ", "specialWeapon":"ウルトラショット", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ウルトラショット"},
      {"id":95, "name":"スパイガジェット","attribute":"シェルター","imageUrl":"スパイガジェット.png", "subWeapon":"トラップ", "specialWeapon":"サメライド", "subWeaponImageName":"トラップ", "specialWeaponImageName":"サメライド"},
      {"id":96, "name":"スパイガジェットソレーラ","attribute":"シェルター","imageUrl":"スパイガジェットソレーラ.png", "subWeapon":"トーピード", "specialWeapon":"スミナガシート", "subWeaponImageName":"トーピード", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      {"id":97, "name":"24式張替傘・甲","attribute":"シェルター","imageUrl":"24式張替傘・甲.png", "subWeapon":"ラインマーカー", "specialWeapon":"グレートバリア", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"グレートバリア"},
      {"id":98, "name":"24式張替傘・乙","attribute":"シェルター","imageUrl":"24式張替傘・乙.png", "subWeapon":"トラップ", "specialWeapon":"デコイチラシ", "subWeaponImageName":"トラップ", "specialWeaponImageName":"デコイチラシ"},
      // --- ブラスター ---
      {"id":99, "name":"ノヴァブラスター","attribute":"ブラスター","imageUrl":"ノヴァブラスター.png", "subWeapon":"スプラッシュボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":100, "name":"ノヴァブラスターネオ","attribute":"ブラスター","imageUrl":"ノヴァブラスターネオ.png", "subWeapon":"タンサンボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"タンサンボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":101, "name":"ホットブラスター","attribute":"ブラスター","imageUrl":"ホットブラスター.png", "subWeapon":"ロボットボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"グレートバリア"},
      {"id":102, "name":"ホットブラスターカスタム","attribute":"ブラスター","imageUrl":"ホットブラスターカスタム.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"ウルトラショット", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"ウルトラショット"},
      {"id":103, "name":"ロングブラスター","attribute":"ブラスター","imageUrl":"ロングブラスター.png", "subWeapon":"キューバンボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ホップソナー"},
      {"id":104, "name":"ロングブラスターカスタム","attribute":"ブラスター","imageUrl":"ロングブラスターカスタム.png", "subWeapon":"スプラッシュボム", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"テイオウイカ"},
      {"id":105, "name":"クラッシュブラスター","attribute":"ブラスター","imageUrl":"クラッシュブラスター.png", "subWeapon":"スプラッシュボム", "specialWeapon":"ウルトラショット", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"ウルトラショット"},
      {"id":106, "name":"クラッシュブラスターネオ","attribute":"ブラスター","imageUrl":"クラッシュブラスターネオ.png", "subWeapon":"カーリングボム", "specialWeapon":"デコイチラシ", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"デコイチラシ"},
      {"id":107, "name":"ラピッドブラスター","attribute":"ブラスター","imageUrl":"ラピッドブラスター.png", "subWeapon":"トラップ", "specialWeapon":"トリプルトルネード", "subWeaponImageName":"トラップ", "specialWeaponImageName":"トリプルトルネード"},
      {"id":108, "name":"ラピッドブラスターデコ","attribute":"ブラスター","imageUrl":"ラピッドブラスターデコ.png", "subWeapon":"トーピード", "specialWeapon":"ジェットパック", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ジェットパック"},
      {"id":109, "name":"Rブラスターエリート","attribute":"ブラスター","imageUrl":"Rブラスターエリート.png", "subWeapon":"ポイズンミスト", "specialWeapon":"キューインキ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"キューインキ"},
      {"id":110, "name":"Rブラスターエリートデコ","attribute":"ブラスター","imageUrl":"Rブラスターエリートデコ.png", "subWeapon":"ラインマーカー", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ラインマーカー", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":111, "name":"S-BLAST92","attribute":"ブラスター","imageUrl":"S-BLAST92.png", "subWeapon":"スプリンクラー", "specialWeapon":"サメライド", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"サメライド"},
      {"id":112, "name":"S-BLAST91","attribute":"ブラスター","imageUrl":"S-BLAST91.png", "subWeapon":"スプラッシュシールド", "specialWeapon":"ナイスダマ", "subWeaponImageName":"スプラッシュシールド", "specialWeaponImageName":"ナイスダマ"},
      // --- フデ ---
      {"id":113, "name":"パブロ","attribute":"フデ","imageUrl":"パブロ.png", "subWeapon":"スプラッシュボム", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"スプラッシュボム", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":114, "name":"パブロ・ヒュー","attribute":"フデ","imageUrl":"パブロ・ヒュー.png", "subWeapon":"トラップ", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"トラップ", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":115, "name":"ホクサイ","attribute":"フデ","imageUrl":"ホクサイ.png", "subWeapon":"キューバンボム", "specialWeapon":"ショクワンダー", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"ショクワンダー"},
      {"id":116, "name":"ホクサイ・ヒュー","attribute":"フデ","imageUrl":"ホクサイ・ヒュー.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"アメフラシ", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"アメフラシ"},
      {"id":117, "name":"フィンセント","attribute":"フデ","imageUrl":"フィンセント.png", "subWeapon":"カーリングボム", "specialWeapon":"ホップソナー", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"ホップソナー"},
      {"id":118, "name":"フィンセント・ヒュー","attribute":"フデ","imageUrl":"フィンセント・ヒュー.png", "subWeapon":"ポイントセンサー", "specialWeapon":"スミナガシート", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"スミナガシート"}, // 仮: スミナガシート
      // --- ストリンガー ---
      {"id":119, "name":"トライストリンガー","attribute":"ストリンガー","imageUrl":"トライストリンガー.png", "subWeapon":"ポイズンミスト", "specialWeapon":"メガホンレーザー5.1ch", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"メガホンレーザー5.1ch"},
      {"id":120, "name":"トライストリンガーコラボ","attribute":"ストリンガー","imageUrl":"トライストリンガーコラボ.png", "subWeapon":"スプリンクラー", "specialWeapon":"テイオウイカ", "subWeaponImageName":"スプリンクラー", "specialWeaponImageName":"テイオウイカ"},
      {"id":121, "name":"LACT-450","attribute":"ストリンガー","imageUrl":"LACT-450.png", "subWeapon":"カーリングボム", "specialWeapon":"マルチミサイル", "subWeaponImageName":"カーリングボム", "specialWeaponImageName":"マルチミサイル"},
      {"id":122, "name":"LACT-450デコ","attribute":"ストリンガー","imageUrl":"LACT-450デコ.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"サメライド", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"サメライド"},
      {"id":123, "name":"フルイドV","attribute":"ストリンガー","imageUrl":"フルイドV.png", "subWeapon":"ロボットボム", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"ロボットボム", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":124, "name":"フルイドVカスタム","attribute":"ストリンガー","imageUrl":"フルイドVカスタム.png", "subWeapon":"ポイントセンサー", "specialWeapon":"ホップソナー", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"ホップソナー"},
      // --- ワイパー ---
      {"id":125, "name":"ジムワイパー","attribute":"ワイパー","imageUrl":"ジムワイパー.png", "subWeapon":"クイックボム", "specialWeapon":"カニタンク", "subWeaponImageName":"クイックボム", "specialWeaponImageName":"カニタンク"},
      {"id":126, "name":"ジムワイパー・ヒュー","attribute":"ワイパー","imageUrl":"ジムワイパー・ヒュー.png", "subWeapon":"ポイズンミスト", "specialWeapon":"キューインキ", "subWeaponImageName":"ポイズンミスト", "specialWeaponImageName":"キューインキ"},
      {"id":127, "name":"ドライブワイパー","attribute":"ワイパー","imageUrl":"ドライブワイパー.png", "subWeapon":"トーピード", "specialWeapon":"ウルトラハンコ", "subWeaponImageName":"トーピード", "specialWeaponImageName":"ウルトラハンコ"},
      {"id":128, "name":"ドライブワイパーデコ","attribute":"ワイパー","imageUrl":"ドライブワイパーデコ.png", "subWeapon":"ジャンプビーコン", "specialWeapon":"マルチミサイル", "subWeaponImageName":"ジャンプビーコン", "specialWeaponImageName":"マルチミサイル"},
      {"id":129, "name":"デンタルワイパーミント","attribute":"ワイパー","imageUrl":"デンタルワイパーミント.png", "subWeapon":"キューバンボム", "specialWeapon":"グレートバリア", "subWeaponImageName":"キューバンボム", "specialWeaponImageName":"グレートバリア"},
      {"id":130, "name":"デンタルワイパースミ","attribute":"ワイパー","imageUrl":"デンタルワイパースミ.png", "subWeapon":"ポイントセンサー", "specialWeapon":"カニタンク", "subWeaponImageName":"ポイントセンサー", "specialWeaponImageName":"カニタンク"}
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