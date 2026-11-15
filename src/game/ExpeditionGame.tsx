import { useEffect, useRef, useState } from 'react';
import type { TripDraft } from '../planning/trip';
import {
  emptyInput,
  expeditionFromPlan,
  initialRover,
  practiceExpedition,
  scanCheckpoint,
  stepRover,
  targetDistance,
  type DriveInput,
  type Expedition,
  type RoverState,
} from './expedition';
import { createExpeditionRenderer } from './render-expedition';
import './expedition.css';

export function ExpeditionGame({ draft }: { draft: TripDraft }) {
  const [session, setSession] = useState<Expedition | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const plan = expeditionFromPlan(draft);
  function launch(expedition: Expedition, button: HTMLButtonElement) {
    opener.current = button;
    setSession(expedition);
  }
  return (
    <section
      id="expedition-game"
      className="expedition-launcher"
      aria-label="Rover expedition game"
    >
      <div>
        <p className="eyebrow">MISSION CONTROL, MEET PLAYTIME.</p>
        <h2>Your plan. Six wheels. A whole lot of Mars.</h2>
        <p>
          Take the wheel, follow the beacons and scan every checkpoint. Then
          find your way home.
        </p>
        <p className="game-disclaimer">
          Arcade rover · fictional 3D terrain · compressed distances
        </p>
        <div className="expedition-launch-actions">
          <button
            disabled={!plan}
            onClick={(event) => {
              if (plan) launch(plan, event.currentTarget);
            }}
          >
            Drive my plan ↗
          </button>
          <button
            onClick={(event) =>
              launch(practiceExpedition(), event.currentTarget)
            }
          >
            Start practice mission
          </button>
        </div>
        <p className="game-plan-status">
          {plan
            ? `${draft.stops.length} destination${draft.stops.length === 1 ? '' : 's'} ready, in your planned order. Return to base included.`
            : 'To drive your plan, set a base and add at least one destination above. Practice is ready now.'}
        </p>
      </div>
      <div className="expedition-ticket" aria-hidden="true">
        <span>BOARDING PASS / MARSWAY</span>
        <strong>
          LET’S
          <br />
          GET DUSTY.
        </strong>
        <small>DRIVE → DISCOVER → RETURN</small>
        <div className="ticket-wheels">● ● ●</div>
      </div>
      {session && (
        <GameSession
          expedition={session}
          onClose={() => {
            setSession(null);
            opener.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </section>
  );
}

function GameSession({
  expedition,
  onClose,
}: {
  expedition: Expedition;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<DriveInput>(emptyInput());
  const rover = useRef(initialRover(expedition));
  const pausedRef = useRef(false);
  const assistRef = useRef(false);
  const [hud, setHud] = useState<RoverState>(rover.current);
  const [paused, setPaused] = useState(false);
  const [assist, setAssist] = useState(false);
  const [failure, setFailure] = useState('');
  const [restart, setRestart] = useState(0);
  const [journal, setJournal] = useState<string[]>([]);
  const target = expedition.points[hud.target];
  const totalScans = expedition.points.length - 2;
  const ready = hud.phase === 'arrived';
  const complete = hud.phase === 'complete';
  function closeGame() {
    dialog.current?.close();
    onClose();
  }
  function pause(value: boolean) {
    pausedRef.current = value;
    setPaused(value);
    controls.current = emptyInput();
  }
  function scan() {
    if (pausedRef.current || rover.current.phase !== 'arrived') return;
    const name = expedition.points[rover.current.target].name;
    rover.current = scanCheckpoint(rover.current);
    setHud({ ...rover.current });
    setJournal((previous) => [...previous, name]);
    canvas.current?.focus();
  }
  const scanRef = useRef(scan);
  scanRef.current = scan;
  useEffect(() => {
    dialog.current?.showModal();
    canvas.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let draw: ReturnType<typeof createExpeditionRenderer>;
    try {
      draw = createExpeditionRenderer(element);
    } catch (error) {
      setFailure((error as Error).message);
      return;
    }
    let frame = 0,
      previous = 0,
      published = 0,
      elapsed = 0,
      drawnWidth = 0,
      drawnHeight = 0;
    let drawnPhase = '';
    const tick = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.5) : 0;
      previous = now;
      if (!pausedRef.current && !document.hidden) {
        elapsed += dt;
        const oldPhase = rover.current.phase;
        // Small simulation steps preserve steering and checkpoint detection
        // when a slower device draws fewer frames.
        for (let remaining = dt; remaining > 0; remaining -= 0.05) {
          rover.current = stepRover(
            rover.current,
            controls.current,
            Math.min(remaining, 0.05),
            expedition,
            assistRef.current,
          );
        }
        if (now - published > 100 || oldPhase !== rover.current.phase) {
          setHud({ ...rover.current });
          published = now;
        }
      }
      if (
        (!pausedRef.current && rover.current.phase !== 'complete') ||
        drawnPhase !== rover.current.phase ||
        drawnWidth !== element.clientWidth ||
        drawnHeight !== element.clientHeight
      ) {
        draw(rover.current, expedition, elapsed);
        drawnWidth = element.clientWidth;
        drawnHeight = element.clientHeight;
        drawnPhase = rover.current.phase;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [expedition, restart]);
  useEffect(() => {
    function stopInput() {
      controls.current = emptyInput();
    }
    function suspend() {
      stopInput();
      pausedRef.current = true;
      setPaused(true);
    }
    function visibility() {
      if (document.hidden) suspend();
    }
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  function key(event: React.KeyboardEvent<HTMLCanvasElement>, down: boolean) {
    const keys: Record<string, keyof DriveInput> = {
      w: 'forward',
      arrowup: 'forward',
      s: 'reverse',
      arrowdown: 'reverse',
      a: 'left',
      arrowleft: 'left',
      d: 'right',
      arrowright: 'right',
    };
    const pressed = event.key.toLowerCase();
    const direction = keys[pressed];
    if (direction) {
      event.preventDefault();
      controls.current[direction] = down;
    } else if (pressed === ' ') {
      event.preventDefault();
      if (down && !event.repeat) scanRef.current();
    } else if (pressed === 'p' && down && !event.repeat)
      pause(!pausedRef.current);
  }
  function reset() {
    rover.current = initialRover(expedition);
    controls.current = emptyInput();
    setHud({ ...rover.current });
    setJournal([]);
    pause(false);
    assistRef.current = false;
    setAssist(false);
    setRestart((value) => value + 1);
    canvas.current?.focus();
  }
  return (
    <dialog
      ref={dialog}
      className="expedition-dialog"
      aria-labelledby="game-title"
      onCancel={(event) => {
        event.preventDefault();
        closeGame();
      }}
    >
      <header className="game-header">
        <div>
          <p className="eyebrow">
            {expedition.kind === 'plan'
              ? 'YOUR PLAN / ARCADE EXPEDITION'
              : 'PRACTICE / FICTIONAL DESTINATIONS'}
          </p>
          <h2 id="game-title">Mars, here we roam.</h2>
        </div>
        <button onClick={closeGame} aria-label="Close expedition game">
          Back to planning ✕
        </button>
      </header>
      <div className="game-hud">
        <div>
          <small>
            {complete
              ? 'EXPEDITION COMPLETE'
              : `CHECKPOINT ${hud.target} / ${expedition.points.length - 1}`}
          </small>
          <strong>{complete ? 'Home, dusty home!' : target.name}</strong>
        </div>
        <div>
          <small>DISCOVERIES</small>
          <strong>
            {hud.scans} / {totalScans}
          </strong>
        </div>
        <div>
          <small>ROVER</small>
          <strong>{Math.abs(hud.speed).toFixed(0)} game u/s</strong>
        </div>
      </div>
      <div className="game-viewport">
        <canvas
          ref={canvas}
          tabIndex={0}
          aria-label="3D rover driving scene. Use W A S D or arrow keys to drive, Space to scan, P to pause."
          onKeyDown={(event) => key(event, true)}
          onKeyUp={(event) => key(event, false)}
          onBlur={() => {
            controls.current = emptyInput();
          }}
          data-phase={hud.phase}
          data-x={hud.x.toFixed(2)}
          data-z={hud.z.toFixed(2)}
        />
        <div className="game-scene-tag">
          FICTIONAL TERRAIN / SCHEMATIC ROUTE
        </div>
        {failure && (
          <div className="game-overlay" role="alert">
            <h3>Could not start the scene</h3>
            <p>{failure}</p>
            <button onClick={closeGame}>Return to planner</button>
          </div>
        )}
        {paused && !failure && (
          <div className="game-overlay">
            <p className="eyebrow">TAKE A BREATHER</p>
            <h3>Mars can wait.</h3>
            <button
              onClick={() => {
                pause(false);
                canvas.current?.focus();
              }}
            >
              Resume driving
            </button>
          </div>
        )}
        {complete && !paused && (
          <div className="game-overlay" role="status">
            <p className="eyebrow">ALL CHECKPOINTS. ALL THE WAY HOME.</p>
            <h3>One dusty adventure, complete.</h3>
            <p>{hud.scans} discoveries logged in this game.</p>
            <button onClick={reset}>Drive it again</button>
          </div>
        )}
        {!paused && !complete && !failure && (
          <div
            className="drive-pad"
            role="group"
            aria-label="Touch driving controls"
          >
            {(['left', 'forward', 'reverse', 'right'] as const).map(
              (direction) => (
                <button
                  key={direction}
                  aria-label={`Drive ${direction}`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    controls.current[direction] = true;
                  }}
                  onPointerUp={() => {
                    controls.current[direction] = false;
                  }}
                  onPointerCancel={() => {
                    controls.current[direction] = false;
                  }}
                  onLostPointerCapture={() => {
                    controls.current[direction] = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      controls.current[direction] = true;
                    }
                  }}
                  onKeyUp={() => {
                    controls.current[direction] = false;
                  }}
                  onBlur={() => {
                    controls.current[direction] = false;
                  }}
                >
                  {
                    { left: '↶', forward: '↑', reverse: '↓', right: '↷' }[
                      direction
                    ]
                  }
                </button>
              ),
            )}
          </div>
        )}
      </div>
      <div className="game-objective" role="status">
        <span aria-hidden="true">{complete ? '✦' : ready ? '◎' : '➜'}</span>
        <div>
          <strong>
            {complete
              ? 'Expedition complete. Your original plan is ready for another adventure.'
              : ready
                ? `You made it to ${target.name}.`
                : `Follow the gold trail to ${target.name}.`}
          </strong>
          <p>
            {ready
              ? target.tasks[0] || 'Look around and record your discovery.'
              : complete
                ? 'Game scans are separate from the planner’s task checklists.'
                : `${Math.ceil(targetDistance(hud, expedition))} game units to go · ${assist ? 'Route assist on. Steer to take over.' : 'WASD / arrows to drive. Space to scan. P to pause.'}`}
          </p>
        </div>
        <button disabled={!ready || paused} onClick={scan}>
          Scan checkpoint {ready ? '✦' : ''}
        </button>
      </div>
      <div className="game-actions">
        <button
          disabled={complete || !!failure}
          onClick={() => {
            pause(!paused);
            canvas.current?.focus();
          }}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          aria-pressed={assist}
          disabled={complete || !!failure}
          onClick={() => {
            assistRef.current = !assist;
            setAssist(!assist);
            canvas.current?.focus();
          }}
        >
          Route assist: {assist ? 'on' : 'off'}
        </button>
        <button onClick={reset}>Restart expedition</button>
        <span>
          Fictional terrain and arcade motion; no real rover capability or route
          validation.
        </span>
      </div>
      <details className="game-journal">
        <summary>Expedition journal · {journal.length} discoveries</summary>
        {journal.length ? (
          <ol>
            {journal.map((name, index) => (
              <li key={index}>✦ {name} — game scan recorded</li>
            ))}
          </ol>
        ) : (
          <p>
            Your first discovery is out there. Drive to a beacon and scan it.
          </p>
        )}
      </details>
    </dialog>
  );
}
