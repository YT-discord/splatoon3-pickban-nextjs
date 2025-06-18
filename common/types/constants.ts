import type { Stage, Rule } from './game';

export const MAX_USERS_PER_ROOM = 16;
export const MAX_PLAYERS_PER_TEAM = 4;
export const MIN_PLAYERS_PER_TEAM = 1;
export const MAX_BANS_PER_TEAM = 3;
export const MAX_PICKS_PER_TEAM = 4; // = totalPickTurns / 2
export const TOTAL_PICK_TURNS = MAX_PICKS_PER_TEAM * 2; // 8
export const MAX_USERS_PER_TEAM = 4;

// ステージ選択用
export const RANDOM_STAGE_CHOICE = {
    id: 'random', // id は 'random' 文字列のまま
    name: 'おまかせ',
    imageUrl: '/images/icons/random.png' // ★ ステージ用アイコンパス
};
// ルール選択用
export const RANDOM_RULE_CHOICE = {
    id: 'random', // id は 'random' 文字列のまま
    name: 'おまかせ',
    imageUrl: '/images/icons/random.png' // ★ ルール用アイコンパス
};
// 武器グリッド用
export const RANDOM_WEAPON_ID = -1; // 武器用IDは数値
export const RANDOM_WEAPON_CHOICE_ITEM = { // ★ 名前変更推奨
    id: RANDOM_WEAPON_ID,
    name: 'おまかせ',
    attribute: 'special',
    imageUrl: '/images/weapons/random.png', // ★ 武器用アイコンパス
    subWeapon: '', specialWeapon: '', subWeaponImageName: '', specialWeaponImageName: ''
};

// 時間設定 (秒)
export const BAN_PHASE_DURATION = 30;
export const PICK_PHASE_TURN_DURATION = 15;

// Fast Timer (デバッグ用) 環境変数 FAST_TIMER=true で有効
export const USE_FAST_TIMER = process.env.FAST_TIMER === 'true';
export const FAST_TIMER_MULTIPLIER = 5; // 例: 1/5 の時間にする

export const SUB_WEAPONS: string[] = [
    "スプラッシュボム", "キューバンボム", "クイックボム", "スプリンクラー",
    "スプラッシュシールド", "タンサンボム", "カーリングボム", "ロボットボム",
    "ジャンプビーコン", "ポイントセンサー", "トラップ", "ポイズンミスト", "ラインマーカー", "トーピード"
]

export const SPECIAL_WEAPONS: string[] = [
    "ウルトラショット", "グレートバリア", "ショクワンダー", "マルチミサイル", 
    "アメフラシ", "ナイスダマ", "ホップソナー", "キューインキ", "メガホンレーザー5.1ch",
    "ジェットパック", "ウルトラハンコ", "カニタンク", "サメライド", 
    "トリプルトルネード", "エナジースタンド", "デコイチラシ", "テイオウイカ", "ウルトラチャクチ", "スミナガシート"
]

export const ROOM_IDS: string[] = [
    "バトロイカ",
    "アイロニック",
    "クラーゲス",
    "ロッケンベルグ",
    "エゾッコ",
    "フォーリマ",
    "ホッコリー",
    "ホタックス",
    "ジモン",
    "シグレニ",
    "アロメ",
    "ヤコ",
    "アナアキ",
    "エンペリー",
    "タタキケンサキ",
    "バラズシ",
    "シチリン"
];

export const DEFAULT_ROOM_NAMES: string[] = [
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

export const STAGES_DATA: Stage[] = [
    { id: 1, name: 'ユノハナ大渓谷', imageUrl: '/images/stages/ユノハナ.png' },
    { id: 2, name: 'ゴンズイ地区', imageUrl: '/images/stages/ゴンズイ.png' },
    { id: 3, name: 'ヤガラ市場', imageUrl: '/images/stages/ヤガラ.png' },
    { id: 4, name: 'マテガイ放水路', imageUrl: '/images/stages/マテガイ.png' },
    { id: 5, name: 'ナメロウ金属', imageUrl: '/images/stages/ナメロウ.png' },
    { id: 6, name: 'マサバ海峡大橋', imageUrl: '/images/stages/マサバ.png' },
    { id: 7, name: 'キンメダイ美術館', imageUrl: '/images/stages/キンメダイ.png' },
    { id: 8, name: 'マヒマヒリゾート＆スパ', imageUrl: '/images/stages/マヒマヒ.png' },
    { id: 9, name: '海女美術大学', imageUrl: '/images/stages/アマビ.png' },
    { id: 10, name: 'チョウザメ造船', imageUrl: '/images/stages/チョウザメ.png' },
    { id: 11, name: 'ザトウマーケット', imageUrl: '/images/stages/ザトウ.png' },
    { id: 12, name: 'スメーシーワールド', imageUrl: '/images/stages/スメーシー.png' },
    { id: 13, name: 'クサヤ温泉', imageUrl: '/images/stages/クサヤ.png' },
    { id: 14, name: 'ヒラメが丘団地', imageUrl: '/images/stages/ヒラメ.png' },
    { id: 15, name: 'ナンプラー遺跡', imageUrl: '/images/stages/ナンプラー.png' },
    { id: 16, name: 'マンタマリア号', imageUrl: '/images/stages/マンタマリア.png' },
    { id: 17, name: 'タラポートショッピングパーク', imageUrl: '/images/stages/タラポート.png' },
    { id: 18, name: 'コンブトラック', imageUrl: '/images/stages/コンブ.png' },
    { id: 19, name: 'タカアシ経済特区', imageUrl: '/images/stages/タカアシ.png' },
    { id: 20, name: 'オヒョウ海運', imageUrl: '/images/stages/オヒョウ.png' },
    { id: 21, name: 'バイガイ亭', imageUrl: '/images/stages/バイガイ.png' },
    { id: 22, name: 'ネギトロ炭鉱', imageUrl: '/images/stages/ネギトロ.png' },
    { id: 23, name: 'カジキ空港', imageUrl: '/images/stages/カジキ.png' },
    { id: 24, name: 'リュウグウターミナル', imageUrl: '/images/stages/リュウグウ.png' },
    { id: 25, name: 'デカライン高架下', imageUrl: '/images/stages/デカライン.png' }
];

export const RULES_DATA: Rule[] = [
    { id: 1, name: 'ナワバリバトル', imageUrl: '/images/rules/ナワバリバトル.png', description: 'ステージをインクで塗りたくれ！' },
    { id: 2, name: 'ガチエリア', imageUrl: '/images/rules/ガチエリア.png', description: 'ステージ中央のガチエリアを確保し続けろ！' },
    { id: 3, name: 'ガチヤグラ', imageUrl: '/images/rules/ガチヤグラ.png', description: 'ステージ中央のガチヤグラを相手ゴールまで進めろ！' },
    { id: 4, name: 'ガチホコバトル', imageUrl: '/images/rules/ガチホコ.png', description: 'ガチホコを拾って相手ゴールに叩き込め！' },
    { id: 5, name: 'ガチアサリ', imageUrl: '/images/rules/ガチアサリ.png', description: 'アサリを集めて相手ゴールに入れろ！' },
];

export const WEAPON_ATTRIBUTES = [
    "シューター", "ローラー", "チャージャー", "スロッシャー", "スピナー",
    "マニューバー", "シェルター", "ブラスター", "フデ", "ストリンガー", "ワイパー"
] as const;