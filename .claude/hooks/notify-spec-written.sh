#!/bin/bash
# Reads PostToolUse JSON from stdin; sends macOS notification when a docs/specs/ file is written.
python3 - <<'EOF'
import sys, json, subprocess, os
data = json.load(sys.stdin)
path = data.get("tool_input", {}).get("file_path", "")
if "docs/specs/" in path:
    name = os.path.basename(path)
    subprocess.run([
        "osascript", "-e",
        f'display notification "{name} 생성됨" with title "MakeForest" subtitle "에이전트 아웃풋"'
    ])
EOF
