#!/bin/sh
# Снимок метрик «Чужого голоса» в папку $1 — те же команды, что T-15 (docs/lab/runs/T-15/README.md),
# плюс guilt-scan --missing (развилки «ждёт без напоминаний»). Запуск из корня: sh docs/lab/runs/X-E3/snap.sh <папка>
set -e
B=$1; id=chuzhoy-golos; mkdir -p "$B"
npm run -s story:lint -- $id > "$B/$id.lint.txt" 2>&1 || true
npm run -s story:lint -- $id --json > "$B/$id.lint.json" 2>/dev/null || true
npm run -s story:trace -- --story $id --compare silent > "$B/$id.trace.compare-silent.txt" 2>&1 || true
npm run -s story:trace -- --story $id --persona all --mode realtime > "$B/$id.trace.realtime.txt" 2>&1 || true
npm run -s story:trace -- --story $id --persona all --mode click > "$B/$id.trace.click.txt" 2>&1 || true
npm run -s story:sessions -- --story $id --persona all > "$B/$id.sessions.txt" 2>&1 || true
npm run -s story:sessions -- --story $id --persona all --json > "$B/$id.sessions.json" 2>/dev/null || true
npm run -s story:cast -- --story $id > "$B/$id.cast.txt" 2>&1 || true
npm run -s story:cast -- --story $id --json > "$B/$id.cast.json" 2>/dev/null || true
npm run -s story:endings -- --story $id > "$B/$id.endings.txt" 2>&1 || true
npm run -s story:endings -- --story $id --json > "$B/$id.endings.json" 2>/dev/null || true
npm run -s story:vars -- --story $id > "$B/$id.vars.txt" 2>&1 || true
npm run -s story:vars -- --story $id --json > "$B/$id.vars.json" 2>/dev/null || true
npm run -s story:trace -- --story $id --persona distracted --runs 50 --json 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s).stories[0];console.log(JSON.stringify({about:"story:trace --persona distracted --runs 50 --json, только batches",runs:(j.runs||[]).map(r=>({seed:r.seed,ending:r.ending?.name??null,batches:r.batches}))}))})' \
  > "$B/$id.distracted-batches.json" || true
node .claude/skills/story-time/scripts/guilt-scan.mjs $id --missing > "$B/$id.guilt-missing.txt" 2>&1 || true
