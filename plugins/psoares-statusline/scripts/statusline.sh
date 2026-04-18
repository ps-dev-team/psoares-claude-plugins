#!/usr/bin/env bash
# Claude Code statusline — Gruvbox Material Dark.
#
# Optional account label: set these in the wrapper that invokes this script.
#   CLAUDE_LABEL        — text shown at the left (e.g. "UPHOLD", "PERSONAL")
#   CLAUDE_LABEL_COLOR  — either a hex like "#84fb7f" or a raw ANSI escape
#                         like '\033[38;2;132;251;127m'. Empty = no label.

input=$(cat)

RST='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# ── Gruvbox Material Dark palette ────────────────────────────────────────────
FG='\033[38;2;183;197;211m'          # #b7c5d3 - default text
FG_DIM='\033[38;2;113;121;131m'      # dimmed text
C_GREEN='\033[38;2;139;212;156m'     # #8bd49c  model / context ok
C_ORANGE='\033[38;2;233;172;103m'    # #e9ac67  context warning
C_RED='\033[38;2;217;84;104m'        # #d95468  context critical / error
C_BLUE='\033[38;2;83;150;253m'       # #5396fd  directory / info
C_CYAN='\033[38;2;112;225;232m'      # #70e1e8  cost / tokens
C_PURPLE='\033[38;2;182;45;101m'     # #b62d65  agents
C_PURPLE2='\033[38;2;194;141;217m'   # #c28dd9  branch / agent names
C_TEAL='\033[38;2;68;207;178m'       # #44cfb2  thinking effort

SEP="${FG_DIM}│${RST}"

# ── Label color resolution (hex → ANSI, or pass ANSI through) ────────────────
label_text="${CLAUDE_LABEL:-}"
label_color_raw="${CLAUDE_LABEL_COLOR:-}"
label_color=""
if [ -n "$label_text" ]; then
  if [[ "$label_color_raw" == "#"* ]] && [ "${#label_color_raw}" -eq 7 ]; then
    r=$((16#${label_color_raw:1:2}))
    g=$((16#${label_color_raw:3:2}))
    b=$((16#${label_color_raw:5:2}))
    label_color="\033[38;2;${r};${g};${b}m"
  elif [ -n "$label_color_raw" ]; then
    label_color="$label_color_raw"
  else
    label_color="$C_GREEN"
  fi
fi

# ── Extract fields ──────────────────────────────────────────────────────────
model_name=$(echo "$input" | jq -r '.model.display_name // "unknown"')
model_id=$(echo "$input" | jq -r '.model.id // ""')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
cwd_display=$(echo "$cwd" | sed "s|^$HOME|~|")
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
total_in=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
vim_mode=$(echo "$input" | jq -r '.vim.mode // empty')
agent_name=$(echo "$input" | jq -r '.agent.name // empty')
worktree_branch=$(echo "$input" | jq -r '.worktree.branch // empty')
output_style=$(echo "$input" | jq -r '.output_style.name // empty')

parts=()

# ── 1. Account label (optional) ─────────────────────────────────────────────
if [ -n "$label_text" ]; then
  parts+=("${BOLD}${label_color} ${label_text}${RST}")
fi

# ── 2. Directory ────────────────────────────────────────────────────────────
parts+=("${C_BLUE}${cwd_display}${RST}")

# ── 3. Git branch (worktree-aware, falls back to current repo) ──────────────
branch="$worktree_branch"
if [ -z "$branch" ] && [ -d "$cwd" ]; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
           || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
fi
if [ -n "$branch" ]; then
  parts+=("${C_PURPLE2} ${branch}${RST}")
fi

# ── 4. Model + thinking effort ──────────────────────────────────────────────
model_label="${C_GREEN}${model_name}${RST}"
if echo "$model_id" | grep -qi "thinking\|opus"; then
  model_label="${C_GREEN}${model_name}${RST} ${C_TEAL}(thinking)${RST}"
fi
if [ -n "$output_style" ] && [ "$output_style" != "default" ] && [ "$output_style" != "Default" ]; then
  model_label="${model_label} ${C_TEAL}[${output_style}]${RST}"
fi
parts+=("$model_label")

# ── 5. Context window ───────────────────────────────────────────────────────
if [ -n "$used_pct" ]; then
  used_int=$(printf "%.0f" "$used_pct")
  remaining_int=$(printf "%.0f" "$remaining_pct")
  bar_filled=$(( used_int / 10 ))
  bar_empty=$(( 10 - bar_filled ))
  bar=""
  if [ "$used_int" -lt 50 ]; then
    bar_color="$C_GREEN"
  elif [ "$used_int" -lt 80 ]; then
    bar_color="$C_ORANGE"
  else
    bar_color="$C_RED"
  fi
  for ((i=0; i<bar_filled; i++)); do bar="${bar}█"; done
  for ((i=0; i<bar_empty; i++)); do bar="${bar}░"; done
  parts+=("${bar_color}ctx ${bar} ${remaining_int}% left${RST}")
fi

# ── 6. Token cost estimate (model-aware, blended rate) ─────────────────────
# Pricing per million tokens (USD). Real cost is lower with cache hits and
# slightly higher on cache writes — this is a rough upper bound.
if [ "$total_in" -gt 0 ] || [ "$total_out" -gt 0 ]; then
  case "$(echo "$model_id" | tr '[:upper:]' '[:lower:]')" in
    *opus*)   price_in=15; price_out=75 ;;
    *haiku*)  price_in=1;  price_out=5  ;;
    *)        price_in=3;  price_out=15 ;;  # sonnet + default
  esac
  cost=$(awk "BEGIN { printf \"%.3f\", ($total_in * $price_in + $total_out * $price_out) / 1000000 }")
  parts+=("${C_CYAN}~\$${cost}${RST}")
fi

# ── 7. Active agent ─────────────────────────────────────────────────────────
if [ -n "$agent_name" ]; then
  parts+=("${C_PURPLE}agent:${C_PURPLE2}${agent_name}${RST}")
fi

# ── 8. Vim mode ─────────────────────────────────────────────────────────────
if [ -n "$vim_mode" ]; then
  if [ "$vim_mode" = "NORMAL" ]; then
    parts+=("${C_ORANGE}[N]${RST}")
  else
    parts+=("${C_GREEN}[I]${RST}")
  fi
fi

# ── Assemble ─────────────────────────────────────────────────────────────────
output=""
for i in "${!parts[@]}"; do
  if [ $i -eq 0 ]; then
    output="${parts[$i]}"
  else
    output="${output} ${SEP} ${parts[$i]}"
  fi
done

printf "%b" "$output"
