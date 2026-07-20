/**
 * Arys AI v1.5.1 — Advanced 3D Background System
 *
 * Features:
 * - Lightweight Three.js particle system
 * - Animated 3D geometric objects (cubes, spheres, torus)
 * - Wireframe AI core with rotation
 * - Particle background with depth
 * - CSS animation fallback
 * - Performance-optimized for low-end devices
 * - Automatic pause when tab is hidden
 */

import { isMobile, debounce } from "./utils.js";

// ============================================================
// State Management
// ============================================================
let scene, camera, renderer;
let particles, floaters = [];
let aiCore, rotatingObjects = [];
let animationId = null;
let isRunning = false;
let performanceMode = false;

// ============================================================
// Initialize Three.js 3D background
// ============================================================
export function init3D() {
    // Don't initialize twice
    if (isRunning) return;

    // Performance settings based on device
    performanceMode = isMobile();
    const particleCount = performanceMode ? 30 : 60;
    const floaterCount = performanceMode ? 3 : 5;

    try {
        const container = document.getElementById("threeContainer");
        if (!container || container.querySelector("canvas")) return;

        // Scene setup
        scene = new THREE.Scene();
        scene.background = null;

        // Camera with better perspective
        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 40;
        camera.position.y = 5;

        // Renderer with performance optimizations
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !performanceMode,
            powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Advanced particle system with depth
        createParticleSystem(particleCount);

        // Create floating 3D objects
        createFloaters(floaterCount);

        // Create AI core centerpiece
        createAICore();

        // Event listeners
        window.addEventListener("resize", debounce(onResize, 250));

        // Start animation
        isRunning = true;
        animate();

        console.log("3D background initialized with", particleCount, "particles and", floaterCount, "floaters");
    } catch (e) {
        console.warn("3D background failed to load:", e.message);
        setupCSSFallback();
    }
}

// ============================================================
// Create advanced particle system
// ============================================================
function createParticleSystem(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Create spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 25 + Math.random() * 15;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi) - 10;

        sizes[i] = 0.1 + Math.random() * 0.3;

        // Vary particle colors slightly
        const colorFactor = 0.8 + Math.random() * 0.4;
        colors[i * 3] = colorFactor;
        colors[i * 3 + 1] = colorFactor;
        colors[i * 3 + 2] = colorFactor;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// ============================================================
// Create floating 3D geometric objects
// ============================================================
function createFloaters(count) {
    const shapes = [
        { type: "box", size: [1.4, 1.4, 1.4], color: 0xffffff, opacity: 0.12, wireframe: true },
        { type: "sphere", size: 1.0, color: 0xffffff, opacity: 0.08, wireframe: true },
        { type: "tetrahedron", size: 1.2, color: 0xffffff, opacity: 0.15, wireframe: true },
        { type: "octahedron", size: 1.0, color: 0xffffff, opacity: 0.10, wireframe: true },
        { type: "icosahedron", size: 1.1, color: 0xffffff, opacity: 0.14, wireframe: true },
        { type: "torus", size: [1.8, 0.4], color: 0xffffff, opacity: 0.09, wireframe: true },
    ];

    for (let i = 0; i < count; i++) {
        const shape = shapes[i % shapes.length];
        let geometry, mesh;

        switch (shape.type) {
            case "box":
                geometry = new THREE.BoxGeometry(...shape.size);
                break;
            case "sphere":
                geometry = new THREE.SphereGeometry(shape.size, 16, 16);
                break;
            case "tetrahedron":
                geometry = new THREE.TetrahedronGeometry(shape.size);
                break;
            case "octahedron":
                geometry = new THREE.OctahedronGeometry(shape.size);
                break;
            case "icosahedron":
                geometry = new THREE.IcosahedronGeometry(shape.size, 0);
                break;
            case "torus":
                geometry = new THREE.TorusGeometry(...shape.size, 8, 16);
                break;
            default:
                geometry = new THREE.BoxGeometry(...shape.size);
        }

        const material = new THREE.MeshBasicMaterial({
            color: shape.color,
            wireframe: shape.wireframe,
            transparent: true,
            opacity: shape.opacity,
            side: THREE.DoubleSide,
        });

        mesh = new THREE.Mesh(geometry, material);

        // Position in 3D space
        mesh.position.set(
            (Math.random() - 0.5) * 35,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 20 - 15
        );

        // Random rotation
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        // Animation properties
        mesh.userData = {
            rotSpeedX: (Math.random() - 0.5) * 0.003,
            rotSpeedY: (Math.random() - 0.5) * 0.003,
            rotSpeedZ: (Math.random() - 0.5) * 0.002,
            floatSpeed: 0.3 + Math.random() * 0.4,
            floatAmp: 1.0 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            scalePulse: 0.9 + Math.random() * 0.2,
        };

        scene.add(mesh);
        floaters.push(mesh);
    }
}

// ============================================================
// Create AI Core Centerpiece
// ============================================================
function createAICore() {
    // Core sphere
    const coreGeometry = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
    });

    aiCore = new THREE.Mesh(coreGeometry, coreMaterial);
    aiCore.position.set(0, 0, -10);

    // Add rotating rings around core
    const ringCount = 3;
    const ringGroup = new THREE.Group();

    for (let i = 0; i < ringCount; i++) {
        const ringGeometry = new THREE.TorusGeometry(2.8 + i * 0.6, 0.15, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.12 - i * 0.03,
            side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        // Position rings on different axes
        if (i === 0) {
            ring.rotation.x = Math.PI / 4;
        } else if (i === 1) {
            ring.rotation.y = Math.PI / 4;
        } else {
            ring.rotation.z = Math.PI / 4;
        }

        ring.userData = {
            rotationSpeed: (0.002 + i * 0.001) * (Math.random() > 0.5 ? 1 : -1),
            rotationAxis: i === 0 ? 'x' : i === 1 ? 'y' : 'z',
        };

        ringGroup.add(ring);
        rotatingObjects.push(ring);
    }

    aiCore.add(ringGroup);
    scene.add(aiCore);

    // Add core to rotating objects
    rotatingObjects.push(aiCore);
    aiCore.userData = {
        rotationSpeed: 0.001,
        rotationAxis: 'y',
    };
}

// ============================================================
// Animation loop with performance optimization
// ============================================================
function animate() {
    if (!isRunning) return;
    animationId = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // Animate particles with depth-based movement
    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        const sizes = particles.geometry.attributes.size.array;

        for (let i = 0; i < positions.length; i += 3) {
            // Depth-based animation
            const depthFactor = 1 - Math.abs(positions[i + 2]) / 50;
            positions[i] += Math.sin(time * 0.5 + i * 0.1) * 0.01 * depthFactor;
            positions[i + 1] += Math.cos(time * 0.3 + i * 0.1) * 0.015 * depthFactor;

            // Size pulsing
            sizes[i / 3] = 0.15 + Math.sin(time * 2 + i) * 0.05;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.size.needsUpdate = true;
    }

    // Animate floating objects
    if (floaters.length > 0) {
        floaters.forEach((mesh, idx) => {
            const data = mesh.userData;
            mesh.rotation.x += data.rotSpeedX;
            mesh.rotation.y += data.rotSpeedY;
            mesh.rotation.z += data.rotSpeedZ || 0;

            // Floating animation
            mesh.position.y += Math.sin(time * data.floatSpeed + data.phase) * 0.008 * data.floatAmp;

            // Subtle scale pulsing
            const scale = data.scalePulse * (1 + Math.sin(time * 1.5 + idx) * 0.05);
            mesh.scale.set(scale, scale, scale);
        });
    }

    // Animate AI core and rings
    if (rotatingObjects.length > 0) {
        rotatingObjects.forEach(obj => {
            const data = obj.userData;
            if (data.rotationAxis === 'x') {
                obj.rotation.x += data.rotationSpeed;
            } else if (data.rotationAxis === 'y') {
                obj.rotation.y += data.rotationSpeed;
            } else if (data.rotationAxis === 'z') {
                obj.rotation.z += data.rotationSpeed;
            }
        });
    }

    // Render if available
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ============================================================
// Stop 3D animation
// ============================================================
export function stop3D() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ============================================================
// Clean up resources
// ============================================================
export function dispose3D() {
    stop3D();
    window.removeEventListener("resize", onResize);

    if (renderer) {
        // Dispose geometries and materials
        if (particles) {
            particles.geometry.dispose();
            particles.material.dispose();
        }

        floaters.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        if (aiCore) {
            aiCore.traverse(obj => {
                if (obj.isMesh) {
                    obj.geometry.dispose();
                    obj.material.dispose();
                }
            });
        }

        renderer.dispose();
        const canvas = renderer.domElement;
        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    }

    // Clear references
    scene = null;
    camera = null;
    renderer = null;
    particles = null;
    floaters = [];
    aiCore = null;
    rotatingObjects = [];
}

// ============================================================
// Resize handler
// ============================================================
function onResize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
// CSS fallback animation
// ============================================================
function setupCSSFallback() {
    const container = document.getElementById("threeContainer");
    if (!container) return;

    // Create floating particles with CSS
    for (let i = 0; i < 20; i++) {
        const dot = document.createElement("div");
        dot.className = "particle-dot";
        dot.style.cssText = `
            position: absolute;
            width: ${2 + Math.random() * 6}px;
            height: ${2 + Math.random() * 6}px;
            background: rgba(255,255,255,${0.1 + Math.random() * 0.2});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            pointer-events: none;
            animation: floatParticle ${8 + Math.random() * 12}s infinite ease-in-out;
            animation-delay: ${Math.random() * 6}s;
            will-change: transform, opacity;
        `;
        container.appendChild(dot);
    }

    // Add some wireframe-like elements
    for (let i = 0; i < 3; i++) {
        const wireframe = document.createElement("div");
        wireframe.className = "wireframe-fallback";
        wireframe.style.cssText = `
            position: absolute;
            width: ${40 + Math.random() * 60}px;
            height: ${40 + Math.random() * 60}px;
            border: 1px solid rgba(255,255,255,0.08);
            left: ${Math.random() * 80 + 10}%;
            top: ${Math.random() * 80 + 10}%;
            pointer-events: none;
            animation: spin-slow ${20 + Math.random() * 10}s linear infinite;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            opacity: ${0.05 + Math.random() * 0.1};
        `;
        container.appendChild(wireframe);
    }
}

// ============================================================
// Performance optimization - reduce quality on mobile
// ============================================================
export function setPerformanceMode(enabled) {
    performanceMode = enabled;
    if (isRunning) {
        // Re-initialize with new settings
        dispose3D();
        init3D();
    }
}

// ============================================================
// Auto-pause when tab is not visible
// ============================================================
export function handleVisibilityChange() {
    if (document.hidden) {
        stop3D();
    } else {
        if (document.getElementById("threeContainer")) {
            init3D();
        }
    }
}