
import React, { useRef } from 'react';
import useEffect from 'react';
import useState from 'react';
// Simple single-file top-down racing game using Canvas
// Controls: Arrow keys or A/D to steer, Up to accelerate, Down to brake

export default function App() {
	const canvasRef = useRef(null);
	const [running, setRunning] = useState(true);
	const [score, setScore] = useState(0);
	const keys = useRef({});

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		let w = (canvas.width = 800);
		let h = (canvas.height = 600);

		// Game state
		const player = {
			x: w / 2,
			y: h - 120,
			width: 50,
			height: 90,
			speed: 0,
			angle: 0,
			maxSpeed: 7,
		};

		let roadOffset = 0;
		let obstacles = [];
		let frame = 0;
		let lastTime = performance.now();

		function spawnObstacle() {
			const laneX = w / 2 + (Math.random() * 3 - 1.5) * 120; // vary across road
			const size = 40 + Math.random() * 60;
			obstacles.push({ x: laneX, y: -size, w: size, h: size, speed: 3 + Math.random() * 4 });
			if (obstacles.length > 12) obstacles.shift();
		}

		function rectsCollide(a, b) {
			return !(a.x + a.width < b.x || a.x > b.x + b.w || a.y + a.height < b.y || a.y > b.y + b.h);
		}

		function resetGame() {
			obstacles = [];
			frame = 0;
			roadOffset = 0;
			player.x = w / 2;
			player.y = h - 120;
			player.speed = 0;
			setScore(0);
			setRunning(true);
		}

		function update(dt) {
			// Controls
			if (keys.current.ArrowLeft || keys.current.a) player.x -= 200 * dt * (1 - Math.abs(player.angle));
			if (keys.current.ArrowRight || keys.current.d) player.x += 200 * dt * (1 - Math.abs(player.angle));
			if (keys.current.ArrowUp || keys.current.w) player.speed += 8 * dt;
			if (keys.current.ArrowDown || keys.current.s) player.speed -= 12 * dt;

			// clamp speed and position
			player.speed = Math.max(0, Math.min(player.maxSpeed, player.speed));
			player.x = Math.max(120, Math.min(w - 120 - player.width, player.x));

			// road movement gives illusion of forward motion
			roadOffset += player.speed * 6;
			if (roadOffset > 40) roadOffset -= 40;

			// update obstacles
			for (let ob of obstacles) {
				ob.y += ob.speed + player.speed * 1.5;
			}
			// spawn occasionally
			if (frame % Math.max(20, 80 - Math.floor(score / 10)) === 0) spawnObstacle();

			// remove offscreen
			obstacles = obstacles.filter((o) => o.y < h + 200);

			// collision check
			for (let ob of obstacles) {
				if (rectsCollide(player, ob)) {
					setRunning(false);
				}
			}

			// score increases by distance
			setScore((s) => s + Math.floor(player.speed * dt * 100));
			frame++;
		}

		function draw() {
			// background
			ctx.fillStyle = '#2b2b2b';
			ctx.fillRect(0, 0, w, h);

			// draw road
			const roadW = 400;
			const roadX = w / 2 - roadW / 2;
			ctx.fillStyle = '#444';
			ctx.fillRect(roadX, 0, roadW, h);
			// road edges
			ctx.fillStyle = '#222';
			ctx.fillRect(roadX - 40, 0, 40, h);
			ctx.fillRect(roadX + roadW, 0, 40, h);

			// dashed center line
			ctx.strokeStyle = '#eee';
			ctx.lineWidth = 4;
			ctx.setLineDash([30, 30]);
			ctx.lineDashOffset = -roadOffset;
			ctx.beginPath();
			ctx.moveTo(w / 2, 0);
			ctx.lineTo(w / 2, h);
			ctx.stroke();
			ctx.setLineDash([]);

			// obstacles
			for (let ob of obstacles) {
				ctx.fillStyle = '#b33';
				ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
				ctx.strokeStyle = '#800';
				ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
			}

			// player car
			ctx.save();
			ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
			ctx.rotate(player.angle * 0.05);
			ctx.fillStyle = '#0af';
			ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
			// windows
			ctx.fillStyle = 'rgba(255,255,255,0.6)';
			ctx.fillRect(-player.width / 4, -player.height / 4, player.width / 2, player.height / 4);
			ctx.restore();

			// HUD
			ctx.fillStyle = '#fff';
			ctx.font = '18px sans-serif';
			ctx.fillText(`Score: ${score}`, 14, 26);
			ctx.fillText(`Speed: ${Math.round(player.speed)}`, 14, 48);
			if (!running) {
				ctx.fillStyle = 'rgba(0,0,0,0.6)';
				ctx.fillRect(0, 0, w, h);
				ctx.fillStyle = '#fff';
				ctx.font = '36px sans-serif';
				ctx.fillText('Crashed - Press R to restart', w / 2 - 220, h / 2);
			}
		}

		function loop(now) {
			const dt = Math.min(1 / 30, (now - lastTime) / 1000);
			lastTime = now;
			if (running) update(dt);
			draw();
			requestAnimationFrame(loop);
		}

		requestAnimationFrame(loop);

		// keyboard
		function down(e) {
			keys.current[e.key] = true;
			if (!running && (e.key === 'r' || e.key === 'R')) resetGame();
		}
		function up(e) {
			keys.current[e.key] = false;
		}
		window.addEventListener('keydown', down);
		window.addEventListener('keyup', up);

		return () => {
			window.removeEventListener('keydown', down);
			window.removeEventListener('keyup', up);
		};
	}, [running]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
			<h3>Mini Asphalt — single-file demo</h3>
			<canvas ref={canvasRef} style={{ border: '2px solid #222', background: '#111' }} />
			<div style={{ marginTop: 10 }}>
				<button onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Resume'}</button>
				<button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))} style={{ marginLeft: 8 }}>
					Restart
				</button>
			</div>
			<div style={{ marginTop: 8, color: '#666' }}>Controls: ← → or A/D to steer, ↑ to accelerate, ↓ to brake, R to restart</div>
		</div>
	);
}
