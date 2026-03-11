import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface OrbVisualizationProps {
  state?: 'idle' | 'active' | 'thinking' | 'success';
  size?: number;
}

export function OrbVisualization({ state = 'idle', size = 200 }: OrbVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    points?: THREE.Points;
    animationId?: number;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = size;
    const height = size;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particle system
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Create sphere pattern
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const radius = 2.5;
      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Color based on state
      const color = new THREE.Color(0x1850ee); // Primary blue
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom shader material
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uScale;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Gentle breathing animation
          float breath = sin(uTime * 0.5) * 0.1;
          pos *= (1.0 + breath);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (20.0 * uScale) / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          if (dist > 0.5) discard;

          float alpha = 1.0 - (dist * 2.0);
          alpha = pow(alpha, 2.0);

          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Store references
    sceneRef.current = { scene, camera, renderer, points };

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      const animationId = requestAnimationFrame(animate);
      sceneRef.current.animationId = animationId;

      const delta = clock.getElapsedTime();

      if (material.uniforms) {
        material.uniforms.uTime.value = delta;

        // Scale based on state
        const targetScale = state === 'active' ? 1.2 : state === 'thinking' ? 1.1 : 1.0;
        material.uniforms.uScale.value += (targetScale - material.uniforms.uScale.value) * 0.05;
      }

      // Gentle rotation
      points.rotation.y = delta * 0.15;
      points.rotation.x = Math.sin(delta * 0.1) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [state, size]);

  return (
    <div
      ref={containerRef}
      className="orb-visualization"
      style={{
        width: size,
        height: size,
        background: 'transparent',
        filter: 'drop-shadow(0 0 30px rgba(24, 80, 238, 0.4))'
      }}
    />
  );
}
