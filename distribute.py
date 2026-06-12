#!/usr/bin/env python3
"""
distribute.py (placeholder)

Goal (future):
- Take matched radar items (link + GPT draft)
- Pick related media from the 12TB drive (via media_index.json)
- Auto-render copy + assets into:
  - Xiaohongshu (小红书) post format
  - Instagram caption + carousel plan

This file is intentionally a stub so you can wire a one-click UI later.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class RadarItem:
    link: str
    title: str
    subtext: str = ""
    draft: str = ""
    landmarks: List[str] | None = None


def load_media_index(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def choose_media_for_item(media_index: Dict[str, Any], item: RadarItem) -> List[str]:
    """
    Placeholder selection strategy.
    Later you can implement:
    - landmark -> folder mapping
    - keyword search in filenames
    - Gallery/Studio preference for art/framing demands
    """
    return []


def render_xiaohongshu(item: RadarItem, media_paths: List[str]) -> str:
    # Placeholder output
    lines = [
        f"标题：{item.title}",
        "",
        item.draft or item.subtext,
        "",
        f"来源：{item.link}",
    ]
    return "\n".join([x for x in lines if x])


def render_instagram(item: RadarItem, media_paths: List[str]) -> str:
    # Placeholder output
    lines = [
        item.draft or item.subtext,
        "",
        f"Source: {item.link}",
        "",
        "#NYC #Manhattan",
    ]
    return "\n".join([x for x in lines if x])


def main() -> None:
    print("distribute.py placeholder — nothing to do yet.")
    print("Next step: feed RadarItem objects from your radar output, and write rendered text + media plan to disk.")


if __name__ == "__main__":
    main()

