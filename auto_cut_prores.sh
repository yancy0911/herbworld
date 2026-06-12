#!/bin/bash
# 统帅专用：曼哈顿雨夜 - 最终修正版
OUT="/Volumes/Manhattan_12TB/Final_Gold/FINAL_OUTPUT"

# 1. 彻底清理
rm -rf "$OUT"/*
mkdir -p "$OUT"

echo "🧹 正在清理旧废品，准备生产黑金..."

# 2. 【核心修正】每个路径必须独立占一行，或者用空格完全隔开
TARGET_DIRS=(
    "/Volumes/Manhattan_12TB/026_04_24_纽约实拍原片"
    "/Volumes/Manhattan_12TB/20260426_NYC_FullDay"
)

for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "📂 锁定目标: $dir"
        find "$dir" -maxdepth 1 \( -iname "*.mov" -o -iname "*.mp4" \) | while read -r video; do
            filename=$(basename "$video")
            echo "🎬 正在执导精华片段: $filename"
            
            ffmpeg -y -ss 00:00:10 -t 15 -i "$video" \
            -vf "setpts=1.25*PTS,hqdn3d=1.5:1.5:6:6,curves=strong_contrast,eq=saturation=1.3,fade=t=in:st=0:d=2,fade=t=out:st=13:d=2" \
            -c:v prores -profile:v 3 -vendor apl0 -pix_fmt yuv422p10le \
            -af "volume=1.8,highpass=f=200,afade=t=in:st=0:d=2,afade=t=out:st=13:d=2" \
            -c:a pcm_s16le -ar 48000 \
            "$OUT/CINEMA_${filename%.*}.mov"
            
            echo "✨ 样片入库: CINEMA_${filename%.*}.mov"
        done
    else
        echo "❌ 路径依然无效: $dir"
    fi
done

echo "🏁 统帅，任务圆满结束！"