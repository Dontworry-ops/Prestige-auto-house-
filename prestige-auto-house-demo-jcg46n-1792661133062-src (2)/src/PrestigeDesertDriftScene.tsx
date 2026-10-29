import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Prestige Auto House — original storyboard:
 * sunset desert, overhead Mercedes-AMG GT3 Evo full-circle drift, drive away,
 * tyre smoke fills the picture and dissolves to the vehicle collection.
 *
 * Source asset supplied by the project owner:
 * Mercedes AMG GT3 Evo 2020 by vecarz, Sketchfab, CC BY 4.0.
 * https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619
 *
 * Model is intentionally split into 3 browser-uploadable parts (<25 MB each).
 * Never load the older mercedes-amg-gt.glb, which is CC BY-NC-SA.
 */
const MODEL_PARTS = [
  '/resources/mercedes-amg-gt3-evo.ccby.part1.bin',
  '/resources/mercedes-amg-gt3-evo.ccby.part2.bin',
  '/resources/mercedes-amg-gt3-evo.ccby.part3.bin',
] as const;

type Props = {
  scrollProgress: number;
  onFailure: () => void;
  onLoaded?: () => void;
};
type LoadState = 'waiting' | 'loading' | 'ready' | 'unavailable';

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
const CIRCLE_END = 0.59;
const STRAIGHT_END = 0.86;
const R = 2.8;

function routeAt(progress: number) {
  const p = clamp(progress);
  if (p <= CIRCLE_END) {
    const theta = (p / CIRCLE_END) * Math.PI * 2;
    return {
      x: R * Math.cos(theta),
      z: R * Math.sin(theta),
      yaw: -theta - .34,
      drift: true,
    };
  }
  const t = clamp((p - CIRCLE_END) / (STRAIGHT_END - CIRCLE_END));
  return {
    x: R + Math.sin(t * Math.PI) * .08,
    z: t * 16.5,
    yaw: -.32 * (1 - smooth(t)),
    drift: false,
  };
}

function noiseTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const r = n - Math.floor(n);
        const bands = Math.sin((x + y * .35) * .12) * 8;
        const shade = r * 20 + bands;
        const i = (y * 256 + x) * 4;
        image.data[i] = 146 + shade;
        image.data[i + 1] = 95 + shade * .8;
        image.data[i + 2] = 61 + shade * .6;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(19, 19);
  texture.anisotropy = 4;
  return texture;
}

function smokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 63);
    gradient.addColorStop(0, 'rgba(245,232,208,.75)');
    gradient.addColorStop(.25, 'rgba(228,203,163,.60)');
    gradient.addColorStop(.6, 'rgba(195,165,136,.26)');
    gradient.addColorStop(1, 'rgba(195,165,136,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

async function loadOriginalModel(signal: AbortSignal, onProgress: (n: number) => void) {
  // Fetch, rejoin and parse the original user-provided 55 MB GLB unchanged.
  // GitHub's browser upload limit is 25 MB, hence these 3 static chunks.
  const buffers: ArrayBuffer[] = [];
  let sum = 0;
  for (let i = 0; i < MODEL_PARTS.length; i++) {
    const response = await fetch(MODEL_PARTS[i], { signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('octet-stream') && response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('Original licensed Mercedes-AMG GT3 model has not been uploaded');
    }
    const bytes = await response.arrayBuffer();
    buffers.push(bytes);
    sum += bytes.byteLength;
    onProgress((i + 1) / (MODEL_PARTS.length + 1));
  }
  if (sum < 40_000_000) throw new Error('Mercedes model data incomplete');
  const joined = new Uint8Array(sum);
  let position = 0;
  for (const buffer of buffers) {
    joined.set(new Uint8Array(buffer), position);
    position += buffer.byteLength;
  }
  // Confirm this is a real GLB, not a server's HTML 404 response.
  if (new DataView(joined.buffer).getUint32(0, true) !== 0x46546c67 ||
      new DataView(joined.buffer).getUint32(8, true) !== sum) {
    throw new Error('Original Mercedes GLB is invalid or incomplete');
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress(.98);
  return new Promise<THREE.Group>((resolve, reject) => {
    new GLTFLoader().parse(joined.buffer, '', gltf => resolve(gltf.scene), reject);
  });
}

export default function PrestigeDesertDriftScene({ scrollProgress, onFailure, onLoaded }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(scrollProgress);
  const failRef = useRef(onFailure);
  const loadedRef = useRef(onLoaded);
  const [near, setNear] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('waiting');
  const [percent, setPercent] = useState(0);

  useEffect(() => { progressRef.current = scrollProgress; }, [scrollProgress]);
  useEffect(() => { failRef.current = onFailure; loadedRef.current = onLoaded; }, [onFailure, onLoaded]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) setNear(true);
    }, { rootMargin: '90% 0px', threshold: 0 });
    observer.observe(mount);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!near || !mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let camera: THREE.PerspectiveCamera;
    let car: THREE.Group | null = null;
    let active = true;
    let running = true;
    let frame = 0;
    let lastTime = 0;
    let observer: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let asset: THREE.Object3D | null = null;
    const controller = new AbortController();
    const geo: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];
    const maps: THREE.Texture[] = [];
    const puffs: THREE.Sprite[] = [];
    const smokeMat: THREE.SpriteMaterial[] = [];

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.15 : 1.55));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0x9b5f40);
      renderer.domElement.className = 'prestige-desert-canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x9a654b);
      scene.fog = new THREE.Fog(0x9a654b, 31, 85);

      camera = new THREE.PerspectiveCamera(41, 1, .1, 150);
      camera.position.set(-.8, 20.8, 9.5);
      camera.up.set(0, 0, -1);
      camera.lookAt(1.1, 0, 3.2);

      scene.add(new THREE.HemisphereLight(0xffd8aa, 0x48352e, 2.45));
      const sunset = new THREE.DirectionalLight(0xffbe7a, 3.6);
      sunset.position.set(-12, 13, -6);
      scene.add(sunset);
      const rim = new THREE.DirectionalLight(0xffe6cc, 1.7);
      rim.position.set(8, 7, 5);
      scene.add(rim);

      const sandMap = noiseTexture();
      maps.push(sandMap);
      const sand = new THREE.Mesh(
        new THREE.PlaneGeometry(180, 180, 1, 1),
        new THREE.MeshStandardMaterial({ map: sandMap, roughness: 1, metalness: 0, side: THREE.DoubleSide })
      );
      geo.push(sand.geometry);
      mats.push(sand.material as THREE.Material);
      sand.rotation.x = -Math.PI / 2;
      sand.position.y = -.32;
      scene.add(sand);

      // A warm, almost-black strip of tarmac heads toward the desert horizon.
      const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x31302d, roughness: .98 });
      mats.push(roadMaterial);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 55), roadMaterial);
      geo.push(road.geometry);
      road.rotation.x = -Math.PI / 2;
      road.position.set(R, -.275, 16.5);
      scene.add(road);

      const shoulderMaterial = new THREE.MeshBasicMaterial({ color: 0xb78360, transparent: true, opacity: .65 });
      mats.push(shoulderMaterial);
      for (const x of [R - 2.92, R + 2.92]) {
        const geometry = new THREE.PlaneGeometry(.06, 55);
        geo.push(geometry);
        const edge = new THREE.Mesh(geometry, shoulderMaterial);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(x, -.265, 16.5);
        scene.add(edge);
      }
      const skidGeometry = new THREE.RingGeometry(R - .12, R + .12, 120);
      const skidMaterial = new THREE.MeshBasicMaterial({
        color: 0x2b231f, transparent: true, opacity: .55,
        side: THREE.DoubleSide, depthWrite: false,
      });
      geo.push(skidGeometry);
      mats.push(skidMaterial);
      const skidMark = new THREE.Mesh(skidGeometry, skidMaterial);
      skidMark.rotation.x = -Math.PI / 2;
      skidMark.position.set(0, -.265, 0);
      scene.add(skidMark);

      // Dust clouds are billboarded sprites, all placed deterministically
      // along the exact drift path. Scrolling backwards rewinds cleanly.
      const smokeMap = smokeTexture();
      maps.push(smokeMap);
      for (let i = 0; i < 100; i++) {
        const material = new THREE.SpriteMaterial({
          map: smokeMap, transparent: true, opacity: 0,
          color: i % 4 === 0 ? 0xf9e4c2 : 0xe9d2b1,
          depthWrite: false,
        });
        smokeMat.push(material);
        const sprite = new THREE.Sprite(material);
        sprite.visible = false;
        scene.add(sprite);
        puffs.push(sprite);
      }

      car = new THREE.Group();
      scene.add(car);
      const shadowMap = smokeMap;
      const shadowMaterial = new THREE.SpriteMaterial({ map: shadowMap, color: 0x38251c, transparent: true, opacity: .32, depthWrite: false });
      mats.push(shadowMaterial);
      const contact = new THREE.Sprite(shadowMaterial);
      contact.scale.set(4.3, 2.4, 1);
      contact.position.y = -.19;
      car.add(contact);

      const resize = () => {
        if (!renderer || !active) return;
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < 700 ? 55 : 41;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      observer = new IntersectionObserver(entries => {
        running = Boolean(entries[0]?.isIntersecting);
      });
      observer.observe(mount);

      setLoadState('loading');
      void loadOriginalModel(controller.signal, p => { if (active) setPercent(Math.round(p * 100)); })
        .then(model => {
          if (!active || !car) return;
          asset = model;
          const bounds = new THREE.Box3().setFromObject(model);
          const dim = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const length = Math.max(dim.x, dim.z, .01);
          const factor = 4.1 / length;
          model.scale.setScalar(factor);
          model.position.set(-center.x * factor, -bounds.min.y * factor - .1, -center.z * factor);
          // Rotate the model geometry if its long axis points along the X axis.
          if (dim.x > dim.z) model.rotation.y = Math.PI / 2;
          car.add(model);
          setLoadState('ready');
          loadedRef.current?.();
        })
        .catch(error => {
          if (!active || controller.signal.aborted) return;
          console.warn('Original Mercedes 3D asset is not available:', error);
          setLoadState('unavailable');
          failRef.current();
        });

      const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let animatedProgress = 0;
      const render = (now: number) => {
        if (!active || !renderer) return;
        frame = requestAnimationFrame(render);
        if (!running || document.hidden) {
          lastTime = now;
          return;
        }
        const dt = Math.min(.06, (now - (lastTime || now)) / 1000);
        lastTime = now;
        const goal = motionReduced ? .12 : progressRef.current;
        animatedProgress += (goal - animatedProgress) * Math.min(1, dt * 5.7);
        const p = clamp(animatedProgress);
        const position = routeAt(p);
        if (car) {
          car.position.set(position.x, -.18, position.z);
          car.rotation.y = position.yaw;
          car.rotation.z = position.drift ? Math.sin(p * 80) * .008 : 0;
        }
        // Top view changes into a gentle tracking shot as the car accelerates.
        const roadPhase = smooth((p - CIRCLE_END) / (STRAIGHT_END - CIRCLE_END));
        const target = new THREE.Vector3(1.1 + roadPhase * .8, 0, 2.5 + roadPhase * 5.5);
        const destination = new THREE.Vector3(-.8 + roadPhase * 2, 20.8 - roadPhase * 2.3, 9.5 + roadPhase * 5.5);
        camera.position.lerp(destination, Math.min(1, dt * 3));
        camera.lookAt(target);
        for (let i = 0; i < puffs.length; i++) {
          const trailTime = .025 + (i / (puffs.length - 1)) * .82;
          const age = p - trailTime;
          const puff = puffs[i];
          if (age < 0 || age > .35) {
            puff.visible = false;
            continue;
          }
          const pt = routeAt(trailTime);
          const life = 1 - age / .35;
          const spread = age * 3.4;
          const flip = Math.sin(i * 15.831);
          puff.visible = true;
          puff.position.set(pt.x + flip * (.2 + spread), .4 + age * 3.4, pt.z + Math.cos(i * 7.17) * (.2 + spread));
          const size = 1.05 + age * 16.2;
          puff.scale.set(size, size * .74, 1);
          smokeMat[i].opacity = .36 * Math.pow(life, .6);
        }
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);
    } catch (error) {
      console.warn('Prestige sunset desert 3D unavailable', error);
      setLoadState('unavailable');
      failRef.current();
    }

    return () => {
      active = false;
      controller.abort();
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      observer?.disconnect();
      if (asset) {
        asset.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry.dispose();
            const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            list.forEach(m => {
              if (!m) return;
              for (const value of Object.values(m)) {
                if (value && typeof value === 'object' && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
              }
              m.dispose();
            });
          }
        });
      }
      geo.forEach(item => item.dispose());
      mats.forEach(item => item.dispose());
      smokeMat.forEach(item => item.dispose());
      maps.forEach(item => item.dispose());
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [near]);

  return (
    <div className="prestige-desert-scene">
      <div ref={mountRef} className="prestige-desert-mount" aria-label="Mercedes-AMG GT3 cinematic 3D desert animation" />
      {loadState !== 'ready' && loadState !== 'unavailable' && (
        <div className="prestige-desert-loading" role="status" aria-live="polite">
          <span className="prestige-desert-loading-mark">P.</span>
          <strong>{loadState === 'waiting' ? 'THE DESERT AWAITS' : 'LOADING THE ORIGINAL MERCEDES GT3'}</strong>
          <span className="prestige-desert-loading-line"><i style={{ width: `${Math.max(8, percent)}%` }} /></span>
        </div>
      )}
      <span className="prestige-desert-asset-credit">
        3D Mercedes-AMG GT3 Evo by <a href="https://sketchfab.com/3d-models/mercedes-amg-gt3-evo-2020-wwwvecarzcom-39e77243109f4e5cb7134b6f31c8f619" target="_blank" rel="noopener noreferrer">vecarz / Sketchfab</a> · CC BY 4.0
      </span>
    </div>
  );
}
