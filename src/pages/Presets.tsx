import { useState } from "react";
import { Check, Edit3, Plus, Sparkles, Trash2 } from "lucide-react";
import { api, formatDurationText } from "../lib/tauri";
import type { AppConfig, TimerPreset } from "../types";

interface PresetsProps {
  config: AppConfig;
  onConfigChange: (cfg: AppConfig) => void;
}

interface PresetFormState {
  id: string;
  name: string;
  description: string;
  focusMinutes: number;
  breakValue: number;
  breakUnit: "seconds" | "minutes";
}

const EMPTY_FORM: PresetFormState = {
  id: "",
  name: "",
  description: "",
  focusMinutes: 30,
  breakValue: 2,
  breakUnit: "minutes",
};

const QUICK_FOCUS_CHIPS = [15, 20, 25, 30, 45, 60];
const QUICK_BREAK_CHIPS: { label: string; value: number; unit: "seconds" | "minutes" }[] = [
  { label: "20 秒", value: 20, unit: "seconds" },
  { label: "1 分钟", value: 1, unit: "minutes" },
  { label: "3 分钟", value: 3, unit: "minutes" },
  { label: "5 分钟", value: 5, unit: "minutes" },
  { label: "10 分钟", value: 10, unit: "minutes" },
];

export function Presets({ config, onConfigChange }: PresetsProps) {
  const [editing, setEditing] = useState<PresetFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNewForm = () => {
    setError(null);
    setEditing({ ...EMPTY_FORM });
  };

  const openEditForm = (preset: TimerPreset) => {
    setError(null);
    const isExactMinutes = preset.breakSeconds >= 60 && preset.breakSeconds % 60 === 0;
    setEditing({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      focusMinutes: preset.focusMinutes,
      breakValue: isExactMinutes ? preset.breakSeconds / 60 : preset.breakSeconds,
      breakUnit: isExactMinutes ? "minutes" : "seconds",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) {
      setError("请输入方案名称");
      return;
    }
    const breakSeconds =
      editing.breakUnit === "minutes"
        ? Math.round(editing.breakValue * 60)
        : Math.round(editing.breakValue);

    if (editing.focusMinutes < 1 || editing.focusMinutes > 180) {
      setError("专注时长需在 1 至 180 分钟之间");
      return;
    }
    if (breakSeconds < 10 || breakSeconds > 3600) {
      setError("休息时长需在 10 秒至 60 分钟之间");
      return;
    }

    const updated = await api.saveCustomPreset({
      id: editing.id,
      name: editing.name.trim(),
      description:
        editing.description.trim() ||
        `专注 ${editing.focusMinutes} 分钟后休息 ${formatDurationText(breakSeconds)}`,
      focusMinutes: editing.focusMinutes,
      breakSeconds,
      isBuiltin: false,
    });
    onConfigChange(updated);
    setEditing(null);
  };

  const handleActivate = async (id: string) => {
    const updated = await api.setActivePreset(id);
    onConfigChange(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await api.deleteCustomPreset(id);
    onConfigChange(updated);
  };

  const builtinPresets = config.presets.filter((p) => p.isBuiltin);
  const customPresets = config.presets.filter((p) => !p.isBuiltin);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            自定义护眼节奏
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">时间方案管理</h1>
        </div>
        <button
          onClick={openNewForm}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          新建自定义方案
        </button>
      </div>

      {/* Create / Edit Form Card */}
      {editing && (
        <form
          onSubmit={handleSave}
          className="glass-card rounded-3xl p-6 space-y-5 animate-float-in"
          style={{ borderColor: "var(--accent)" }}
        >
          <div className="flex items-center gap-2 font-bold text-base">
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span>{editing.id ? "编辑自定义方案" : "创建自定义护眼方案"}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1.5 text-xs font-semibold">
              <span>方案名称</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="例如：代码冲刺 / 睡前轻度护眼"
                maxLength={24}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-500/25"
                style={{
                  backgroundColor: "var(--bg-surface-solid)",
                  borderColor: "var(--border-strong)",
                }}
              />
            </label>

            <label className="block space-y-1.5 text-xs font-semibold">
              <span>备注说明（可选）</span>
              <input
                type="text"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="简要描述适用场景"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-500/25"
                style={{
                  backgroundColor: "var(--bg-surface-solid)",
                  borderColor: "var(--border-strong)",
                }}
              />
            </label>

            <div className="space-y-2 text-xs font-semibold">
              <span>专注用眼时长（分钟）</span>
              <input
                type="number"
                min={1}
                max={180}
                value={editing.focusMinutes}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    focusMinutes: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/25 tabular-nums"
                style={{
                  backgroundColor: "var(--bg-surface-solid)",
                  borderColor: "var(--border-strong)",
                }}
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {QUICK_FOCUS_CHIPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEditing({ ...editing, focusMinutes: m })}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer"
                    style={{
                      backgroundColor:
                        editing.focusMinutes === m ? "var(--accent-soft)" : "var(--bg-subtle)",
                      borderColor:
                        editing.focusMinutes === m ? "var(--accent)" : "transparent",
                      color:
                        editing.focusMinutes === m ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {m} 分钟
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <span>护眼休息时长</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={editing.breakUnit === "seconds" ? 10 : 1}
                  max={editing.breakUnit === "seconds" ? 3600 : 60}
                  value={editing.breakValue}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      breakValue: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/25 tabular-nums"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                />
                <select
                  value={editing.breakUnit}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      breakUnit: e.target.value as "seconds" | "minutes",
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none"
                  style={{
                    backgroundColor: "var(--bg-surface-solid)",
                    borderColor: "var(--border-strong)",
                  }}
                >
                  <option value="seconds">秒</option>
                  <option value="minutes">分钟</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {QUICK_BREAK_CHIPS.map((c) => {
                  const selected =
                    editing.breakUnit === c.unit && editing.breakValue === c.value;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() =>
                        setEditing({ ...editing, breakValue: c.value, breakUnit: c.unit })
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-subtle)",
                        borderColor: selected ? "var(--accent)" : "transparent",
                        color: selected ? "var(--accent)" : "var(--text-secondary)",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && <div className="text-xs text-rose-500 font-semibold">{error}</div>}

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
              style={{ borderColor: "var(--border-strong)" }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              保存方案
            </button>
          </div>
        </form>
      )}

      {/* Built-in Presets */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
          内置科学预设
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtinPresets.map((preset) => {
            const active = preset.id === config.activePresetId;
            const breakRatio = Math.min(
              32,
              Math.max(8, (preset.breakSeconds / (preset.focusMinutes * 60 + preset.breakSeconds)) * 100)
            );
            return (
              <div
                key={preset.id}
                className="glass-card rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--border-soft)",
                  backgroundColor: active ? "var(--accent-soft)" : "var(--bg-surface)",
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[15px]">{preset.name}</span>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-semibold tabular-nums"
                      style={{
                        backgroundColor: "var(--bg-surface-solid)",
                        color: "var(--accent)",
                      }}
                    >
                      {preset.focusMinutes}分 / {formatDurationText(preset.breakSeconds)}
                    </span>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {preset.description}
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] mt-3.5 overflow-hidden flex">
                    <div
                      className="h-full"
                      style={{ width: `${100 - breakRatio}%`, backgroundColor: "var(--accent)", opacity: 0.75 }}
                    />
                    <div className="h-full bg-teal-400" style={{ width: `${breakRatio}%` }} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => void handleActivate(preset.id)}
                    disabled={active}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-default ${
                      active ? "btn-primary" : "border"
                    }`}
                    style={
                      active
                        ? undefined
                        : {
                            backgroundColor: "var(--bg-surface-solid)",
                            borderColor: "var(--border-strong)",
                          }
                    }
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {active ? "当前使用中" : "启用此方案"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Custom Presets */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "var(--text-muted)" }}>
          我的自定义方案（{customPresets.length}）
        </h2>

        {customPresets.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed p-10 text-center text-sm"
            style={{
              borderColor: "var(--border-strong)",
              color: "var(--text-secondary)",
            }}
          >
            还没有自定义方案，点击右上角「新建自定义方案」即可自由定制你的专属专注与休息时长。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customPresets.map((preset) => {
              const active = preset.id === config.activePresetId;
              return (
                <div
                  key={preset.id}
                  className="glass-card rounded-3xl p-5 flex flex-col justify-between gap-4"
                  style={{
                    borderColor: active ? "var(--accent)" : "var(--border-soft)",
                    backgroundColor: active ? "var(--accent-soft)" : "var(--bg-surface)",
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[15px] truncate">{preset.name}</span>
                      <span
                        className="text-xs px-3 py-1 rounded-full font-semibold tabular-nums shrink-0"
                        style={{
                          backgroundColor: "var(--bg-surface-solid)",
                          color: "var(--accent)",
                        }}
                      >
                        {preset.focusMinutes}分 / {formatDurationText(preset.breakSeconds)}
                      </span>
                    </div>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {preset.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditForm(preset)}
                        className="p-2 rounded-xl border hover:opacity-80 cursor-pointer"
                        style={{
                          backgroundColor: "var(--bg-surface-solid)",
                          borderColor: "var(--border-soft)",
                        }}
                        title="编辑方案"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void handleDelete(preset.id)}
                        className="p-2 rounded-xl border text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        style={{
                          backgroundColor: "var(--bg-surface-solid)",
                          borderColor: "var(--border-soft)",
                        }}
                        title="删除方案"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => void handleActivate(preset.id)}
                      disabled={active}
                      className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:cursor-default ${
                        active ? "btn-primary" : "border"
                      }`}
                      style={
                        active
                          ? undefined
                          : {
                              backgroundColor: "var(--bg-surface-solid)",
                              borderColor: "var(--border-strong)",
                            }
                      }
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      {active ? "当前使用中" : "启用此方案"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
