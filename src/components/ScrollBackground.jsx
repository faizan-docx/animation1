import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BlurText from './BlurText';
import CardNav from './CardNav';
import CardSwap, { Card } from './CardSwap';
import ElectricBorder from './ElectricBorder';
import logo from './logo.svg';
import './ScrollBackground.css';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Math utilities
const MathUtils = {
  normalize: function($value, $min, $max) {
    return ($value - $min) / ($max - $min);
  },
  interpolate: function($normValue, $min, $max) {
    return $min + ($max - $min) * $normValue;
  },
  map: function($value, $min1, $max1, $min2, $max2) {
    if ($value < $min1) {
      $value = $min1;
    }
    if ($value > $max1) {
      $value = $max1;
    }
    var res = this.interpolate(this.normalize($value, $min1, $max1), $min2, $max2);
    return res;
  }
};

const ScrollBackground = () => {
  const canvasRef = useRef(null);
  const contentRef = useRef(null);

  
  useEffect(() => {
    // Initialize variables
    let ww = window.innerWidth,
        wh = window.innerHeight;
    
    let camera, scene, renderer, composer;
    let cameraRotationProxyX = 3.14159;
    let cameraRotationProxyY = 0;
    let cameraTargetPercentage = 0;
    let currentCameraPercentage = 0;
    let tubePerc = { percent: 0 };
    let particleSystem1, particleSystem2, particleSystem3;
    let texture, mapHeight;
    let animationFrameId;
    
    // Initialize Three.js
    const init = () => {
      // Create renderer
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true
      });
      renderer.setSize(ww, wh);
      
      // Create scene
      scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x194794, 0, 100);
      
      // Create camera
      camera = new THREE.PerspectiveCamera(45, ww / wh, 0.001, 200);
      camera.rotation.y = cameraRotationProxyX;
      camera.rotation.z = cameraRotationProxyY;
      
      const c = new THREE.Group();
      c.position.z = 400;
      c.add(camera);
      scene.add(c);
      
      // Set up post-processing
      const renderScene = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      );
      bloomPass.threshold = 0;
      bloomPass.strength = 0.9;
      bloomPass.radius = 0;
      
      composer = new EffectComposer(renderer);
      composer.addPass(renderScene);
      composer.addPass(bloomPass);
      
      // Create tube geometry
      const points = [
        [10, 89, 0],
        [50, 88, 10],
        [76, 139, 20],
        [126, 141, 12],
        [150, 112, 8],
        [157, 73, 0],
        [180, 44, 5],
        [207, 35, 10],
        [232, 36, 0]
      ].map(p => new THREE.Vector3(p[0], p[2], p[1]));
      
      const path = new THREE.CatmullRomCurve3(points);
      path.tension = 0.5;
      
      const geometry = new THREE.TubeGeometry(path, 300, 4, 32, false);
      
      // Load textures
      texture = new THREE.TextureLoader().load(
        'https://s3-us-west-2.amazonaws.com/s.cdpn.io/68819/3d_space_5.jpg',
        texture => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.offset.set(0, 0);
          texture.repeat.set(15, 2);
        }
      );
      
      mapHeight = new THREE.TextureLoader().load(
        'https://s3-us-west-2.amazonaws.com/s.cdpn.io/68819/waveform-bump3.jpg',
        texture => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.offset.set(0, 0);
          texture.repeat.set(15, 2);
        }
      );
      
      const material = new THREE.MeshPhongMaterial({
        side: THREE.BackSide,
        map: texture,
        shininess: 20,
        bumpMap: mapHeight,
        bumpScale: -0.03,
        specular: 0x0b2349
      });
      
      const tube = new THREE.Mesh(geometry, material);
      scene.add(tube);
      
      // Inner tube wireframe
      const innerGeometry = new THREE.TubeGeometry(path, 150, 3.4, 32, false);
      const geo = new THREE.EdgesGeometry(innerGeometry);
      const mat = new THREE.LineBasicMaterial({
        linewidth: 2,
        opacity: 0.2,
        transparent: true
      });
      
      const wireframe = new THREE.LineSegments(geo, mat);
      scene.add(wireframe);
      
      // Add lights
      const light = new THREE.PointLight(0xffffff, 0.35, 4, 0);
      scene.add(light);
      
      // Create particles
      createParticles();
      
      // Set up scroll animation
      setupScrollAnimation(light, c, path);
      
      // Start rendering
      render(light, c, path);
    };
    
    const createParticles = () => {
      const spikeyTexture = new THREE.TextureLoader().load(
        'https://s3-us-west-2.amazonaws.com/s.cdpn.io/68819/spikey.png'
      );
      
      const particleCount = 6800;
      const pMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.5,
        map: spikeyTexture,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      // Create three particle systems
      const particles1 = new THREE.BufferGeometry();
      const particles2 = new THREE.BufferGeometry();
      const particles3 = new THREE.BufferGeometry();
      
      const positions1 = new Float32Array(particleCount * 3);
      const positions2 = new Float32Array(particleCount * 3);
      const positions3 = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        // System 1
        positions1[i * 3] = Math.random() * 500 - 250;
        positions1[i * 3 + 1] = Math.random() * 50 - 25;
        positions1[i * 3 + 2] = Math.random() * 500 - 250;
        
        // System 2
        positions2[i * 3] = Math.random() * 500;
        positions2[i * 3 + 1] = Math.random() * 10 - 5;
        positions2[i * 3 + 2] = Math.random() * 500;
        
        // System 3
        positions3[i * 3] = Math.random() * 500;
        positions3[i * 3 + 1] = Math.random() * 10 - 5;
        positions3[i * 3 + 2] = Math.random() * 500;
      }
      
      particles1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));
      particles2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
      particles3.setAttribute('position', new THREE.BufferAttribute(positions3, 3));
      
      particleSystem1 = new THREE.Points(particles1, pMaterial);
      particleSystem2 = new THREE.Points(particles2, pMaterial);
      particleSystem3 = new THREE.Points(particles3, pMaterial);
      
      scene.add(particleSystem1);
      scene.add(particleSystem2);
      scene.add(particleSystem3);
    };
    
    const setupScrollAnimation = (light, c, path) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.documentElement,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        }
      });
      
      tl.to(tubePerc, {
        percent: 0.96,
        ease: "none",
        duration: 1,
        onUpdate: () => {
          cameraTargetPercentage = tubePerc.percent;
        }
      });
    };
    
    const updateCameraPercentage = (percentage, light, c, path) => {
      const p1 = path.getPointAt(percentage);
      const p2 = path.getPointAt(percentage + 0.03);
      
      c.position.set(p1.x, p1.y, p1.z);
      c.lookAt(p2);
      light.position.set(p2.x, p2.y, p2.z);
    };
    
    const render = (light, c, path) => {
      currentCameraPercentage = cameraTargetPercentage;
      
      camera.rotation.y += (cameraRotationProxyX - camera.rotation.y) / 15;
      camera.rotation.x += (cameraRotationProxyY - camera.rotation.x) / 15;
      
      updateCameraPercentage(currentCameraPercentage, light, c, path);
      
      // Animate particles
      if (particleSystem1 && particleSystem2 && particleSystem3) {
        particleSystem1.rotation.y += 0.00002;
        particleSystem2.rotation.x += 0.00005;
        particleSystem3.rotation.z += 0.00001;
      }
      
      // Animate texture
      if (texture) {
        texture.offset.x += 0.004;
      }
      
      composer.render();
      animationFrameId = requestAnimationFrame(() => render(light, c, path));
    };
    
    const handleResize = () => {
      ww = window.innerWidth;
      wh = window.innerHeight;
      
      if (camera) {
        camera.aspect = ww / wh;
        camera.updateProjectionMatrix();
      }
      
      if (renderer) {
        renderer.setSize(ww, wh);
      }
      
      if (composer) {
        composer.setSize(ww, wh);
      }
    };
    
    const handleMouseMove = (evt) => {
      cameraRotationProxyX = MathUtils.map(evt.clientX, 0, window.innerWidth, 3.24, 3.04);
      cameraRotationProxyY = MathUtils.map(evt.clientY, 0, window.innerHeight, -0.1, 0.1);
    };
    
    // Initialize the scene
    init();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Clean up function
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      // Dispose of Three.js resources
      if (renderer) {
        renderer.dispose();
      }
      
      // Kill GSAP animations
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);
  

  
  const handleAnimationComplete = () => {
    console.log('Tagline animation completed!');
  };

  const navItems = [
    {
      label: "About",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Company", ariaLabel: "About Company" },
        { label: "Careers", ariaLabel: "About Careers" }
      ]
    },
    {
      label: "Projects", 
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Featured", ariaLabel: "Featured Projects" },
        { label: "Case Studies", ariaLabel: "Project Case Studies" }
      ]
    },
    {
      label: "Contact",
      bgColor: "#271E37", 
      textColor: "#fff",
      links: [
        { label: "Email", ariaLabel: "Email us" },
        { label: "Twitter", ariaLabel: "Twitter" },
        { label: "LinkedIn", ariaLabel: "LinkedIn" }
      ]
    }
  ];
  
  return (
    <div className="scroll-background-container">
      <canvas ref={canvasRef} className="experience" />
      <div className="vignette-radial" />
      
      {/* Navigation */}
      <CardNav
        logo={logo}
        logoAlt="Company Logo"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.1)"
        menuColor="#fff"
        buttonBgColor="#4a90e2"
        buttonTextColor="#fff"
        ease="power3.out"
      />
      
      {/* Content Container */}
      <div ref={contentRef} className="content-container">
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <BlurText
              text="How can we serve your brand's needs?"
              delay={150}
              animateBy="words"
              direction="top"
              onAnimationComplete={handleAnimationComplete}
              className="hero-title"
            />
            <div className="hero-tags">
              <span>Web Development</span>
              <span>UI/UX Design</span>
              <span>Brand Strategy</span>
              <span>Digital Marketing</span>
            </div>
            <a href="#services" className="cta-button">Explore Our Services</a>
          </div>
        </section>



        {/* Services Section */}
        <section id="services" className="services">
          <div className="container">
            <h2>Our Services</h2>
            <div style={{ height: '700px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardSwap
                width={600}
                height={350}
                cardDistance={40}
                verticalDistance={35}
                delay={3000}
                pauseOnHover={false}
              >
                <Card>
                  <h3>Website Development</h3>
                  <p>Custom responsive websites and web applications built with cutting-edge technologies including React, Next.js, and Node.js. From concept to deployment, we create fast, secure, and scalable digital solutions.</p>
                  <p>• Mobile-first responsive design</p>
                  <p>• SEO-optimized architecture</p>
                  <p>• Advanced security features</p>
                  <p>• Cloud hosting & CDN integration</p>
                </Card>
                <Card>
                  <h3>SEO</h3>
                  <p>Search Engine Optimization strategies that boost your online visibility and drive organic traffic. We optimize your website to rank higher on Google with proven techniques and continuous monitoring.</p>
                  <p>• Keyword research & strategy</p>
                  <p>• Technical SEO audits</p>
                  <p>• Content optimization</p>
                  <p>• Local SEO & Google My Business</p>
                  <p>• Monthly performance reports</p>
                </Card>
                <Card>
                  <h3>Performance Advertising</h3>
                  <p>Data-driven advertising campaigns across Google Ads, Facebook, Instagram, and LinkedIn. Maximize your ROI with targeted ads that convert visitors into customers through strategic audience targeting.</p>
                  <p>• Google Ads & Shopping campaigns</p>
                  <p>• Social media advertising</p>
                  <p>• Retargeting & remarketing</p>
                  <p>• A/B testing & optimization</p>
                  <p>• Real-time campaign monitoring</p>
                </Card>
                <Card>
                  <h3>Tracking and Analytics</h3>
                  <p>Comprehensive analytics setup and monitoring to track user behavior, conversions, and campaign performance. Make informed decisions with actionable insights from advanced data analysis.</p>
                  <p>• Google Analytics 4 setup</p>
                  <p>• Conversion tracking</p>
                  <p>• Custom dashboard creation</p>
                  <p>• Heat mapping & user recordings</p>
                  <p>• Monthly insights reports</p>
                </Card>
                <Card>
                  <h3>Digital Consulting</h3>
                  <p>Strategic digital transformation guidance to help your business thrive online. From technology audits to growth strategies, we provide expert consultation for sustainable digital success.</p>
                  <p>• Digital strategy development</p>
                  <p>• Technology stack recommendations</p>
                  <p>• Competitive analysis</p>
                  <p>• Growth hacking strategies</p>
                  <p>• ROI optimization planning</p>
                </Card>
                <Card>
                  <h3>eCommerce AI</h3>
                  <p>AI-powered eCommerce solutions including personalized recommendations, intelligent chatbots, automated inventory management, and smart customer service to boost sales and enhance user experience.</p>
                  <p>• AI product recommendations</p>
                  <p>• Intelligent chatbots</p>
                  <p>• Automated inventory management</p>
                  <p>• Dynamic pricing optimization</p>
                  <p>• Predictive analytics</p>
                </Card>
              </CardSwap>
            </div>
          </div>
        </section>

        {/* Company Info Section */}
        <section className="company-info">
          <div className="container">
            <div className="company-badge">
              <span className="badge">Level 1 B-BBEE Company</span>
            </div>
            <h2>Digital Marketing Solutions</h2>
            <div className="intro-content">
              <p>Online visibility isn't as simple as it once was. Search engine algorithms are constantly evolving and with the introduction of AI and machine learning, it's harder than ever to connect with your target audience. Plus27 Digital can help connect your brand to your new and existing audiences, increasing online visibility and driving growth.</p>
              
              <p>Focusing on lead generation through a multi-channel strategy, you can benefit from platforms such as Google Ads and paid social media, including Meta, TikTok, or even LinkedIn. Earned media, such as content marketing and SEO, will help enhance visibility. Programmatic ads increase brand awareness and reconnect potential customers. This holistic approach attracts quality leads, driving targeted traffic to your website and improving performance at every touchpoint.</p>
              
              <p>We take a 360-degree approach to digital marketing. This includes tracking, reporting, creative advertising, and web development. Our team achieves results by focusing on a results-first mindset. We use data-driven insights to develop targeted strategies. These strategies grab attention and turn interest into quality leads. Let's team up to get the most from your digital marketing investment and boost your online growth.</p>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="process-section">
  <div className="container">
    <h2>Check out how we operate</h2>
    <div className="process-grid">
      <ElectricBorder
        color="#7df9ff"
        speed={1}
        chaos={0.5}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">01</div>
          <h3>The Introduction Phase</h3>
          <p>We start by getting to know your brand inside out. In our initial consultation, we concentrate on understanding what you want to achieve, the challenges you face, and what matters most to you. This discovery phase ensures we're on the same page as you, setting the stage for a partnership that truly works together.</p>
        </div>
      </ElectricBorder>
      
      <ElectricBorder
        color="#7df9ff"
        speed={1.2}
        chaos={0.4}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">02</div>
          <h3>The Research Phase</h3>
          <p>We conduct a competitor analysis, industry audits, and keyword research to understand the market and identify key opportunities. This reveals competitor channel effectiveness, traffic sources, and successful visitor acquisition strategies. We translate these insights into a data-driven digital strategy that gives your brand a distinct competitive edge.</p>
        </div>
      </ElectricBorder>
      
      <ElectricBorder
        color="#7df9ff"
        speed={0.8}
        chaos={0.6}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">03</div>
          <h3>The Planning Phase</h3>
          <p>The insights create a blueprint for a data driven digital strategy. We prioritise high impact channels, allocate budgets using proven ROI models, and implement website enhancements where necessary, all grounded in industry best practices. By focusing on relevance and performance, we ensure all campaigns are strategically created to maximise performance from launch.</p>
        </div>
      </ElectricBorder>
      
      <ElectricBorder
        color="#7df9ff"
        speed={1.1}
        chaos={0.3}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">04</div>
          <h3>The Implementation Phase</h3>
          <p>To ensure accurate campaign measurement and optimisation, we implement a comprehensive tracking framework before launch. This includes setting up consent mode, enhanced conversion tracking, integrating social media pixels and CAPI, and other essential components. This ensures reliable attribution for campaigns running across multiple channels, providing clear insights for performance analysis.</p>
        </div>
      </ElectricBorder>
      
      <ElectricBorder
        color="#7df9ff"
        speed={0.9}
        chaos={0.5}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">05</div>
          <h3>The Optimisation Phase</h3>
          <p>We monitor and optimise all campaigns on an ongoing basis, using data from both the engine and the tracking framework. We look at audience targeting and key performance metrics. This helps us find the best channels and top campaigns. We optimise by pacing budgets, refining bid strategies, A/B testing ad creatives, and more to improve key metrics.</p>
        </div>
      </ElectricBorder>
      
      <ElectricBorder
        color="#7df9ff"
        speed={1.3}
        chaos={0.4}
        thickness={2}
        style={{ borderRadius: 16 }}
      >
        <div className="process-card">
          <div className="process-number">06</div>
          <h3>The Reporting Phase</h3>
          <p>Transparency is crucial to success, and so we provide clear, actionable reports that highlight campaign performance, key metrics, and ROI. We provide regular updates and detailed analysis. This helps you see your progress toward your goals. You'll know what works and where the opportunities are. Our data driven insights empower you to make informed decisions, refining strategies for growth.</p>
        </div>
      </ElectricBorder>
    </div>
  </div>
</section>

        {/* Digital Strategy Section */}
        <section className="digital-strategy">
          <div className="container">
            <h2>Think Differently About Digital And Its Possibilities For Your Brand</h2>
            <div className="strategy-content">
              <div className="strategy-highlight">
                <h3>Turn Clicks into Customers</h3>
                <p>Successful brands don't just have a website and social media page - they build digital into their DNA. As a brand, you need to design meaningful experiences that connect with your audience. Then leverage this data to deliver relevant messaging in the right place at the right time. As a brand, you need to see digital as a strategy rather than a mix of channels.</p>
              </div>
              
              <div className="strategy-cta">
                <p>At Plus27 Digital, we help brands thrive online. We go beyond just showing up. Our expertise keeps you connected to top marketing solutions and future digital opportunities. Let's create a digital strategy that grows with your business goals.</p>
                <a href="#contact" className="cta-button">Start Your Digital Journey</a>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="about">
          <div className="container">
            <div className="about-content">
              <span className="badge">About Us</span>
              <h2>We Create Digital Excellence</h2>
              <p>Our team of experts is dedicated to delivering innovative solutions that drive growth and engagement. With years of experience in the industry, we understand what it takes to make your brand stand out.</p>
              <p>We combine creativity with technical expertise to build digital experiences that resonate with your audience and achieve your business objectives.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="container">
            <h2>Ready to Transform Your Brand?</h2>
            <h3>Let's discuss your project</h3>
            <p>We'll work with you to understand your goals and create a customized strategy that delivers results.</p>
            <a href="#contact" className="cta-button">Get Started Today</a>
            <p className="highlight">No obligation, just a friendly conversation</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="container">
            <p>&copy; 2025 Your Brand. All rights reserved...</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ScrollBackground;