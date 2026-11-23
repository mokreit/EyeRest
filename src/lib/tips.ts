export interface EyeCareTip {
  title: string;
  detail: string;
  category: "远眺放松" | "眨眼润眼" | "眼肌舒缓" | "肩颈放松";
}

export const EYE_CARE_TIPS: EyeCareTip[] = [
  {
    title: "远眺 6 米外的自然景物",
    detail: "将视线从近处屏幕移开，注视窗外远处的树梢或建筑轮廓，让紧绷的睫状肌彻底放松。",
    category: "远眺放松",
  },
  {
    title: "有意识地缓慢眨眼 10 次",
    detail: "盯屏时眨眼频率会下降一半以上。轻柔闭合双眼停留 1 秒再睁开，重新铺匀泪膜缓解干涩。",
    category: "眨眼润眼",
  },
  {
    title: "掌心温敷护眼法",
    detail: "双手搓热后轻合在闭合的双眼上（不要压迫眼球），感受温暖黑暗带来的舒缓。",
    category: "眼肌舒缓",
  },
  {
    title: "眼球轻缓画“∞”字",
    detail: "保持头部不动，视线在想象中的远方画一个舒缓的水平 8 字，平衡放松六条眼外肌。",
    category: "眼肌舒缓",
  },
  {
    title: "深呼吸，放松双肩与下颌",
    detail: "吸气 4 秒、屏息 2 秒、缓慢呼气 6 秒，顺势让耸起的双肩自然下沉。",
    category: "肩颈放松",
  },
  {
    title: "近远交替对焦训练",
    detail: "先注视前方一臂远的指尖 3 秒，再切换到 6 米外的远景 5 秒，交替 3 次恢复调节弹性。",
    category: "远眺放松",
  },
  {
    title: "起身喝一口温水",
    detail: "站起来活动下肢并补充水分，既改善眼部微循环，也能保持充足体液分泌泪液。",
    category: "肩颈放松",
  },
  {
    title: "检查坐姿与屏幕距离",
    detail: "保持眼睛与屏幕相距 50–70 厘米，视线微向下倾斜 10°–15°，减少眼球表面暴露面积。",
    category: "眨眼润眼",
  },
  {
    title: "缓慢转动颈部释放压力",
    detail: "轻缓地左右侧倾颈部各保持 5 秒，避免快速甩头，舒缓久坐带来的颈椎紧绷。",
    category: "肩颈放松",
  },
  {
    title: "闭目养神，让大脑短暂留白",
    detail: "轻轻合上双眼，把注意力放在平缓的呼吸上，哪怕短短几十秒也能显著恢复专注力。",
    category: "眼肌舒缓",
  },
  {
    title: "调整环境光线对比度",
    detail: "确保屏幕亮度与周围环境光协调，避免在完全昏暗的环境中高亮度盯屏。",
    category: "远眺放松",
  },
  {
    title: "轻柔按揉太阳穴与眉心",
    detail: "用指腹以轻柔力度顺时针打圈放松眉骨与太阳穴周围，缓解眼眶酸胀感。",
    category: "眼肌舒缓",
  },
];

export function getEyeCareTip(index: number): EyeCareTip {
  const safe = ((index % EYE_CARE_TIPS.length) + EYE_CARE_TIPS.length) % EYE_CARE_TIPS.length;
  return EYE_CARE_TIPS[safe];
}
