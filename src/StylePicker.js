import * as THREE from 'three';
import * as xb from 'xrblocks';
import {CONFIG} from './config.js';

// 職責：TARGETED 期間顯示選單。
// 輸入：目標位置與朝向。輸出：選定的風格代號。
//
// 點擊判定沿用步驟 1.3 驗證過的模式：不用 xb.MeshScript + onObjectSelectStart
// （CLAUDE.md 記錄這個寫法沒有範例可抄），改成在這個 Script 上覆寫
// onSelectStart(event)，比對 event.surface 是不是選單裡的某個方塊。
export class StylePicker extends xb.Script {
  constructor({task}) {
    super();
    this.task = task;
    this.cubes = []; // {mesh, style}
    this.onSelected = null;
  }

  show({position, quaternion, onSelected}) {
    this.hide(); // 保險：上一輪沒清乾淨就先清掉

    this.onSelected = onSelected;

    // 選單中心：目標位置沿法向量向外 pickerDistance，跟目標同高。
    const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
    const menuCenter = position.clone().addScaledVector(normal, CONFIG.pickerDistance);
    menuCenter.y = position.y;

    // 四個方塊沿面板水平軸排列，間距 pickerSpacing。
    const step = CONFIG.pickerCubeSize + CONFIG.pickerSpacing;
    const offsets = [-1.5, -0.5, 0.5, 1.5];

    CONFIG.styles.forEach((style, i) => {
      const geometry = new THREE.BoxGeometry(
        CONFIG.pickerCubeSize,
        CONFIG.pickerCubeSize,
        CONFIG.pickerCubeSize
      );
      const material = new THREE.MeshBasicMaterial({
        color: CONFIG.fallbackColors[style] ?? 0xffffff,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(menuCenter).addScaledVector(right, offsets[i] * step);
      mesh.quaternion.copy(quaternion);
      this.add(mesh);
      this.cubes.push({mesh, style});

      const loader = new THREE.TextureLoader();
      loader.load(
        `assets/styles/${this.task}_${style}.png`,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        () => {} // 載入失敗：保留純色
      );
    });
  }

  onSelectStart(event) {
    const hit = this.cubes.find((cube) => cube.mesh === event.surface);
    if (!hit) return;

    const callback = this.onSelected;
    this.hide(); // spec：選定後立即隱藏
    callback?.(hit.style);
  }

  hide() {
    for (const {mesh} of this.cubes) {
      this.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.cubes = [];
    this.onSelected = null;
  }
}
