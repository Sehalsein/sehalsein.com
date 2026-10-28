import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Play, Star } from 'lucide-react';

type FallingStar = { x: number; y: number; speed: number; phase: number };
export default function StarGame({ back }: { back?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false),
    [score, setScore] = useState(0),
    [lives, setLives] = useState(3),
    [finished, setFinished] = useState(false);
  const game = useRef({
    paddle: 0.5,
    target: 0.5,
    score: 0,
    lives: 3,
    time: 0,
    spawn: 0,
    stars: [] as FallingStar[],
    keys: new Set<string>(),
  });
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0,
      last = performance.now();
    const state = game.current;
    const pointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      state.target = Math.max(0.065, Math.min(0.935, (e.clientX - r.left) / r.width));
    };
    const keydown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        state.keys.add(e.code);
      }
    };
    const keyup = (e: KeyboardEvent) => state.keys.delete(e.code);
    const blur = () => state.keys.clear();
    canvas.addEventListener('pointermove', pointer);
    canvas.addEventListener('pointerdown', pointer);
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    const star = (x: number, y: number, size: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 ? size * 0.42 : size,
          a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        if (i) ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
        else ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.035);
      last = now;
      const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const background = ctx.createLinearGradient(0, 0, 0, h);
      background.addColorStop(0, '#1a293c');
      background.addColorStop(1, '#476165');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 65; i++) {
        ctx.fillStyle = `rgba(246,233,204,${0.15 + (i % 5) * 0.07})`;
        ctx.beginPath();
        ctx.arc(
          (((i * 173 + 47) % 997) / 997) * w,
          (((i * 107) % 503) / 503) * (h - 40),
          i % 4 === 0 ? 1.3 : 0.7,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = '#e5d9b5';
      ctx.beginPath();
      ctx.arc(w * 0.83, h * 0.19, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#253b4b';
      ctx.beginPath();
      ctx.arc(w * 0.83 + 11, h * 0.19 - 5, 23, 0, Math.PI * 2);
      ctx.fill();
      if (playing && !document.hidden) {
        state.time += dt;
        state.spawn += dt;
        const direction =
          Number(state.keys.has('ArrowRight') || state.keys.has('KeyD')) -
          Number(state.keys.has('ArrowLeft') || state.keys.has('KeyA'));
        if (direction)
          state.target = Math.max(0.065, Math.min(0.935, state.target + direction * dt * 0.65));
        state.paddle += (state.target - state.paddle) * Math.min(1, dt * 14);
        if (state.spawn > 0.8) {
          state.spawn = 0;
          state.stars.push({
            x: 0.09 + Math.random() * 0.82,
            y: -0.04,
            speed: 0.18 + state.score * 0.007,
            phase: Math.random() * 6.28,
          });
        }
        state.stars = state.stars.filter((item) => {
          item.y += item.speed * dt;
          if (item.y > 0.855 && item.y < 0.93 && Math.abs(item.x - state.paddle) < 0.085) {
            state.score++;
            setScore(state.score);
            return false;
          }
          if (item.y > 1.03) {
            state.lives--;
            setLives(state.lives);
            return false;
          }
          return true;
        });
        if (state.lives <= 0 || state.score >= 12) {
          setPlaying(false);
          setFinished(true);
        }
      }
      for (const item of state.stars) {
        ctx.fillStyle = '#f5d893';
        ctx.shadowColor = '#eedbb0';
        ctx.shadowBlur = 13;
        star(item.x * w, item.y * h, 8, state.time + item.phase);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#dcc9a3';
      ctx.beginPath();
      ctx.roundRect(state.paddle * w - w * 0.065, h * 0.9, w * 0.13, 9, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(227,218,188,.15)';
      ctx.beginPath();
      ctx.ellipse(state.paddle * w, h * 0.95, w * 0.08, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', pointer);
      canvas.removeEventListener('pointerdown', pointer);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
    };
  }, [playing]);
  function start() {
    Object.assign(game.current, {
      paddle: 0.5,
      target: 0.5,
      score: 0,
      lives: 3,
      time: 0,
      spawn: 0,
      stars: [],
    });
    setScore(0);
    setLives(3);
    setFinished(false);
    setPlaying(true);
    canvasRef.current?.focus();
  }
  return (
    <section className="star-game">
      <div className="game-heading">
        {back ? (
          <button className="text-button" onClick={back}>
            <ArrowLeft size={16} /> Channels
          </button>
        ) : (
          <span className="eyebrow">A little arcade</span>
        )}
        <span>
          <Star size={14} /> {score} / 12{' '}
          <span className="game-lives" aria-label={`${lives} chances remaining`}>
            {'●'.repeat(Math.max(0, lives))}
            {'○'.repeat(3 - Math.max(0, lives))}
          </span>
        </span>
      </div>
      <div className="game-viewport">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="Starlight: move with the mouse, touch, or left and right arrow keys to catch twelve falling stars"
          data-playing={playing}
        />
        {!playing ? (
          <div className="game-start">
            <span className="eyebrow">A small game for a quiet evening</span>
            <h2>
              {finished
                ? score >= 12
                  ? 'A pocketful of stars.'
                  : 'There are always more stars.'
                : 'Starlight'}
            </h2>
            <p>
              {finished
                ? `You caught ${score} ${score === 1 ? 'star' : 'stars'}.`
                : 'Catch twelve little stars. Let the rest of the world wait.'}
            </p>
            <button className="primary-button" onClick={start}>
              {finished ? <RotateCcw size={16} /> : <Play size={16} />}
              {finished ? 'Play again' : 'Catch some stars'}
            </button>
          </div>
        ) : null}
      </div>
      <p className="game-instructions">
        Move your mouse, drag a finger, or use <kbd>←</kbd> <kbd>→</kbd>
      </p>
    </section>
  );
}
