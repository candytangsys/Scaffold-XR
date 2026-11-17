import * as THREE from 'three';
import * as xb from 'xrblocks';
import {CONFIG} from './config.js';

// 職責：IDLE → TARGETED。
// 使用者點一面垂直牆時，判斷是否為有效目標，並算出面板該放的
// 位置與朝向。判定規則見 docs/spec.md 第 2 節，朝向規則見第 3 節。
//
// XR Blocks 每幀會自動對整個場景做 raycast，選取時把結果放進
// onSelectStart(event) 的 event.surface（點到的物件）與
// event.intersection（交點資訊）。這裡不用自己寫 raycast。
// 參考：google/xrblocks templates/03_spatial_placement/main.js
// （onSelectStart 讀 event.surface / event.intersection 的寫法）。
export class PlacementController extends xb.Script {
  constructor({onPlaced}) {
    super();
    this.onPlaced = onPlaced;
  }

  onSelectStart(event) {
    const surface = event.surface;
    const intersection = event.intersection;
    if (!surface || !intersection) return;

    // 條件一：只接受垂直牆。
    // 模擬器回傳小寫 'vertical'，實機是大寫開頭 'Vertical'，
    // 一律轉小寫比對（CLAUDE.md 陷阱一）。
    if (surface.orientation?.toLowerCase() !== 'vertical') return;

    // 條件二：距離要在可互動範圍內。
    if (
      intersection.distance < CONFIG.minDistance ||
      intersection.distance > CONFIG.maxDistance
    ) {
      return;
    }

    // 交點法向量是平面的本地座標，要轉成世界座標才能拿來算朝向。
    // 參考 google/xrblocks src/utils/ObjectPlacement.ts 的做法
    // （transformDirection(intersection.object.matrixWorld)）。
    const localNormal = intersection.normal ?? intersection.face?.normal;
    if (!localNormal) return;
    surface.updateWorldMatrix(true, false);
    const normal = localNormal
      .clone()
      .transformDirection(surface.matrixWorld)
      .normalize();

    // 有些牆的多邊形繞線方向是反的（陷阱七），算出來的法向量會指向
    // 牆的另一側（背對房間）。用「法向量應該要面向相機」這個假設
    // 修正：法向量如果背對相機，就反過來。
    const towardCamera = xb.core.camera.position.clone().sub(intersection.point);
    if (normal.dot(towardCamera) < 0) {
      normal.negate();
    }

    // 條件三：交點離平面邊緣至少要有半個面板寬，面板才不會超出牆面。
    // 把交點轉成平面本地座標，跟平面幾何的邊界框比較。
    const localPoint = surface.worldToLocal(intersection.point.clone());
    surface.geometry.computeBoundingBox();
    const box = surface.geometry.boundingBox;
    const margin = CONFIG.panelSize / 2;
    const fits =
      localPoint.x >= box.min.x + margin &&
      localPoint.x <= box.max.x - margin &&
      localPoint.z >= box.min.z + margin &&
      localPoint.z <= box.max.z - margin;
    if (!fits) return;

    // 三項判定都通過，算出面板位置與朝向。
    const position = intersection.point
      .clone()
      .addScaledVector(normal, CONFIG.surfaceOffset);

    // 朝向規則（spec 第 3 節）：面板 -Z 軸對齊牆面法向量，
    // 上方向盡量朝世界正上方。
    //
    // ⚠️ THREE.Object3D.lookAt() 對一般物件（不是 Camera/Light）是讓
    // +Z 軸朝向目標，不是 -Z（陷阱八，查過 three.js 原始碼確認）。
    // 所以要看向 normal 的「反方向」，+Z 朝 -normal，-Z 才會對齊 normal。
    const dummy = new THREE.Object3D();
    dummy.position.copy(position);
    dummy.up.set(0, 1, 0);
    dummy.lookAt(position.clone().sub(normal));

    this.onPlaced({position, quaternion: dummy.quaternion.clone()});
  }
}
