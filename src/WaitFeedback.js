import * as THREE from 'three';
import * as xb from 'xrblocks';
import {CONFIG} from './config.js';

// 職責：WAITING 全程（研究核心）。三條件（C1/C2/C3）的差異全部封裝在
// 這裡，PlacementController、ContentApplier 都不需要知道現在是哪個條件。
// 規則見 docs/spec.md 第 3 節。
//
// 計時用 performance.now() 在 update() 裡逐幀比對，不用 setTimeout，
// 這樣 C3 才能逐幀更新不透明度、不會跟計時漂移（spec 第 4 節）。
export class WaitFeedback extends xb.Script {
  // position/quaternion：面板要放的位置與朝向（PlacementController 算好的）。
  // condition：'C1' / 'C2' / 'C3'。
  // style：所選風格，C2/C3 填充層用它的 fallbackColors。
  // duration：等待秒數。
  // onDone：計時結束時呼叫。
  start({position, quaternion, condition, style, duration, onDone}) {
    this.clearMeshes(); // 保險：如果上一輪還沒清乾淨就又開始，先清掉

    this.condition = condition;
    this.duration = duration;
    this.onDone = onDone;
    this.startTime = performance.now();

    // C1：等待期間不建立任何 mesh。
    if (condition !== 'C2' && condition !== 'C3') return;

    // 面板的本地 -Z 軸對齊牆面法向量（見 PlacementController），
    // 所以從 quaternion 反推法向量方向，讓填充層沿法向量再往外一點點。
    const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

    // 邊框層（後）：比填充層大一圈，不透明度固定 0.7，三條件都一樣。
    const borderGeometry = new THREE.PlaneGeometry(
      CONFIG.borderSize,
      CONFIG.borderSize
    );
    const borderMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.placeholderColor,
      transparent: true,
      opacity: CONFIG.borderOpacity,
      depthWrite: false, // 兩層半透明重疊，避免深度寫入造成遮擋瑕疵
      side: THREE.DoubleSide,
    });
    this.borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    this.borderMesh.position.copy(position);
    this.borderMesh.quaternion.copy(quaternion);
    this.add(this.borderMesh);

    // 填充層（前）：顏色為所選風格色（C2、C3 相同）。
    // C2 固定 c2Opacity，C3 從 c3OpacityStart 開始（update() 裡逐幀往上加）。
    const fillGeometry = new THREE.PlaneGeometry(
      CONFIG.panelSize,
      CONFIG.panelSize
    );
    const startOpacity =
      condition === 'C2' ? CONFIG.c2Opacity : CONFIG.c3OpacityStart;
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: CONFIG.fallbackColors[style] ?? CONFIG.placeholderColor,
      transparent: true,
      opacity: startOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    this.fillMesh.position
      .copy(position)
      .addScaledVector(normal, CONFIG.layerGap);
    this.fillMesh.quaternion.copy(quaternion);
    this.add(this.fillMesh);
  }

  update() {
    if (!this.onDone) return; // 還沒開始，或已經結束

    const elapsed = (performance.now() - this.startTime) / 1000;

    if (this.condition === 'C3' && this.fillMesh) {
      const t = Math.min(elapsed / this.duration, 1);
      const eased = CONFIG.c3Easing(t);
      this.fillMesh.material.opacity =
        CONFIG.c3OpacityStart +
        (CONFIG.c3OpacityEnd - CONFIG.c3OpacityStart) * eased;
    }

    if (elapsed >= this.duration) {
      const onDone = this.onDone;
      this.onDone = null;
      this.clearMeshes();
      onDone();
    }
  }

  // 清除自己建立的所有 mesh 並釋放材質（spec 第 4 節）。
  clearMeshes() {
    for (const mesh of [this.borderMesh, this.fillMesh]) {
      if (!mesh) continue;
      this.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.borderMesh = null;
    this.fillMesh = null;
  }
}
