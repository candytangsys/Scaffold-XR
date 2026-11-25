# Scaffold XR

WebXR 研究原型：點一面牆、選一個風格、等 15 秒、圖片出現在那裡。
研究對象是**等待期間那塊空間呈現什麼**（三個實驗條件 C1 / C2 / C3）。

完整規格見 [`docs/spec.md`](docs/spec.md)。

> 命名說明：本文件與規格書中的 `C1` / `C2` / `C3` 一律指**三個實驗條件**，不是開發步驟。開發步驟用「步驟 1.1」這種編號。

---

## 快速開始

### 環境

- Windows 11，Chrome 桌面（使用 XR Blocks 內建的模擬器）
- [XR Blocks](https://github.com/google/xrblocks) v0.17.0（本機 clone 在 `../xrblocks/`，僅作為參考，不修改）
- three.js **0.184.0**（版本必須一致，見[陷阱三](#️-陷阱三threejs-版本)）
- 目標實機為 Meta Quest 3S，但現階段全部在模擬器開發

### 啟動

```
cd scaffold-xr
npx http-server -p 8081 --cors -c-1
```

打開 `http://127.0.0.1:8081/`。

- 用 8081 是因為 8080 可能被 xrblocks 的 `npm run serve` 佔用。
- `-c-1` 關閉快取，**一定要加**，否則改完程式碼重新整理可能還是看到舊版本（見[陷阱六](#️-陷阱六http-server-快取)）。

### 切換實驗條件

在瀏覽器網址列輸入以下網址，即可切換 C1、C2、C3 條件：

| 條件 | 網址 |
|---|---|
| C1 | `http://127.0.0.1:8081/?c=C1` |
| C2 | `http://127.0.0.1:8081/?c=C2` |
| C3 | `http://127.0.0.1:8081/?c=C3` |

也可以加上受試者編號 `p` 和任務 `task`，例如：
`http://127.0.0.1:8081/?c=C2&p=03&task=w2`。
`p` 預設為 `00`，`task` 可設為 `w1`、`w2` 或 `w3`。

### 模擬器操作

（`src/simulator/controlModes/SimulatorUserMode.ts:22-42`）

| 操作 | 對應 |
|---|---|
| 左鍵點擊 | `onSelectStart` / `onSelectEnd`，射線依滑鼠游標位置計算 |
| 右鍵拖曳 | 轉頭 |
| WASD / QE | 移動 |
| R | 重置 |
| E | 匯出 CSV |

---

## 資料夾結構

```
scaffold-xr/
├── README.md
├── docs/
│   └── spec.md            ← 完整規格
├── index.html             ← importmap + 載入 main.js
├── main.js                ← options、xb.add、xb.init、網址參數解析
├── src/
│   ├── config.js          ← 所有參數（spec 第 7 節）
│   ├── PlacementController.js
│   ├── StylePicker.js
│   ├── WaitFeedback.js    ← 研究核心
│   ├── ContentApplier.js
│   └── PoseLogger.js
└── assets/
    └── styles/            ← 12 張圖（尚未備妥時用純色代替）
```

## 開發約定

- 純 HTML + ES module，不使用 React、Vue、webpack、vite。
- 所有參數放在 `src/config.js`，不寫死在模組裡。
- 不用 `localStorage` 存實驗資料。
- 不修改 `../xrblocks/` 裡的任何檔案，那是 Google 的原始碼，只當參考。
- 不加入 `docs/spec.md` 第 9 節列為「明確不做」的功能。
- 寧可簡單，不要聰明：不加抽象層、不為「以後可能用到」多寫。
- 變數與函式名用英文，註解用中文。
- 文件中沒寫到的 XR Blocks API，先到 `../xrblocks/samples/` 找範例確認，不要憑 three.js 經驗猜。

---

## 開發進度

### 階段一　地基

| 步驟 | 目標 | 驗收 |
|---|---|---|
| 1.1 | 資料夾結構、`index.html`、`main.js`，模擬器啟動 | 看到 Living Room，Console 無紅字 |
| 1.2 | 畫面前方固定位置放一個方塊 | 看得到方塊 |
| 1.3 | **點一面牆，方塊出現在那裡且朝向正確** | 點哪放哪，貼齊牆面，不歪不倒 |

**1.3 是整個專案的關卡，已經通過。** 原先設想的兩個候選 API 都不適用：`user.select()` 已被移除（現在叫 `getIntersectionAt()`），`placeOnSurface()` 的朝向邏輯是給地板／桌面物件用的，用在牆上會錯 90 度。實際可行的做法見下方[選取與點擊](#選取與點擊)。

### 階段二　研究核心

| 步驟 | 目標 | 驗收 |
|---|---|---|
| 2.1 | `WaitFeedback` 的 C1 條件 + `ContentApplier` | 點牆後等 15 秒，圖片（或純色）出現 |
| 2.2 | C2 條件的兩層佔位面 | 等待期間看得到所選風格色的半透明方塊與白色邊框 |
| 2.3 | C3 條件的漸進顯現 | 所選風格色的填充層由很淡（0.05）變到很明顯（0.9），邊框不變，曲線非線性（ease-in-out） |

### 階段三　周邊

| 步驟 | 目標 | 驗收 |
|---|---|---|
| 3.1 | `StylePicker` | 四個方塊可點，結果圖對應選擇 |
| 3.2 | `PoseLogger` + CSV 匯出 | 按 E 下載到能用試算表開啟的檔案 |
| 3.3 | 網址參數、R 重置 | 三條件三任務都能切換，試次編號遞增 |

---

## XR Blocks API 筆記

可信度標記：

- `[驗證]` = 範例中實際使用過，或親自跑過
- `[原始碼]` = 只在 `src/` 看到定義，沒有呼叫端
- `[未驗證]` = 存在但沒人用過，用之前要先確認

以下檔案路徑若未特別說明，皆指 `../xrblocks/` 內的檔案。

### 最小骨架

**importmap** — 本專案是 xrblocks 的**同層資料夾**，不在其內部，因此走 CDN（`README.md:90-104`）：

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
      "xrblocks": "https://cdn.jsdelivr.net/gh/google/xrblocks@build/xrblocks.js",
      "xrblocks/addons/": "https://cdn.jsdelivr.net/gh/google/xrblocks@build/addons/"
    }
  }
</script>
```

若 CDN 版本行為與本機 v0.17.0 不一致，可改指向 `../xrblocks/build/xrblocks.js`（寫法見 `templates/00_basic/index.html:14-23` `[驗證]`）。

**啟動順序**（`templates/00_basic/main.js:49-52` `[驗證]`）：

```js
document.addEventListener('DOMContentLoaded', function () {
  xb.add(new MainScript());
  xb.init(new xb.Options());
});
```

所有範例都是先 `add` 再 `init`。

### Script 生命週期

（`src/core/Script.ts:63-196`；init / update / onSelectStart / onSelectEnd / dispose 為 `[驗證]`）

```
init(deps?)                  初始化，可回傳 Promise
update(time?, frame?)        每幀執行
onSelectStart(event)         選取開始（模擬器 = 滑鼠左鍵按下）
onSelectEnd(event)           選取結束
onObjectSelectStart(event)   點到某個物件時，回傳 true 可阻止冒泡
onObjectSelectEnd(event)
onKeyDown(event)             鍵盤，用於 R 重置與 E 匯出
dispose()                    從場景移除時
```

`xb.Script` 是 `THREE.Object3D` 的 mixin，`xb.MeshScript` 是 `THREE.Mesh` 的版本，可 `new xb.MeshScript(geometry, material)`。

### 平面偵測

```js
options.world.enablePlaneDetection();
```

`src/world/WorldOptions.ts:33-37` `[驗證]`（`samples/modelviewer/main.js:23`）

**⚠️ 注意**：這個方法會同時設定 `world.enabled` 與 `world.planes.enabled`。若改成手動設 `options.world.planes.enabled = true` 而漏了 `options.world.enabled = true`，`World.init()` 會直接 return，平面偵測完全不啟動，而且不報錯。**用這個便利方法就好，不要手動組。**

### 模擬器的平面資料（親自驗證）

Living Room 環境固定提供 16 個平面：

| 標籤 | 方向 | 數量 |
|---|---|---|
| `wall` | `vertical` | **12** |
| `table` | `horizontal` | 1 |
| `floor` | `horizontal` | 1 |
| `horizontal` | `horizontal` | 2 |

讀取方式：

```js
xb.core.world.planes.get()        // 全部 DetectedPlane[]
xb.core.world.planes.get('wall')  // 只要牆
```

`DetectedPlane` 繼承 `THREE.Mesh`，`position` / `quaternion` / `geometry` 都已是世界座標。

### 放置到平面上

**`xb.world.placeOnHorizontalSurface(obj, {seconds: 30})`** `[驗證]`
`src/world/World.ts:259-285`，範例 `samples/modelviewer/ModelViewerScene.js:62-67`

⚠️ **只接受水平面**，會濾掉所有垂直面。本專案三個任務都是牆面，所以用不到。

**`xb.world.placeOnSurface(obj, controller)`** `[驗證，但不適用]`
方法存在，會對所有平面 raycast，命中後呼叫 `placeObjectAtIntersectionFacingTarget()` 算朝向。但這個朝向函式把法向量當「上方向」、物體轉向面朝相機，是給站在地板／桌面上的物件用的（官方範例 `templates/03_spatial_placement/main.js` 是立牌）。用在垂直牆上，面板會整個轉 90 度。

**`xb.core.user.select(obj, controller)`** — **已不存在**。現在的 `src/core/User.ts` 改名成 `getIntersectionAt(obj, id)`。本專案的點擊流程用不到，因為 `onSelectStart(event)` 已經直接提供交點資料（見下一節）。

### 選取與點擊

SDK 每幀對整個場景自動做 raycast。選取時，結果會送進 `onSelectStart(event)` / `onSelectEnd(event)`：

- `event.surface`：點到的物件，可能是 `undefined`
- `event.intersection`：交點資訊（`.point` `.distance` `.normal` `.face` 等）

**不需要自己寫 raycast，也不需要把可點選物件包成 `xb.MeshScript` 子類別**——直接在任何 `xb.Script`（例如 `MainScript` 或 `PlacementController`）覆寫 `onSelectStart(event)`，讀 `event.surface` 判斷點到了什麼即可。

`[驗證]`，參考 `templates/03_spatial_placement/main.js` 的 `onSelectStart`。

⚠️ **`event.intersection.normal` 是平面的本地座標系向量，不是世界座標**，拿來算朝向前要轉換（參考 `src/utils/ObjectPlacement.ts`）：

```js
surface.updateWorldMatrix(true, false);
const worldNormal = intersection.normal
  .clone()
  .transformDirection(surface.matrixWorld)
  .normalize();
```

面板朝向依規格書第 3 節（-Z 對齊法向量、up 盡量朝世界正上方），用 `THREE.Object3D.lookAt` 借位計算。**注意要用 `.sub()`**，原因見[陷阱八](#️-陷阱八object3dlookat-對一般物件是-z-朝向目標不是--z)：

```js
const dummy = new THREE.Object3D();
dummy.position.copy(position);
dummy.up.set(0, 1, 0);
dummy.lookAt(position.clone().sub(worldNormal));
// dummy.quaternion 就是面板要用的朝向
```

### 材質與貼圖

沒有 XR Blocks 專屬材質類別，直接用 three.js 原生。

**半透明**（`templates/00_basic/main.js:17-21` `[驗證]`）：

```js
const material = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.4,
});
```

`transparent: true` 在建立當下就設好，不要等要變透明才切換。

半透明物件若會與其他物件重疊，參考 `src/ui/components/ImageView.ts:34-39` 加 `depthWrite: false`，避免深度寫入造成的遮擋瑕疵。本專案的兩層佔位面就屬於這種情況。

**載入圖片**（`src/ui/components/ImageView.ts:72-77` `[驗證]`）：

```js
const loader = new THREE.TextureLoader();
loader.load(src, (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  material.map = texture;
  material.needsUpdate = true;
});
```

**逐幀改不透明度**（`samples/scene_mesh/main.js:42-53` `[驗證]`）：

```js
update() {
  material.opacity = computeOpacity();   // 不需要 needsUpdate
}
```

`opacity` 是普通數值屬性，three.js 每幀都會讀。`needsUpdate` 只在**貼圖像素內容或幾何頂點**變動時才需要。

### 相機姿態

```js
xb.core.camera.position    // THREE.Vector3
xb.core.camera.quaternion  // THREE.Quaternion
```

`samples/reticle/main.js:42` `[驗證]`

每幀更新，頻率跟裝置更新率一致（模擬器約 60Hz，Quest 72–120Hz）。更新順序為 Depth → World → Input → **Scripts**，所以自訂 `update()` 讀到的相機資料已是該幀最新（`src/core/Core.ts:519-527`）。模擬器裡右鍵拖曳改的就是同一個 camera 實例，姿態資料在模擬器也完全可用。

---

## ⚠️ 已知陷阱

### ⚠️ 陷阱一：orientation 大小寫不一致

| 環境 | 值 |
|---|---|
| 模擬器 | `'vertical'` / `'horizontal'`（小寫） |
| 真機 | `'Vertical'` / `'Horizontal'`（大寫開頭） |

`src/world/planes/DetectedPlane.ts:19,56-60`

**所有 orientation 比對一律先 `.toLowerCase()`。** 否則模擬器正常、上實機全部失效，而且不會報錯。SDK 自己的 `HorizontalPlacement.ts:67` 就有做這個防護。

### ⚠️ 陷阱二：沒有持久化 Anchor

`src/` 裡沒有任何 WebXR Anchors 的封裝。`World.anchorObjectAtReticle()` 是未實作的 stub，呼叫會 throw。`World.planes` 的官方註解也寫「Not recommended for anchoring」。

放上去的物件就是場景圖裡普通的 `Object3D`，靠 `local-floor` 參考空間維持位置。對本專案（15 秒的互動）夠用，但不能宣稱做了空間錨定。

### ⚠️ 陷阱三：three.js 版本

`src/utils/VersionCheck.ts` 要求 revision ≥ 182，`package.json` 的 peerDependency 是 `^0.184.0`。

**版本不對只會 `console.error`，不會擋執行**，之後出現的怪行為很難追。importmap 一律釘 `three@0.184.0`。

### ⚠️ 陷阱四：Quest 的靜默失效（實機執行期）

`plane-detection` 在 WebXR 是 **optional feature**。裝置不支援時 session 照常啟動、不報錯，只是 `frame.detectedPlanes` 永遠是 `undefined`，平面偵測靜默失效（`src/core/Core.ts:402-407`）。

XR Blocks 官方目標平台是 Android XR，README 沒有點名 Quest。原始碼裡有 Quest 專屬參數（`src/world/objects/ObjectDetector.ts:96-97`、`src/camera/QuestCameraParams.ts`），但 `demos/vrm-avatar/README.md:56` 自述「on-device testing has not been done yet」。上實機前要特別確認。

### ⚠️ 陷阱五：線寬無效

`THREE.LineBasicMaterial` 的 `linewidth` 在絕大多數 WebGL 平台上被忽略，永遠只畫 1px。**不要用線來做邊框**，規格書第 3 節改用兩層 quad 就是為了這件事。

### ⚠️ 陷阱六：`http-server` 快取

`npx http-server -p 8081 --cors` 預設對每個靜態檔案加 `Cache-Control: max-age=3600`（啟動訊息會印出 `Cache: 3600 seconds`）。改完 `main.js` 或 `src/` 檔案後，一般重新整理（F5）可能還是讀到舊版本，看起來像「改了沒生效」。

啟動指令加上 `-c-1` 就不會踩到。如果看到行為跟程式碼對不上，第一件事先確認 server 是不是用這個參數起的。

### ⚠️ 陷阱七：`DetectedPlane` 材質預設單面，牆可能只有一側點得到

平面偵測產生的牆面材質預設是 `FrontSide`（單面）。多邊形繞線方向決定哪一側算正面，raycast 只有從法向量那側打過去才會命中，**另一側的射線直接穿透，`event.surface` 變成 `undefined`，不會報錯**。Living Room 環境裡 12 面牆的繞線方向並不統一。

症狀：同一面牆，站在室內點得到、站到室外反而點不到；換另一面牆又剛好相反。

**修法一（選取得到）**：平面偵測到之後，把材質設成雙面：

```js
for (const plane of xb.core.world.planes.get()) {
  plane.material.side = THREE.DoubleSide;
}
```

平面是非同步產生的，要在 `update()` 裡等 `planes.get().length > 0` 之後再做，不要在 `init()` 當下做（那時很可能還是空陣列）。

**第二層問題**：`DoubleSide` 只解決「兩側都選得到」，不會改變 raycast 回傳的 `intersection.normal` 方向——繞線反過來的牆，法向量會指向牆的**外側**。用這個法向量算面板位置／朝向，面板會被推到牆的另一側。小位移（例如 `surfaceOffset` 0.01m）肉眼幾乎看不出來；但像 `StylePicker` 選單離牆 0.5m，整個選單會被推到牆外，使用者的射線永遠先打到牆本身，症狀很像「選不到」。

**修法二（方向算對）**：法向量算出來後，檢查是否背對相機，背對就反過來：

```js
const towardCamera = xb.core.camera.position.clone().sub(intersection.point);
if (normal.dot(towardCamera) < 0) {
  normal.negate();
}
```

**兩個修法都要做**，互不取代。

### ⚠️ 陷阱八：`Object3D.lookAt()` 對一般物件是 +Z 朝向目標，不是 -Z

three.js 的 `lookAt()` 對 `Camera` / `Light` 跟對一般 `Object3D` 行為不同（見 three.js `src/core/Object3D.js`）：

```js
// Camera / Light：_m1.lookAt(_position, _target, this.up)   → -Z 朝向目標
// 一般 Object3D：  _m1.lookAt(_target, _position, this.up)   → 參數反過來，+Z 朝向目標
```

借 `new THREE.Object3D()` 算「讓 -Z 對齊某方向」時，直接 `dummy.lookAt(position + direction)` 得到的其實是 **+Z 對齊 direction**。要讓 -Z 對齊 `direction`，必須看向反方向：

```js
dummy.lookAt(position.clone().sub(direction));
```

這個 bug 很難用肉眼發現：面板材質是 `DoubleSide` 時正反面看起來一樣；只有在算有方向性的大位移（例如選單離面板 0.5m）時才會跑到錯的一側，或是貼上有方向性的圖片時**整張鏡像翻轉**才會發現。
