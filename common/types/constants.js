"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEAPON_ATTRIBUTES = exports.RULES_DATA = exports.STAGES_DATA = exports.DEFAULT_ROOM_NAMES = exports.ROOM_IDS = exports.SPECIAL_WEAPONS = exports.SUB_WEAPONS = exports.FAST_TIMER_MULTIPLIER = exports.USE_FAST_TIMER = exports.PICK_PHASE_TURN_DURATION = exports.BAN_PHASE_DURATION = exports.RANDOM_WEAPON_CHOICE_ITEM = exports.RANDOM_WEAPON_ID = exports.RANDOM_RULE_CHOICE = exports.RANDOM_STAGE_CHOICE = exports.MAX_USERS_PER_TEAM = exports.TOTAL_PICK_TURNS = exports.MAX_PICKS_PER_TEAM = exports.MAX_BANS_PER_TEAM = exports.MIN_PLAYERS_PER_TEAM = exports.MAX_PLAYERS_PER_TEAM = exports.MAX_USERS_PER_ROOM = void 0;
exports.MAX_USERS_PER_ROOM = 16;
exports.MAX_PLAYERS_PER_TEAM = 4;
exports.MIN_PLAYERS_PER_TEAM = 1;
exports.MAX_BANS_PER_TEAM = 3;
exports.MAX_PICKS_PER_TEAM = 4; // = totalPickTurns / 2
exports.TOTAL_PICK_TURNS = exports.MAX_PICKS_PER_TEAM * 2; // 8
exports.MAX_USERS_PER_TEAM = 4;
// ステージ選択用
exports.RANDOM_STAGE_CHOICE = {
    id: 'random', // id は 'random' 文字列のまま
    name: 'おまかせ',
    imageUrl: '/images/icons/random.png' // ★ ステージ用アイコンパス
};
// ルール選択用
exports.RANDOM_RULE_CHOICE = {
    id: 'random', // id は 'random' 文字列のまま
    name: 'おまかせ',
    imageUrl: '/images/icons/random.png' // ★ ルール用アイコンパス
};
// 武器グリッド用
exports.RANDOM_WEAPON_ID = -1; // 武器用IDは数値
exports.RANDOM_WEAPON_CHOICE_ITEM = {
    id: exports.RANDOM_WEAPON_ID,
    name: 'おまかせ',
    attribute: 'special',
    imageUrl: '/images/weapons/random.png', // ★ 武器用アイコンパス
    subWeapon: '', specialWeapon: '', subWeaponImageName: '', specialWeaponImageName: ''
};
// 時間設定 (秒)
exports.BAN_PHASE_DURATION = 30;
exports.PICK_PHASE_TURN_DURATION = 10;
// Fast Timer (デバッグ用) 環境変数 FAST_TIMER=true で有効
exports.USE_FAST_TIMER = process.env.FAST_TIMER === 'true';
exports.FAST_TIMER_MULTIPLIER = 5; // 例: 1/5 の時間にする
exports.SUB_WEAPONS = [
    "スプラッシュボム", "キューバンボム", "クイックボム", "カーリングボム",
    "ロボットボム", "タンサンボム", "トーピード", "スプリンクラー",
    "スプラッシュシールド", "ジャンプビーコン", "ラインマーカー", "ポイントセンサー",
    "トラップ", "ポイズンミスト"
    // "スプリングボム" など特殊なものがあれば追加
].sort(function (a, b) { return a.localeCompare(b, 'ja'); }); // 五十音順ソート
exports.SPECIAL_WEAPONS = [
    "グレートバリア", "ホップソナー", "カニタンク", "トリプルトルネード",
    "サメライド", "ナイスダマ", "ウルトラショット", "テイオウイカ",
    "エナジースタンド", "デコイチラシ", "キューインキ", "アメフラシ",
    "メガホンレーザー5.1ch", "ジェットパック", "ウルトラハンコ", "マルチミサイル",
    "ショクワンダー", "スミナガシート", "ウルトラチャクチ"
].sort(function (a, b) { return a.localeCompare(b, 'ja'); }); // 五十音順ソート
exports.ROOM_IDS = [
    "アイロニック",
    "アナアキ",
    "アロメ",
    "エゾッコ",
    "エンペリー",
    "クラーゲス",
    "シグレニ",
    "シチリン",
    "ジモン",
    "タタキケンサキ",
    "バトロイカ",
    "バラズシ",
    "フォーリマ",
    "ホタックス",
    "ホッコリー",
    "ヤコ",
    "ロッケンベルグ"
];
exports.DEFAULT_ROOM_NAMES = [
    "エンジョイ部屋", // room1
    "エンジョイ部屋", // room2
    "エンジョイ部屋", // room3
    "エンジョイ部屋", // room4
    "エンジョイ部屋", // room5
    "エンジョイ部屋", // room6
    "エンジョイ部屋", // room7
    "エンジョイ部屋", // room8
    "エンジョイ部屋", // room9
    "エンジョイ部屋", // room10
    "エンジョイ部屋", // room11
    "エンジョイ部屋", // room12
    "エンジョイ部屋", // room13
    "エンジョイ部屋", // room14
    "エンジョイ部屋", // room15
    "エンジョイ部屋", // room16
    "エンジョイ部屋", // room17
];
exports.STAGES_DATA = [
    { id: 1, name: 'リュウグウターミナル', imageUrl: '/images/stages/リュウグウ.png' },
    { id: 2, name: 'スメーシーワールド', imageUrl: '/images/stages/スメーシー.png' },
    { id: 3, name: 'チョウザメ造船', imageUrl: '/images/stages/チョウザメ.png' },
    { id: 4, name: 'マンタマリア号', imageUrl: '/images/stages/マンタマリア.png' },
    { id: 5, name: 'ヒラメが丘団地', imageUrl: '/images/stages/ヒラメ.png' },
    { id: 6, name: 'マサバ海峡大橋', imageUrl: '/images/stages/マサバ.png' },
    { id: 7, name: 'マテガイ放水路', imageUrl: '/images/stages/マテガイ.png' },
    { id: 8, name: 'キンメダイ美術館', imageUrl: '/images/stages/キンメダイ.png' },
    { id: 9, name: 'オヒョウ海運', imageUrl: '/images/stages/オヒョウ.png' },
    { id: 10, name: 'ナンプラー遺跡', imageUrl: '/images/stages/ナンプラー.png' },
    { id: 11, name: 'タラポートショッピングパーク', imageUrl: '/images/stages/タラポート.png' },
    { id: 12, name: 'ネギトロ炭鉱', imageUrl: '/images/stages/ネギトロ.png' },
    { id: 13, name: 'タカアシ経済特区', imageUrl: '/images/stages/タカアシ.png' },
    { id: 14, name: 'ザトウマーケット', imageUrl: '/images/stages/ザトウ.png' },
    { id: 15, name: 'ヤガラ市場', imageUrl: '/images/stages/ヤガラ.png' },
    { id: 16, name: 'カジキ空港', imageUrl: '/images/stages/カジキ.png' },
    { id: 17, name: '海女美術大学', imageUrl: '/images/stages/アマビ.png' },
    { id: 18, name: 'ユノハナ大渓谷', imageUrl: '/images/stages/ユノハナ.png' },
    { id: 19, name: 'マヒマヒリゾート＆スパ', imageUrl: '/images/stages/マヒマヒ.png' },
    { id: 20, name: 'コンブトラック', imageUrl: '/images/stages/コンブ.png' },
    { id: 21, name: 'ナメロウ金属', imageUrl: '/images/stages/ナメロウ.png' },
    { id: 22, name: 'ゴンズイ地区', imageUrl: '/images/stages/ゴンズイ.png' },
    { id: 23, name: 'バイガイ亭', imageUrl: '/images/stages/バイガイ.png' },
    { id: 24, name: 'クサヤ温泉', imageUrl: '/images/stages/クサヤ.png' }
];
exports.RULES_DATA = [
    { id: 1, name: 'ガチエリア', imageUrl: '/images/rules/ガチエリア.png', description: 'ステージ中央のガチエリアを確保し続けろ！' },
    { id: 2, name: 'ガチヤグラ', imageUrl: '/images/rules/ガチヤグラ.png', description: 'ステージ中央のガチヤグラを相手ゴールまで進めろ！' },
    { id: 3, name: 'ガチホコバトル', imageUrl: '/images/rules/ガチホコ.png', description: 'ガチホコを拾って相手ゴールに叩き込め！' },
    { id: 4, name: 'ガチアサリ', imageUrl: '/images/rules/ガチアサリ.png', description: 'アサリを集めて相手ゴールに入れろ！' },
    { id: 5, name: 'ナワバリバトル', imageUrl: '/images/rules/ナワバリバトル.png', description: 'ステージをインクで塗りたくれ！' },
];
exports.WEAPON_ATTRIBUTES = [
    "シューター", "ローラー", "チャージャー", "スロッシャー", "スピナー",
    "マニューバー", "シェルター", "ブラスター", "フデ", "ストリンガー", "ワイパー"
];
