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
            attributes: ['id', 'name', 'imageUrl', 'attribute'], // 必要なカラムのみ取得
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
    // force: true は開発中のみ。本番ではマイグレーションを使うべき
    await sequelize.sync({ force: true });
    console.log('Database synchronized.');

    // ★ マスターデータのみ定義 (selectedBy, bannedBy を削除)
    const masterWeaponsData: Omit<MasterWeapon, 'createdAt' | 'updatedAt'>[] = [
      {"name":"ボールドマーカー","attribute":"シューター","imageUrl":"ボールドマーカー.png","id":1},
      {"name":"ボールドマーカーネオ","attribute":"シューター","imageUrl":"ボールドマーカーネオ.png","id":2},
      {"name":"わかばシューター","attribute":"シューター","imageUrl":"わかばシューター.png","id":3},
      {"name":"もみじシューター","attribute":"シューター","imageUrl":"もみじシューター.png","id":4},
      {"name":"シャープマーカー","attribute":"シューター","imageUrl":"シャープマーカー.png","id":5},
      {"name":"シャープマーカーネオ","attribute":"シューター","imageUrl":"シャープマーカーネオ.png","id":6},
      {"name":"プロモデラーMG","attribute":"シューター","imageUrl":"プロモデラーMG.png","id":7},
      {"name":"プロモデラーRG","attribute":"シューター","imageUrl":"プロモデラーRG.png","id":8},
      {"name":"スプラシューター","attribute":"シューター","imageUrl":"スプラシューター.png","id":9},
      {"name":"スプラシューターコラボ","attribute":"シューター","imageUrl":"スプラシューターコラボ.png","id":10},
      {"name":"52ガロン","attribute":"シューター","imageUrl":"52ガロン.png","id":11},
      {"name":"52ガロンデコ","attribute":"シューター","imageUrl":"52ガロンデコ.png","id":12},
      {"name":"N-ZAP85","attribute":"シューター","imageUrl":"N-ZAP85.png","id":13},
      {"name":"N-ZAP89","attribute":"シューター","imageUrl":"N-ZAP89.png","id":14},
      {"name":"プライムシューター","attribute":"シューター","imageUrl":"プライムシューター.png","id":15},
      {"name":"プライムシューターコラボ","attribute":"シューター","imageUrl":"プライムシューターコラボ.png","id":16},
      {"name":"96ガロン","attribute":"シューター","imageUrl":"96ガロン.png","id":17},
      {"name":"96ガロンデコ","attribute":"シューター","imageUrl":"96ガロンデコ.png","id":18},
      {"name":"ジェットスイーパー","attribute":"シューター","imageUrl":"ジェットスイーパー.png","id":19},
      {"name":"ジェットスイーパーカスタム","attribute":"シューター","imageUrl":"ジェットスイーパーカスタム.png","id":20},
      {"name":"スペースシューター","attribute":"シューター","imageUrl":"スペースシューター.png","id":21},
      {"name":"スペースシューターコラボ","attribute":"シューター","imageUrl":"スペースシューターコラボ.png","id":22},
      {"name":"L3リールガン","attribute":"シューター","imageUrl":"L3リールガン.png","id":23},
      {"name":"L3リールガンD","attribute":"シューター","imageUrl":"L3リールガンD.png","id":24},
      {"name":"H3リールガン","attribute":"シューター","imageUrl":"H3リールガン.png","id":25},
      {"name":"H3リールガンD","attribute":"シューター","imageUrl":"H3リールガンD.png","id":26},
      {"name":"ボトルガイザー","attribute":"シューター","imageUrl":"ボトルガイザー.png","id":27},
      {"name":"ボトルガイザーフォイル","attribute":"シューター","imageUrl":"ボトルガイザーフォイル.png","id":28},
      {"name":"カーボンローラー","attribute":"ローラー","imageUrl":"カーボンローラー.png","id":29},
      {"name":"カーボンローラーデコ","attribute":"ローラー","imageUrl":"カーボンローラーデコ.png","id":30},
      {"name":"スプラローラー","attribute":"ローラー","imageUrl":"スプラローラー.png","id":31},
      {"name":"スプラローラーコラボ","attribute":"ローラー","imageUrl":"スプラローラーコラボ.png","id":32},
      {"name":"ダイナモローラー","attribute":"ローラー","imageUrl":"ダイナモローラー.png","id":33},
      {"name":"ダイナモローラーテスラ","attribute":"ローラー","imageUrl":"ダイナモローラーテスラ.png","id":34},
      {"name":"ヴァリアブルローラー","attribute":"ローラー","imageUrl":"ヴァリアブルローラー.png","id":35},
      {"name":"ヴァリアブルローラーフォイル","attribute":"ローラー","imageUrl":"ヴァリアブルローラーフォイル.png","id":36},
      {"name":"ワイドローラー","attribute":"ローラー","imageUrl":"ワイドローラー.png","id":37},
      {"name":"ワイドローラーコラボ","attribute":"ローラー","imageUrl":"ワイドローラーコラボ.png","id":38},
      {"name":"スクイックリンα","attribute":"チャージャー","imageUrl":"スクイックリンα.png","id":39},
      {"name":"スクイックリンβ","attribute":"チャージャー","imageUrl":"スクイックリンβ.png","id":40},
      {"name":"スプラチャージャー","attribute":"チャージャー","imageUrl":"スプラチャージャー.png","id":41},
      {"name":"スプラチャージャーコラボ","attribute":"チャージャー","imageUrl":"スプラチャージャーコラボ.png","id":42},
      {"name":"スプラスコープ","attribute":"チャージャー","imageUrl":"スプラスコープ.png","id":43},
      {"name":"スプラスコープコラボ","attribute":"チャージャー","imageUrl":"スプラスコープコラボ.png","id":44},
      {"name":"リッター4K","attribute":"チャージャー","imageUrl":"リッター4K.png","id":45},
      {"name":"リッター4Kカスタム","attribute":"チャージャー","imageUrl":"リッター4Kカスタム.png","id":46},
      {"name":"4Kスコープ","attribute":"チャージャー","imageUrl":"4Kスコープ.png","id":47},
      {"name":"4Kスコープカスタム","attribute":"チャージャー","imageUrl":"4Kスコープカスタム.png","id":48},
      {"name":"14式竹筒銃・甲","attribute":"チャージャー","imageUrl":"14式竹筒銃・甲.png","id":49},
      {"name":"14式竹筒銃・乙","attribute":"チャージャー","imageUrl":"14式竹筒銃・乙.png","id":50},
      {"name":"ソイチューバー","attribute":"チャージャー","imageUrl":"ソイチューバー.png","id":51},
      {"name":"ソイチューバーカスタム","attribute":"チャージャー","imageUrl":"ソイチューバーカスタム.png","id":52},
      {"name":"R-PEN5H","attribute":"チャージャー","imageUrl":"R-PEN5H.png","id":53},
      {"name":"R-PEN5B","attribute":"チャージャー","imageUrl":"R-PEN5B.png","id":54},
      {"name":"バケットスロッシャー","attribute":"スロッシャー","imageUrl":"バケットスロッシャー.png","id":55},
      {"name":"バケットスロッシャーデコ","attribute":"スロッシャー","imageUrl":"バケットスロッシャーデコ.png","id":56},
      {"name":"ヒッセン","attribute":"スロッシャー","imageUrl":"ヒッセン.png","id":57},
      {"name":"ヒッセン・ヒュー","attribute":"スロッシャー","imageUrl":"ヒッセン・ヒュー.png","id":58},
      {"name":"スクリュースロッシャー","attribute":"スロッシャー","imageUrl":"スクリュースロッシャー.png","id":59},
      {"name":"スクリュースロッシャーネオ","attribute":"スロッシャー","imageUrl":"スクリュースロッシャーネオ.png","id":60},
      {"name":"オーバーフロッシャー","attribute":"スロッシャー","imageUrl":"オーバーフロッシャー.png","id":61},
      {"name":"オーバーフロッシャーデコ","attribute":"スロッシャー","imageUrl":"オーバーフロッシャーデコ.png","id":62},
      {"name":"エクスプロッシャー","attribute":"スロッシャー","imageUrl":"エクスプロッシャー.png","id":63},
      {"name":"エクスプロッシャーカスタム","attribute":"スロッシャー","imageUrl":"エクスプロッシャーカスタム.png","id":64},
      {"name":"モップリン","attribute":"スロッシャー","imageUrl":"モップリン.png","id":65},
      {"name":"モップリンD","attribute":"スロッシャー","imageUrl":"モップリンD.png","id":66},
      {"name":"スプラスピナー","attribute":"スピナー","imageUrl":"スプラスピナー.png","id":67},
      {"name":"スプラスピナーコラボ","attribute":"スピナー","imageUrl":"スプラスピナーコラボ.png","id":68},
      {"name":"バレルスピナー","attribute":"スピナー","imageUrl":"バレルスピナー.png","id":69},
      {"name":"バレルスピナーデコ","attribute":"スピナー","imageUrl":"バレルスピナーデコ.png","id":70},
      {"name":"ハイドラント","attribute":"スピナー","imageUrl":"ハイドラント.png","id":71},
      {"name":"ハイドラントカスタム","attribute":"スピナー","imageUrl":"ハイドラントカスタム.png","id":72},
      {"name":"クーゲルシュライバー","attribute":"スピナー","imageUrl":"クーゲルシュライバー.png","id":73},
      {"name":"クーゲルシュライバー・ヒュー","attribute":"スピナー","imageUrl":"クーゲルシュライバー・ヒュー.png","id":74},
      {"name":"ノーチラス47","attribute":"スピナー","imageUrl":"ノーチラス47.png","id":75},
      {"name":"ノーチラス79","attribute":"スピナー","imageUrl":"ノーチラス79.png","id":76},
      {"name":"イグザミナー","attribute":"スピナー","imageUrl":"イグザミナー.png","id":77},
      {"name":"イグザミナー・ヒュー","attribute":"スピナー","imageUrl":"イグザミナー・ヒュー.png","id":78},
      {"name":"スパッタリー","attribute":"マニューバー","imageUrl":"スパッタリー.png","id":79},
      {"name":"スパッタリー・ヒュー","attribute":"マニューバー","imageUrl":"スパッタリー・ヒュー.png","id":80},
      {"name":"スプラマニューバー","attribute":"マニューバー","imageUrl":"スプラマニューバー.png","id":81},
      {"name":"スプラマニューバーコラボ","attribute":"マニューバー","imageUrl":"スプラマニューバーコラボ.png","id":82},
      {"name":"ケルビン525","attribute":"マニューバー","imageUrl":"ケルビン525.png","id":83},
      {"name":"ケルビン525デコ","attribute":"マニューバー","imageUrl":"ケルビン525デコ.png","id":84},
      {"name":"デュアルスイーパー","attribute":"マニューバー","imageUrl":"デュアルスイーパー.png","id":85},
      {"name":"デュアルスイーパーカスタム","attribute":"マニューバー","imageUrl":"デュアルスイーパーカスタム.png","id":86},
      {"name":"クアッドホッパーブラック","attribute":"マニューバー","imageUrl":"クアッドホッパーブラック.png","id":87},
      {"name":"クアッドホッパーホワイト","attribute":"マニューバー","imageUrl":"クアッドホッパーホワイト.png","id":88},
      {"name":"ガエンFF","attribute":"マニューバー","imageUrl":"ガエンFF.png","id":89},
      {"name":"ガエンFFカスタム","attribute":"マニューバー","imageUrl":"ガエンFFカスタム.png","id":90},
      {"name":"パラシェルター","attribute":"シェルター","imageUrl":"パラシェルター.png","id":91},
      {"name":"パラシェルターソレーラ","attribute":"シェルター","imageUrl":"パラシェルターソレーラ.png","id":92},
      {"name":"キャンピングシェルター","attribute":"シェルター","imageUrl":"キャンピングシェルター.png","id":93},
      {"name":"キャンピングシェルターソレーラ","attribute":"シェルター","imageUrl":"キャンピングシェルターソレーラ.png","id":94},
      {"name":"スパイガジェット","attribute":"シェルター","imageUrl":"スパイガジェット.png","id":95},
      {"name":"スパイガジェットソレーラ","attribute":"シェルター","imageUrl":"スパイガジェットソレーラ.png","id":96},
      {"name":"24式張替傘・甲","attribute":"シェルター","imageUrl":"24式張替傘・甲.png","id":97},
      {"name":"24式張替傘・乙","attribute":"シェルター","imageUrl":"24式張替傘・乙.png","id":98},
      {"name":"ノヴァブラスター","attribute":"ブラスター","imageUrl":"ノヴァブラスター.png","id":99},
      {"name":"ノヴァブラスターネオ","attribute":"ブラスター","imageUrl":"ノヴァブラスターネオ.png","id":100},
      {"name":"ホットブラスター","attribute":"ブラスター","imageUrl":"ホットブラスター.png","id":101},
      {"name":"ホットブラスターカスタム","attribute":"ブラスター","imageUrl":"ホットブラスターカスタム.png","id":102},
      {"name":"ロングブラスター","attribute":"ブラスター","imageUrl":"ロングブラスター.png","id":103},
      {"name":"ロングブラスターカスタム","attribute":"ブラスター","imageUrl":"ロングブラスターカスタム.png","id":104},
      {"name":"クラッシュブラスター","attribute":"ブラスター","imageUrl":"クラッシュブラスター.png","id":105},
      {"name":"クラッシュブラスターネオ","attribute":"ブラスター","imageUrl":"クラッシュブラスターネオ.png","id":106},
      {"name":"ラピッドブラスター","attribute":"ブラスター","imageUrl":"ラピッドブラスター.png","id":107},
      {"name":"ラピッドブラスターデコ","attribute":"ブラスター","imageUrl":"ラピッドブラスターデコ.png","id":108},
      {"name":"Rブラスターエリート","attribute":"ブラスター","imageUrl":"Rブラスターエリート.png","id":109},
      {"name":"Rブラスターエリートデコ","attribute":"ブラスター","imageUrl":"Rブラスターエリートデコ.png","id":110},
      {"name":"S-BLAST92","attribute":"ブラスター","imageUrl":"S-BLAST92.png","id":111},
      {"name":"S-BLAST91","attribute":"ブラスター","imageUrl":"S-BLAST91.png","id":112},
      {"name":"パブロ","attribute":"フデ","imageUrl":"パブロ.png","id":113},
      {"name":"パブロ・ヒュー","attribute":"フデ","imageUrl":"パブロ・ヒュー.png","id":114},
      {"name":"ホクサイ","attribute":"フデ","imageUrl":"ホクサイ.png","id":115},
      {"name":"ホクサイ・ヒュー","attribute":"フデ","imageUrl":"ホクサイ・ヒュー.png","id":116},
      {"name":"フィンセント","attribute":"フデ","imageUrl":"フィンセント.png","id":117},
      {"name":"フィンセント・ヒュー","attribute":"フデ","imageUrl":"フィンセント・ヒュー.png","id":118},
      {"name":"トライストリンガー","attribute":"ストリンガー","imageUrl":"トライストリンガー.png","id":119},
      {"name":"トライストリンガーコラボ","attribute":"ストリンガー","imageUrl":"トライストリンガーコラボ.png","id":120},
      {"name":"LACT-450","attribute":"ストリンガー","imageUrl":"LACT-450.png","id":121},
      {"name":"LACT-450デコ","attribute":"ストリンガー","imageUrl":"LACT-450デコ.png","id":122},
      {"name":"フルイドV","attribute":"ストリンガー","imageUrl":"フルイドV.png","id":123},
      {"name":"フルイドVカスタム","attribute":"ストリンガー","imageUrl":"フルイドVカスタム.png","id":124},
      {"name":"ジムワイパー","attribute":"ワイパー","imageUrl":"ジムワイパー.png","id":125},
      {"name":"ジムワイパー・ヒュー","attribute":"ワイパー","imageUrl":"ジムワイパー・ヒュー.png","id":126},
      {"name":"ドライブワイパー","attribute":"ワイパー","imageUrl":"ドライブワイパー.png","id":127},
      {"name":"ドライブワイパーデコ","attribute":"ワイパー","imageUrl":"ドライブワイパーデコ.png","id":128},
      {"name":"デンタルワイパーミント","attribute":"ワイパー","imageUrl":"デンタルワイパーミント.png","id":129},
      {"name":"デンタルワイパースミ","attribute":"ワイパー","imageUrl":"デンタルワイパースミ.png","id":130}
  ];

    // MasterWeapon[] 型として扱うことで型チェック
    const weaponsToCreate: CreationAttributes<WeaponModel>[] = masterWeaponsData.map(w => ({
      // MasterWeapon のプロパティを WeaponModel のカラムに合わせてマッピング
      // この場合、MasterWeapon と CreationAttributes<WeaponModel> (必要な部分) は一致するはず
      id: w.id,
      name: w.name,
      imageUrl: w.imageUrl, // DBに保存するパス/URL
      attribute: w.attribute,
      // createdAt, updatedAt は Sequelize が自動で処理するので含めない
  }));

    await WeaponModel.bulkCreate(weaponsToCreate);

    console.log(`Database initialized with ${masterWeaponsData.length} master weapons.`);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};