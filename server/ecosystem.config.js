module.exports = {
	apps: [
	{
            name: 'splatoon3-pickban-api', // pm2で表示されるアプリケーション名 (任意)
            script: 'npm',            // npmコマンドを実行
            args: 'run start',        // package.jsonの "start" スクリプトを実行
            cwd: './',                // このecosystem.config.jsファイルがあるディレクトリをカレントディレクトリとする
            instances: 1,             // 起動するインスタンス数 (CPUコア数に応じて 'max' も可)
            autorestart: true,        // クラッシュ時に自動で再起動する
            watch: false,             // ファイル変更監視 (本番では通常false)
            max_memory_restart: '1G', // メモリ使用量が1GBを超えたら再起動 (適宜調整)
            env: {
            // NODE_ENV: 'development', // 通常の `pm2 start` で起動した際の環境変数
},
env_production: {
            NODE_ENV: 'production', // `pm2 start --env production` で起動した際の環境変数
		    //                             // PORT: 3001,      // サーバーがリッスンするポート (アプリ内でprocess.env.PORTを参照する場合)
		    //                                     // API_KEY: 'your_production_api_key', // その他本番用環境変数
},
    //                                                 // ts-node を直接指定する場合 (npm script を使わない場合)
    //                                                       // script: './node_modules/.bin/ts-node',
    //                                                             // args: 'app.ts',
    //                                                                   // exec_mode: 'fork', // ts-node を直接実行する場合に推奨
    //                                                                         // interpreter: 'none', // ts-node を直接実行する場合
   },
  ],
 };
