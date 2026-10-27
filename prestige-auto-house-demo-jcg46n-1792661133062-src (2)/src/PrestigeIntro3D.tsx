import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import helvetiker from 'three/examples/fonts/helvetiker_bold.typeface.json';

type PrestigeIntro3DProps = { onSkip: () => void };

/**
 * An actual 3D typographic sculpture rendered with WebGL.
 * Canvas/CSS fallback remains visible when WebGL isn't supported.
 */
export default function PrestigeIntro3D({ onSkip }: PrestigeIntro3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let resizeObserver: ResizeObserver | undefined;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setClearColor('#050606', 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.domElement.className = 'prestige-webgl-canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0.2, 17.5);

      const group = new THREE.Group();
      scene.add(group);
      const font = new FontLoader().parse(helvetiker);

      const makeType = (word: string, size: number, depth: number, y: number, material: THREE.Material) => {
        const geometry = new TextGeometry(word, {
          font,
          size,
          depth,
          curveSegments: 10,
          bevelEnabled: true,
          bevelThickness: depth * 0.22,
          bevelSize: depth * 0.18,
          bevelSegments: 3,
        });
        geometry.computeBoundingBox();
        const width = (geometry.boundingBox?.max.x || 0) - (geometry.boundingBox?.min.x || 0);
        geometry.translate(-width / 2, 0, 0);
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.castShadow = false;
        group.add(mesh);
        return mesh;
      };

      const champagne = new THREE.MeshPhysicalMaterial({
        color: '#d7c49e',
        metalness: 0.78,
        roughness: 0.24,
        clearcoat: 0.56,
        clearcoatRoughness: 0.18,
        side: THREE.DoubleSide,
      });
      const platinum = new THREE.MeshPhysicalMaterial({
        color: '#e4e3dc',
        metalness: 0.64,
        roughness: 0.25,
        clearcoat: 0.3,
      });
      materials.push(champagne, platinum);

      makeType('PRESTIGE', 1.14, 0.2, 0.08, champagne);
      const subtitle = makeType('AUTO HOUSE', 0.29, 0.07, -1.06, platinum);
      subtitle.scale.x = 1.19;

      const lineGeometry = new THREE.BoxGeometry(3.4, 0.013, 0.025);
      geometries.push(lineGeometry);
      const line = new THREE.Mesh(lineGeometry, champagne);
      line.position.set(0, -1.64, 0.06);
      group.add(line);

      scene.add(new THREE.AmbientLight('#c4bdb0', 1.2));
      const keyLight = new THREE.SpotLight('#fff5df', 90, 45, Math.PI / 5, 0.55);
      keyLight.position.set(-5, 7, 11);
      scene.add(keyLight);
      const rimLight = new THREE.PointLight('#f7d19a', 65, 40);
      rimLight.position.set(7, -3, 7);
      scene.add(rimLight);
      const coolLight = new THREE.PointLight('#8ca0b1', 24, 40);
      coolLight.position.set(-7, -2, -1);
      scene.add(coolLight);

      const resize = () => {
        if (!renderer) return;
        const width = Math.max(1, mount.clientWidth);
        const height = Math.max(1, mount.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = width < 640 ? 26.5 : width < 950 ? 20 : 17.5;
        camera.updateProjectionMatrix();
      };
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);

      const start = performance.now();
      setReady(true);
      const animate = (now: number) => {
        if (!renderer) return;
        const seconds = (now - start) / 1000;
        const t = prefersReducedMotion ? 1 : Math.min(1, seconds / 2.05);
        // The physical feeling of a suspended sculpture landing in space.
        const ease = 1 - Math.pow(1 - t, 4);
        const settle = prefersReducedMotion ? 0 : Math.sin(t * Math.PI * 3) * Math.pow(1 - t, 3) * 0.23;
        group.position.y = (1 - ease) * 7.5 + settle;
        group.position.z = (1 - ease) * -5;
        group.rotation.x = (1 - ease) * -0.65 + (prefersReducedMotion ? 0 : Math.sin(seconds * 0.7) * 0.012);
        group.rotation.y = (1 - ease) * -0.54 + (prefersReducedMotion ? 0 : Math.sin(seconds * 0.45) * 0.045);
        group.rotation.z = (1 - ease) * 0.07;
        rimLight.position.x = 7 - Math.min(seconds, 3) * 2;
        renderer.render(scene, camera);
        frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    } catch (error) {
      console.warn('Prestige 3D intro unavailable, using accessible brand fallback.', error);
      setReady(false);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div className="brand-drop-intro prestige-intro-3d" role="presentation">
      <div className="prestige-intro-halo" aria-hidden="true" />
      <div className="prestige-intro-grid" aria-hidden="true" />
      <div className="prestige-intro-canvas-wrap" ref={mountRef} aria-hidden="true" />
      <div className={ready ? 'prestige-intro-fallback is-hidden' : 'prestige-intro-fallback'}>
        <div className="intro-wordmark">PRESTIGE<span>.</span></div>
        <div className="intro-submark">AUTO HOUSE</div>
        <div className="intro-rule" />
      </div>
      <div className="prestige-intro-eyebrow" aria-hidden="true">AN AUTOMOTIVE EXPERIENCE</div>
      <button className="prestige-intro-skip" type="button" onClick={onSkip} aria-label="Skip 3D introduction">
        SKIP INTRO <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
