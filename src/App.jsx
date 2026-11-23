import { useEffect, useRef, useState } from "react";
import "./App.css";

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 2200;

const ASSETS = {
  player: "/images/player.png",
  p_l: "/images/p_l",
  p_b: "/images/p_b",
  p_r: "/images/p_r",
  tree: "/images/tree.png",
  house: "/images/house.png",
  rock: "/images/rock.png",
  elder: "/images/elder.png",
  monster: "/images/monster.png"
};

const trees = Array.from({ length: 95 }, (_, i) => {
  const x = 90 + ((i * 197) % (WORLD_WIDTH - 180));
  const y = 90 + ((i * 131) % (WORLD_HEIGHT - 180));
  // Leave a village clearing and the river area open.
  const inVillage = x > 650 && x < 1450 && y > 500 && y < 1250;
  const nearRiver = x > 2100 && x < 2350;
  return { x, y, size: 70 + (i % 3) * 12, visible: !inVillage && !nearRiver };
}).filter((tree) => tree.visible);

const rocks = Array.from({ length: 24 }, (_, i) => ({
  x: 150 + ((i * 317) % 2650),
  y: 150 + ((i * 223) % 1900),
  size: 35 + (i % 3) * 12
}));

const houses = [
  { x: 790, y: 570, w: 260, h: 230 },
  { x: 1250, y: 620, w: 250, h: 220 },
  { x: 900, y: 1050, w: 270, h: 230 },
  { x: 1450, y: 1020, w: 250, h: 220 }
];

export default function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef({
    x: 1120,
    y: 900,
    direction: "down",
    frame: 0,
    moving: false
  });
  const keysRef = useRef({});
  const [health, setHealth] = useState(100);
  const [mana, setMana] = useState(50);
  const [xp, setXp] = useState(0);
  const [gold, setGold] = useState(25);
  const [questDone, setQuestDone] = useState(false);
  const [panel, setPanel] = useState("");
  const [logs, setLogs] = useState([
    "Ты прибыл в деревню.",
    "Задание: поговори со старейшиной."
  ]);
  const [potions, setPotions] = useState(3);

  const addLog = (message) => {
    setLogs((old) => [...old.slice(-4), message]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;
    const images = {};

    Object.entries(ASSETS).forEach(([name, src]) => {
      const image = new Image();
      image.src = src;
      images[name] = image;
    });

    let animationId;
    let lastTime = 0;

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawImage(name, x, y, width, height) {
      const image = images[name];
      if (image && image.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, x, y, width, height);
      }
    }

    function drawWorld() {
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;

      // Grass base and subtle grass pattern.
      ctx.fillStyle = "#568b45";
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      for (let x = 20; x < WORLD_WIDTH; x += 80) {
        for (let y = 20; y < WORLD_HEIGHT; y += 80) {
          if ((x * 7 + y * 3) % 5 === 0) {
            ctx.fillStyle = "#65984d";
            ctx.fillRect(x, y, 5, 4);
          }
        }
      }

      // Winding river.
      ctx.fillStyle = "#245f7b";
      ctx.beginPath();
      ctx.moveTo(2200, 0);
      ctx.lineTo(2390, 0);
      ctx.lineTo(2330, 500);
      ctx.lineTo(2410, 950);
      ctx.lineTo(2290, 1450);
      ctx.lineTo(2370, 2200);
      ctx.lineTo(2180, 2200);
      ctx.lineTo(2240, 1450);
      ctx.lineTo(2160, 950);
      ctx.lineTo(2230, 500);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#65b6ca";
      ctx.lineWidth = 5;
      for (let y = 80; y < WORLD_HEIGHT; y += 110) {
        ctx.beginPath();
        ctx.moveTo(2220 + (y % 3) * 15, y);
        ctx.lineTo(2290 + (y % 4) * 10, y + 12);
        ctx.stroke();
      }

      // Main dirt roads.
      ctx.strokeStyle = "#ad8050";
      ctx.lineWidth = 105;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 970);
      ctx.lineTo(650, 970);
      ctx.lineTo(1100, 900);
      ctx.lineTo(1700, 970);
      ctx.lineTo(2260, 1050);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(1120, 0);
      ctx.lineTo(1120, 900);
      ctx.lineTo(1080, 1450);
      ctx.lineTo(1050, 2200);
      ctx.stroke();

      // Small bridges across the river.
      [420, 1040, 1660].forEach((y) => {
        ctx.fillStyle = "#5c3b24";
        ctx.fillRect(2150, y, 300, 100);
        ctx.fillStyle = "#b27a45";
        ctx.fillRect(2160, y + 8, 280, 84);
        ctx.fillStyle = "#704729";
        for (let x = 2170; x < 2440; x += 28) {
          ctx.fillRect(x, y + 8, 5, 84);
        }
      });

      // Village square.
      ctx.fillStyle = "#c09561";
      ctx.beginPath();
      ctx.ellipse(1120, 930, 430, 330, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#d3aa76";
      ctx.beginPath();
      ctx.ellipse(1120, 930, 390, 292, 0, 0, Math.PI * 2);
      ctx.fill();

      // Houses.
      houses.forEach((house) => {
        drawImage("house", house.x, house.y, house.w, house.h);
      });

      // Elder near the central square.
      drawImage("elder", 1070, 690, 76, 100);

      // Decorative well.
      ctx.fillStyle = "#777987";
      ctx.beginPath();
      ctx.ellipse(1330, 950, 60, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#24485c";
      ctx.beginPath();
      ctx.ellipse(1330, 942, 45, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trees and rocks.
      trees.forEach((tree) => {
        drawImage("tree", tree.x - tree.size / 2, tree.y - tree.size / 2, tree.size, tree.size);
      });

      rocks.forEach((rock) => {
        drawImage("rock", rock.x - rock.size / 2, rock.y - rock.size / 2, rock.size, rock.size);
      });

      // A few monsters in the forest.
      [[380, 430], [1850, 350], [2650, 1300], [500, 1750]].forEach(([x, y]) => {
        drawImage("monster", x - 30, y - 38, 60, 76);
      });

      // World border marker.
      ctx.strokeStyle = "#294b2e";
      ctx.lineWidth = 18;
      ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }

    function drawPlayer() {
      const bob = game.moving && Math.floor(game.frame / 7) % 2 === 0 ? -4 : 0;
      drawImage("player", game.x - 32, game.y - 48 + bob, 64, 88);
    }

    function loop(time) {
      const delta = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
      lastTime = time;

      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;

      if (keys.KeyW || keys.ArrowUp) dy -= 1;
      if (keys.KeyS || keys.ArrowDown) dy += 1;
      if (keys.KeyA || keys.ArrowLeft) dx -= 1;
      if (keys.KeyD || keys.ArrowRight) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
        game.x += dx * 4 * delta;
        game.y += dy * 4 * delta;
        game.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
          game.direction = dx > 0 ? "right" : "left";
        } else {
          game.direction = dy > 0 ? "down" : "up";
        }
      } else {
        game.moving = false;
      }

      game.x = Math.max(35, Math.min(WORLD_WIDTH - 35, game.x));
      game.y = Math.max(45, Math.min(WORLD_HEIGHT - 45, game.y));
      game.frame += delta;

      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const cameraX = Math.max(0, Math.min(WORLD_WIDTH - viewW, game.x - viewW / 2));
      const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - viewH, game.y - viewH / 2));

      ctx.clearRect(0, 0, viewW, viewH);
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      drawWorld();
      drawPlayer();
      ctx.restore();

      animationId = requestAnimationFrame(loop);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationId = requestAnimationFrame(loop);

    const handleKeyDown = (event) => {
      keysRef.current[event.code] = true;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === "KeyE") {
        const distance = Math.hypot(game.x - 1108, game.y - 730);
        if (distance < 120 && !questDone) {
          setQuestDone(true);
          setXp((value) => value + 50);
          setGold((value) => value + 20);
          setLogs((old) => [...old.slice(-3), "Старейшина: Спасибо за помощь!", "Задание выполнено: +50 XP, +20 золота"]);
        } else if (distance >= 120) {
          addLog("Подойди ближе к старейшине.");
        }
      }
      if (event.code === "Space" || event.code === "KeyJ") {
        addLog("Ты взмахнул мечом!");
      }
    };

    const handleKeyUp = (event) => {
      keysRef.current[event.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [questDone]);

  function usePotion() {
    if (potions <= 0) {
      addLog("Зелья закончились!");
      return;
    }
    if (health >= 100) {
      addLog("Здоровье уже полное.");
      return;
    }
    setHealth((value) => Math.min(100, value + 35));
    setPotions((value) => value - 1);
    addLog("Использовано зелье здоровья.");
  }

  return (
    <div className="game-screen">
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hero-hud">
        <img src={ASSETS.player} alt="Герой" className="hero-avatar" />
        <div className="hero-stats">
          <div className="hero-title">Уровень 1 <span>Путешественник</span></div>
          <div className="stat-line"><b>❤️</b><div className="bar"><i className="health-fill" style={{ width: `${health}%` }} /></div><small>{health}/100</small></div>
          <div className="stat-line"><b>🔵</b><div className="bar"><i className="mana-fill" style={{ width: `${mana * 2}%` }} /></div><small>{mana}/50</small></div>
          <div className="xp-line">⭐ Опыт: {xp}　🪙 {gold}</div>
        </div>
      </div>

      <div className="quest-card">
        <h3>📜 Текущее задание</h3>
        <p>{questDone ? "✓ Поговорить со старейшиной" : "◆ Поговори со старейшиной"}</p>
        <small>{questDone ? "Задание выполнено!" : "Найди его на площади деревни. Нажми E."}</small>
      </div>

      <div className="mini-map">
        <div className="map-title">КАРТА МИРА</div>
        <div className="map-river" />
        <div className="map-dot" />
        <div className="map-player" />
      </div>

      <div className="side-menu">
        <button onClick={() => setPanel("inventory")}>🎒 Инвентарь</button>
        <button onClick={() => setPanel("quests")}>📜 Задания</button>
        <button onClick={() => setPanel("character")}>👤 Персонаж</button>
        <button onClick={() => setPanel("settings")}>⚙️ Настройки</button>
      </div>

      <div className="chat-panel">
        {logs.map((log, index) => <p key={`${index}-${log}`}>{log}</p>)}
      </div>

      <div className="hotbar">
        <button onClick={() => addLog("Ты атаковал мечом!") }><small>1</small>⚔️</button>
        <button onClick={() => { setMana((value) => Math.max(0, value - 10)); addLog("Использовано заклинание огня."); }}><small>2</small>🔥</button>
        <button onClick={usePotion}><small>3</small>🧪<em>{potions}</em></button>
        <button onClick={() => setPanel("inventory")}><small>4</small>🎒</button>
      </div>

      {panel && (
        <div className="modal-backdrop" onClick={() => setPanel("")}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setPanel("")}>×</button>
            {panel === "inventory" && <>
              <h2>🎒 Инвентарь</h2>
              <p>⚔️ Железный меч — 1</p>
              <p>🔥 Заклинание огня — 1</p>
              <p>🧪 Зелье здоровья — {potions}</p>
              <p>🪙 Золото — {gold}</p>
            </>}
            {panel === "quests" && <>
              <h2>📜 Задания</h2>
              <p>{questDone ? "✓ Поговорить со старейшиной — выполнено" : "◆ Поговорить со старейшиной — не выполнено"}</p>
              <p>Награда: 50 опыта и 20 золота.</p>
            </>}
            {panel === "character" && <>
              <h2>👤 Персонаж</h2>
              <img src={ASSETS.player} alt="Герой" className="modal-avatar" />
              <p>Путешественник — уровень 1</p>
              <p>❤️ Здоровье: {health}/100</p>
              <p>🔵 Мана: {mana}/50</p>
              <p>⭐ Опыт: {xp}</p>
              <p>🛡️ Защита: 5</p>
            </>}
            {panel === "settings" && <>
              <h2>⚙️ Управление</h2>
              <p>WASD или стрелки — движение</p>
              <p>Space / J — атака</p>
              <p>E — разговор со старейшиной</p>
              <p>Карта большая: исследуй её, отходя от деревни.</p>
            </>}
          </div>
        </div>
      )}

      <div className="controls-hint">WASD / СТРЕЛКИ — ДВИЖЕНИЕ　 SPACE / J — АТАКА　 E — ДИАЛОГ</div>
    </div>
  );
}
