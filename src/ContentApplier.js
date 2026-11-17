import * as THREE from 'three';
import * as xb from 'xrblocks';
import {CONFIG} from './config.js';

// 職責：DONE。在目標位置建立貼有對應圖片的平面。
// 輸入：{position, quaternion, task, style}。
export class ContentApplier extends xb.Script {
  show({position, quaternion, task, style}) {
    this.clear(); // 保險：如果上一輪還沒清乾淨就又顯示，先清掉

    const geometry = new THREE.PlaneGeometry(CONFIG.panelSize, CONFIG.panelSize);
    const material = new THREE.MeshBasicMaterial({
      color: CONFIG.fallbackColors[style] ?? 0xffffff,
      side: THREE.DoubleSide,
    });
    this.panel = new THREE.Mesh(geometry, material);
    this.panel.position.copy(position);
    this.panel.quaternion.copy(quaternion);
    this.add(this.panel);

    // 檔名規則：${task}_${style}.png（spec 第 6 節）。
    // 圖還沒放進 assets/styles/ 時，載入會失敗，維持前面設好的純色即可。
    const loader = new THREE.TextureLoader();
    loader.load(
      `assets/styles/${task}_${style}.png`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        material.map = texture;
        material.color.set(0xffffff);
        material.needsUpdate = true;
      },
      undefined,
      () => {} // 載入失敗：保留純色，不用額外處理
    );
  }

  // 按 R 重置時呼叫，把目前顯示的面板清掉。
  clear() {
    if (!this.panel) return;
    this.remove(this.panel);
    this.panel.geometry.dispose();
    this.panel.material.dispose();
    this.panel = null;
  }
}
