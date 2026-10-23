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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tryPlay = () => {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    };
    video.addEventListener('canplay', tryPlay);
    tryPlay();
    return () => video.removeEventListener('canplay', tryPlay);
  }, []);

  return (
    <div className="drift-car" style={{ opacity: Math.min(1, Math.max(0, scrollProgress < 0.08 ? scrollProgress / 0.08 : scrollProgress < 0.48 ? 1 : (1 - scrollProgress) / 0.52)) }}>
      <video
        ref={videoRef}
        className="drift-hero-video"
        src="https://videos.pexels.com/video-files/16532416/16532416-hd_1920_1080_60fps.mp4"
        poster="https://images.pexels.com/videos/16532416/bmw-fast-car-freeway-moving-car-16532416.jpeg?auto=compress&w=1260&h=750&dpr=1"
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-label="Cinematic BMW driving scene for Prestige Auto House"
      />
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandMenuOpen, setBrandMenuOpen] = useState(false);
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
    '--drift-opacity': Math.min(1, Math.max(0, scrollProgress < 0.08 ? scrollProgress / 0.08 : scrollProgress < 0.48 ? 1 : (1 - scrollProgress) / 0.52)),
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
        <div className="brand-menu-wrap">
          <button
            className="auto-brand brand-menu-trigger"
            type="button"
            aria-label="Open Prestige vehicle categories"
            aria-expanded={brandMenuOpen}
            onClick={() => setBrandMenuOpen(open => !open)}
          >
            <span className="brand-emblem">P<span>.</span></span>
            <span>PRESTIGE <small>AUTO HOUSE</small></span>
            <ChevronDown className={brandMenuOpen ? 'brand-chevron is-open' : 'brand-chevron'} size={15} />
          </button>
          {brandMenuOpen && (
            <div className="brand-dropdown">
              <a href="#inventory" onClick={() => { setBrandMenuOpen(false); setMake('All makes'); }}>Pre-owned vehicles <span>Explore the collection</span></a>
              <a href="#find-a-car" onClick={() => { setBrandMenuOpen(false); setQuote(current => ({ ...current, desiredCar: 'New vehicle enquiry' })); }}>New vehicles <span>Request a new-car enquiry</span></a>
            </div>
          )}
        </div>
        <button
          className="mobile-menu"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? 'site-links expanded' : 'site-links'}>
          <a href="#home" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#inventory" onClick={() => setMenuOpen(false)}>
            Pre-owned
          </a>
          <a href="#find-a-car" onClick={() => setMenuOpen(false)}>
            New vehicles
          </a>
          <a href="#experience" onClick={() => setMenuOpen(false)}>
            Experience
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
          <MercedesDriftScene scrollProgress={scrollProgress} />
          <div className="drift-copy">
            <span className="micro-label">PRESTIGE AUTO HOUSE</span>
            <h2>
              Built to <em>stand apart.</em>
            </h2>
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
        <section className="vehicle-bubble-section" aria-label="Explore the vehicle collection">
          <div className="bubble-heading">
            <div>
              <div className="micro-label">THE PRESTIGE EDIT</div>
              <h3>Keep your eyes <em>moving.</em></h3>
            </div>
            <span>SELECT A VEHICLE TO EXPLORE</span>
          </div>
          <div className="vehicle-bubble-viewport">
            <div className="vehicle-bubble-track">
              {[...vehicles, ...vehicles].map((car, index) => {
                const duplicate = index >= vehicles.length;
                return (
                  <button
                    className="vehicle-bubble"
                    key={`${car.id}-bubble-${index}`}
                    type="button"
                    onClick={() => setSelected(car)}
                    tabIndex={duplicate ? -1 : 0}
                    aria-hidden={duplicate}
                    aria-label={`Explore ${car.year} ${car.make} ${car.model}`}
                  >
                    <span className="vehicle-bubble-image">
                      <img src={car.image} alt="" loading="lazy" />
                      <span className="vehicle-bubble-arrow"><ArrowUpRight size={17} /></span>
                    </span>
                    <span className="vehicle-bubble-copy">
                      <span>{car.make} · {car.year}</span>
                      <strong>{car.model}</strong>
                      <span className="vehicle-bubble-price">{money(car.price)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="bubble-disclaimer">Sample vehicle cards for design demonstration. Availability and prices must be verified.</p>
        </section>

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
