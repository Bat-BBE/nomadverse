'use client';
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { env, stepEnv } from '@/game/tod';
import { useGame, world } from '@/game/store';

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // keep at far plane
}`;

const skyFrag = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSkySun;
uniform vec3 uGround;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 sd = normalize(uSunDir);
  float h = d.y;
  // warm horizon on the sun's side, cooler on the far side
  float az = dot(normalize(d.xz + 1e-5), normalize(sd.xz + 1e-5)) * 0.5 + 0.5;
  vec3 horizon = mix(uHorizon * vec3(0.92, 0.95, 1.05), uSkySun, pow(az, 3.0) * uGlow * 0.75);
  float band = pow(smoothstep(-0.02, 0.5, h), 0.5);
  vec3 col = mix(horizon, uTop, band);
  // thin bright layer right at the horizon
  col += uSkySun * exp(-abs(h) * 28.0) * 0.18 * uGlow * az;
  col = mix(col, uGround, smoothstep(0.0, -0.12, h));
  float s = max(dot(d, sd), 0.0);
  col += uSun * pow(s, 6.0) * 0.28 * uGlow;
  col += uSun * pow(s, 48.0) * 0.55 * uGlow;
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9985, 0.9993, s) * 3.0; // sun disc (blooms)
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const starVert = /* glsl */ `
attribute float aSize;
uniform float uTime;
varying float vTw;
void main() {
  vTw = 0.6 + 0.4 * sin(uTime * 1.7 + position.x * 13.0 + position.z * 7.0);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.9999;
  gl_PointSize = aSize;
}`;

const starFrag = /* glsl */ `
uniform float uOpacity;
varying float vTw;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * uOpacity * vTw;
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), a);
}`;

export function Sky() {
  const tod = useGame((s) => s.tod);
  const scene = useThree((s) => s.scene);
  const skyRef = useRef<THREE.Mesh>(null);
  const starRef = useRef<THREE.Points>(null);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: env.skyTop },
          uHorizon: { value: env.skyHorizon },
          uSkySun: { value: env.skySun },
          uGround: { value: env.ground },
          uSun: { value: env.sun },
          uSunDir: { value: env.sunDir },
          uGlow: { value: 1 },
        },
      }),
    []
  );

  const stars = useMemo(() => {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const y = Math.abs(u) * 0.95 + 0.05;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * r * 900, y * 900, Math.sin(th) * r * 900], i * 3);
      size[i] = Math.random() < 0.05 ? 3.2 : 1.2 + Math.random() * 1.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
    });
    return { g, m };
  }, []);

  useFrame(({ camera, clock }, dt) => {
    stepEnv(tod, Math.min(dt, 0.1));
    world.time = clock.elapsedTime;
    skyMat.uniforms.uGlow.value = env.glow;
    skyRef.current?.position.copy(camera.position);
    starRef.current?.position.copy(camera.position);
    stars.m.uniforms.uOpacity.value = env.stars;
    stars.m.uniforms.uTime.value = clock.elapsedTime;
    if (starRef.current) starRef.current.visible = env.stars > 0.02;
    if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(env.fog);
  });

  return (
    <>
      <mesh ref={skyRef} material={skyMat} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[950, 32, 16]} />
      </mesh>
      <points ref={starRef} geometry={stars.g} material={stars.m} frustumCulled={false} renderOrder={-9} />
    </>
  );
}

export function Lights() {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const px = world.player.x;
    const pz = world.player.z;
    target.position.set(px, 0, pz);
    target.updateMatrixWorld();
    l.position.set(px + env.sunDir.x * 80, Math.max(env.sunDir.y, 0.15) * 80, pz + env.sunDir.z * 80);
    l.color.copy(env.sun);
    l.intensity = env.sunIntensity;
    if (hemi.current) {
      hemi.current.color.copy(env.hemiSky);
      hemi.current.groundColor.copy(env.hemiGround);
      hemi.current.intensity = env.hemiIntensity;
    }
  });

  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#bcd3ef', '#8a7a52', 0.9]} />
      <directionalLight
        ref={sun}
        target={target}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
    </>
  );
}
