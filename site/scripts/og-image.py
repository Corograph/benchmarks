#!/usr/bin/env python3
"""The share card: public/og.png (1200×630) cut from the competition quadrant chart.
Regenerate after `competition-quadrant.py --chart-only` in the deck folder."""
import subprocess, shutil
from pathlib import Path
src = Path.home() / 'svml/SVML-Assets/TrueArchitect-ai/TrueArchitect-Deck/competition-quadrant-chart.png'
out = Path(__file__).resolve().parents[1] / 'public/og.png'
shutil.copy(src, out)
subprocess.run(['sips', '--resampleWidth', '1200', str(out)], check=True, capture_output=True)   # 3840×2160 → 1200×675
subprocess.run(['sips', '--cropToHeightWidth', '630', '1200', str(out)], check=True, capture_output=True)  # centre crop → 1200×630
print('wrote', out)
