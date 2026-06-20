import type { Plan, PlanItem } from "@/lib/study-plan/plan";
import type { SkillKey } from "@/lib/study-plan/diagnostic";

const TH: Record<SkillKey, string> = { reading: "อ่าน", listening: "ฟัง", speaking: "พูด", writing: "เขียน" };
const NAVY = "#004AAD";

function Item({ item, index }: { item: PlanItem; index: number }) {
  const active = !item.locked;
  return (
    <div style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, background: active ? "#f4f8ff" : "#fff", border: active ? `2px solid ${NAVY}` : "1px solid #e3e8f0", opacity: active ? 1 : 0.72 }}>
      <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: active ? NAVY : "#d3d7df", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e" }}>
          {TH[item.skill]} <span style={{ color: active ? "#993c1d" : "#5b6472", fontWeight: 400 }}>(จาก {item.fromScore})</span>
        </div>
        <div style={{ fontSize: 12, color: active ? "#993c1d" : "#5b6472", marginTop: 2 }}>{item.whyTh}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, alignItems: "center" }}>
          {item.modules.map((m) => (
            <span key={m.id} style={{ fontSize: 11, background: active ? "#e7eefb" : "#eef0f3", color: active ? NAVY : "#5b6472", borderRadius: 6, padding: "3px 8px" }}>
              {m.titleTh}
            </span>
          ))}
          <span style={{ fontSize: 11, color: "#888", padding: "3px 4px" }}>~{item.estMinutes} นาที</span>
        </div>
        {active && (
          <button style={{ marginTop: 10, background: NAVY, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            เริ่มเลย →
          </button>
        )}
      </div>
      <div style={{ flexShrink: 0, color: active ? NAVY : "#9aa1ad", fontSize: 16 }}>{active ? "▶" : "🔒"}</div>
    </div>
  );
}

export default function StudyPlanView({ plan }: { plan: Plan }) {
  return (
    <div style={{ maxWidth: 360, margin: "0 auto", background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e3e8f0", fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <div style={{ background: NAVY, color: "#fff", padding: "14px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>แผนเรียนเฉพาะคุณ</div>
        <div style={{ fontSize: 12, color: "#cfe0f7", marginTop: 2 }}>จาก {plan.predicted} → เป้าหมาย {plan.target} · เรียงจากจุดอ่อนที่สุดก่อน</div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {plan.items.map((it, i) => <Item key={it.skill} item={it} index={i} />)}
        <div style={{ display: "flex", gap: 10, padding: 12, border: "1px solid #ead9a6", borderRadius: 12, background: "#fcf6e6", opacity: 0.85 }}>
          <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#FFCC00", color: "#5a4600", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚑</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e" }}>เส้นชัย: {plan.finishLine.titleTh}</div>
          </div>
          <div style={{ flexShrink: 0, color: "#9aa1ad", fontSize: 16 }}>🔒</div>
        </div>
      </div>
      <div style={{ margin: "0 14px 16px", background: "#fff7df", border: "1px solid #ffe18a", borderRadius: 12, padding: 13, textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#5a4600" }}>ปลดล็อกทั้งแผน — เริ่มจากจุดอ่อนที่สุดของคุณ</div>
        <button style={{ marginTop: 9, width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>ดูแพ็กเกจ →</button>
      </div>
    </div>
  );
}
