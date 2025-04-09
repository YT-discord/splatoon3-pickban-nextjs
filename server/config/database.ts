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
        // imageUrlは変更する必要があるかもしれない
        {"name":"わかばシューター","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/わかばシューター.png","id":1},
        {"name":"スプラシューター","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/スプラシューター.png","id":2},
        {"name":"プロモデラーMG","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/プロモデラーMG.png","id":3},
        {"name":"N-ZAP85","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/N-ZAP85.png","id":4},
        {"name":"もみじシューター","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/もみじシューター.png","id":5},
        {"name":"スペースシューター","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/スペースシューター.png","id":6},
        {"name":"ボールドマーカー","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ボールドマーカー.png","id":7},
        {"name":"プライムシューター","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/プライムシューター.png","id":8},
        {"name":"スプラシューターコラボ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/スプラシューターコラボ.png","id":9},
        {"name":"52ガロン","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/52ガロン.png","id":10},
        {"name":"N-ZAP89","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/N-ZAP89.png","id":11},
        {"name":"スペースシューターコラボ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/スペースシューターコラボ.png","id":12},
        {"name":"L3リールガン","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/L3リールガン.png","id":13},
        {"name":"ボールドマーカーネオ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ボールドマーカーネオ.png","id":14},
        {"name":"52ガロンデコ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/52ガロンデコ.png","id":15},
        {"name":"ジェットスイーパー","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ジェットスイーパー.png","id":16},
        {"name":"シャープマーカー","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/シャープマーカー.png","id":17},
        {"name":"96ガロン","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/96ガロン.png","id":18},
        {"name":"プロモデラーRG","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/プロモデラーRG.png","id":19},
        {"name":"L3リールガンD","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/L3リールガンD.png","id":20},
        {"name":"ボトルガイザー","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ボトルガイザー.png","id":21},
        {"name":"プライムシューターコラボ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/プライムシューターコラボ.png","id":22},
        {"name":"ジェットスイーパーカスタム","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ジェットスイーパーカスタム.png","id":23},
        {"name":"シャープマーカーネオ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/シャープマーカーネオ.png","id":24},
        {"name":"96ガロンデコ","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/96ガロンデコ.png","id":25},
        {"name":"H3リールガン","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/H3リールガン.png","id":26},
        {"name":"ボトルガイザーフォイル","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/ボトルガイザーフォイル.png","id":27},
        {"name":"H3リールガンD","attribute":"シューター","imageUrl":"http://localhost:3001/api/weapons/H3リールガンD.png","id":28},
        {"name":"スプラローラー","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/スプラローラー.png","id":29},
        {"name":"カーボンローラー","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/カーボンローラー.png","id":30},
        {"name":"スプラローラーコラボ","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/スプラローラーコラボ.png","id":31},
        {"name":"ダイナモローラー","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ダイナモローラー.png","id":32},
        {"name":"ワイドローラー","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ワイドローラー.png","id":33},
        {"name":"ダイナモローラーテスラ","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ダイナモローラーテスラ.png","id":34},
        {"name":"ワイドローラーコラボ","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ワイドローラーコラボ.png","id":35},
        {"name":"ヴァリアブルローラー","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ヴァリアブルローラー.png","id":36},
        {"name":"カーボンローラーデコ","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/カーボンローラーデコ.png","id":37},
        {"name":"ヴァリアブルローラーフォイル","attribute":"ローラー","imageUrl":"http://localhost:3001/api/weapons/ヴァリアブルローラーフォイル.png","id":38},
        {"name":"スプラチャージャー","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スプラチャージャー.png","id":39},
        {"name":"スクイックリンα","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スクイックリンα.png","id":40},
        {"name":"スプラチャージャーコラボ","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スプラチャージャーコラボ.png","id":41},
        {"name":"スプラスコープ","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スプラスコープ.png","id":42},
        {"name":"スクイックリンβ","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スクイックリンβ.png","id":43},
        {"name":"R-PEN5H","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/R-PEN5H.png","id":44},
        {"name":"スプラスコープコラボ","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/スプラスコープコラボ.png","id":45},
        {"name":"リッター4K","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/リッター4K.png","id":46},
        {"name":"R-PEN5B","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/R-PEN5B.png","id":47},
        {"name":"リッター4Kカスタム","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/リッター4Kカスタム.png","id":48},
        {"name":"14式竹筒銃・甲","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/14式竹筒銃・甲.png","id":49},
        {"name":"ソイチューバー","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/ソイチューバー.png","id":50},
        {"name":"4Kスコープ","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/4Kスコープ.png","id":51},
        {"name":"ソイチューバーカスタム","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/ソイチューバーカスタム.png","id":52},
        {"name":"4Kスコープカスタム","attribute":"チャージャー","imageUrl":"http://localhost:3001/api/weapons/4Kスコープカスタム.png","id":53},
        {"name":"バケットスロッシャー","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/バケットスロッシャー.png","id":54},
        {"name":"ヒッセン","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/ヒッセン.png","id":55},
        {"name":"バケットスロッシャーデコ","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/バケットスロッシャーデコ.png","id":56},
        {"name":"スクリュースロッシャー","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/スクリュースロッシャー.png","id":57},
        {"name":"モップリン","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/モップリン.png","id":58},
        {"name":"ヒッセン・ヒュー","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/ヒッセン・ヒュー.png","id":59},
        {"name":"モップリンD","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/モップリンD.png","id":60},
        {"name":"オーバーフロッシャー","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/オーバーフロッシャー.png","id":61},
        {"name":"スクリュースロッシャーネオ","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/スクリュースロッシャーネオ.png","id":62},
        {"name":"オーバーフロッシャーデコ","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/オーバーフロッシャーデコ.png","id":63},
        {"name":"エクスプロッシャー","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/エクスプロッシャー.png","id":64},
        {"name":"エクスプロッシャーカスタム","attribute":"スロッシャー","imageUrl":"http://localhost:3001/api/weapons/エクスプロッシャーカスタム.png","id":65},
        {"name":"バレルスピナー","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/バレルスピナー.png","id":66},
        {"name":"スプラスピナー","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/スプラスピナー.png","id":67},
        {"name":"イグザミナー","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/イグザミナー.png","id":68},
        {"name":"バレルスピナーデコ","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/バレルスピナーデコ.png","id":69},
        {"name":"ハイドラント","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/ハイドラント.png","id":70},
        {"name":"スプラスピナーコラボ","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/スプラスピナーコラボ.png","id":71},
        {"name":"ノーチラス47","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/ノーチラス47.png","id":72},
        {"name":"ノーチラス79","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/ノーチラス79.png","id":73},
        {"name":"クーゲルシュライバー","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/クーゲルシュライバー.png","id":74},
        {"name":"クーゲルシュライバー・ヒュー","attribute":"スピナー","imageUrl":"http://localhost:3001/api/weapons/クーゲルシュライバー・ヒュー.png","id":75},
        {"name":"スプラマニューバー","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/スプラマニューバー.png","id":76},
        {"name":"デュアルスイーパー","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/デュアルスイーパー.png","id":77},
        {"name":"スプラマニューバーコラボ","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/スプラマニューバーコラボ.png","id":78},
        {"name":"スパッタリー","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/スパッタリー.png","id":79},
        {"name":"デュアルスイーパーカスタム","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/デュアルスイーパーカスタム.png","id":80},
        {"name":"クアッドホッパーブラック","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/クアッドホッパーブラック.png","id":81},
        {"name":"ケルビン525","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/ケルビン525.png","id":82},
        {"name":"ガエンFF","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/ガエンFF.png","id":83},
        {"name":"クアッドホッパーホワイト","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/クアッドホッパーホワイト.png","id":84},
        {"name":"スパッタリー・ヒュー","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/スパッタリー・ヒュー.png","id":85},
        {"name":"ケルビン525デコ","attribute":"マニューバー","imageUrl":"http://localhost:3001/api/weapons/ケルビン525デコ.png","id":86},
        {"name":"パラシェルター","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/パラシェルター.png","id":87},
        {"name":"24式張替傘・甲","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/24式張替傘・甲.png","id":88},
        {"name":"キャンピングシェルター","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/キャンピングシェルター.png","id":89},
        {"name":"スパイガジェット","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/スパイガジェット.png","id":90},
        {"name":"パラシェルターソレーラ","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/パラシェルターソレーラ.png","id":91},
        {"name":"キャンピングシェルターソレーラ","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/キャンピングシェルターソレーラ.png","id":92},
        {"name":"スパイガジェットソレーラ","attribute":"シェルター","imageUrl":"http://localhost:3001/api/weapons/スパイガジェットソレーラ.png","id":93},
        {"name":"ホットブラスター","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ホットブラスター.png","id":94},
        {"name":"ラピッドブラスター","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ラピッドブラスター.png","id":95},
        {"name":"ホットブラスターカスタム","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ホットブラスターカスタム.png","id":96},
        {"name":"ラピッドブラスターデコ","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ラピッドブラスターデコ.png","id":97},
        {"name":"ロングブラスター","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ロングブラスター.png","id":98},
        {"name":"ノヴァブラスター","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ノヴァブラスター.png","id":99},
        {"name":"S-BLAST92","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/S-BLAST92.png","id":100},
        {"name":"クラッシュブラスター","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/クラッシュブラスター.png","id":101},
        {"name":"ノヴァブラスターネオ","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/ノヴァブラスターネオ.png","id":102},
        {"name":"クラッシュブラスターネオ","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/クラッシュブラスターネオ.png","id":103},
        {"name":"Rブラスターエリート","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/Rブラスターエリート.png","id":104},
        {"name":"S-BLAST91","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/S-BLAST91.png","id":105},
        {"name":"Rブラスターエリートデコ","attribute":"ブラスター","imageUrl":"http://localhost:3001/api/weapons/Rブラスターエリートデコ.png","id":106},
        {"name":"ホクサイ","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/ホクサイ.png","id":107},
        {"name":"パブロ","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/パブロ.png","id":108},
        {"name":"ホクサイ・ヒュー","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/ホクサイ・ヒュー.png","id":109},
        {"name":"フィンセント","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/フィンセント.png","id":110},
        {"name":"パブロ・ヒュー","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/パブロ・ヒュー.png","id":111},
        {"name":"フィンセント・ヒュー","attribute":"フデ","imageUrl":"http://localhost:3001/api/weapons/フィンセント・ヒュー.png","id":112},
        {"name":"トライストリンガー","attribute":"ストリンガー","imageUrl":"http://localhost:3001/api/weapons/トライストリンガー.png","id":113},
        {"name":"LACT-450","attribute":"ストリンガー","imageUrl":"http://localhost:3001/api/weapons/LACT-450.png","id":114},
        {"name":"トライストリンガーコラボ","attribute":"ストリンガー","imageUrl":"http://localhost:3001/api/weapons/トライストリンガーコラボ.png","id":115},
        {"name":"LACT-450デコ","attribute":"ストリンガー","imageUrl":"http://localhost:3001/api/weapons/LACT-450デコ.png","id":116},
        {"name":"ドライブワイパー","attribute":"ワイパー","imageUrl":"http://localhost:3001/api/weapons/ドライブワイパー.png","id":117},
        {"name":"ドライブワイパーデコ","attribute":"ワイパー","imageUrl":"http://localhost:3001/api/weapons/ドライブワイパーデコ.png","id":118},
        {"name":"ジムワイパー","attribute":"ワイパー","imageUrl":"http://localhost:3001/api/weapons/ジムワイパー.png","id":119},
        {"name":"ジムワイパー・ヒュー","attribute":"ワイパー","imageUrl":"http://localhost:3001/api/weapons/ジムワイパー・ヒュー.png","id":120}
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