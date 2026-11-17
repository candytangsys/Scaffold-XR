import * as xb from 'xrblocks';
import * as THREE from 'three';
import {PlacementController} from './src/PlacementController.js';
import {StylePicker} from './src/StylePicker.js';
import {WaitFeedback} from './src/WaitFeedback.js';
import {ContentApplier} from './src/ContentApplier.js';
import {PoseLogger} from './src/PoseLogger.js';
import {CONFIG} from './src/config.js';

// 網址參數（spec 第 8 節），實驗時由施測者手動改網址切換，不做 UI。
const params = new URLSearchParams(window.location.search);
const condition = params.get('c') || 'C1'; // C1 / C2 / C3
const participantId = params.get('p') || '00';
const task = params.get('task') || 'w1'; // w1 / w2 / w3，決定用哪一套圖片

// 整個流程的狀態機：IDLE → TARGETED → WAITING → DONE →（按 R）→ IDLE。
// main.js 負責串接五個模組、管狀態，模組本身互相不知道對方存在。
class MainScript extends xb.Script {
  constructor({stylePicker, waitFeedback, contentApplier, poseLogger}) {
    super();
    this.stylePicker = stylePicker;
    this.waitFeedback = waitFeedback;
    this.contentApplier = contentApplier;
    this.poseLogger = poseLogger;

    this.state = 'IDLE';
    this.trial = 1;
    this._fixedPlaneMaterials = false;
  }

  update() {
    // 平面偵測到的牆預設材質是單面的（FrontSide），只有法向量指向的
    // 那一側能被 raycast 選到；模擬器產生的多邊形繞線方向沒有統一，
    // 導致部分牆只能從室內點、部分只能從室外點。改成雙面材質，
    // 兩側都能選取。只要做一次即可。
    if (!this._fixedPlaneMaterials) {
      const planes = xb.core.world.planes.get();
      if (planes.length === 0) return; // 平面偵測還沒跑完，下一幀再檢查
      for (const plane of planes) {
        plane.material.side = THREE.DoubleSide;
      }
      this._fixedPlaneMaterials = true;
    }
  }

  // PlacementController 判定通過時呼叫（IDLE → TARGETED）。
  onWallTargeted({position, quaternion}) {
    if (this.state !== 'IDLE') return; // 只有 IDLE 才能開始新的一輪
    this.state = 'TARGETED';
    this.stylePicker.show({
      position,
      quaternion,
      onSelected: (style) => this.startWaiting({position, quaternion, style}),
    });
  }

  // StylePicker 選定風格時呼叫（TARGETED → WAITING）。
  startWaiting({position, quaternion, style}) {
    this.state = 'WAITING';
    this.poseLogger.startPhase('waiting', {
      condition,
      task,
      style,
      trial: this.trial,
    });
    this.waitFeedback.start({
      position,
      quaternion,
      condition,
      duration: CONFIG.waitDuration,
      onDone: () => this.finishWaiting({position, quaternion, style}),
    });
  }

  // 等待滿時間時呼叫（WAITING → DONE）。
  finishWaiting({position, quaternion, style}) {
    this.state = 'DONE';
    this.poseLogger.startPhase('done', {
      condition,
      task,
      style,
      trial: this.trial,
    });
    this.contentApplier.show({position, quaternion, task, style});
  }

  // R：DONE → IDLE，試次編號加一。其他狀態按 R 不做事。
  resetToIdle() {
    if (this.state !== 'DONE') return;
    this.state = 'IDLE';
    this.trial += 1;
    this.poseLogger.stopPhase();
    this.contentApplier.clear();
  }

  onKeyDown(event) {
    if (event.code === 'KeyR') {
      this.resetToIdle();
    } else if (event.code === 'KeyE') {
      this.poseLogger.exportCsv(participantId);
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const stylePicker = new StylePicker({task});
  const waitFeedback = new WaitFeedback();
  const contentApplier = new ContentApplier();
  const poseLogger = new PoseLogger();

  const main = new MainScript({stylePicker, waitFeedback, contentApplier, poseLogger});

  const placementController = new PlacementController({
    onPlaced: (result) => main.onWallTargeted(result),
  });

  xb.add(main);
  xb.add(placementController);
  xb.add(stylePicker);
  xb.add(waitFeedback);
  xb.add(contentApplier);
  xb.add(poseLogger);

  const options = new xb.Options();
  options.world.enablePlaneDetection();
  xb.init(options);
});
