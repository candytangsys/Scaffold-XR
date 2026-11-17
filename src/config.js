// 所有可調參數集中在這裡，模組裡不寫死數字。
// 數值來源：docs/spec.md 第 7 節（已定案）。
export const CONFIG = {
  // 面板
  panelSize: 0.80,             // 填充層邊長，公尺
  borderSize: 0.84,            // 邊框層邊長
  surfaceOffset: 0.01,         // 離牆距離
  layerGap: 0.002,             // 邊框層與填充層間距

  // 選取判定
  minDistance: 0.8,            // 最近可選取距離
  maxDistance: 4.0,            // 最遠可選取距離

  // 時間
  waitDuration: 15.0,          // 等待秒數

  // 外觀
  placeholderColor: 0xffffff,
  borderOpacity: 0.7,          // 邊框層，三條件皆固定
  c2Opacity: 0.4,              // C2 填充層，固定
  c3OpacityStart: 0.1,         // C3 填充層起點
  c3OpacityEnd: 0.5,           // C3 填充層終點
  c3Easing: (t) => 1 - Math.pow(1 - t, 3),

  // 風格選單
  styles: ['wood', 'brick', 'fabric', 'concrete'],
  pickerCubeSize: 0.15,
  pickerSpacing: 0.05,
  pickerDistance: 0.5,

  // 圖片素材尚未備妥時的替代色（ContentApplier、StylePicker 共用）
  fallbackColors: {
    wood: 0x8b5a2b,
    brick: 0xb04a3a,
    fabric: 0x6b8f71,
    concrete: 0x9a9a9a,
  },

  // 資料
  decimalPlaces: 4,
};
