import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Spectral GT RS is an original, unbranded CC0 1.0 vehicle by JaronKBragg7337.
// License and source: https://github.com/JaronKBragg7337/spectral-gt-rs
// This is a concept car visualisation, not an advertised vehicle or manufacturer model.
const MODEL_URL = 'https://jaronkbragg7337.github.io/spectral-gt-rs/spectral_gt_rs_game_ready.glb';

type Props = {
  scrollProgress: number;
  onFailure: () => void;
};

type State = 'waiting' | 'loading' | 'ready' | 'failed';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function createShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 15, 128, 128, 126);
    gradient.addColorStop(0, 'rgba(0,0,0,.85)');
    gradient.addColorStop(0.48, 'rgba(0,0,0,.55)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export default function PrestigeCarScene({ scrollProgress, onFailure }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(scrollProgress);
  const dragRef = useRef({ down: false, x: 0, angle: 0 });
  const [state, setState] = useState<State>('waiting');
  const [near, setNear] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);

  useEffect(() => {
    progressRef.current = scrollProgress;
  }, [scrollProgress]);

  // Do not load a sizeable 3D asset until this section is near the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) setNear(true); },
      { rootMargin: '85% 0px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const mount = wrapRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let visibilityObserver: IntersectionObserver | null = null;
    let disposed = false;
    let onscreen = true;
    let materialTextures: THREE.Texture[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    let loadedModel: THREE.Object3D | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let spin = 0;
    let turn = 0;
    let arrival = 0;
    let lastTime = 0;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.3 : 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.shadowMap.enabled = false;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.className = 'prestige-car-webgl';
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D unbranded concept sports car');
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050708, 0.022);
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      const carRig = new THREE.Group();
      carRig.position.y = -0.25;
      scene.add(carRig);

      scene.add(new THREE.HemisphereLight(0xe6e6f0, 0x403324, 2.7));
      const key = new THREE.SpotLight(0xffe7bd, 145, 55, Math.PI / 4, .75);
      key.position.set(-6, 11, 11);
      scene.add(key);
      const fill = new THREE.PointLight(0xc5dcff, 95, 40);
      fill.position.set(6, 4, -7);
      scene.add(fill);
      const edge = new THREE.PointLight(0xffbd69, 90, 38);
      edge.position.set(-8, 1, -3);
      scene.add(edge);

      // The floor and its soft contact shadow ground the vehicle in a studio.
      const floorGeometry = new THREE.CircleGeometry(17, 80);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111316,
        metalness: .5,
        roughness: .31,
        side: THREE.DoubleSide,
      });
      geometries.push(floorGeometry);
      materials.push(floorMaterial);
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.13;
      scene.add(floor);

      const shadowTexture = createShadowTexture();
      textures.push(shadowTexture);
      const shadowGeometry = new THREE.PlaneGeometry(10, 6);
      const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: .95,
      });
      geometries.push(shadowGeometry);
      materials.push(shadowMaterial);
      const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.117;
      scene.add(shadow);

      const ringGeometry = new THREE.RingGeometry(6.75, 6.78, 128);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xb9a277,
        transparent: true,
        opacity: .26,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      geometries.push(ringGeometry);
      materials.push(ringMaterial);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -1.102;
      scene.add(ring);

      const resize = () => {
        if (!renderer || disposed) return;
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.fov = width < 720 ? 38 : 32;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);

      visibilityObserver = new IntersectionObserver(entries => {
        onscreen = Boolean(entries[0]?.isIntersecting);
      }, { threshold: 0 });
      visibilityObserver.observe(mount);

      setState('loading');
      const loader = new GLTFLoader();
      loader.load(
        MODEL_URL,
        gltf => {
          if (disposed) {
            gltf.scene.traverse(obj => {
              if ((obj as THREE.Mesh).isMesh) (obj as THREE.Mesh).geometry.dispose();
            });
            return;
          }
          const model = gltf.scene;
          loadedModel = model;
          // The original asset faces +X. Normalize its true 3D bounding box
          // rather than assuming the export dimensions or rotation.
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const longest = Math.max(size.x, size.z, .01);
          const scale = 6.7 / longest;
          model.scale.setScalar(scale);
          model.position.set(-center.x * scale, -bounds.min.y * scale - .89, -center.z * scale);
          model.traverse(obj => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.frustumCulled = true;
            const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            meshMaterials.forEach(mat => {
              if (mat && 'envMapIntensity' in mat) {
                (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.15;
              }
              for (const value of Object.values(mat || {})) {
                if (value && typeof value === 'object' && (value as THREE.Texture).isTexture) {
                  materialTextures.push(value as THREE.Texture);
                }
              }
            });
          });
          carRig.add(model);
          // Native model clips can be activated later; the showroom uses a
          // smooth, deterministic scroll-controlled camera/car orientation.
          if (gltf.animations.length > 0) mixer = new THREE.AnimationMixer(model);
          setState('ready');
          setLoadPercent(100);
        },
        event => {
          if (disposed || !event.total) return;
          setLoadPercent(clamp(event.loaded / event.total) * 100);
        },
        error => {
          if (disposed) return;
          console.warn('Prestige car model could not load; cinematic film remains available.', error);
          setState('failed');
          onFailure();
        }
      );

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const tick = (now: number) => {
        if (disposed || !renderer) return;
        animationFrame = window.requestAnimationFrame(tick);
        if (!onscreen || document.hidden) {
          lastTime = now;
          return;
        }
        const dt = Math.min(.05, Math.max(0, (now - (lastTime || now)) / 1000));
        lastTime = now;
        const progress = progressRef.current;
        const ease = Math.min(1, dt * 5.2);
        spin += (dragRef.current.angle - spin) * ease;
        const targetTurn = reducedMotion ? -.22 : -.22 + progress * Math.PI * 1.64 + spin;
        turn += (targetTurn - turn) * ease;
        arrival = Math.min(1, arrival + dt * .65);
        carRig.rotation.set(0, turn, 0);
        carRig.scale.setScalar(reducedMotion ? 1 : .91 + .09 * (1 - Math.pow(1 - arrival, 3)));
        carRig.position.y = reducedMotion ? -.18 : -.18 + Math.sin(now * .00075) * .035;
        const mobile = mount.clientWidth < 720;
        const cameraBase = mobile ? new THREE.Vector3(7.2, 3.6, 21.7) : new THREE.Vector3(8.0, 3.55, 10.8);
        camera.position.lerp(
          cameraBase.add(new THREE.Vector3(
            mobile ? 0 : -progress * 1.0,
            reducedMotion ? 0 : Math.sin(progress * Math.PI) * .65,
            mobile ? 0 : progress * 1.25
          )),
          ease
        );
        camera.lookAt(0, -.1, 0);
        if (mixer) mixer.update(dt);
        renderer.render(scene, camera);
      };
      animationFrame = window.requestAnimationFrame(tick);
    } catch (error) {
      console.warn('WebGL 3D unavailable; cinematic film remains available.', error);
      setState('failed');
      onFailure();
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      if (loadedModel) {
        loadedModel.traverse(obj => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          list.forEach(mat => mat?.dispose());
        });
      }
      new Set(materialTextures).forEach(tex => tex.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(tex => tex.dispose());
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [near, onFailure]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.down = true;
    dragRef.current.x = event.clientX;
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.down || state !== 'ready') return;
    const movement = event.clientX - dragRef.current.x;
    dragRef.current.x = event.clientX;
    dragRef.current.angle += movement * .006;
  };
  const onPointerEnd = () => {
    dragRef.current.down = false;
  };

  return (
    <div className="prestige-car-scene" aria-label="Interactive 3D concept sports car">
      <div className="prestige-car-studio-glow" aria-hidden="true" />
      <div
        ref={wrapRef}
        className="prestige-car-canvas-mount"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      />
      {state !== 'ready' && state !== 'failed' && (
        <div className="prestige-car-loading" role="status" aria-live="polite">
          <span className="prestige-car-loading-icon" aria-hidden="true">P.</span>
          <span>{state === 'waiting' ? 'PREPARING THE EXPERIENCE' : 'SCULPTING THE SCENE'}</span>
          <div className="prestige-car-loading-bar" aria-hidden="true"><span style={{ width: state === 'waiting' ? '10%' : `${Math.max(13, loadPercent)}%` }} /></div>
        </div>
      )}
      {state === 'ready' && (
        <div className="prestige-car-hint" aria-hidden="true">
          <span className="prestige-car-hint-line" />
          <span>DRAG TO ORBIT</span>
          <span className="prestige-car-hint-dot">·</span>
          <span>SCROLL TO REVEAL</span>
        </div>
      )}
      <span className="prestige-car-concept-note">UNBRANDED CONCEPT CAR · 3D VISUALISATION</span>
    </div>
  );
}
