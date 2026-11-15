import { terrainHeight, type Expedition, type RoverState } from './expedition';

type Vec3 = [number, number, number];
type Projected = { x: number; y: number; depth: number };
interface Face {
  points: Projected[];
  depth: number;
  colour: string;
}
const earth = [
  '#a95740',
  '#b46447',
  '#c07451',
  '#ae6045',
  '#c47b56',
  '#bd6b49',
];

export function createExpeditionRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context)
    throw new Error('Canvas rendering is unavailable in this browser.');
  const ctx = context;
  return (state: RoverState, expedition: Expedition, elapsed: number) => {
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    if (
      canvas.width !== Math.round(width * ratio) ||
      canvas.height !== Math.round(height * ratio)
    ) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    sky.addColorStop(0, '#27213e');
    sky.addColorStop(0.55, '#b16a73');
    sky.addColorStop(1, '#e5aa79');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffe1a2';
    ctx.beginPath();
    ctx.arc(width * 0.79, height * 0.18, height * 0.047, 0, Math.PI * 2);
    ctx.fill();
    // Distant silhouettes shift with heading, independently of the near mesh.
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? '#9a5f65' : '#8a5968';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width + 20; x += 20) {
        const wave = (x / width) * 8 + state.heading * 0.8 + layer;
        ctx.lineTo(
          x,
          height * (0.34 + layer * 0.06) -
            Math.abs(Math.sin(wave) * Math.cos(wave * 1.8)) * height * 0.13,
        );
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }
    const sin = Math.sin(state.heading),
      cos = Math.cos(state.heading);
    const roverY = terrainHeight(state.x, state.z);
    const camera: Vec3 = [state.x - sin * 19, roverY + 11, state.z - cos * 19];
    const pitch = 0.3,
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    const focal = Math.min(width * 0.85, height * 1.25);
    function project([x, y, z]: Vec3): Projected {
      const dx = x - camera[0],
        dy = y - camera[1],
        dz = z - camera[2];
      const forward = dx * sin + dz * cos;
      const depth = forward * cp - dy * sp;
      return {
        x: width / 2 + ((dx * cos - dz * sin) * focal) / depth,
        y: height * 0.47 - ((dy * cp + forward * sp) * focal) / depth,
        depth,
      };
    }
    const faces: Face[] = [];
    function polygon(points: Vec3[], colour: string) {
      const screen = points.map(project);
      if (
        screen.some((p) => p.depth < 0.8) ||
        screen.every((p) => p.x < -width) ||
        screen.every((p) => p.x > width * 2) ||
        screen.every((p) => p.y < -height)
      )
        return;
      faces.push({
        points: screen,
        depth: screen.reduce((sum, p) => sum + p.depth, 0) / screen.length,
        colour,
      });
    }
    function box(
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      heading: number,
      colours: [string, string, string],
    ) {
      const c = Math.cos(heading),
        s = Math.sin(heading);
      const point = (a: number, b: number, e: number): Vec3 => [
        x + a * c + e * s,
        y + b,
        z - a * s + e * c,
      ];
      const v = [
        point(-w / 2, 0, -d / 2),
        point(w / 2, 0, -d / 2),
        point(w / 2, 0, d / 2),
        point(-w / 2, 0, d / 2),
        point(-w / 2, h, -d / 2),
        point(w / 2, h, -d / 2),
        point(w / 2, h, d / 2),
        point(-w / 2, h, d / 2),
      ];
      polygon([v[0], v[1], v[5], v[4]], colours[0]);
      polygon([v[2], v[3], v[7], v[6]], colours[0]);
      polygon([v[1], v[2], v[6], v[5]], colours[1]);
      polygon([v[3], v[0], v[4], v[7]], colours[1]);
      polygon([v[4], v[5], v[6], v[7]], colours[2]);
    }
    const cell = 12,
      radius = width < 600 ? 10 : 13;
    const centreX = Math.floor(state.x / cell),
      centreZ = Math.floor(state.z / cell);
    for (let iz = -radius; iz < radius; iz++) {
      for (let ix = -radius; ix < radius; ix++) {
        const x = (centreX + ix) * cell,
          z = (centreZ + iz) * cell;
        const a: Vec3 = [x, terrainHeight(x, z), z];
        const b: Vec3 = [x + cell, terrainHeight(x + cell, z), z];
        const c: Vec3 = [x + cell, terrainHeight(x + cell, z + cell), z + cell];
        const d: Vec3 = [x, terrainHeight(x, z + cell), z + cell];
        const colour =
          Math.abs((centreX + ix) * 7 + (centreZ + iz) * 13) % earth.length;
        polygon([a, b, c], earth[colour]);
        polygon([a, c, d], earth[(colour + 1) % earth.length]);
      }
    }
    // Chunky scattered rocks have stable world positions while the rover moves.
    for (let iz = -4; iz <= 4; iz++)
      for (let ix = -4; ix <= 4; ix++) {
        const gx = Math.floor(state.x / 24) + ix,
          gz = Math.floor(state.z / 24) + iz;
        const seed = Math.abs(Math.sin(gx * 127.1 + gz * 311.7));
        const x = gx * 24 + seed * 16,
          z = gz * 24 + seed * 11;
        if (expedition.points.some((p) => Math.hypot(p.x - x, p.z - z) < 14))
          continue;
        box(
          x,
          terrainHeight(x, z) - 0.2,
          z,
          1 + seed * 3,
          0.7 + seed * 1.8,
          1 + seed * 2,
          seed * 4,
          ['#824837', '#9b573d', '#c38a60'],
        );
      }
    const start = expedition.points[state.target - 1],
      target = expedition.points[state.target];
    const legLength = Math.hypot(target.x - start.x, target.z - start.z);
    for (let step = 0; step <= Math.min(60, legLength / 4); step++) {
      const t = step / Math.max(1, Math.min(60, legLength / 4));
      const x = start.x + (target.x - start.x) * t,
        z = start.z + (target.z - start.z) * t;
      const y = terrainHeight(x, z) + 0.15;
      polygon(
        [
          [x - 0.65, y, z - 0.65],
          [x + 0.65, y, z - 0.65],
          [x + 0.65, y, z + 0.65],
          [x - 0.65, y, z + 0.65],
        ],
        '#ffda82',
      );
    }
    expedition.points.slice(0, -1).forEach((p, index) => {
      const y = terrainHeight(p.x, p.z);
      if (index === 0) {
        const habitatX = p.x - 14,
          habitatZ = p.z - 10;
        const habitatY = terrainHeight(habitatX, habitatZ);
        box(habitatX, habitatY, habitatZ, 7, 4, 5, 0, [
          '#c8bec0',
          '#e7dcd0',
          '#fff3dd',
        ]);
        box(habitatX - 7, habitatY + 0.3, habitatZ, 5, 0.4, 5, 0, [
          '#334264',
          '#334264',
          '#6a89b6',
        ]);
      } else {
        const active = index === state.target;
        box(p.x, y, p.z, 0.5, 9, 0.5, 0, ['#6c544e', '#8e7460', '#fce1a3']);
        box(
          p.x + 1.8,
          y + 6.5,
          p.z,
          3.6,
          2,
          0.15,
          0,
          active
            ? ['#ffc95f', '#f5a854', '#ffe3a3']
            : ['#61b6ab', '#4a8f8a', '#a8ded1'],
        );
      }
    });
    const tx = target.x,
      tz = target.z,
      ty = terrainHeight(tx, tz) + 0.3;
    const ringRadius = 9 + Math.sin(elapsed * 2) * 0.4;
    for (let i = 0; i < 32; i++) {
      const a = (i * Math.PI) / 16,
        b = ((i + 1) * Math.PI) / 16;
      const at = (angle: number, r: number): Vec3 => [
        tx + Math.sin(angle) * r,
        ty,
        tz + Math.cos(angle) * r,
      ];
      polygon(
        [
          at(a, ringRadius),
          at(b, ringRadius),
          at(b, ringRadius + 0.6),
          at(a, ringRadius + 0.6),
        ],
        '#ffe0a0',
      );
    }
    function paintFaces() {
      faces.sort((a, b) => b.depth - a.depth);
      for (const face of faces) {
        ctx.beginPath();
        face.points.forEach((p, i) =>
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
        );
        ctx.closePath();
        ctx.fillStyle = face.colour;
        ctx.fill();
        if (face.depth < 28) {
          ctx.strokeStyle = face.colour;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      faces.length = 0;
    }
    paintFaces();
    // Six wheels, a gold chassis, white instrument deck and a camera mast.
    const local = (x: number, y: number, z: number): Vec3 => [
      state.x + x * cos + z * sin,
      roverY + y,
      state.z - x * sin + z * cos,
    ];
    const roverBox = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      colours: [string, string, string],
    ) => {
      const p = local(x, y, z);
      box(...p, w, h, d, state.heading, colours);
    };
    roverBox(0, 0.8, 0, 3.5, 0.8, 4.8, ['#bc843b', '#e0aa51', '#ffe0a0']);
    roverBox(0, 1.6, 0, 3, 0.65, 3.5, ['#d8d5d3', '#e9e4de', '#fff7e6']);
    roverBox(0, 2.25, -0.5, 2.7, 0.12, 2, ['#2e3e5d', '#31425f', '#59789f']);
    for (const side of [-1, 1])
      for (const position of [-1.7, 0, 1.7])
        roverBox(side * 2, 0.1, position, 1, 1.4, 1.35, [
          '#252435',
          '#353044',
          '#514250',
        ]);
    roverBox(0.6, 2.25, 1.1, 0.22, 2.2, 0.22, [
      '#ac9c91',
      '#d1c6b5',
      '#f7ebcd',
    ]);
    roverBox(0.6, 4.25, 1.1, 1.1, 0.6, 0.65, ['#cbbdb1', '#eee7d7', '#fff7e7']);
    roverBox(0.6, 4.35, 1.47, 0.8, 0.27, 0.08, [
      '#132c42',
      '#132c42',
      '#132c42',
    ]);
    paintFaces();
    const flag = project([tx, ty + 12, tz]);
    if (
      flag.depth > 1 &&
      flag.x > 20 &&
      flag.x < width - 20 &&
      flag.y > 20 &&
      flag.y < height - 30
    ) {
      const text = `${state.target === expedition.points.length - 1 ? '⌂' : state.target} / ${target.name}`;
      ctx.font = 'bold 12px system-ui';
      const size = Math.min(width - 30, ctx.measureText(text).width + 24);
      const x = Math.max(8, Math.min(width - size - 8, flag.x - size / 2));
      ctx.fillStyle = '#262139e8';
      ctx.fillRect(x, flag.y - 18, size, 28);
      ctx.fillStyle = '#ffdf9b';
      ctx.fillText(text, x + 12, flag.y, size - 24);
    }
    // A schematic minimap keeps destinations visible even behind the camera.
    const mw = width < 600 ? 100 : 145,
      mh = 92,
      mx = width - mw - 14,
      my = 14;
    ctx.fillStyle = '#272139de';
    ctx.fillRect(mx, my, mw, mh);
    const xs = expedition.points.map((p) => p.x),
      zs = expedition.points.map((p) => p.z);
    const minX = Math.min(...xs, state.x) - 20,
      maxX = Math.max(...xs, state.x) + 20;
    const minZ = Math.min(...zs, state.z) - 20,
      maxZ = Math.max(...zs, state.z) + 20;
    const scale = Math.min(
      (mw - 24) / (maxX - minX),
      (mh - 24) / (maxZ - minZ),
    );
    const mini = (x: number, z: number) => [
      mx + 12 + (x - minX) * scale,
      my + mh - 12 - (z - minZ) * scale,
    ];
    ctx.strokeStyle = '#f3c483';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    expedition.points.forEach((p, i) => {
      const [x, y] = mini(p.x, p.z);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
    expedition.points.slice(0, -1).forEach((p, i) => {
      const [x, y] = mini(p.x, p.z);
      ctx.fillStyle = i === state.target ? '#ffdc89' : '#b2b1c4';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    const [px, py] = mini(state.x, state.z);
    ctx.fillStyle = '#8bf5df';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  };
}
