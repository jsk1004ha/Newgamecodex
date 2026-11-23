(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const menu = document.getElementById('menuLayer');
  const hud = document.getElementById('hud');
  const hpBar = document.getElementById('hpBar');
  const dashBar = document.getElementById('dashBar');
  const comboBar = document.getElementById('comboBar');

  const hpText = document.getElementById('hpText');
  const dashText = document.getElementById('dashText');
  const comboText = document.getElementById('comboText');
  const bossHud = document.getElementById('bossHud');
  const bossHpBar = document.getElementById('bossHpBar');
  const bossHpText = document.getElementById('bossHpText');
  const bossBadge = document.getElementById('bossBadge');
  const warningPanel = document.getElementById('warningPanel');

  const stageLabel = document.getElementById('stageLabel');
  const timerLabel = document.getElementById('timerLabel');
  const objectiveLabel = document.getElementById('objectiveLabel');
  const warningLabel = document.getElementById('warningLabel');

  const W = () => canvas.width;
  const H = () => canvas.height;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  const STORAGE_KEY = 'shardsprint_save_v2';
  const DEFAULT_SAVE = {
    bestScore: 0,
    bestRank: 'M',
    bestCombo: 0,
    playCount: 0,
    clearCount: 0,
    gachaCurrency: 0,
    unlocks: { prism: true, gale: false, bulwark: false, ember: false },
    equipped: 'prism',
    charms: { spark: 0, edge: 0, flow: 0, aegis: 0, pulse: 0, overdrive: 0 },
    equippedCharms: ['spark'],
    growthPath: 'balanced',
    achievements: {},
    missions: {},
    stats: {
      perfectDodges: 0,
      parries: 0,
      noHitStages: 0,
      totalHits: 0,
      totalDashes: 0,
      totalPlaysTime: 0,
      bossClears: 0,
      gachaRolls: 0,
      pathPlays: {}
    },
    settings: {
      volume: 0.6,
      mute: false,
      reduceShake: false,
      reduceFlash: false,
      reduceParticles: false,
      assist: false,
      difficulty: 'normal'
    }
  };

  function loadSave() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!raw || typeof raw !== 'object') throw new Error('broken');
      const out = structuredClone(DEFAULT_SAVE);
      Object.assign(out, raw);
      out.unlocks = { ...DEFAULT_SAVE.unlocks, ...(raw.unlocks || {}) };
      out.charms = { ...DEFAULT_SAVE.charms, ...(raw.charms || {}) };
      out.equippedCharms = Array.isArray(raw.equippedCharms) ? raw.equippedCharms.slice(0, 3) : ['spark'];
      out.achievements = { ...(raw.achievements || {}) };
      out.missions = { ...(raw.missions || {}) };
      out.settings = { ...DEFAULT_SAVE.settings, ...(raw.settings || {}) };
      out.stats = { ...DEFAULT_SAVE.stats, ...(raw.stats || {}) };
      return out;
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  const save = loadSave();
  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(save));

  const skins = {
    prism: { name: 'Prism Runner', color: '#47d7ff', trail: '#c8f8ff', desc: '기본형' },
    gale: { name: 'Gale Fang', color: '#9cff7d', trail: '#d2ffc6', desc: '완벽 회피 누적 20회' },
    bulwark: { name: 'Bulwark Arc', color: '#f1a6ff', trail: '#ffe1ff', desc: '패링 누적 15회' },
    ember: { name: 'Ember Shard', color: '#ff9165', trail: '#ffd1ae', desc: '보스 3회 격파' }
  };

  const charmlib = {
    spark: { n: 'Spark Lens', rarity: 'N', desc: '기본 공격 피해 +8%' },
    edge: { n: 'Edge Prism', rarity: 'R', desc: '콤보 유지 +25%' },
    flow: { n: 'Flow Coil', rarity: 'R', desc: '대시 회복 +20%' },
    aegis: { n: 'Aegis Knurl', rarity: 'SR', desc: '피격 무적 +0.08초' },
    pulse: { n: 'Pulse Halo', rarity: 'SR', desc: '완벽회피 시 회복 +2' },
    overdrive: { n: 'Overdrive Core', rarity: 'SSR', desc: '차지 강공격 폭발 강화' }
  };

  const growthPaths = {
    balanced: { n: 'Balanced Route', d: '기본형 / 안정적', atk: 1, dash: 1, defense: 1, combo: 1 },
    striker: { n: 'Striker Route', d: '공격 특화 / 체력 -10%', atk: 1.2, dash: 0.95, defense: 0.88, combo: 1.05 },
    phantom: { n: 'Phantom Route', d: '기동 특화 / 공격 -8%', atk: 0.92, dash: 1.25, defense: 0.95, combo: 1.12 },
    sentinel: { n: 'Sentinel Route', d: '안정 특화 / 대시 회복 -12%', atk: 0.95, dash: 0.88, defense: 1.22, combo: 0.95 },
    riposte: { n: 'Riposte Route', d: '패링·회피 보상 강화', atk: 1.04, dash: 1.04, defense: 0.98, combo: 1.2 }
  };

  const missions = [
    ['m1', 'Stage 1 돌파'], ['m2', '완벽 회피 8회'], ['m3', '패링 5회'], ['m4', '콤보 30'], ['m5', '4분 이내 완주'],
    ['m6', '노피격 스테이지 2회'], ['m7', '대시 50회'], ['m8', '강공격 20킬'], ['m9', '보스 3회 격파'], ['m10', '가챠 5회 뽑기'],
    ['m11', '보스 스테이지 무피격 1회'], ['m12', '가챠 코어 10회 뽑기'], ['m13', '콤보 유지 15초'], ['m14', '하드 난이도 Stage 8 도달'],
    ['m15', '한 런에서 패링 12회'], ['m16', '한 런에서 완벽회피 15회'], ['m17', '한 런에서 조각 350 획득'], ['m18', '세 가지 성장 경로로 1회 이상 플레이'],
    ['m19', 'SSR 코어 장착 후 클리어'], ['m20', '보스 마무리를 강공격으로 2회']
  ];
  const achievements = [
    ['a1', '첫 출격'], ['a2', '유리칼 춤(콤보 40)'], ['a3', '완벽회피 마스터(25)'], ['a4', '반격자(20)'], ['a5', '무흔 질주(노피격 스테이지 4회)'],
    ['a6', '초고속 완주(180초 미만)'], ['a7', '절체절명 클리어(HP 20% 미만)'], ['a8', '연계 장인(콤보붕괴 3회 이하)'], ['a9', '수집가(스킨 4종)'], ['a10', '하드모드 클리어'],
    ['a11', '전략가(성장경로 5종 경험)'], ['a12', '가챠 중독(20회 뽑기)'], ['a13', '보스 학살자(보스 8회 격파)'], ['a14', '질풍(한 런 대시 90회)'], ['a15', '철벽(피격 6회 이하 클리어)'],
    ['a16', '폭발장인(강공격 처치 40회)'], ['a17', '상급 수집가(SR 이상 코어 5개)'],
    ['a18', '??? 숨김: 보스 3연 패링'], ['a19', '??? 숨김: SSR 코어 첫 획득'], ['a20', '??? 숨김: HP 10 이하로 승리'],
    ['a21', '??? 숨김: 패링만으로 보스 처치'], ['a22', '??? 숨김: 가챠 없이 하드 클리어'], ['a23', '??? 숨김: 노대시 Stage 클리어'], ['a24', '??? 숨김: 12스테이지 올클리어 3회']
  ];

  const COLORS = { bgA: '#120a25', bgB: '#080513', hazard: '#ff3f6c', warn: '#ffd66b', good: '#86ff88' };
  const rankOrder = ['SSR', 'SR', 'R', 'N', 'E', 'L', 'M', 'G'];

  const game = {
    state: 'title',
    stage: 0,
    totalStages: 12,
    score: 0,
    time: 0,
    clearTime: 0,
    rank: 'M',
    shake: 0,
    slowmo: 0,
    combo: 0,
    comboTimer: 0,
    comboBreaks: 0,
    hitsTaken: 0,
    perfectDodges: 0,
    parries: 0,
    dashesUsed: 0,
    heavyKills: 0,
    totalNoHit: 0,
    roundNoHit: true,
    bossesKilled: 0,
    bossParryChain: 0,
    bossNoHit: 0,
    bossHeavyFinish: 0,
    comboLongTimer: 0,
    comboLongReached: 0,
    noDashStageClear: 0,
    usedDashInStage: false,
    usedGachaThisRun: false,
    currencyThisRun: 0,
    player: null,
    enemies: [],
    projectiles: [],
    hazards: [],
    particles: [],
    arcs: [],
    after: [],
    pickups: [],
    ribbons: [],
    popups: []
  };

  const keys = new Set();
  const just = new Set();

  const SFX = (() => {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const tone = (type, hz, dur, vol, slide = 1) => {
      if (save.settings.mute) return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = hz;
      g.gain.value = vol * save.settings.volume;
      o.connect(g);
      g.connect(ac.destination);
      o.frequency.exponentialRampToValueAtTime(hz * slide, ac.currentTime + dur);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.start();
      o.stop(ac.currentTime + dur);
    };
    return {
      nav: () => tone('square', 280, 0.06, 0.05, 1.1),
      ok: () => tone('triangle', 340, 0.12, 0.06, 1.7),
      dash: () => tone('sawtooth', 470, 0.07, 0.05, 0.7),
      attack: () => tone('square', 520, 0.05, 0.04, 1.0),
      heavy: () => tone('triangle', 180, 0.16, 0.07, 2.2),
      hit: () => tone('triangle', 640, 0.03, 0.04, 1.4),
      hurt: () => tone('sawtooth', 120, 0.2, 0.08, 0.6),
      warn: () => tone('sawtooth', 160, 0.12, 0.05, 1.2),
      perfect: () => tone('triangle', 730, 0.14, 0.06, 1.8),
      parry: () => tone('square', 940, 0.1, 0.06, 0.5),
      boss: () => tone('sawtooth', 95, 0.4, 0.1, 1.4),
      clear: () => tone('square', 350, 0.2, 0.06, 1.8),
      over: () => tone('sawtooth', 90, 0.35, 0.08, 0.6),
      reward: () => tone('square', 680, 0.12, 0.05, 1.6),
      unlock: () => tone('triangle', 300, 0.24, 0.08, 2.2)
    };
  })();

  const hasCharm = (id) => save.equippedCharms.includes(id);

  function resetRun() {
    game.stage = 1;
    game.score = 0;
    game.time = 0;
    game.clearTime = 0;
    game.rank = 'M';
    game.combo = 0;
    game.comboTimer = 0;
    game.comboBreaks = 0;
    game.hitsTaken = 0;
    game.perfectDodges = 0;
    game.parries = 0;
    game.dashesUsed = 0;
    game.heavyKills = 0;
    game.totalNoHit = 0;
    game.roundNoHit = true;
    game.bossesKilled = 0;
    game.bossParryChain = 0;
    game.bossNoHit = 0;
    game.bossHeavyFinish = 0;
    game.comboLongTimer = 0;
    game.comboLongReached = 0;
    game.noDashStageClear = 0;
    game.usedDashInStage = false;
    game.usedGachaThisRun = false;
    game.currencyThisRun = 0;
    game.player = {
      x: W() / 2,
      y: H() / 2,
      vx: 0,
      vy: 0,
      r: 17,
      hp: 100,
      maxHp: 100,
      dash: 100,
      maxDash: 100,
      dir: 0,
      atk: 0,
      heavy: 0,
      dashT: 0,
      inv: 0,
      hitstop: 0,
      charge: 0,
      skin: save.equipped,
      animT: 0
    };
    const path = growthPaths[save.growthPath] || growthPaths.balanced;
    game.player.maxHp = Math.round(game.player.maxHp * path.defense);
    game.player.hp = game.player.maxHp;

    game.enemies.length = 0;
    game.projectiles.length = 0;
    game.hazards.length = 0;
    game.particles.length = 0;
    game.arcs.length = 0;
    game.after.length = 0;
    game.pickups.length = 0;
    game.ribbons.length = 0;
    game.popups.length = 0;
    spawnStage();
  }

  function isBossStage() {
    return game.stage % 4 === 0;
  }

  function spawnStage() {
    game.enemies.length = 0;
    game.projectiles.length = 0;
    game.pickups.length = 0;
    game.hazards.length = 0;
    game.roundNoHit = true;

    if (isBossStage()) {
      const hpMul = 1 + (save.settings.difficulty === 'hard' ? 0.25 : 0);
      game.enemies.push({
        type: 'boss',
        x: W() / 2,
        y: H() / 2 - 60,
        r: 40,
        hp: Math.floor((280 + game.stage * 18) * hpMul),
        maxHp: Math.floor((280 + game.stage * 18) * hpMul),
        t: 0,
        phase: 0,
        wind: 0,
        atkCd: 1,
        spawn: 0.8,
        hit: 0,
        pattern: 0,
        dashCount: 0,
        parryTag: false
      });
      for (let i = 0; i < 3; i++) {
        game.hazards.push({ x: 220 + i * 320, y: H() / 2 + 120, r: 70, pulse: i * 0.8, active: false, shape: 'ring' });
      }
      game.popups.push({ text: `BOSS STAGE ${game.stage} - Pattern Read!`, t: 2.2, good: false });
      SFX.boss();
    } else {
      const count = 2 + Math.ceil(game.stage * 0.9);
      for (let i = 0; i < count; i++) {
        game.enemies.push({
          type: 'mob',
          x: rand(90, W() - 90),
          y: rand(80, H() - 80),
          r: rand(14, 23),
          hp: 26 + game.stage * 10,
          t: rand(0, 6),
          wind: 0,
          atkCd: rand(0.5, 1.8),
          hit: 0,
          spawn: 0.5
        });
      }
      if (game.stage >= 5) {
        const hz = 1 + Math.floor(game.stage / 4);
        for (let i = 0; i < hz; i++) game.hazards.push({ x: rand(140, W() - 140), y: rand(120, H() - 120), r: 56 + game.stage * 4, pulse: rand(0, 2), active: false, shape: 'ring' });
      }
    }

    stageLabel.textContent = `STAGE ${game.stage}/${game.totalStages}${isBossStage() ? ' BOSS' : ''}`;
    objectiveLabel.textContent = isBossStage() ? 'OBJECTIVE: SHATTER THE PRISM CORE' : `OBJECTIVE: CLEAR ${game.enemies.length} TARGETS`;
  }

  function addParticles(x, y, color, n = 12, speed = 220, ribbon = false) {
    const scale = save.settings.reduceParticles ? 0.45 : 1;
    const c = Math.max(1, Math.floor(n * scale));
    for (let i = 0; i < c; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.2, 0.55), max: 0.55, size: rand(2, 6), c: color });
      if (ribbon && i < 3) game.ribbons.push({ x, y, life: 0.25, max: 0.25, len: rand(24, 52), ang: a, c: color });
    }
  }

  function hitSuccess(power = 1) {
    const p = game.player;
    const path = growthPaths[save.growthPath] || growthPaths.balanced;
    game.combo += 1;
    game.comboTimer = 2.1 * path.combo * (hasCharm('edge') ? 1.25 : 1);
    game.score += Math.floor(22 * power + game.combo * 1.4);
    save.stats.totalHits += 1;
    save.bestCombo = Math.max(save.bestCombo, game.combo);
    p.hitstop = 0.045;
    addParticles(p.x + Math.cos(p.dir) * 34, p.y + Math.sin(p.dir) * 34, '#fff5a8', 8, 140, true);
    SFX.hit();
  }

  function damagePlayer(n, kx, ky, strong = false) {
    const p = game.player;
    if (p.inv > 0) return;
    const path = growthPaths[save.growthPath] || growthPaths.balanced;
    const invBonus = hasCharm('aegis') ? 0.08 : 0;
    p.hp -= n / path.defense;
    p.inv = (strong ? 0.44 : 0.3) + invBonus;
    const d = Math.hypot(kx, ky) || 1;
    p.x -= (kx / d) * (strong ? 24 : 16);
    p.y -= (ky / d) * (strong ? 24 : 16);
    game.hitsTaken += 1;
    game.roundNoHit = false;
    game.bossParryChain = 0;
    if (!save.settings.reduceShake) game.shake = strong ? 13 : 7;
    if (!save.settings.reduceFlash) game.arcs.push({ type: 'hurt', x: p.x, y: p.y, r: 62, t: 0.12 });
    addParticles(p.x, p.y, '#ff6d8d', 10, 150);
    SFX.hurt();
  }

  function inDangerZone(x, y) {
    return game.hazards.some((h) => h.active && Math.hypot(h.x - x, h.y - y) < h.r - 6);
  }

  function applyCharmsOnStart() {
    const p = game.player;
    const path = growthPaths[save.growthPath] || growthPaths.balanced;
    if (hasCharm('flow')) p.dash = Math.min(p.maxDash, p.dash + 15 * path.dash);
    if (hasCharm('spark')) game.score += 50;
  }

  function update(dt) {
    if (game.state !== 'play') return;
    const p = game.player;
    const path = growthPaths[save.growthPath] || growthPaths.balanced;
    save.stats.pathPlays[save.growthPath] = true;

    p.animT += dt;
    game.time += dt;
    if (game.slowmo > 0) game.slowmo -= dt;

    if (p.hitstop > 0) {
      p.hitstop -= dt;
      dt *= 0.1;
    }

    const ax = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
    const ay = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);

    const speed = 370 * (save.settings.assist ? 1.12 : 1) * (0.96 + path.dash * 0.04);
    p.vx += ax * speed * dt;
    p.vy += ay * speed * dt;
    p.vx *= 0.81;
    p.vy *= 0.81;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = clamp(p.x, 24, W() - 24);
    p.y = clamp(p.y, 24, H() - 24);
    if (ax || ay) p.dir = Math.atan2(ay, ax);

    if ((just.has('Shift') || just.has(' ')) && p.dash >= 16 && p.dashT <= 0) {
      const m = Math.hypot(ax, ay) || 1;
      p.vx = ((ax || Math.cos(p.dir)) / m) * 760;
      p.vy = ((ay || Math.sin(p.dir)) / m) * 760;
      p.dash -= 16;
      p.dashT = 0.18;
      p.inv = 0.22;
      game.usedDashInStage = true;
      game.dashesUsed += 1;
      save.stats.totalDashes += 1;
      for (let i = 0; i < 8; i++) game.after.push({ x: p.x, y: p.y, t: 0.24, c: skins[p.skin].trail, ang: p.dir });
      game.arcs.push({ type: 'perfect', x: p.x, y: p.y, r: 16, t: 0.2 });
      game.ribbons.push({ x: p.x, y: p.y, life: 0.16, max: 0.16, len: 70, ang: p.dir, c: '#b3f3ff' });
      SFX.dash();
    }

    p.dashT -= dt;
    p.inv -= dt;
    p.dash = Math.min(p.maxDash, p.dash + 22 * dt * path.dash * (hasCharm('flow') ? 1.2 : 1));

    if (keys.has('j')) {
      p.charge = clamp(p.charge + dt, 0, 1.3);
      if (Math.random() < 0.2) game.particles.push({ x: p.x + rand(-8, 8), y: p.y + rand(-8, 8), vx: rand(-20, 20), vy: rand(-40, -10), life: 0.2, max: 0.2, size: 3, c: '#ffbc78' });
    }

    if (!keys.has('j') && p.charge > 0.42 && p.heavy <= 0) {
      p.heavy = 0.42;
      game.arcs.push({ type: 'heavy', x: p.x, y: p.y, r: 50 + p.charge * 115, t: 0.26 });
      if (!save.settings.reduceShake) game.shake = 9;
      const heavyMul = (hasCharm('overdrive') ? 1.22 : 1) * path.atk;
      for (const e of game.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 86 + p.charge * 140) {
          const dmg = (24 + p.charge * 34) * heavyMul;
          e.hp -= dmg;
          e.hit = 0.2;
          e.x += Math.cos(p.dir) * 26;
          e.y += Math.sin(p.dir) * 26;
          if (e.hp <= 0) game.heavyKills += 1;
          hitSuccess(1.5);
        }
      }
      addParticles(p.x, p.y, '#ffbf6a', 22, 300, true);
      p.charge = 0;
      SFX.heavy();
    }

    if (just.has('k') && p.atk <= 0) {
      p.atk = 0.2;
      const reach = 84;
      const tx = p.x + Math.cos(p.dir) * reach;
      const ty = p.y + Math.sin(p.dir) * reach;
      game.arcs.push({ type: 'slash', x: p.x, y: p.y, r: reach, t: 0.13, a: p.dir });
      for (const e of game.enemies) {
        const d = Math.hypot(e.x - tx, e.y - ty);
        if (d < e.r + 30) {
          const base = (hasCharm('spark') ? 15.2 : 14) * path.atk;
          e.hp -= base;
          e.hit = 0.13;
          e.x += Math.cos(p.dir) * 18;
          e.y += Math.sin(p.dir) * 18;
          hitSuccess(1);
        }
      }
      SFX.attack();
    }

    p.atk -= dt;
    p.heavy -= dt;

    for (const e of game.enemies) {
      e.spawn -= dt;
      if (e.spawn > 0) continue;
      e.t += dt;

      if (e.type === 'mob') {
        updateMob(e, p, dt);
      } else {
        updateBoss(e, p, dt);
      }

      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 4 && p.inv <= 0) {
        damagePlayer(e.type === 'boss' ? 14 : 8, p.x - e.x, p.y - e.y, e.type === 'boss');
      }
    }

    for (const pr of game.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.t -= dt;
      pr.anim += dt;

      if (Math.hypot(pr.x - p.x, pr.y - p.y) < pr.r + p.r - 4) {
        if (p.dashT > 0.06) {
          game.perfectDodges += 1;
          save.stats.perfectDodges += 1;
          p.dash = Math.min(p.maxDash, p.dash + 17);
          if (hasCharm('pulse')) p.hp = Math.min(p.maxHp, p.hp + 2);
          if (save.growthPath === 'riposte') p.hp = Math.min(p.maxHp, p.hp + 1);
          game.arcs.push({ type: 'perfect', x: p.x, y: p.y, r: 26, t: 0.26 });
          addParticles(p.x, p.y, '#78edff', 14, 210);
          pr.t = 0;
          SFX.perfect();
        } else if (p.atk > 0.09 || p.heavy > 0.11) {
          game.parries += 1;
          save.stats.parries += 1;
          game.score += 65;
          game.arcs.push({ type: 'parry', x: p.x, y: p.y, r: 38, t: 0.22 });
          addParticles(p.x, p.y, '#b0ff90', 16, 220, true);
          if (pr.fromBoss) {
            game.bossParryChain += 1;
          }
          pr.t = 0;
          SFX.parry();
        } else if (p.inv <= 0) {
          damagePlayer(pr.strong ? 18 : 11, pr.vx, pr.vy, pr.strong);
        }
      }
    }

    game.projectiles = game.projectiles.filter((pr) => pr.t > 0 && pr.x > -60 && pr.x < W() + 60 && pr.y > -60 && pr.y < H() + 60);

    for (const hz of game.hazards) {
      hz.pulse += dt;
      hz.active = Math.sin(hz.pulse * 2.2) > (hz.shape === 'cross' ? 0.45 : 0.62);
      if (hz.active && Math.hypot(hz.x - p.x, hz.y - p.y) < hz.r - 10 && p.inv <= 0) damagePlayer(7, p.x - hz.x, p.y - hz.y, false);
    }

    const prevCount = game.enemies.length;
    game.enemies = game.enemies.filter((e) => {
      if (e.hp > 0) return true;
      const reward = e.type === 'boss' ? 70 : 8;
      game.currencyThisRun += reward;
      game.score += e.type === 'boss' ? 1100 : 150 + game.combo * 2;
      addParticles(e.x, e.y, e.type === 'boss' ? '#ffd87a' : '#ff9f74', e.type === 'boss' ? 40 : 18, e.type === 'boss' ? 380 : 260, true);
      game.slowmo = 0.06;
      if (!save.settings.reduceShake) game.shake = e.type === 'boss' ? 14 : 6;
      if (e.type === 'boss') {
        game.bossesKilled += 1;
        if (p.heavy > 0.05) game.bossHeavyFinish += 1;
        save.stats.bossClears += 1;
        game.popups.push({ text: 'BOSS BREAK!', t: 2.1, good: true });
      }
      game.pickups.push({ x: e.x, y: e.y, t: 4, val: reward });
      return false;
    });

    if (prevCount !== game.enemies.length) SFX.reward();

    for (const pk of game.pickups) {
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 180) {
        pk.x += (dx / d) * 230 * dt;
        pk.y += (dy / d) * 230 * dt;
      }
      if (d < 20) {
        pk.t = 0;
        game.score += pk.val * 3;
        p.hp = Math.min(p.maxHp, p.hp + (pk.val >= 70 ? 6 : 2));
        addParticles(p.x, p.y, '#8dff95', 10, 150);
      }
      pk.t -= dt;
    }
    game.pickups = game.pickups.filter((p2) => p2.t > 0);

    for (const a of game.after) a.t -= dt;
    for (const a of game.arcs) a.t -= dt;
    for (const pz of game.particles) {
      pz.x += pz.vx * dt;
      pz.y += pz.vy * dt;
      pz.vx *= 0.92;
      pz.vy *= 0.92;
      pz.life -= dt;
    }
    for (const rb of game.ribbons) rb.life -= dt;

    game.after = game.after.filter((a) => a.t > 0);
    game.arcs = game.arcs.filter((a) => a.t > 0);
    game.particles = game.particles.filter((p2) => p2.life > 0);
    game.ribbons = game.ribbons.filter((r) => r.life > 0);

    game.comboTimer -= dt;
    if (game.combo > 0) {
      game.comboLongTimer += dt;
      game.comboLongReached = Math.max(game.comboLongReached, game.comboLongTimer);
    } else {
      game.comboLongTimer = 0;
    }
    if (game.comboTimer <= 0 && game.combo > 0) {
      game.combo = 0;
      game.comboBreaks += 1;
      game.comboLongTimer = 0;
    }

    if (game.enemies.length === 0) {
      if (game.roundNoHit) game.totalNoHit += 1;
      if (!game.usedDashInStage) game.noDashStageClear += 1;
      if (isBossStage() && game.roundNoHit) game.bossNoHit += 1;
      if (game.stage >= game.totalStages) {
        finishRun(true);
        return;
      }
      game.stage += 1;
      game.usedDashInStage = false;
      spawnStage();
      game.popups.push({ text: `STAGE ${game.stage - 1} CLEAR`, t: 1.8, good: true });
      SFX.clear();
    }

    if (p.hp <= 0) {
      finishRun(false);
      return;
    }

    updateHUD();
  }

  function updateMob(e, p, dt) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    e.atkCd -= dt;
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) {
        if (Math.random() < 0.56 || game.stage > 7) {
          game.projectiles.push({ x: e.x, y: e.y, vx: (dx / d) * 280, vy: (dy / d) * 280, r: 8, t: 3, strong: game.stage > 8, anim: 0, fromBoss: false });
        } else {
          e.x += (dx / d) * 190;
          e.y += (dy / d) * 190;
        }
      }
      return;
    }

    const drift = Math.sin(e.t * 3.4) * 24;
    e.x += (dx / d) * (72 + game.stage * 8) * dt + Math.cos(e.t * 2.1) * dt * drift;
    e.y += (dy / d) * (72 + game.stage * 8) * dt + Math.sin(e.t * 2.4) * dt * drift;

    const baseWind = 0.52 - (save.settings.difficulty === 'hard' ? 0.08 : 0) + (save.settings.assist ? 0.09 : 0);
    if (d < 120 && e.atkCd <= 0) {
      e.wind = baseWind;
      e.atkCd = 1.5;
      SFX.warn();
    }
  }

  function updateBoss(b, p, dt) {
    b.atkCd -= dt;
    b.t += dt;
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;

    if (b.wind > 0) {
      b.wind -= dt;
      if (b.wind <= 0) {
        if (b.pattern === 0) {
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8 + b.t * 0.2;
            game.projectiles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 10, t: 3.4, strong: true, anim: 0, fromBoss: true });
          }
        } else if (b.pattern === 1) {
          b.x += (dx / d) * 240;
          b.y += (dy / d) * 240;
          game.arcs.push({ type: 'bossSlash', x: b.x, y: b.y, r: 120, t: 0.2, a: Math.atan2(dy, dx) });
        } else {
          game.hazards.push({ x: p.x + rand(-70, 70), y: p.y + rand(-70, 70), r: 64, pulse: 0, active: false, shape: 'cross', life: 3 });
        }
      }
      return;
    }

    const orbitR = 150;
    b.x = W() / 2 + Math.cos(b.t * 0.7) * orbitR;
    b.y = H() / 2 + Math.sin(b.t * 0.9) * (orbitR * 0.5) - 50;

    if (b.atkCd <= 0) {
      b.pattern = (b.pattern + 1) % 3;
      b.wind = 0.66 - (save.settings.difficulty === 'hard' ? 0.09 : 0);
      b.atkCd = 1.8;
      SFX.warn();
    }

    if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r + 6 && p.inv <= 0) damagePlayer(15, p.x - b.x, p.y - b.y, true);
  }

  function rankOf() {
    const val = game.score + Math.max(0, 1500 - game.time * 3) - game.hitsTaken * 90 + game.parries * 40 + game.perfectDodges * 35 + game.bossesKilled * 120;
    if (val > 10000) return 'SSR';
    if (val > 9000) return 'SR';
    if (val > 8000) return 'R';
    if (val > 6500) return 'N';
    if (val > 5000) return 'E';
    if (val > 3600) return 'L';
    if (val > 2400) return 'M';
    return 'G';
  }

  function checkProgress(win) {
    const pathCount = Object.keys(save.stats.pathPlays || {}).length;
    const ms = save.missions;
    if (game.stage >= 1) ms.m1 = true;
    if (game.perfectDodges >= 8) ms.m2 = true;
    if (game.parries >= 5) ms.m3 = true;
    if (save.bestCombo >= 30 || game.combo >= 30) ms.m4 = true;
    if (win && game.time <= 240) ms.m5 = true;
    if (game.totalNoHit >= 2) ms.m6 = true;
    if (game.dashesUsed >= 50) ms.m7 = true;
    if (game.heavyKills >= 20) ms.m8 = true;
    if (game.bossesKilled >= 3) ms.m9 = true;
    if (save.stats.gachaRolls >= 5) ms.m10 = true;
    if (game.bossNoHit >= 1) ms.m11 = true;
    if (save.stats.gachaRolls >= 10) ms.m12 = true;
    if (game.comboLongReached >= 15) ms.m13 = true;
    if (save.settings.difficulty === 'hard' && game.stage >= 8) ms.m14 = true;
    if (game.parries >= 12) ms.m15 = true;
    if (game.perfectDodges >= 15) ms.m16 = true;
    if (game.currencyThisRun >= 350) ms.m17 = true;
    if (pathCount >= 3) ms.m18 = true;
    if (hasCharm('overdrive') && win) ms.m19 = true;
    if (game.bossHeavyFinish >= 2) ms.m20 = true;

    const a = save.achievements;
    if (save.playCount >= 1) a.a1 = true;
    if (save.bestCombo >= 40) a.a2 = true;
    if (save.stats.perfectDodges >= 25) a.a3 = true;
    if (save.stats.parries >= 20) a.a4 = true;
    if (save.stats.noHitStages >= 4) a.a5 = true;
    if (win && game.time < 180) a.a6 = true;
    if (win && game.player.hp < 20) a.a7 = true;
    if (win && game.comboBreaks <= 3) a.a8 = true;
    if (Object.values(save.unlocks).filter(Boolean).length >= 4) a.a9 = true;
    if (win && save.settings.difficulty === 'hard') a.a10 = true;
    if (pathCount >= 5) a.a11 = true;
    if (save.stats.gachaRolls >= 20) a.a12 = true;
    if (save.stats.bossClears >= 8) a.a13 = true;
    if (game.dashesUsed >= 90) a.a14 = true;
    if (win && game.hitsTaken <= 6) a.a15 = true;
    if (game.heavyKills >= 40) a.a16 = true;
    if ((save.charms.aegis + save.charms.pulse + save.charms.overdrive) >= 5) a.a17 = true;
    if (game.bossParryChain >= 3) a.a18 = true;
    if (save.charms.overdrive > 0) a.a19 = true;
    if (win && game.player.hp <= 10) a.a20 = true;
    if (game.bossParryChain >= 2 && game.bossesKilled >= 1 && game.hitsTaken < 8) a.a21 = true;
    if (win && save.settings.difficulty === 'hard' && !game.usedGachaThisRun) a.a22 = true;
    if (game.noDashStageClear >= 1) a.a23 = true;
    if (save.clearCount >= 3) a.a24 = true;

    if (save.stats.perfectDodges >= 20) unlockSkin('gale');
    if (save.stats.parries >= 15) unlockSkin('bulwark');
    if (save.stats.bossClears >= 3) unlockSkin('ember');
  }

  function unlockSkin(id) {
    if (!save.unlocks[id]) {
      save.unlocks[id] = true;
      game.popups.push({ text: `${skins[id].name} 해금`, t: 2.2, good: true });
      SFX.unlock();
    }
  }

  function finishRun(win) {
    game.state = 'result';
    hud.classList.add('hidden');
    menu.classList.add('active');

    game.clearTime = game.time;
    game.rank = rankOf();
    save.playCount += 1;
    if (win) save.clearCount += 1;
    save.bestScore = Math.max(save.bestScore, game.score);
    if (rankOrder.indexOf(game.rank) < rankOrder.indexOf(save.bestRank)) save.bestRank = game.rank;
    save.bestCombo = Math.max(save.bestCombo, game.combo);
    save.stats.noHitStages += game.totalNoHit;
    save.stats.totalPlaysTime += game.time;
    save.gachaCurrency += Math.floor(game.currencyThisRun + game.score * 0.05);

    checkProgress(win);
    persist();
    if (win) SFX.clear(); else SFX.over();
    renderResult(win);
  }

  function doGachaRoll() {
    const cost = 120;
    if (save.gachaCurrency < cost) return { ok: false, msg: '조각 부족' };
    save.gachaCurrency -= cost;
    game.usedGachaThisRun = true;
    save.stats.gachaRolls += 1;

    const r = Math.random();
    let id;
    if (r < 0.01) id = 'overdrive';
    else if (r < 0.12) id = Math.random() < 0.5 ? 'aegis' : 'pulse';
    else if (r < 0.45) id = Math.random() < 0.5 ? 'edge' : 'flow';
    else id = 'spark';

    save.charms[id] += 1;
    persist();
    return { ok: true, id };
  }

  function toggleCharm(id) {
    const idx = save.equippedCharms.indexOf(id);
    if (idx >= 0) {
      save.equippedCharms.splice(idx, 1);
    } else {
      if (save.charms[id] <= 0) return;
      if (save.equippedCharms.length >= 3) save.equippedCharms.shift();
      save.equippedCharms.push(id);
    }
    persist();
  }

  function updateHUD() {
    const p = game.player;

    hpBar.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
    dashBar.style.width = `${clamp((p.dash / p.maxDash) * 100, 0, 100)}%`;
    comboBar.style.width = `${clamp((game.comboTimer / (2.1 * (hasCharm('edge') ? 1.25 : 1))) * 100, 0, 100)}%`;

    hpText.textContent = `${Math.floor(Math.max(0, p.hp))} / ${p.maxHp}`;
    dashText.textContent = `${Math.floor(p.dash)} / ${p.maxDash}`;
    comboText.textContent = `x${Math.max(0, Math.floor(game.combo))}`;

    const mins = Math.floor(game.time / 60).toString().padStart(2, '0');
    const secs = (game.time % 60).toFixed(2).padStart(5, '0');
    timerLabel.textContent = `${mins}:${secs}`;

    stageLabel.textContent = `STAGE ${game.stage} / ${game.totalStages}`;
    objectiveLabel.textContent = isBossStage()
      ? `Defeat Prism Core · Score ${Math.floor(game.score)}`
      : `Clear ${Math.max(0, game.enemies.filter((e) => e.type !== 'boss').length)} Targets`;

    bossBadge.style.display = isBossStage() ? 'inline-block' : 'none';
    const boss = game.enemies.find((e) => e.type === 'boss');

    if (isBossStage() && boss) {
      bossHud.style.display = 'block';
      bossHpBar.style.width = `${clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
      bossHpText.textContent = `${Math.floor(Math.max(0, boss.hp))} / ${boss.maxHp}`;
    } else {
      bossHud.style.display = 'none';
    }

    let warningMsg = '';
    if (inDangerZone(p.x, p.y)) warningMsg = 'HAZARD ZONE LOCK';
    else if (p.hp < 24) warningMsg = 'CRITICAL HP';
    else if (isBossStage()) warningMsg = 'PRISM CORE OVERDRIVE';

    if (warningMsg) {
      warningPanel.classList.remove('hidden');
      warningLabel.textContent = warningMsg;
    } else {
      warningPanel.classList.add('hidden');
    }
  }

  function drawBackground() {
    const g = ctx.createRadialGradient(W() * 0.5, H() * 0.58, 90, W() * 0.5, H() * 0.5, W() * 0.9);
    g.addColorStop(0, '#28143f');
    g.addColorStop(0.55, COLORS.bgA);
    g.addColorStop(1, COLORS.bgB);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W(), H());

    const t = game.time;
    ctx.strokeStyle = '#4fd7ff1e';
    ctx.lineWidth = 1;
    const cell = 44;
    for (let x = -cell; x < W() + cell; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x + ((t * 24) % cell), 0);
      ctx.lineTo(x + ((t * 24) % cell), H());
      ctx.stroke();
    }
    for (let y = -cell; y < H() + cell; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y + ((t * 12) % cell));
      ctx.lineTo(W(), y + ((t * 12) % cell));
      ctx.stroke();
    }

    for (let i = 0; i < 4; i++) {
      const rr = 90 + i * 76 + Math.sin(t * 1.6 + i) * 10;
      ctx.strokeStyle = i % 2 ? '#ff346a28' : '#ff8d2f22';
      ctx.lineWidth = i % 2 ? 2 : 3;
      ctx.beginPath();
      ctx.arc(W() * 0.5, H() * 0.62, rr, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pulse = 0.14 + Math.sin(t * 2.4) * 0.04;
    ctx.globalAlpha = pulse + game.stage * 0.01;
    ctx.fillStyle = game.stage % 2 ? '#6e3eff1b' : '#2cf1ff17';
    for (let i = 0; i < 10; i++) {
      const x = (i * 170 + (t * 54) % 170) - 170;
      ctx.fillRect(x, 0, 48, H());
    }
    ctx.globalAlpha = 1;
  }


  function drawBossCoreAura(boss) {
    const spin = game.time * 1.8;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.strokeStyle = '#ff3b6f55';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 78 + i * 28 + Math.sin(spin + i) * 4, spin * (0.28 + i * 0.06), spin * (0.28 + i * 0.06) + Math.PI * 1.2);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const a = spin + i * (Math.PI * 2 / 8);
      const rr = boss.r + 30 + Math.sin(spin * 1.6 + i) * 10;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#120d1f';
      ctx.strokeStyle = '#ff4f95aa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 20);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const core = ctx.createRadialGradient(0, 0, 6, 0, 0, 42);
    core.addColorStop(0, '#ffd5ef');
    core.addColorStop(0.35, '#ff4f9e');
    core.addColorStop(1, '#58143d00');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawUiScanLines() {
    if (save.settings.reduceFlash) return;
    const row = 4;
    ctx.fillStyle = '#ffffff08';
    for (let y = (game.time * 60) % row; y < H(); y += row * 2) ctx.fillRect(0, y, W(), 1);
    const vignette = ctx.createRadialGradient(W() / 2, H() / 2, W() * 0.3, W() / 2, H() / 2, W() * 0.7);
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#00000099');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W(), H());
  }

  function draw() {
    let camX = 0;
    let camY = 0;
    if (game.shake > 0) {
      camX = (Math.random() - 0.5) * game.shake;
      camY = (Math.random() - 0.5) * game.shake;
      game.shake *= 0.88;
      if (save.settings.reduceShake) game.shake = 0;
    }

    ctx.save();
    ctx.clearRect(0, 0, W(), H());
    ctx.translate(camX, camY);

    drawBackground();

    for (const hz of game.hazards) {
      if (hz.life !== undefined) hz.life -= 1 / 60;
      ctx.strokeStyle = hz.active ? COLORS.hazard : '#8f6aa3';
      ctx.lineWidth = hz.active ? 5 : 2;
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r * (hz.active ? 1.04 : 1), 0, Math.PI * 2);
      ctx.stroke();
      if (hz.shape === 'cross') {
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(hz.x - hz.r, hz.y);
        ctx.lineTo(hz.x + hz.r, hz.y);
        ctx.moveTo(hz.x, hz.y - hz.r);
        ctx.lineTo(hz.x, hz.y + hz.r);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    game.hazards = game.hazards.filter((h) => h.life === undefined || h.life > 0);

    for (const af of game.after) {
      ctx.globalAlpha = af.t / 0.24 * 0.55;
      ctx.fillStyle = af.c;
      ctx.beginPath();
      ctx.ellipse(af.x, af.y, 13, 10, af.ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const rb of game.ribbons) {
      ctx.globalAlpha = rb.life / rb.max;
      ctx.strokeStyle = rb.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rb.x, rb.y);
      ctx.lineTo(rb.x - Math.cos(rb.ang) * rb.len, rb.y - Math.sin(rb.ang) * rb.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const e of game.enemies) {
      if (e.spawn > 0) ctx.globalAlpha = 1 - e.spawn / (e.type === 'boss' ? 0.8 : 0.5);
      const pulse = 1 + Math.sin(e.t * 7) * 0.08;
      ctx.fillStyle = e.hit > 0 ? '#fff' : e.type === 'boss' ? '#ff5f79' : '#ff90ae';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      if (e.wind > 0) {
        ctx.strokeStyle = COLORS.warn;
        ctx.lineWidth = e.type === 'boss' ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(game.player.x, game.player.y);
        ctx.stroke();
      }
      if (e.type === 'boss') {
        drawBossCoreAura(e);
        /*
        ctx.fillStyle = '#fff6';
        ctx.fillRect(e.x - 80, e.y - 60, 160, 8);
        ctx.fillStyle = '#ff738c';
        ctx.fillRect(e.x - 80, e.y - 60, 160 * (e.hp / e.maxHp), 8);
        */
      }
      ctx.globalAlpha = 1;
      e.hit *= 0.82;
    }

    for (const pr of game.projectiles) {
      ctx.fillStyle = pr.strong ? '#ff3f6c' : '#ffb000';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff9';
      ctx.beginPath();
      ctx.moveTo(pr.x - pr.vx * 0.03, pr.y - pr.vy * 0.03);
      ctx.lineTo(pr.x, pr.y);
      ctx.stroke();
    }

    for (const a of game.arcs) {
      ctx.globalAlpha = a.t / 0.26;
      if (a.type === 'slash') {
        ctx.strokeStyle = '#f7f2ff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, a.a - 0.42, a.a + 0.42);
        ctx.stroke();
      } else if (a.type === 'heavy') {
        ctx.strokeStyle = '#ffb36a';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * (1 - a.t), 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.type === 'perfect') {
        ctx.strokeStyle = '#47d7ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * (1.35 - a.t), 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.type === 'parry') {
        ctx.strokeStyle = '#a6ff8a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * (1.2 - a.t), 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.type === 'bossSlash') {
        ctx.strokeStyle = '#ffd17a';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, a.a - 0.35, a.a + 0.35);
        ctx.stroke();
      } else if (a.type === 'hurt') {
        ctx.fillStyle = '#ff3f6c55';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const pz of game.particles) {
      ctx.globalAlpha = pz.life / pz.max;
      ctx.fillStyle = pz.c;
      ctx.fillRect(pz.x, pz.y, pz.size, pz.size);
    }
    ctx.globalAlpha = 1;

    drawUiScanLines();

    const p = game.player || { x: 0, y: 0, dir: 0, skin: 'prism', inv: 0, animT: 0 };
    const skin = skins[p.skin] || skins.prism;
    const bob = Math.sin(p.animT * 11) * 2;
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.dir);
    ctx.fillStyle = p.inv > 0 ? '#ffffff' : skin.color;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(28, 0);
    ctx.stroke();

    ctx.restore();

    if (game.player && game.player.hp < 24) {
      ctx.fillStyle = '#ff3f6c99';
      ctx.beginPath();
      ctx.moveTo(0, H() / 2);
      ctx.lineTo(28, H() / 2 - 24);
      ctx.lineTo(28, H() / 2 + 24);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W(), H() / 2);
      ctx.lineTo(W() - 28, H() / 2 - 24);
      ctx.lineTo(W() - 28, H() / 2 + 24);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#fff';
    for (let i = 0; i < game.popups.length; i++) {
      const p2 = game.popups[i];
      ctx.globalAlpha = clamp(p2.t, 0, 1);
      ctx.fillStyle = p2.good ? '#86ff88' : '#ffd7a3';
      ctx.fillText(p2.text, 22, 30 + i * 18);
    }
    ctx.globalAlpha = 1;
  }

  function renderMenu(kind = 'title') {
    hud.classList.add('hidden');
    menu.classList.add('active');

    if (kind === 'title') {
      menu.innerHTML = `
      <h2>Shardsprint: Counter Pulse</h2>
      <p><strong>12 스테이지 액션 런 + 보스 패턴전 + 가챠 코어 수집</strong></p>
      <div class='btnrow'>
        <button data-act='start'><span>게임 시작</span></button>
        <button data-act='skins'><span>스킨 선택</span></button>
        <button data-act='gacha'><span>가챠/코어</span></button>
        <button data-act='missions'><span>미션</span></button>
        <button data-act='achievements'><span>업적</span></button>
        <button data-act='settings'><span>설정</span></button>
        <button data-act='controls'><span>조작 안내</span></button>
        <button data-act='credits'><span>크레딧</span></button>
      </div>
      <p><small>Best Score ${save.bestScore} / Rank ${save.bestRank} / Combo ${save.bestCombo} / Gear ${save.gachaCurrency} / Path ${save.growthPath}</small></p>`;
      return;
    }

    if (kind === 'controls') {
      menu.innerHTML = `<h2>조작 안내</h2>
      <div class='grid'>
      <div class='card'>이동: WASD / 방향키</div><div class='card'>대시/회피: Shift 또는 Space</div><div class='card'>빠른 공격: K</div>
      <div class='card'>차지 강공격: J 홀드 후 릴리즈</div><div class='card'>일시정지: ESC</div><div class='card'>메뉴: Tab / Enter</div></div>
      <div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'skins') {
      const content = Object.entries(skins).map(([id, s]) => `
      <div class='card'><b>${s.name}</b><br>${s.desc}<br><small>${save.unlocks[id] ? '해금' : '잠금'}</small>
      <div class='btnrow'><button data-equip='${id}' ${save.unlocks[id] ? '' : 'disabled'}><span>${save.equipped === id ? '장착중' : '장착'}</span></button></div></div>`).join('');
      menu.innerHTML = `<h2>스킨 선택</h2><div class='grid'>${content}</div><div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'gacha') {
      const rows = Object.entries(charmlib).map(([id, c]) => `
      <div class='card'><b>[${c.rarity}] ${c.n}</b><br>${c.desc}<br>보유: ${save.charms[id]} / ${save.equippedCharms.includes(id) ? '장착중' : '미장착'}
      <div class='btnrow'><button data-charm='${id}' ${save.charms[id] > 0 ? '' : 'disabled'}><span>${save.equippedCharms.includes(id) ? '해제' : '장착'}</span></button></div></div>`).join('');
      const pathRows = Object.entries(growthPaths).map(([id, p]) => `<div class='card'><b>${p.n}</b><br>${p.d}<br><small>${save.growthPath === id ? '선택됨' : '미선택'}</small><div class='btnrow'><button data-path='${id}'><span>선택</span></button></div></div>`).join('');
      menu.innerHTML = `<h2>가챠 코어</h2><p>보유 조각: ${save.gachaCurrency} / 1회 비용: 120</p>
      <div class='btnrow'><button data-act='roll'><span>1회 뽑기</span></button><button data-act='roll10'><span>3회 연속 뽑기</span></button></div>
      <div class='grid'>${rows}</div>
      <h2>성장 경로</h2><div class='grid'>${pathRows}</div>
      <div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'missions') {
      menu.innerHTML = `<h2>미션 ${missions.length}</h2><ul class='list'>${missions.map(([id, t]) => `<li class='${save.missions[id] ? 'done' : ''}'>${save.missions[id] ? '✅' : '⬜'} ${t}</li>`).join('')}</ul><div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'achievements') {
      menu.innerHTML = `<h2>업적 ${achievements.length}</h2><ul class='list'>${achievements.map(([id, t], i) => `<li class='${save.achievements[id] ? 'done' : (i > 16 ? 'hiddenEntry' : '')}'>${save.achievements[id] ? '🏆' : '🔒'} ${save.achievements[id] ? t : (i > 16 ? '숨겨진 업적' : '미달성')}</li>`).join('')}</ul><div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'settings') {
      menu.innerHTML = `<h2>설정</h2><div class='grid'>
      <div class='card'>난이도: <button data-set='difficulty'>${save.settings.difficulty}</button></div>
      <div class='card'>Assist: <button data-toggle='assist'>${save.settings.assist ? 'ON' : 'OFF'}</button></div>
      <div class='card'>흔들림 감소: <button data-toggle='reduceShake'>${save.settings.reduceShake ? 'ON' : 'OFF'}</button></div>
      <div class='card'>플래시 감소: <button data-toggle='reduceFlash'>${save.settings.reduceFlash ? 'ON' : 'OFF'}</button></div>
      <div class='card'>파티클 감소: <button data-toggle='reduceParticles'>${save.settings.reduceParticles ? 'ON' : 'OFF'}</button></div>
      <div class='card'>음소거: <button data-toggle='mute'>${save.settings.mute ? 'ON' : 'OFF'}</button></div>
      <div class='card'>볼륨: <input id='vol' type='range' min='0' max='1' step='0.05' value='${save.settings.volume}'/></div>
      </div><div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
      return;
    }

    if (kind === 'credits') {
      menu.innerHTML = `<h2>크레딧</h2><p>Design / Code / VFX / SFX / QA : Autonomous Solo Agent</p><p>Engine: HTML5 Canvas + Vanilla JS + WebAudio</p><div class='btnrow'><button data-act='title'><span>뒤로</span></button></div>`;
    }
  }

  function renderPause() {
    menu.classList.add('active');
    menu.innerHTML = `<h2>일시정지</h2><p>보스 패턴은 예고선-음향 후 발동됩니다.</p><div class='btnrow'><button data-act='resume'><span>계속</span></button><button data-act='restart'><span>재시작</span></button><button data-act='title'><span>메뉴</span></button></div>`;
  }

  function renderResult(win) {
    const hint = win
      ? '다음 목표: 하드 모드에서 보스 패턴 3연 패링에 도전하세요.'
      : game.perfectDodges < 5
      ? '대시를 조금 늦게 사용하면 완벽 회피 보상을 더 자주 얻습니다.'
      : '위험구역 이탈 우선 후 반격 타이밍을 노리세요.';

    menu.innerHTML = `<h2>${win ? '클리어' : '게임오버'} / Rank ${game.rank}</h2>
    <div class='grid'>
      <div class='card'>스테이지: ${game.stage}/${game.totalStages}<br>시간: ${game.clearTime.toFixed(1)}s<br>점수: ${Math.floor(game.score)}</div>
      <div class='card'>콤보 최고: ${save.bestCombo}<br>피격: ${game.hitsTaken}<br>완벽회피: ${game.perfectDodges} / 패링: ${game.parries}</div>
      <div class='card'>보스 격파: ${game.bossesKilled}<br>획득 조각: +${Math.floor(game.currencyThisRun + game.score * 0.05)}<br>누적 조각: ${save.gachaCurrency}</div>
      <div class='card'>미션: ${Object.values(save.missions).filter(Boolean).length}/${missions.length}<br>업적: ${Object.values(save.achievements).filter(Boolean).length}/${achievements.length}<br>랭크 체계: N/R/SR/SSR/E/L/M/G<br>${hint}</div>
    </div>
    <div class='btnrow'><button data-act='restart'><span>다시 플레이</span></button><button data-act='gacha'><span>가챠로 이동</span></button><button data-act='title'><span>메뉴</span></button></div>`;
  }

  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    SFX.nav();

    if (b.dataset.act === 'start') {
      game.state = 'play';
      menu.classList.remove('active');
      hud.classList.remove('hidden');
      resetRun();
      applyCharmsOnStart();
      SFX.ok();
      return;
    }

    if (b.dataset.act === 'resume') {
      game.state = 'play';
      menu.classList.remove('active');
      hud.classList.remove('hidden');
      return;
    }

    if (b.dataset.act === 'restart') {
      game.state = 'play';
      menu.classList.remove('active');
      hud.classList.remove('hidden');
      resetRun();
      applyCharmsOnStart();
      return;
    }

    if (b.dataset.act === 'roll' || b.dataset.act === 'roll10') {
      const rolls = b.dataset.act === 'roll10' ? 3 : 1;
      const pulls = [];
      for (let i = 0; i < rolls; i++) {
        const out = doGachaRoll();
        if (!out.ok) break;
        pulls.push(out.id);
      }
      if (pulls.length > 0) {
        game.popups.push({ text: `가챠 획득: ${pulls.map((id) => charmlib[id].n).join(', ')}`, t: 2.5, good: true });
        if (pulls.includes('overdrive')) SFX.unlock();
        renderMenu('gacha');
      } else {
        game.popups.push({ text: '조각이 부족합니다', t: 1.6, good: false });
      }
      return;
    }

    if (b.dataset.charm) {
      toggleCharm(b.dataset.charm);
      renderMenu('gacha');
      return;
    }
    if (b.dataset.path) {
      save.growthPath = b.dataset.path;
      persist();
      renderMenu('gacha');
      return;
    }

    if (b.dataset.equip && save.unlocks[b.dataset.equip]) {
      save.equipped = b.dataset.equip;
      persist();
      renderMenu('skins');
      return;
    }

    if (b.dataset.toggle) {
      const k = b.dataset.toggle;
      save.settings[k] = !save.settings[k];
      persist();
      renderMenu('settings');
      return;
    }

    if (b.dataset.set === 'difficulty') {
      save.settings.difficulty = save.settings.difficulty === 'normal' ? 'hard' : 'normal';
      persist();
      renderMenu('settings');
      return;
    }

    const act = b.dataset.act;
    if (act === 'title') game.state = 'title';
    if (act && act !== 'start' && act !== 'resume' && act !== 'restart' && act !== 'roll' && act !== 'roll10') renderMenu(act);
  });

  menu.addEventListener('input', (e) => {
    if (e.target.id === 'vol') {
      save.settings.volume = Number(e.target.value);
      persist();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key) && game.state === 'play') e.preventDefault();
    keys.add(e.key);
    just.add(e.key);

    if (e.key === 'Escape') {
      if (game.state === 'play') {
        game.state = 'pause';
        renderPause();
      } else if (game.state === 'pause') {
        game.state = 'play';
        menu.classList.remove('active');
        hud.classList.remove('hidden');
      }
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    update(dt * (game.slowmo > 0 ? 0.45 : 1));
    draw();

    for (const p of game.popups) p.t -= dt;
    game.popups = game.popups.filter((p) => p.t > 0);

    just.clear();
    requestAnimationFrame(loop);
  }

  renderMenu('title');
  requestAnimationFrame(loop);
})();
