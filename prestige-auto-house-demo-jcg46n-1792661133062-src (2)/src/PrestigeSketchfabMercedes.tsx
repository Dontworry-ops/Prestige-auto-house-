import { useEffect, useRef, useState, type RefObject } from 'react';
import { Matrix4, Vector3 } from 'three';

/**
 * The user's exact, CC BY 4.0 Mercedes-AMG GT3 Evo model,
 * hosted by the original uploader rather than substituting another vehicle.
 * GLB source metadata: vecarz / Sketchfab, model 39e77243109f4e5cb7134b6f31c8f619.
 *
 * Sketchfab Viewer API controls actual scene transform/camera in browser.
 * This route requires no binary re-upload to Vercel.
 */
const ORIGINAL_UID = '39e77243109f4e5cb7134b6f31c8f619';
type SceneNode = { instanceID?: number; name?: string; type?: string };
type CameraPose = { position: number[]; target: number[] };
type ViewerApi = {
  start: () => void;
  stop?: () => void;
  addEventListener: (name: string, fn: () => void) => void;
  removeEventListener?: (name: string, fn: () => void) => void;
  getCameraLookAt: (cb: (error: unknown, camera: CameraPose) => void) => void;
  setCameraLookAt: (position: number[], target: number[], duration?: number) => void;
  getNodeMap: (cb: (error: unknown, nodes: SceneNode[] | Record<string, SceneNode>) => void) => void;
  getMatrix: (id: number, cb: (error: unknown, matrix: ArrayLike<number>) => void) => void;
  setMatrix: (id: number, matrix: number[], callback?: (error: unknown) => void) => void;
  setBackground: (options: { color: number[] }) => void;
  setUserInteraction?: (enabled: boolean) => void;
  recenterCamera: (cb?: (error: unknown) => void) => void;
  setFov: (degrees: number) => void;
};
type SketchfabConstructor = new (version: string, iframe: HTMLIFrameElement) => {
  init: (uid: string, config: Record<string, unknown>) => void;
};
type Props = { progressRef: RefObject<number>; onFailure: () => void; onLoaded?: () => void };
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
// The Mercedes is 4.65 m long and points along its local +X axis.
// Drift = translation along a real circle + its heading roughly tangent to the
// circle, with a 20-degree slip angle. Never move the entire viewer/iframe.
const CIRCLE_END = .59;
const ESCAPE_END = .86;
const SLIP_ANGLE = 20 * Math.PI / 180;
const circleRadius = (mobile: boolean) => mobile ? 1.0 : 1.6;
const stageDistance = (mobile: boolean) => mobile ? 20 : 15.2;
const smoothstep = (x: number) => { const p = clamp(x); return p * p * (3 - 2 * p); };

function driftPose(progress: number, radius: number) {
  const p = clamp(progress);
  if (p <= CIRCLE_END) {
    const theta = p / CIRCLE_END * Math.PI * 2;
    return {
      x: radius * (Math.cos(theta) - 1),
      y: radius * Math.sin(theta),
      // Slip the nose inward rather than spinning on the centre point.
      yaw: theta + Math.PI / 2 - SLIP_ANGLE,
    };
  }
  const t = clamp((p - CIRCLE_END) / (ESCAPE_END - CIRCLE_END));
  return {
    // Exit tangentially from the completed circle, accelerating forward.
    x: 0,
    y: 11 * t * t,
    yaw: Math.PI * 2.5 - SLIP_ANGLE * (1 - smoothstep(t)),
  };
}
let sharedScript: Promise<void> | undefined;
function loadSketchfabScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No browser'));
  const existing = (window as unknown as { Sketchfab?: SketchfabConstructor }).Sketchfab;
  if (existing) return Promise.resolve();
  if (sharedScript) return sharedScript;
  sharedScript = new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
    element.async = true;
    element.onload = () => resolve();
    element.onerror = () => reject(new Error('Sketchfab 3D Viewer API failed to load'));
    document.head.appendChild(element);
  });
  return sharedScript;
}

export default function PrestigeSketchfabMercedes({ progressRef, onFailure, onLoaded }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const failureRef = useRef(onFailure);
  const loadedRef = useRef(onLoaded);
  const viewerRef = useRef<ViewerApi | null>(null);
  const cameraRef = useRef<CameraPose | null>(null);
  const nodeIdRef = useRef<number | null>(null);
  const baseMatrixRef = useRef<Matrix4 | null>(null);
  const pivotRef = useRef<Vector3 | null>(null);
  const lastSentRef = useRef(0);
  const lastProgressSentRef = useRef(-100);
  const [state, setState] = useState<'loading' | 'ready' | 'slow' | 'error'>('loading');

  useEffect(() => { failureRef.current = onFailure; loadedRef.current = onLoaded; }, [onFailure, onLoaded]);

  // Lightweight smoke is drawn directly from a stable scroll ref.
  // Never allocate gradients or rerender React components on each scroll event.
  useEffect(() => {
    const canvas = dustRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 96;
    const spriteCtx = sprite.getContext('2d');
    if (spriteCtx) {
      const fog = spriteCtx.createRadialGradient(48, 48, 0, 48, 48, 48);
      fog.addColorStop(0, 'rgba(250,225,194,.42)');
      fog.addColorStop(.55, 'rgba(240,214,175,.19)');
      fog.addColorStop(1, 'rgba(240,214,175,0)');
      spriteCtx.fillStyle = fog;
      spriteCtx.fillRect(0, 0, 96, 96);
    }

    let frame = 0;
    let lastDrawAt = 0;
    let lastProgress = -1;
    let visible = true;
    const observer = new IntersectionObserver(entries => {
      visible = Boolean(entries[0]?.isIntersecting);
    }, { threshold: 0 });
    observer.observe(canvas);

    const paint = (now: number) => {
      frame = window.requestAnimationFrame(paint);
      if (!visible || document.hidden || now - lastDrawAt < 65) return;
      const p = progressRef.current;
      if (Math.abs(p - lastProgress) < .002) return;
      lastProgress = p;
      lastDrawAt = now;

      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      // A 1x overlay is enough for soft smoke and avoids high-DPI GPU work.
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      if (p < .018) return;

      const mobile = w < 700;
      const radius = circleRadius(mobile);
      const distance = stageDistance(mobile);
      const pxPerMetre = h / (2 * distance * Math.tan(43 * Math.PI / 360));
      const centerX = w * .5;
      const centerY = h * .53;
      const count = Math.min(75, Math.ceil(p / ESCAPE_END * 75));
      for (let i = 0; i < count; i++) {
        const trailP = i / 74 * ESCAPE_END;
        if (trailP >= p) break;
        const age = p - trailP;
        if (age > .38) continue;
        const pose = driftPose(trailP, radius);
        const drift = age * 35;
        const x = centerX + (pose.x + radius) * pxPerMetre + Math.sin(i * 7.7) * drift;
        const y = centerY - pose.y * pxPerMetre + Math.cos(i * 13.2) * drift;
        const size = 24 + age * 120;
        ctx.globalAlpha = Math.max(0, .72 * (1 - age / .38));
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };
    frame = window.requestAnimationFrame(paint);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [progressRef]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const iframe = iframeRef.current;
    if (!iframe) return;
    let ready = false;
    // A slow third-party model download is not an error; keep it loading.
    const timeout = window.setTimeout(() => {
      if (!ready && !cancelled) setState('slow');
    }, 14500);

    const tick = () => {
      if (cancelled || !ready || !viewerRef.current) return;
      const now = performance.now();
      const progressChanged = Math.abs(progressRef.current - lastProgressSentRef.current) > .003;
      if (progressChanged && now - lastSentRef.current >= 75 && !document.hidden) {
        lastProgressSentRef.current = progressRef.current;
        lastSentRef.current = now;
        const api = viewerRef.current;
        const p = progressRef.current;
        const mobile = window.innerWidth < 700;
        const radius = circleRadius(mobile);
        const pose = driftPose(p, radius);
        if (cameraRef.current) {
          // Keep the camera stationary: the 3D vehicle moves in the scene,
          // not the renderer. Camera orbit would make it look as if the car
          // simply spun or if the whole desert were sliding beneath it.
          const id = nodeIdRef.current;
          const baseMatrix = baseMatrixRef.current;
          const pivot = pivotRef.current;
          if (id !== null && baseMatrix && pivot) {
            // One atomic transform per frame. Move and rotate the car about
            // its TRUE centre, instead of letting two separate viewer calls
            // fight each other or rotating the mesh around the world's origin.
            const matrix = new Matrix4()
              .makeTranslation(pivot.x + pose.x, pivot.y + pose.y, pivot.z)
              .multiply(new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), pose.yaw))
              .multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))
              .multiply(baseMatrix);
            api.setMatrix(id, matrix.toArray());
          }
          // If the third-party viewer offers no editable root transform,
          // preserve the actual model without inventing motion via camera or iframe.
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    void loadSketchfabScript().then(() => {
      if (cancelled) return;
      const Sketchfab = (window as unknown as { Sketchfab?: SketchfabConstructor }).Sketchfab;
      if (!Sketchfab) throw new Error('Sketchfab API not present');
      const client = new Sketchfab('1.12.1', iframe);
      client.init(ORIGINAL_UID, {
        autostart: 1,
        camera: 0,
        scrollwheel: 0,
        ui_hint: 0,
        ui_stop: 0,
        dnt: 1,
        preload: 0,
        max_texture_size: window.innerWidth < 720 ? 512 : 1024,
        success: (api: ViewerApi) => {
          if (cancelled) return;
          viewerRef.current = api;
          api.addEventListener('viewerready', () => {
            if (cancelled) return;
            ready = true;
            window.clearTimeout(timeout);
            api.setBackground({ color: [0.54, .34, .25] });
            api.setUserInteraction?.(false);
            // Fit the entire model before switching to the wide overhead shot.
            api.recenterCamera(() => {
              if (cancelled) return;
              api.getCameraLookAt((err, camera) => {
                if (err || !camera?.position || !camera?.target) return;
                const mobile = window.innerWidth < 700;
                const distance = stageDistance(mobile);
                const radius = circleRadius(mobile);
                // The fitted target is our pivot. It doesn't move with the camera.
                cameraRef.current = {
                  position: [...camera.position],
                  target: [...camera.target],
                };
                pivotRef.current = new Vector3(camera.target[0], camera.target[1], camera.target[2]);
                api.setFov(43);
                // Aim at the centre of the donut, not where the car started.
                const target = [camera.target[0] - radius, camera.target[1], camera.target[2]];
                api.setCameraLookAt(
                  [target[0] + distance * .10, target[1] - distance * .10, target[2] + distance],
                  target,
                  .28
                );
              });
            });
            api.getNodeMap((err, values) => {
              if (err || !values) return;
              const nodes = (Array.isArray(values) ? values : Object.values(values)) as SceneNode[];
              const candidates = nodes.filter(n => n.type === 'MatrixTransform' && typeof n.instanceID === 'number');
              const root =
                candidates.find(n => /^Sketchfab_model$/i.test(n.name || '')) ||
                candidates.find(n => /^root$/i.test(n.name || '')) ||
                candidates.find(n => /^Sketchfab_model/i.test(n.name || '')) ||
                candidates[0];
              if (!root || typeof root.instanceID !== 'number') return;
              api.getMatrix(root.instanceID, (error, matrix) => {
                if (error || !matrix || matrix.length < 16) return;
                nodeIdRef.current = root.instanceID as number;
                baseMatrixRef.current = new Matrix4().fromArray(Array.from(matrix));
              });
            });
            setState('ready');
            loadedRef.current?.();
            raf = window.requestAnimationFrame(tick);
          });
          api.start();
        },
        error: () => {
          if (cancelled) return;
          window.clearTimeout(timeout);
          setState('error');
        },
      });
    }).catch(error => {
      if (cancelled) return;
      console.warn('Original Mercedes Sketchfab 3D viewer unavailable', error);
      window.clearTimeout(timeout);
      setState('error');
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(raf);
      viewerRef.current?.stop?.();
      viewerRef.current = null;
      cameraRef.current = null;
      // React removes the iframe; forcing about:blank caused extra navigation.
    };
  }, []);

  // The iframe is a fixed stage; it must never drift out of the browser.
  // All real movement is applied to the model node through Sketchfab's API.
  // The whole circular path stays within the fixed 3D viewport.
  const stageScale = 1;

  return (
    <div className="prestige-desert-scene prestige-desert-sketchfab">
      <div className="prestige-desert-remote-background" aria-hidden="true" />
      <div
        className="prestige-desert-original-preview"
        role="img"
        aria-label="Official preview of the original Mercedes-AMG GT3 Evo 3D car"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(10,9,8,.04), rgba(10,9,8,.52)), url('https://media.sketchfab.com/models/39e77243109f4e5cb7134b6f31c8f619/thumbnails/cfd08577556742aa90fe0ecd46bb9152/98d37ec379194272ba0b95b307206db4.jpeg')" }}
      />
      <iframe
        ref={iframeRef}
        className={state === 'error' ? 'prestige-desert-sketchfab-frame viewer-unavailable' : 'prestige-desert-sketchfab-frame'}
        style={{ transform: `scale(${stageScale})` }}
        title="Original Mercedes-AMG GT3 Evo 3D car model by vecarz"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <canvas className="prestige-desert-tire-smoke" ref={dustRef} aria-hidden="true" />
      {state === 'error' && (
        <div className="prestige-desert-viewer-note" role="status">
          Your original Mercedes-AMG GT3 is here, but this browser could not start the 3D viewer.
          <span><a href="https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619" target="_blank" rel="noopener noreferrer">View the original model in 3D</a>, or choose WATCH FILM above.</span>
        </div>
      )}
      {(state === 'loading' || state === 'slow') && (
        <div className="prestige-desert-loading" role="status">
          <span className="prestige-desert-loading-mark">P.</span>
          <strong>{state === 'slow' ? 'THE 3D MODEL IS STILL LOADING' : 'PREPARING YOUR ORIGINAL MERCEDES-AMG GT3'}</strong>
          <small>{state === 'slow' ? 'This full-detail model is large. WATCH FILM is available while it loads.' : 'Preparing geometry and textures…'}</small>
          <span className="prestige-desert-loading-line"><i /></span>
        </div>
      )}
      <span className="prestige-desert-asset-credit">
        Mercedes-AMG GT3 Evo model by{' '}
        <a href="https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619"
          target="_blank" rel="noopener noreferrer">
          vecarz / Sketchfab
        </a>{' '}· CC BY 4.0
      </span>
    </div>
  );
}
