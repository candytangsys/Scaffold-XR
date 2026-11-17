import * as xb from 'xrblocks';
import {CONFIG} from './config.js';

const COLUMNS = [
  't', 'px', 'py', 'pz', 'qx', 'qy', 'qz', 'qw',
  'condition', 'task', 'style', 'trial', 'phase',
];

// 職責：全程記錄，跟其他模組完全獨立，只讀相機。
// 依賴外部（main.js）在對的時機呼叫 startPhase()/stopPhase() 告知
// 現在是不是該記錄、記錄成什麼中繼資料（見 spec 第 5 節）。
export class PoseLogger extends xb.Script {
  constructor() {
    super();
    this.rows = [];
    this.phase = null; // null（不記錄）/ 'waiting' / 'done'
    this.meta = null;
  }

  // phase：'waiting' 或 'done'。meta：{condition, task, style, trial}。
  startPhase(phase, meta) {
    this.phase = phase;
    this.meta = meta;
  }

  // 回到 IDLE / TARGETED 時呼叫，停止記錄。
  stopPhase() {
    this.phase = null;
    this.meta = null;
  }

  update() {
    if (!this.phase) return; // IDLE、TARGETED 不記錄

    const cam = xb.core.camera;
    const d = CONFIG.decimalPlaces;
    this.rows.push({
      t: performance.now().toFixed(d),
      px: cam.position.x.toFixed(d),
      py: cam.position.y.toFixed(d),
      pz: cam.position.z.toFixed(d),
      qx: cam.quaternion.x.toFixed(d),
      qy: cam.quaternion.y.toFixed(d),
      qz: cam.quaternion.z.toFixed(d),
      qw: cam.quaternion.w.toFixed(d),
      condition: this.meta.condition,
      task: this.meta.task,
      style: this.meta.style,
      trial: this.meta.trial,
      phase: this.phase,
    });
  }

  // 按 E 匯出累積的所有資料（不分試次，全部一起匯出）。
  exportCsv(participantId) {
    const lines = [COLUMNS.join(',')];
    for (const row of this.rows) {
      lines.push(COLUMNS.map((key) => row[key]).join(','));
    }
    const csv = lines.join('\n');

    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `P${participantId}_${formatTimestamp(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
