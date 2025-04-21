// src/components/CircularTimer.tsx
import React from 'react';

interface CircularTimerProps {
  duration: number; // 総時間 (秒)
  currentTime: number; // 現在の残り時間 (秒)
  size?: number; // 円のサイズ (オプション)
  strokeWidth?: number; // 線の太さ (オプション)
  baseColor?: string; // 背景円の色 (オプション)
  progressColor?: string; // 進捗円の色 (オプション)
  textColor?: string; // テキストの色 (オプション)
}

const CircularTimer: React.FC<CircularTimerProps> = ({
  duration,
  currentTime,
  size = 60, // デフォルトサイズ 60px
  strokeWidth = 4, // デフォルトの太さ 4px
  baseColor = "#e0e0e0", // デフォルトの背景色 (薄いグレー)
  progressColor = "#4caf50", // デフォルトの進捗色 (緑)
  textColor = "#333", // デフォルトのテキスト色 (濃いグレー)
}) => {
  // currentTime が duration より大きい場合は duration に丸める (念のため)
  const validCurrentTime = Math.min(Math.max(currentTime, 0), duration);

  const radius = (size - strokeWidth) / 2; // 半径
  const circumference = 2 * Math.PI * radius; // 円周

  // 残り時間に基づいて stroke-dashoffset を計算
  // 0秒のとき offset = 円周 (完全に隠れる)
  // duration秒のとき offset = 0 (完全に表示される)
  // stroke-dasharray は円周と同じ値にする
  const offset = circumference - (validCurrentTime / duration) * circumference;

  // 5秒以下になったら色を変える (オプション)
  const dynamicProgressColor = validCurrentTime <= 5 ? "#f44336" : progressColor; // 例: 赤色

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 背景の円 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={baseColor}
          strokeWidth={strokeWidth}
        />
        {/* 進捗を示す円 (上から時計回りになるように transform で調整) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dynamicProgressColor} // 色を動的に変更
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round" // 線の端を丸める (任意)
          transform={`rotate(-90 ${size / 2} ${size / 2})`} // -90度回転して上を開始点にする
          style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s ease' }} // アニメーション (任意)
        />
        {/* 中央の残り時間テキスト */}
        <text
          x="50%"
          y="50%"
          dy=".3em" // 垂直方向の中央揃え調整
          textAnchor="middle" // 水平方向の中央揃え
          fontSize={size * 0.35} // サイズに応じてフォントサイズ調整 (係数は好みで)
          fill={textColor}
          fontWeight="bold"
        >
          {Math.ceil(validCurrentTime)} {/* 秒数は切り上げて表示 */}
        </text>
      </svg>
    </div>
  );
};

export default CircularTimer;