import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Gauge,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type Car = {
  id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: string;
  fuel: string;
  transmission: string;
  type: string;
  image: string;
  accent: string;
};
const vehicles: Car[] = [
  {
    id: 1,
    make: 'Porsche',
    model: '911 Carrera',
    year: 2023,
    price: 2499000,
    mileage: '8 400 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    type: 'Coupe',
    image:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=90',
    accent: 'Carrera Silver',
  },
  {
    id: 2,
    make: 'BMW',
    model: 'M4 Competition',
    year: 2022,
    price: 1795000,
    mileage: '16 200 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    type: 'Coupe',
    image:
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=90',
    accent: 'Brooklyn Grey',
  },
  {
    id: 3,
    make: 'Mercedes-Benz',
    model: 'AMG GT',
    year: 2023,
    price: 2895000,
    mileage: '6 800 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    type: 'Coupe',
    image:
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=90',
    accent: 'Obsidian Black',
  },
  {
    id: 4,
    make: 'Audi',
    model: 'RS 5 Sportback',
    year: 2022,
    price: 1499000,
    mileage: '21 500 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    type: 'Sportback',
    image:
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=90',
    accent: 'Nardo Grey',
  },
  {
    id: 5,
    make: 'Toyota',
    model: 'GR Supra',
    year: 2021,
    price: 1099000,
    mileage: '28 100 km',
    fuel: 'Petrol',
    transmission: 'Automatic',
    type: 'Coupe',
    image:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=90',
    accent: 'Racing Red',
  },
  {
    id: 6,
    make: 'Land Rover',
    model: 'Defender 110',
    year: 2023,
    price: 1899000,
    mileage: '12 600 km',
    fuel: 'Diesel',
    transmission: 'Automatic',
    type: 'SUV',
    image:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=90',
    accent: 'Santorini Black',
  },
];
const money = (value: number) => 'R ' + value.toLocaleString('en-ZA');

function MercedesDriftScene({ scrollProgress }: { scrollProgress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(scrollProgress);
  const [assetReady, setAssetReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  progressRef.current = scrollProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let renderer: THREE.WebGLRenderer | undefined;
    let frame = 0;
    let carRoot: THREE.Group | undefined;
    let camera: THREE.PerspectiveCamera | undefined;
    let scene: THREE.Scene | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const renderScene = () => {
      if (!active || !renderer || !scene || !camera) return;
      const progress = progressRef.current;
      if (carRoot) {
        const circleEnd = 0.58;
        if (progress < circleEnd) {
          const phase = progress / circleEnd;
          const angle = phase * Math.PI * 2;
          const radius = 2.45;
          carRoot.position.x = Math.cos(angle) * radius;
          carRoot.position.z = Math.sin(angle) * radius;
          carRoot.rotation.y = -angle + Math.PI / 2;
          carRoot.rotation.z = Math.sin(angle * 2) * 0.035;
        } else {
          const phase = Math.min(1, (progress - circleEnd) / (1 - circleEnd));
          carRoot.position.x = Math.sin(phase * Math.PI * 3) * (0.6 + phase * 0.7);
          carRoot.position.z = 2.45 - phase * 8.2;
          carRoot.rotation.y = Math.PI + Math.sin(phase * Math.PI * 5) * 0.2;
          carRoot.rotation.z = Math.sin(phase * Math.PI * 5) * 0.075;
        }
        carRoot.position.y = 0.12 + Math.sin(progress * Math.PI * 16) * 0.025;
      }
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(renderScene);
    };

    const setup = async () => {
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
        renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || 500, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
        renderer.shadowMap.enabled = true;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x9a5938);
        camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(0, 9.5, 0.01);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.HemisphereLight(0xffd9a3, 0x493027, 2.5));
        const keyLight = new THREE.DirectionalLight(0xffb66f, 3.7);
        keyLight.position.set(-5, 9, 4);
        scene.add(keyLight);
        const rimLight = new THREE.DirectionalLight(0xffe0b2, 2.2);
        rimLight.position.set(5, 5, -7);
        scene.add(rimLight);

        const desert = new THREE.Mesh(
          new THREE.PlaneGeometry(80, 100),
          new THREE.MeshStandardMaterial({ color: 0x9c6746, roughness: 1 })
        );
        desert.rotation.x = -Math.PI / 2;
        desert.position.y = -0.12;
        scene.add(desert);

        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(6.8, 100),
          new THREE.MeshStandardMaterial({ color: 0x34302b, roughness: 1 })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.set(0, -0.08, -2);
        scene.add(road);

        const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xb78b68, roughness: 1 });
        [-3.42, 3.42].forEach(x => {
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 100), edgeMaterial);
          edge.position.set(x, -0.055, -2);
          scene.add(edge);
        });

        const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xe4d2b8, transparent: true, opacity: 0.42 });
        for (let z = -48; z < 48; z += 5.5) {
          const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 2.6), laneMaterial);
          dash.rotation.x = -Math.PI / 2;
          dash.position.set(0, -0.052, z - 2);
          scene.add(dash);
        }

        // Subtle broken tyre scuffs on the dirt replace the hard black ring.
        const scuffMaterial = new THREE.LineBasicMaterial({ color: 0x39261d, transparent: true, opacity: 0.22 });
        [2.38, 2.58].forEach((radius, trackIndex) => {
          const points: THREE.Vector3[] = [];
          for (let i = 0; i <= 180; i++) {
            const angle = (i / 180) * Math.PI * 2;
            const gap = angle > 0.12 && angle < 0.3;
            if (gap) continue;
            points.push(new THREE.Vector3(Math.cos(angle) * radius, -0.055 + trackIndex * 0.001, Math.sin(angle) * radius));
          }
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          scene.add(new THREE.Line(geometry, scuffMaterial));
        });

        const loader = new GLTFLoader();
        loader.load(
          '/resources/mercedes-amg-gt.glb',
          gltf => {
            if (!active || !scene) return;
            carRoot = new THREE.Group();
            carRoot.add(gltf.scene);
            const bounds = new THREE.Box3().setFromObject(gltf.scene);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());
            gltf.scene.position.sub(center);
            const largestDimension = Math.max(size.x, size.y, size.z) || 1;
            const scale = 6.4 / largestDimension;
            carRoot.scale.setScalar(scale);
            // The GLB is centred above its ground plane; lift it back onto the road.
            carRoot.position.y = (size.y * scale) / 2 + 0.035;
            carRoot.rotation.x = 0;
            scene.add(carRoot);
            setAssetReady(true);
            setAssetError(false);
          },
          undefined,
          () => {
            if (active) setAssetError(true);
          }
        );

        resizeObserver = new ResizeObserver(() => {
          if (!renderer || !camera || !canvas) return;
          const width = Math.max(1, canvas.clientWidth);
          const height = Math.max(1, canvas.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        });
        resizeObserver.observe(canvas);
        renderScene();
      } catch {
        if (active) setAssetError(true);
      }
    };

    void setup();
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      if (scene) {
        scene.traverse(object => {
          const mesh = object as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => material.dispose());
          }
        });
      }
      renderer?.dispose();
    };
  }, []);

  return (
    <div className="drift-car">
      <img
        className="drift-fallback-image"
        src="https://images.unsplash.com/photo-1768466586643-37371857018e?auto=format&fit=crop&fm=jpg&q=90&w=2400"
        alt="Sports car sliding sideways through a drift with tyre smoke on a track"
        style={{ opacity: assetReady ? 0 : 1 }}
      />
      <canvas
        ref={canvasRef}
        className="drift-3d-canvas"
        aria-label="Interactive Mercedes-AMG GT3 3D drift scene"
        style={{ opacity: assetReady ? 1 : 0 }}
      />
      {!assetReady && (
        <div className="drift-asset-status" role="status">
          <span className="asset-status-dot" />
          <strong>{assetError ? '3D MODEL NOT LOADED' : '3D MODEL ASSET PENDING'}</strong>
          <small>
            Mercedes-AMG GT3 · Upload the GLB and confirm its licence allows commercial website use before the real 3D scene activates.
          </small>
        </div>
      )}
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [quoteSent, setQuoteSent] = useState(false);
  const [quote, setQuote] = useState({ name: '', email: '', phone: '', desiredCar: '', budget: 'Flexible', notes: '' });
  const [search, setSearch] = useState('');
  const [make, setMake] = useState('All makes');
  const [bodyType, setBodyType] = useState('All body types');
  const [sort, setSort] = useState('featured');
  const [selected, setSelected] = useState<Car | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [sent, setSent] = useState(false);
  const [enquiry, setEnquiry] = useState({
    name: '',
    email: '',
    phone: '',
    timing: 'This week',
  });
  const driftRef = useRef<HTMLElement>(null);
  const inventoryRef = useRef<HTMLElement>(null);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  useEffect(() => {
    const introTimer = window.setTimeout(() => setIntroComplete(true), 2600);
    return () => window.clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const node = driftRef.current;
        if (node) {
          const rect = node.getBoundingClientRect();
          const range = Math.max(1, rect.height - window.innerHeight);
          setScrollProgress(
            Math.min(1, Math.max(0, (window.innerHeight - rect.top) / range))
          );
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = Number((entry.target as HTMLElement).dataset.reveal);
            setVisibleCards(current =>
              current.includes(id) ? current : [...current, id]
            );
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = vehicles.filter(car => {
      const matchesSearch =
        !query ||
        `${car.make} ${car.model} ${car.year}`.toLowerCase().includes(query);
      const matchesMake = make === 'All makes' || car.make === make;
      const matchesType =
        bodyType === 'All body types' || car.type === bodyType;
      return matchesSearch && matchesMake && matchesType;
    });
    if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
    if (sort === 'year-new') result.sort((a, b) => b.year - a.year);
    return result;
  }, [search, make, bodyType, sort]);

  const openEnquiry = (car: Car) => {
    setSelected(car);
    setShowEnquiry(true);
    setSent(false);
  };
  const submitEnquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };
  const submitQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuoteSent(true);
  };
  const resetFilters = () => {
    setSearch('');
    setMake('All makes');
    setBodyType('All body types');
    setSort('featured');
  };
  const driftStyle = {
    '--drift-x': `${Math.sin(scrollProgress * Math.PI * 2) * 24}vw`,
    '--drift-y': `${Math.sin(scrollProgress * Math.PI * 2) * -6}vh`,
    '--drift-rotate': `${Math.sin(scrollProgress * Math.PI * 2) * -7}deg`,
    '--drift-scale': 1 + Math.sin(scrollProgress * Math.PI) * 0.12,
    '--drift-opacity': Math.max(0.12, 1 - scrollProgress * 0.88),
    '--scene-glow': 0.12 + scrollProgress * 0.35,
  } as React.CSSProperties;

  return (
    <main className="site-shell">
      {!introComplete && (
        <div className="brand-drop-intro" aria-hidden="true">
          <div className="intro-wordmark">PRESTIGE<span>.</span></div>
          <div className="intro-submark">AUTO HOUSE</div>
          <div className="intro-rule" />
        </div>
      )}
      <div className="demo-note">
        PORTFOLIO CONCEPT <span>—</span> VEHICLES, INVENTORY AND ENQUIRY FLOWS
        ARE DEMONSTRATIONS
      </div>
      <header className="site-nav">
        <a
          className="auto-brand"
          href="#home"
          aria-label="Prestige Auto House home"
        >
          <span className="brand-emblem">
            P<span>.</span>
          </span>
          <span>
            PRESTIGE <small>AUTO HOUSE</small>
          </span>
        </a>
        <button
          className="mobile-menu"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'site-links expanded' : 'site-links'}>
          <a href="#experience" onClick={() => setMenuOpen(false)}>
            Experience
          </a>
          <a href="#inventory" onClick={() => setMenuOpen(false)}>
            Inventory
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            Our standard
          </a>
          <a href="#find-a-car" onClick={() => setMenuOpen(false)}>
            Find a car
          </a>
          <a
            className="nav-outline"
            href="#inventory"
            onClick={() => setMenuOpen(false)}
          >
            Explore cars <ArrowUpRight size={15} />
          </a>
        </nav>
      </header>

      <section className="auto-hero" id="home">
        <div className="hero-photo" />
        <div className="hero-vignette" />
        <div className="hero-topline">
          <span>CURATED AUTOMOTIVE</span>
          <span>PRE-OWNED / PERFORMANCE / LUXURY</span>
        </div>
        <div className="hero-copy">
          <div className="hero-kicker">
            <span /> THE DRIVE IS DIFFERENT HERE
          </div>
          <h1>
            Not just a car.
            <br />
            <em>A feeling.</em>
          </h1>
          <p>
            Considered cars for people who know what moves them. Discover a more
            personal way to find your next drive.
          </p>
          <a className="hero-button" href="#experience">
            Enter the experience <ArrowDownRight size={18} />
          </a>
        </div>
        <div className="hero-bottomline">
          <span>PRESTIGE AUTO HOUSE</span>
          <span>GAUTENG · SOUTH AFRICA</span>
          <a href="#experience">
            SCROLL TO FEEL IT <ArrowDown size={14} />
          </a>
        </div>
      </section>

      <section className="drift-story" id="experience" ref={driftRef}>
        <div className="drift-sticky" style={driftStyle}>
          <div className="drift-glow" />
          <div className="tyre-smoke" style={{ opacity: scrollProgress < 0.52 ? 0.16 + scrollProgress * 0.35 : scrollProgress < 0.72 ? 0.34 + ((scrollProgress - 0.52) / 0.2) * 0.66 : Math.max(0, 1 - (scrollProgress - 0.72) / 0.2), transform: `translateX(${Math.sin(scrollProgress * Math.PI * 2) * 5}vw) scale(${0.85 + scrollProgress * 0.9})` }} aria-hidden="true">
            <span className="smoke-puff smoke-puff-one" />
            <span className="smoke-puff smoke-puff-two" />
            <span className="smoke-puff smoke-puff-three" />
            <span className="smoke-puff smoke-puff-four" />
          </div>
          <div className="smoke-listings" aria-hidden="true" style={{ opacity: Math.min(1, Math.max(0, (scrollProgress - 0.72) / 0.22)) }}>
            <span style={{ transform: `translateY(${(1 - scrollProgress) * -70}px) rotate(-4deg)` }}>PORSCHE 911 CARRERA</span>
            <span style={{ transform: `translateY(${(1 - scrollProgress) * -110}px) rotate(3deg)` }}>BMW M4 COMPETITION</span>
            <span style={{ transform: `translateY(${(1 - scrollProgress) * -90}px) rotate(-2deg)` }}>MERCEDES-AMG GT</span>
            <span style={{ transform: `translateY(${(1 - scrollProgress) * -130}px) rotate(4deg)` }}>AUDI RS 5 SPORTBACK</span>
          </div>
          <div className="drift-copy">
            <span className="micro-label">THE MOMENT BEFORE THE DRIVE</span>
            <h2>
              Feel the road.
              <br />
              <em>Forget the ordinary.</em>
            </h2>
            <p>Scroll to move through the scene.</p>
          </div>
          <MercedesDriftScene scrollProgress={scrollProgress} />
          <div className="drift-caption">
            <span>01 / CONTROL</span>
            <span>02 / MOMENTUM</span>
            <span>03 / ARRIVAL</span>
          </div>
          <div className="scroll-meter">
            <span style={{ height: `${Math.max(8, scrollProgress * 100)}%` }} />
          </div>
          <div className="drift-instruction">
            KEEP SCROLLING <ChevronDown size={14} />
          </div>
          <div className="scene-counter">
            0{Math.min(3, Math.floor(scrollProgress * 3) + 1)} <span>/ 03</span>
          </div>
        </div>
      </section>

      <section className="inventory" id="inventory" ref={inventoryRef}>
        <div className="inventory-intro">
          <div className="micro-label">THE COLLECTION / 2026</div>
          <h2>
            Find your <em>next.</em>
          </h2>
          <p>Distinctive cars. Carefully selected. Ready for a closer look.</p>
          <div className="inventory-count">
            <span>{String(filtered.length).padStart(2, '0')}</span> VEHICLES IN
            THIS VIEW
          </div>
        </div>
        <div className="inventory-controls">
          <label className="search-control">
            <Search size={17} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search make, model or year"
              aria-label="Search vehicles"
            />
          </label>
          <label>
            <span>MAKE</span>
            <select
              value={make}
              onChange={event => setMake(event.target.value)}
              aria-label="Filter by make"
            >
              <option>All makes</option>
              {Array.from(new Set(vehicles.map(car => car.make)))
                .sort()
                .map(item => (
                  <option key={item}>{item}</option>
                ))}
            </select>
          </label>
          <label>
            <span>BODY TYPE</span>
            <select
              value={bodyType}
              onChange={event => setBodyType(event.target.value)}
              aria-label="Filter by body type"
            >
              <option>All body types</option>
              {Array.from(new Set(vehicles.map(car => car.type)))
                .sort()
                .map(item => (
                  <option key={item}>{item}</option>
                ))}
            </select>
          </label>
          <label>
            <span>SORT BY</span>
            <select
              value={sort}
              onChange={event => setSort(event.target.value)}
              aria-label="Sort vehicles"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="year-new">Newest year</option>
            </select>
          </label>
          <button className="clear-filters" onClick={resetFilters}>
            <SlidersHorizontal size={15} /> Clear filters
          </button>
        </div>
        {filtered.length ? (
          <div className="vehicle-grid">
            {filtered.map((car, index) => (
              <article
                className={`vehicle-card ${visibleCards.includes(car.id) ? 'revealed' : ''}`}
                data-reveal={car.id}
                key={car.id}
                style={{ transitionDelay: `${(index % 3) * 90}ms` }}
              >
                <button
                  className="vehicle-photo"
                  onClick={() => setSelected(car)}
                  aria-label={`View ${car.make} ${car.model}`}
                >
                  <img
                    src={car.image}
                    alt={`${car.make} ${car.model}`}
                    loading="lazy"
                  />
                  <span className="photo-year">{car.year}</span>
                  <span className="photo-open">
                    <ArrowUpRight size={17} />
                  </span>
                </button>
                <div className="vehicle-details">
                  <div className="vehicle-make">{car.make}</div>
                  <h3>{car.model}</h3>
                  <div className="vehicle-specs">
                    <span>{car.mileage}</span>
                    <span>{car.transmission}</span>
                    <span>{car.type}</span>
                  </div>
                  <div className="vehicle-price-row">
                    <strong>{money(car.price)}</strong>
                    <button
                      onClick={() => setSelected(car)}
                      aria-label={`View details for ${car.make} ${car.model}`}
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <Search size={25} />
            <h3>No cars match those filters.</h3>
            <p>
              Try a different search or clear the filters to see the full
              collection.
            </p>
            <button className="light-button" onClick={resetFilters}>
              Clear all filters <ArrowRight size={16} />
            </button>
          </div>
        )}
        <div className="inventory-footer">
          <span>DISPLAY INVENTORY — SAMPLE VEHICLES</span>
          <span>DETAILS AND PRICES ARE FOR DESIGN DEMONSTRATION ONLY</span>
        </div>
      </section>

      <section className="quote-search-section" id="find-a-car">
        <div className="quote-search-copy">
          <div className="micro-label">YOUR NEXT CAR, YOUR WAY</div>
          <h2>Looking for<br /><em>something specific?</em></h2>
          <p>Tell us what you have in mind. In a live dealership site, this request would go to the sales team so they could help source the right vehicle.</p>
          <div className="quote-promise"><Check size={16} /> Your preferences. A more personal search.</div>
        </div>
        <div className="quote-search-form-wrap">
          {quoteSent ? (
            <div className="quote-success">
              <span><Check size={22} /></span>
              <div className="micro-label">REQUEST PREVIEWED</div>
              <h3>We know what you're looking for.</h3>
              <p>This is a demonstration only. No request or personal details have been sent to a dealership.</p>
              <button className="light-button" onClick={() => { setQuoteSent(false); setQuote({ name: '', email: '', phone: '', desiredCar: '', budget: 'Flexible', notes: '' }); }}>Make another request <ArrowRight size={15} /></button>
            </div>
          ) : (
            <form className="quote-search-form" onSubmit={submitQuote}>
              <div className="quote-form-heading"><span>VEHICLE SOURCING REQUEST</span><span>01 — 05</span></div>
              <label>What vehicle are you looking for?<input required value={quote.desiredCar} onChange={event => setQuote({ ...quote, desiredCar: event.target.value })} placeholder="e.g. Ford Ranger Wildtrak" /></label>
              <label>Budget range<select value={quote.budget} onChange={event => setQuote({ ...quote, budget: event.target.value })}><option>Flexible</option><option>Under R200,000</option><option>R200,000 – R500,000</option><option>R500,000 – R1,000,000</option><option>R1,000,000+</option></select></label>
              <div className="quote-form-pair">
                <label>Your name<input required value={quote.name} onChange={event => setQuote({ ...quote, name: event.target.value })} placeholder="Name and surname" /></label>
                <label>Email address<input type="email" required value={quote.email} onChange={event => setQuote({ ...quote, email: event.target.value })} placeholder="you@example.com" /></label>
              </div>
              <label>Phone number<input required value={quote.phone} onChange={event => setQuote({ ...quote, phone: event.target.value })} placeholder="+27" /></label>
              <label>Extra details <textarea value={quote.notes} onChange={event => setQuote({ ...quote, notes: event.target.value })} rows={3} placeholder="Preferred year, mileage, colour or features..." /></label>
              <button className="light-button quote-submit" type="submit">Request a quotation <ArrowRight size={16} /></button>
              <small>Demo only · Your details are not transmitted or stored.</small>
            </form>
          )}
        </div>
      </section>

      <section className="standard-section" id="about">
        <div className="standard-number">01 / THE PRESTIGE STANDARD</div>
        <div className="standard-grid">
          <h2>
            More considered.
            <br />
            <em>Less complicated.</em>
          </h2>
          <div>
            <p>
              Buying your next car should feel clear from the first
              conversation. This concept demonstrates how a dealership can
              present its inventory, help people compare options and make the
              next step simple.
            </p>
            <div className="standard-points">
              <span>
                <ShieldCheck size={17} /> Clear vehicle information
              </span>
              <span>
                <Gauge size={17} /> Helpful details up front
              </span>
              <span>
                <Zap size={17} /> A more personal enquiry
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="closing-cta">
        <div className="micro-label">THE NEXT CHAPTER STARTS HERE</div>
        <h2>
          Your next drive
          <br />
          <em>is waiting.</em>
        </h2>
        <a href="#inventory" className="hero-button">
          Explore the collection <ArrowRight size={17} />
        </a>
        <div className="closing-wordmark">
          PRESTIGE<span>.</span>
        </div>
      </section>
      <footer className="auto-footer">
        <a className="auto-brand" href="#home">
          <span className="brand-emblem">
            P<span>.</span>
          </span>
          <span>
            PRESTIGE <small>AUTO HOUSE</small>
          </span>
        </a>
        <span>PORTFOLIO CONCEPT BY VILJOEN GROUP DIGITAL</span>
        <a href="#home">BACK TO TOP ↑</a>
      </footer>

      {selected && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setSelected(null);
            setShowEnquiry(false);
            setSent(false);
          }}
        >
          <section
            className="car-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.make} ${selected.model} details`}
            onClick={event => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => {
                setSelected(null);
                setShowEnquiry(false);
                setSent(false);
              }}
              aria-label="Close vehicle details"
            >
              <X />
            </button>
            {!showEnquiry ? (
              <>
                <img
                  className="modal-image"
                  src={selected.image}
                  alt={`${selected.make} ${selected.model}`}
                />
                <div className="modal-content">
                  <span className="micro-label">
                    {selected.year} / {selected.accent}
                  </span>
                  <h2>
                    {selected.make} <em>{selected.model}</em>
                  </h2>
                  <strong className="modal-price">
                    {money(selected.price)}
                  </strong>
                  <div className="modal-specs">
                    <span>{selected.mileage}</span>
                    <span>{selected.fuel}</span>
                    <span>{selected.transmission}</span>
                    <span>{selected.type}</span>
                  </div>
                  <p>
                    Sample vehicle listing for the portfolio concept. Real
                    listings would be managed by the dealership.
                  </p>
                  <button
                    className="light-button"
                    onClick={() => {
                      setShowEnquiry(true);
                      setSent(false);
                    }}
                  >
                    Request a test drive <ArrowRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-content enquiry-content">
                {sent ? (
                  <div className="enquiry-success">
                    <span>
                      <Check />
                    </span>
                    <h2>You're on the list.</h2>
                    <p>
                      This is a demo confirmation. No enquiry or personal
                      details have been sent to a real dealership.
                    </p>
                    <button
                      className="light-button"
                      onClick={() => {
                        setSelected(null);
                        setShowEnquiry(false);
                        setSent(false);
                      }}
                    >
                      Back to collection
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="micro-label">
                      TEST DRIVE REQUEST / DEMO
                    </span>
                    <h2>
                      Meet the <em>{selected.model}.</em>
                    </h2>
                    <p>
                      Share your details to preview the dealership enquiry flow.
                    </p>
                    <form className="enquiry-form" onSubmit={submitEnquiry}>
                      <label>
                        Full name
                        <input
                          required
                          value={enquiry.name}
                          onChange={event =>
                            setEnquiry({ ...enquiry, name: event.target.value })
                          }
                          placeholder="Your name"
                        />
                      </label>
                      <label>
                        Email address
                        <input
                          type="email"
                          required
                          value={enquiry.email}
                          onChange={event =>
                            setEnquiry({
                              ...enquiry,
                              email: event.target.value,
                            })
                          }
                          placeholder="you@example.com"
                        />
                      </label>
                      <label>
                        Phone number
                        <input
                          required
                          value={enquiry.phone}
                          onChange={event =>
                            setEnquiry({
                              ...enquiry,
                              phone: event.target.value,
                            })
                          }
                          placeholder="+27"
                        />
                      </label>
                      <label>
                        Preferred timing
                        <select
                          value={enquiry.timing}
                          onChange={event =>
                            setEnquiry({
                              ...enquiry,
                              timing: event.target.value,
                            })
                          }
                        >
                          <option>This week</option>
                          <option>Next week</option>
                          <option>Just browsing</option>
                        </select>
                      </label>
                      <button
                        className="light-button full-button"
                        type="submit"
                      >
                        Preview request <ArrowRight size={16} />
                      </button>
                      <small>
                        Demo only · Your information is not transmitted or
                        stored.
                      </small>
                    </form>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
