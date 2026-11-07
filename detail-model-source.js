import * as THREE from 'three';

const canvas = document.querySelector('#model-canvas');
const detail = window.filmDetail;
if (canvas && detail) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 2, 0.1, 100);
  camera.position.set(0, 0.25, 4.7);
  scene.add(new THREE.HemisphereLight(0xffedda, 0x2a130a, 2.2));
  const key = new THREE.DirectionalLight(0xffd6a7, 3.1);
  key.position.set(3, 5, 5);
  scene.add(key);
  const group = new THREE.Group();
  // Locked orthographic-like front view: no perspective yaw or user rotation.
  group.rotation.set(0, 0, Math.PI / 2);
  group.scale.setScalar(1.22);
  scene.add(group);

  const title = detail.filmName.split(/\s+/);
  const canvasLabel = document.createElement('canvas');
  canvasLabel.width = 512; canvasLabel.height = 256;
  const context = canvasLabel.getContext('2d');
  context.fillStyle = detail.filmColor; context.fillRect(0, 0, 512, 256);
  context.fillStyle = '#1c1813'; context.fillRect(0, 0, 512, 38); context.fillRect(0, 218, 512, 38);
  context.fillStyle = '#1b1712'; context.textAlign = 'center';
  context.font = '900 26px Arial'; context.fillText(title[0] || 'FILM', 256, 29);
  context.font = '900 43px Arial'; context.fillText(title.slice(1, -1).join(' ') || '35MM', 256, 113);
  context.font = '900 78px Arial'; context.fillText(title.at(-1) || '400', 256, 196);
  context.font = '700 15px Arial'; context.fillText('35mm · COLOR NEGATIVE · 36 EXP', 256, 242);
  const labelMap = new THREE.CanvasTexture(canvasLabel);
  labelMap.colorSpace = THREE.SRGBColorSpace;
  // CylinderGeometry 的正面 UV 在接缝处；偏移半圈让品牌标签正对镜头。
  labelMap.wrapS = THREE.RepeatWrapping;
  labelMap.offset.x = 0.5;
  const core = new THREE.MeshStandardMaterial({ color: 0x292724, roughness: 0.55, metalness: 0.08 });
  const label = new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.42, metalness: 0.03 });
  const cap = new THREE.MeshStandardMaterial({ color: 0x201f1d, roughness: 0.36, metalness: 0.38 });
  const parts = [
    new THREE.Mesh(new THREE.CylinderGeometry(.71, .71, 2.24, 48), core),
    new THREE.Mesh(new THREE.CylinderGeometry(.722, .722, 1.74, 48, 1, true), label),
    new THREE.Mesh(new THREE.CylinderGeometry(.79, .79, .16, 48), cap),
    new THREE.Mesh(new THREE.CylinderGeometry(.79, .79, .16, 48), cap),
    new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .15, 24), cap),
    new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .15, 24), cap),
  ];
  parts[2].position.y = 1.2; parts[3].position.y = -1.2; parts[4].position.y = 1.34; parts[5].position.y = -1.34;
  parts.forEach((part) => group.add(part));
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function animate() { requestAnimationFrame(animate); resize(); renderer.render(scene, camera); }
  animate();
}
