import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BlurText from './BlurText';
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
  const cardStackRef = useRef(null);
  
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
  
  // Setup card stack animations
  useEffect(() => {
    if (!cardStackRef.current) return;
    
    const cards = Array.from(cardStackRef.current.querySelectorAll('.card-item'));
    
    // Set up initial card styles
    cards.forEach((card, i) => {
      card.style.transform = `translateY(${i * 50}px) scale(${1 - i * 0.1})`;
      card.style.opacity = 1 - i * 0.2;
      card.style.filter = `blur(${i * 2}px)`;
      card.style.zIndex = cards.length - i;
    });
    
    // Create GSAP animations for the stack effect
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: cardStackRef.current,
        start: "top center",
        end: "bottom center",
        scrub: 1,
      }
    });
    
    // Animate each card
    cards.forEach((card, i) => {
      const targetScale = 1 - i * 0.05;
      const targetY = i * 20;
      const targetOpacity = 1 - i * 0.1;
      const targetBlur = i * 1;
      
      tl.to(card, {
        scale: targetScale,
        y: targetY,
        opacity: targetOpacity,
        filter: `blur(${targetBlur}px)`,
        duration: 1,
        ease: "none"
      }, 0);
    });
    
    return () => {
      // Clean up ScrollTrigger instances
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.trigger === cardStackRef.current) {
          trigger.kill();
        }
      });
    };
  }, []);
  
  const handleAnimationComplete = () => {
    console.log('Tagline animation completed!');
  };
  
  return (
    <div className="scroll-background-container">
      <canvas ref={canvasRef} className="experience" />
      <div className="vignette-radial" />
      
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

        {/* Card Stack Section */}
        <section className="card-stack-section">
          <div ref={cardStackRef} className="card-stack-container">
            <div className="card-item">
              <h2>Card 1</h2>
              <p>This is the first card with beautiful scroll animations and smooth transitions.</p>
            </div>
            <div className="card-item">
              <h2>Card 2</h2>
              <p>This is the second card featuring amazing scaling and blur effects.</p>
            </div>
            <div className="card-item">
              <h2>Card 3</h2>
              <p>This is the third card with stunning depth and transparency effects.</p>
            </div>
            <div className="card-item">
              <h2>Card 4</h2>
              <p>This is the fourth card showcasing the complete animation system.</p>
            </div>
            <div className="card-item">
              <h2>Card 5</h2>
              <p>This is the final card demonstrating the full range of capabilities.</p>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="services">
          <div className="container">
            <h2>Our Services</h2>
            <div className="services-grid">
              <div className="service-card">
                <h3>Web Development</h3>
                <p>Custom websites and web applications built with modern technologies for optimal performance.</p>
                <button className="read-more">Learn More</button>
              </div>
              <div className="service-card">
                <h3>UI/UX Design</h3>
                <p>User-centered designs that create seamless and engaging digital experiences.</p>
                <button className="read-more">Learn More</button>
              </div>
              <div className="service-card">
                <h3>Brand Strategy</h3>
                <p>Comprehensive branding solutions to establish your unique identity in the market.</p>
                <button className="read-more">Learn More</button>
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
            <p>&copy; 2023 Your Brand. All rights reserved...</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ScrollBackground;