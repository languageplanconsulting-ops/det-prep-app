import type { Report, SkillResult, SkillKey } from "@/lib/study-plan/diagnostic";
import { thaiFixFirst, thaiReadingInsight, bandShort } from "@/lib/study-plan/explain";

const TH: Record<SkillKey, string> = { reading: "อ่าน", listening: "ฟัง", speaking: "พูด", writing: "เขียน" };

const NAVY = "#004AAD";
const YELLOW = "#FFCC00";

function barColor(s: SkillResult, report: Report): { fg: string; track: string; text: string } {
  if (s.score >= report.target) return { fg: "#1d9e75", track: "#dcefe7", text: "#0f6e56" };
  if (s.skill === report.fixFirst.skill) return { fg: "#D85A30", track: "#f7e0da", text: "#993c1d" };
  return { fg: NAVY, track: "#e7ecf4", text: NAVY };
}

export default function DiagnosticReportView({ report }: { report: Report }) {
  const insight = thaiReadingInsight(report);
  const predictedPct = Math.round((report.predicted / 160) * 100);
  const targetPct = Math.round((report.target / 160) * 100);

  return (
    <div style={{ maxWidth: 360, margin: "0 auto", background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e3e8f0", fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
      <div style={{ background: NAVY, color: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>ผลการวัดระดับของคุณ</span>
        <span style={{ fontSize: 12, color: YELLOW }}>English Plan</span>
      </div>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#5b6472" }}>คะแนนที่คาดการณ์ (เต็ม 160)</div>
          <div style={{ fontSize: 46, fontWeight: 600, color: NAVY, lineHeight: 1.15 }}>{report.predicted}</div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div style={{ position: "relative", height: 10, borderRadius: 6, background: "#e7ecf4" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${predictedPct}%`, background: NAVY, borderRadius: 6 }} />
            <div style={{ position: "absolute", left: `${targetPct}%`, top: -4, bottom: -4, width: 3, background: YELLOW, borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5b6472", marginTop: 6 }}>
            <span>ตอนนี้ {report.predicted}</span>
            <span style={{ color: "#9a7b00" }}>เป้าหมาย {report.target} · ห่าง {report.gap} แต้ม</span>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
          {report.skills.map((s) => {
            const c = barColor(s, report);
            const onTarget = s.score >= report.target;
            return (
              <div key={s.skill} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 46, fontSize: 13, color: c.text }}>{TH[s.skill]}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 5, background: c.track }}>
                  <div style={{ width: `${Math.round((s.score / 160) * 100)}%`, height: "100%", background: c.fg, borderRadius: 5 }} />
                </div>
                <span style={{ width: 66, textAlign: "right", fontSize: 12, fontWeight: 500, color: c.text }}>
                  {onTarget ? "✓ " : ""}{bandShort(s.band)}
                </span>
              </div>
            );
          })}
        </div>

        {(() => {
          const ff = thaiFixFirst(report);
          const c = ff.achieved
            ? { border: "#b7e4cf", bg: "#eafaf3", text: "#0f6e56", icon: "🎉" }
            : { border: "#f3c2bd", bg: "#fdeeeb", text: "#993c1d", icon: "⚑" };
          return (
            <div style={{ marginTop: 18, border: `1px solid ${c.border}`, background: c.bg, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{c.icon} {ff.title}</div>
              <div style={{ fontSize: 13, color: "#5b6472", marginTop: 4 }}>{ff.body}</div>
            </div>
          );
        })()}

        {insight && (
          <div style={{ marginTop: 10, border: "1px solid #cfe0f7", background: "#eff5fd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#185fa5", fontWeight: 500 }}>💡 ข้อสังเกตการอ่าน</div>
            <div style={{ fontSize: 13, color: "#1a1a2e", marginTop: 4 }}>{insight}</div>
          </div>
        )}

        <a href="#study-plan-section" style={{ display: "block", marginTop: 14, width: "100%", boxSizing: "border-box", background: NAVY, color: "#fff", textDecoration: "none", textAlign: "center", border: "none", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>
          ดูแผนเรียนของฉัน → ({report.planSkills.map((s) => TH[s.skill]).join(" · ")})
        </a>
      </div>
    </div>
  );
}
