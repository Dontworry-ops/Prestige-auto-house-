import { useEffect, useRef, useState } from 'react';

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
  getMatrix: (id: number, cb: (error: unknown, matrix: number[]) => void) => void;
  translate: (id: number, point: number[], options: { duration: number }) => void;
  rotate: (id: number, angleAndAxis: number[], options: { duration: number }) => void;
  setBackground: (options: { color: number[] }) => void;
  setUserInteraction?: (enabled: boolean) => void;
  recenterCamera: (cb?: (error: unknown) => void) => void;
  setFov: (degrees: number) => void;
};
type SketchfabConstructor = new (version: string, iframe: HTMLIFrameElement) => {
  init: (uid: string, config: Record<string, unknown>) => void;
};
type Props = { scrollProgress: number; onFailure: () => void; onLoaded?: () => void };
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const circle = (p: number) => {
  const phase = clamp(p / .59);
  const a = phase * Math.PI * 2;
  if (p <= .59) {
    return { x: Math.cos(a) - 1, y: Math.sin(a), yaw: a + Math.PI * .5 };
  }
  const t = clamp((p - .59) / .27);
  return { x: Math.sin(t * Math.PI) * .1, y: t * -2.4, yaw: Math.PI * 2.5 + t * .25 };
};
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

export default function PrestigeSketchfabMercedes({ scrollProgress, onFailure, onLoaded }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(scrollProgress);
  const failureRef = useRef(onFailure);
  const loadedRef = useRef(onLoaded);
  const viewerRef = useRef<ViewerApi | null>(null);
  const cameraRef = useRef<CameraPose | null>(null);
  const nodeIdRef = useRef<number | null>(null);
  const originalPositionRef = useRef<number[] | null>(null);
  const lastSentRef = useRef(0);
  const lastProgressSentRef = useRef(-100);
  const [state, setState] = useState<'loading' | 'ready' | 'slow' | 'error'>('loading');

  useEffect(() => { progressRef.current = scrollProgress; }, [scrollProgress]);
  useEffect(() => { failureRef.current = onFailure; loadedRef.current = onLoaded; }, [onFailure, onLoaded]);

  // Deterministic tyre-dust path in the screen plane. The real Mercedes remains
  // 3D inside the official model viewer; this canvas is only smoke compositing.
  useEffect(() => {
    const canvas = dustRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const bw = Math.max(1, Math.round(w * ratio));
    const bh = Math.max(1, Math.round(h * ratio));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const p = scrollProgress;
    if (p <= .012) return;
    const radius = Math.min(w * .175, h * .24);
    const centerX = w * .52;
    const centerY = h * .53;
    const samples = Math.floor(Math.min(p / .59, 1) * 115);
    for (let i = 0; i < samples; i += 1) {
      const a = (i / 114) * Math.PI * 2 - Math.PI / 2;
      const age = samples - i;
      const drift = age * .44;
      const x = centerX + radius * Math.cos(a) + Math.sin(i * 27.23) * drift;
      const y = centerY + radius * Math.sin(a) - drift * .33;
      const r = 15 + age * .36;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, 'rgba(255,222,179,.15)');
      g.addColorStop(.52, 'rgba(240,208,169,.08)');
      g.addColorStop(1, 'rgba(231,196,151,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
    if (p > .59) {
      const drive = clamp((p - .59) / .27);
      for (let i = 0; i < 35; i++) {
        const t = i / 34;
        const x = centerX + Math.sin(i * 13.7) * 37 + t * w * .32;
        const y = centerY - radius - drive * t * h * .51;
        const r = 30 + t * 68;
        const g = ctx.createRadialGradient(x,y,1,x,y,r);
        g.addColorStop(0,'rgba(253,230,190,.12)');
        g.addColorStop(1,'rgba(232,203,171,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x-r,y-r,r*2,r*2);
      }
    }
  }, [scrollProgress]);

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
      if (progressChanged && now - lastSentRef.current >= 125 && !document.hidden) {
        lastProgressSentRef.current = progressRef.current;
        lastSentRef.current = now;
        const api = viewerRef.current;
        const p = progressRef.current;
        const c = circle(p);
        const camera = cameraRef.current;
        if (camera) {
          const t = camera.target;
          const dx = camera.position[0] - t[0];
          const dy = camera.position[1] - t[1];
          const dz = camera.position[2] - t[2];
          const distance = Math.max(2, Math.hypot(dx,dy,dz));
          const radius = Math.min(2.25, Math.max(.25, distance * .12));
          const id = nodeIdRef.current;
          const original = originalPositionRef.current;
          if (id !== null && original) {
            api.translate(id, [original[0] + c.x * radius, original[1] + c.y * radius, original[2]], { duration: 0 });
            api.rotate(id, [c.yaw, 0, 0, 1], { duration: 0 });
            // Leave room for the ENTIRE car: no more close-up of just the roof.
            const follow = clamp((p - .59) / .27);
            const target = [t[0], t[1] - follow * radius * .7, t[2]];
            api.setCameraLookAt(
              [target[0] + distance * .18, target[1] - distance * .22, target[2] + distance * 1.42],
              target,
              0.15
            );
          } else {
            // Non-editable Sketchfab scene: orbit a wide overhead camera.
            const orbit = -Math.PI / 2 + clamp(p / .59) * Math.PI * 2;
            api.setCameraLookAt(
              [t[0] + Math.cos(orbit) * distance * .56, t[1] + Math.sin(orbit) * distance * .56, t[2] + distance * 1.42],
              t, .14
            );
          }
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
                const base = Math.max(.9, Math.hypot(
                  camera.position[0] - camera.target[0],
                  camera.position[1] - camera.target[1],
                  camera.position[2] - camera.target[2]
                ));
                // Store the original fitted distance, not the wide shot's
                // distance. Otherwise each scroll update zooms out a second time.
                cameraRef.current = {
                  position: [...camera.position],
                  target: [...camera.target],
                };
                api.setFov(43);
                api.setCameraLookAt(
                  [camera.target[0] + base * .18, camera.target[1] - base * .22, camera.target[2] + base * 1.42],
                  camera.target,
                  .15
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
                if (error || !Array.isArray(matrix) || matrix.length < 16) return;
                nodeIdRef.current = root.instanceID as number;
                originalPositionRef.current = [matrix[12],matrix[13],matrix[14]];
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
