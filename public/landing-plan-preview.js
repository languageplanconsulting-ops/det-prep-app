/**
 * Plan Preview — the no-mock-test, no-signup personalised planner used on the
 * landing mockups as the conversion device.
 *
 * The scheduling maths is a faithful port of the SHIPPED engine so the plan a
 * visitor previews is the plan they actually receive:
 *   - src/lib/study-plan/schedule.ts   (study days, check-in mock, final stretch)
 *   - src/lib/study-plan/daily-plan.ts (fixed per-tier exercise sequences)
 *
 * One deliberate SUPERSET: the shipped engine picks study days by `cadenceDays`
 * (every 1/2/3 days). This preview lets the visitor tick weekdays instead,
 * because "which days are you free?" converts better than "how often?".
 * Shipping it would need a small change in schedule.ts. See notes in the index.
 *
 * Renders semantic markup with `pp-` classes only — each landing page supplies
 * its own styling, so the same widget wears four different designs.
 */
(function (global) {
  "use strict";

  /* ---- shipped constants (keep in sync with the TS engine) --------------- */

  var FINAL_STRETCH_DAYS = 14;
  var MOCK_TESTS_PER_WEEK = 2;
  var CHECK_IN_DAY_OFFSET = 14;

  var SKILL_META = {
    dictation: { emoji: "🎧", th: "ฟังแล้วพิมพ์ตาม", short: "ตามคำบอก" },
    fitb: { emoji: "✏️", th: "เติมคำในช่องว่าง", short: "เติมคำ" },
    vocab: { emoji: "📚", th: "ศัพท์จากบทอ่าน", short: "ศัพท์" },
    reading: { emoji: "📖", th: "อ่านจับใจความ", short: "การอ่าน" },
    realword: { emoji: "🔤", th: "แยกคำจริง–คำปลอม", short: "คำจริง" },
  };

  var EXAM_SEQUENCES = {
    5: [
      { skill: "dictation", count: 1 }, { skill: "fitb", count: 1 },
      { skill: "vocab", count: 1 }, { skill: "reading", count: 1 },
      { skill: "realword", count: 1 },
    ],
    10: [
      { skill: "dictation", count: 2 }, { skill: "fitb", count: 2 },
      { skill: "vocab", count: 1 }, { skill: "realword", count: 1 },
    ],
    20: [
      { skill: "dictation", count: 3 }, { skill: "fitb", count: 2 },
      { skill: "vocab", count: 1 }, { skill: "reading", count: 1 },
      { skill: "realword", count: 1 },
    ],
    30: [
      { skill: "dictation", count: 3 }, { skill: "fitb", count: 3 },
      { skill: "vocab", count: 2 }, { skill: "reading", count: 2 },
      { skill: "realword", count: 2 },
    ],
  };

  /* ---- date helpers (UTC-day maths, same as the engine) ------------------ */

  var DAY_MS = 86400000;
  function toUtcDay(iso) { return Math.floor(Date.parse(iso + "T00:00:00Z") / DAY_MS); }
  function fromUtcDay(d) { return new Date(d * DAY_MS).toISOString().slice(0, 10); }
  function todayIso() {
    // Bangkok (+07:00), matching todayIso() in the app.
    return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  }
  function addDaysIso(iso, n) { return fromUtcDay(toUtcDay(iso) + n); }
  function weekdayOf(iso) { return new Date(iso + "T00:00:00Z").getUTCDay(); } // 0=อา

  var TH_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  var TH_MONTHS_FULL = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  var TH_DOW = ["อา","จ","อ","พ","พฤ","ศ","ส"];

  function fmtThaiDate(iso) {
    var d = new Date(iso + "T00:00:00Z");
    return d.getUTCDate() + " " + TH_MONTHS[d.getUTCMonth()] + " " + (d.getUTCFullYear() + 543);
  }

  /* ---- the generator ----------------------------------------------------- */

  /**
   * @param {Object} o
   * @param {string} o.startDate  ISO
   * @param {string|null} o.examDate ISO, or null for freeform
   * @param {number[]} o.weekdays  0..6 the learner is free
   * @param {5|10|20|30} o.minutes per study day
   * @param {number} o.freeformWeeks how long to project when there's no exam date
   */
  function generatePlan(o) {
    var start = o.startDate;
    var freeform = !o.examDate;
    var endIso = freeform ? addDaysIso(start, (o.freeformWeeks || 12) * 7 - 1) : o.examDate;
    var startDay = toUtcDay(start);
    var endDay = toUtcDay(endIso);
    if (endDay < startDay) return null;
    if (endDay - startDay > 400) endDay = startDay + 400; // sanity clamp

    var free = {};
    (o.weekdays || []).forEach(function (w) { free[w] = true; });
    var anyFree = Object.keys(free).length > 0;

    var days = [];
    var stretchStudyDayIndex = 0;
    var checkInPlaced = false;

    for (var d = startDay; d <= endDay; d++) {
      var iso = fromUtcDay(d);
      var offset = d - startDay;
      var isStudyDay = anyFree && !!free[weekdayOf(iso)];
      var daysUntilExam = endDay - d;
      var inFinalStretch = !freeform && daysUntilExam <= FINAL_STRETCH_DAYS && daysUntilExam >= 0;

      var isMock = false;
      if (isStudyDay && inFinalStretch) {
        isMock = stretchStudyDayIndex % 7 < MOCK_TESTS_PER_WEEK;
        stretchStudyDayIndex++;
      }

      var isCheckIn = false;
      if (!freeform && !checkInPlaced && isStudyDay && !inFinalStretch && offset >= CHECK_IN_DAY_OFFSET) {
        isCheckIn = true; checkInPlaced = true; isMock = true;
      }

      var reason = null;
      if (freeform) {
        reason = isStudyDay ? "วันฝึกตามวันที่นักเรียนเลือก — ไม่ผูกกับวันสอบ" : null;
      } else if (isCheckIn) {
        reason = "เช็คจุดยืนหลังฝึกมา 2 สัปดาห์ — ลองทำข้อสอบจำลองดูว่าตอนนี้อยู่ระดับไหน";
      } else if (isMock) {
        reason = "เหลือ " + daysUntilExam + " วันก่อนสอบ — ช่วงนี้ควรฝึกทำข้อสอบจำลองให้ชินกับรูปแบบจริง";
      } else if (isStudyDay) {
        reason = "วันฝึกตามแผนที่ตั้งไว้";
      }

      days.push({
        date: iso,
        isStudyDay: isStudyDay,
        isMockTestDay: isMock,
        isCheckIn: isCheckIn,
        recommendedTier: !isStudyDay ? null : isMock ? 60 : o.minutes,
        daysUntilExam: daysUntilExam,
        reason: reason,
      });
    }

    /* ---- totals --------------------------------------------------------- */
    var studyDays = 0, mockDays = 0, totalMinutes = 0, totalExercises = 0;
    var seq = EXAM_SEQUENCES[o.minutes] || EXAM_SEQUENCES[10];
    var perDayCount = seq.reduce(function (s, it) { return s + it.count; }, 0);

    days.forEach(function (day) {
      if (!day.isStudyDay) return;
      studyDays++;
      if (day.isMockTestDay) { mockDays++; totalMinutes += 60; }
      else { totalMinutes += o.minutes; totalExercises += perDayCount; }
    });

    var hours = totalMinutes / 60;
    // Honest, deliberately WIDE estimate — presented as a range, never a promise.
    var gainLow = Math.max(3, Math.min(25, Math.round(hours * 0.7)));
    var gainHigh = Math.max(gainLow + 5, Math.min(40, Math.round(hours * 1.35)));

    return {
      days: days,
      startDate: start,
      endDate: fromUtcDay(endDay),
      freeform: freeform,
      minutes: o.minutes,
      totalCalendarDays: endDay - startDay + 1,
      weeks: Math.max(1, Math.round((endDay - startDay + 1) / 7)),
      studyDays: studyDays,
      mockDays: mockDays,
      totalMinutes: totalMinutes,
      totalHours: hours,
      totalExercises: totalExercises,
      perDayCount: perDayCount,
      sequence: seq,
      gainLow: gainLow,
      gainHigh: gainHigh,
    };
  }

  /* ---- rendering helpers ------------------------------------------------- */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function monthGrid(plan, monthOffset) {
    var first = new Date(plan.startDate + "T00:00:00Z");
    var y = first.getUTCFullYear(), m = first.getUTCMonth() + monthOffset;
    var cursor = new Date(Date.UTC(y, m, 1));
    var monthLabel = TH_MONTHS_FULL[cursor.getUTCMonth()] + " " + (cursor.getUTCFullYear() + 543);
    var byDate = {};
    plan.days.forEach(function (d) { byDate[d.date] = d; });

    var wrap = el("div", "pp-month");
    wrap.appendChild(el("div", "pp-month-label", monthLabel));
    var grid = el("div", "pp-grid");
    TH_DOW.forEach(function (w) { grid.appendChild(el("div", "pp-dow", w)); });

    var lead = cursor.getUTCDay();
    for (var i = 0; i < lead; i++) grid.appendChild(el("div", "pp-cell pp-empty", ""));

    var daysInMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
    for (var dn = 1; dn <= daysInMonth; dn++) {
      var iso = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), dn)).toISOString().slice(0, 10);
      var info = byDate[iso];
      var cls = "pp-cell";
      var mark = "";
      if (!info) cls += " pp-outside";
      else if (info.isMockTestDay) { cls += " pp-mock"; mark = "<span class='pp-dot'>MOCK</span>"; }
      else if (info.isStudyDay) { cls += " pp-study"; }
      else { cls += " pp-rest"; }
      if (iso === plan.endDate && !plan.freeform) cls += " pp-exam";
      var cell = el("div", cls, "<span class='pp-num'>" + dn + "</span>" + mark);
      cell.title = info && info.reason ? info.reason : "";
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /* ---- public API -------------------------------------------------------- */

  function mount(root, opts) {
    opts = opts || {};
    var state = {
      examDate: opts.examDate || addDaysIso(todayIso(), 60),
      hasExam: opts.hasExam !== false,
      weekdays: opts.weekdays || [0, 1, 2, 3, 4, 5, 6],
      minutes: opts.minutes || 20,
      current: opts.current || 95,
      target: opts.target || 120,
      months: opts.months || 2,
      ctaHref: opts.ctaHref || "/signup?next=%2Fstudy-plan",
      showScore: opts.showScore !== false,
    };

    root.innerHTML = "";
    root.classList.add("pp");

    /* --- controls ------------------------------------------------------- */
    var form = el("div", "pp-form");

    // exam date
    var fDate = el("div", "pp-field");
    fDate.appendChild(el("label", "pp-label", "สอบวันไหน"));
    var dateRow = el("div", "pp-row");
    var dateInput = el("input", "pp-input pp-date");
    dateInput.type = "date";
    dateInput.value = state.examDate;
    dateInput.min = todayIso();
    dateRow.appendChild(dateInput);
    var noDate = el("button", "pp-chip pp-chip-wide", "ยังไม่กำหนด");
    noDate.type = "button";
    dateRow.appendChild(noDate);
    fDate.appendChild(dateRow);
    form.appendChild(fDate);

    // weekdays
    var fDays = el("div", "pp-field");
    fDays.appendChild(el("label", "pp-label", "ว่างฝึกวันไหนบ้าง"));
    var dayRow = el("div", "pp-row pp-row-days");
    var dayBtns = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (w) {
      var b = el("button", "pp-chip pp-chip-day", TH_DOW[w]);
      b.type = "button";
      b.dataset.w = String(w);
      dayRow.appendChild(b);
      dayBtns.push(b);
    });
    fDays.appendChild(dayRow);
    form.appendChild(fDays);

    // minutes
    var fMin = el("div", "pp-field");
    fMin.appendChild(el("label", "pp-label", "วันละกี่นาที"));
    var minRow = el("div", "pp-row");
    var minBtns = [];
    [5, 10, 20, 30].forEach(function (m) {
      var b = el("button", "pp-chip", m + " นาที");
      b.type = "button";
      b.dataset.m = String(m);
      minRow.appendChild(b);
      minBtns.push(b);
    });
    fMin.appendChild(minRow);
    form.appendChild(fMin);

    // score gap (optional)
    var curInput, tgtInput;
    if (state.showScore) {
      var fScore = el("div", "pp-field pp-field-score");
      fScore.appendChild(el("label", "pp-label", "คะแนนตอนนี้ → เป้าหมาย <span class='pp-opt'>(ถ้ายังไม่เคยสอบ กะคร่าว ๆ ได้)</span>"));
      var scoreRow = el("div", "pp-row pp-row-score");
      curInput = el("input", "pp-range");
      curInput.type = "range"; curInput.min = "40"; curInput.max = "160"; curInput.step = "5"; curInput.value = String(state.current);
      tgtInput = el("input", "pp-range");
      tgtInput.type = "range"; tgtInput.min = "40"; tgtInput.max = "160"; tgtInput.step = "5"; tgtInput.value = String(state.target);
      var curWrap = el("div", "pp-range-wrap");
      curWrap.appendChild(el("span", "pp-range-label", "ตอนนี้ <b class='pp-cur-val'>" + state.current + "</b>"));
      curWrap.appendChild(curInput);
      var tgtWrap = el("div", "pp-range-wrap");
      tgtWrap.appendChild(el("span", "pp-range-label", "เป้าหมาย <b class='pp-tgt-val'>" + state.target + "</b>"));
      tgtWrap.appendChild(tgtInput);
      scoreRow.appendChild(curWrap);
      scoreRow.appendChild(tgtWrap);
      fScore.appendChild(scoreRow);
      form.appendChild(fScore);
    }

    root.appendChild(form);

    var out = el("div", "pp-out");
    root.appendChild(out);

    /* --- render --------------------------------------------------------- */
    function syncChips() {
      dayBtns.forEach(function (b) {
        b.classList.toggle("is-on", state.weekdays.indexOf(Number(b.dataset.w)) >= 0);
      });
      minBtns.forEach(function (b) {
        b.classList.toggle("is-on", Number(b.dataset.m) === state.minutes);
      });
      noDate.classList.toggle("is-on", !state.hasExam);
      dateInput.classList.toggle("is-off", !state.hasExam);
      dateInput.disabled = !state.hasExam;
    }

    function render() {
      syncChips();
      var plan = generatePlan({
        startDate: todayIso(),
        examDate: state.hasExam ? state.examDate : null,
        weekdays: state.weekdays,
        minutes: state.minutes,
        freeformWeeks: 12,
      });
      out.innerHTML = "";
      if (!plan) { out.appendChild(el("p", "pp-warn", "เลือกวันสอบที่เป็นอนาคตก่อนนะ")); return; }
      if (plan.studyDays === 0) {
        out.appendChild(el("p", "pp-warn", "เลือกวันที่ว่างฝึกอย่างน้อย 1 วันก่อน"));
        return;
      }

      /* headline stats */
      var stats = el("div", "pp-stats");
      function stat(v, l, sub) {
        var s = el("div", "pp-stat");
        s.appendChild(el("div", "pp-stat-v", v));
        s.appendChild(el("div", "pp-stat-l", l));
        if (sub) s.appendChild(el("div", "pp-stat-s", sub));
        return s;
      }
      stats.appendChild(stat(String(plan.studyDays), "วันฝึกทั้งหมด", plan.freeform ? "ใน 12 สัปดาห์" : "ถึงวันสอบ"));
      stats.appendChild(stat(plan.totalHours.toFixed(1) + " ชม.", "เวลาฝึกรวม", plan.minutes + " นาที/วัน"));
      stats.appendChild(stat(String(plan.totalExercises), "ข้อที่จะได้ทำ", plan.perDayCount + " ข้อ/วัน"));
      stats.appendChild(stat(String(plan.mockDays), "ครั้งที่ซ้อมสอบเต็ม", plan.mockDays ? "รวมวันเช็คจุดยืน" : "เพิ่มเมื่อใกล้สอบ"));
      out.appendChild(stats);

      /* the promise line */
      var end = el("div", "pp-promise");
      if (plan.freeform) {
        end.innerHTML = "แผนนี้เริ่ม <b>" + fmtThaiDate(plan.startDate) + "</b> — ยังไม่มีวันสอบ เราจะวางให้ 12 สัปดาห์ก่อน แล้วปรับใหม่ทันทีที่นักเรียนกำหนดวันสอบ";
      } else {
        end.innerHTML = "แผนนี้เริ่ม <b>" + fmtThaiDate(plan.startDate) + "</b> และ<b>จบวันที่ " + fmtThaiDate(plan.endDate) + "</b> ซึ่งเป็นวันสอบของนักเรียน — รวม " + plan.weeks + " สัปดาห์";
      }
      out.appendChild(end);

      /* score projection */
      if (state.showScore) {
        var gap = Math.max(0, state.target - state.current);
        var proj = el("div", "pp-proj");
        var enough = plan.gainHigh >= gap;
        proj.innerHTML =
          "<div class='pp-proj-head'>ช่องว่างที่ต้องปิด <b class='pp-gap'>" + gap + " คะแนน</b></div>" +
          "<div class='pp-proj-bar'><span class='pp-proj-fill' style='width:" +
            Math.min(100, gap ? Math.round((plan.gainHigh / gap) * 100) : 100) + "%'></span></div>" +
          "<div class='pp-proj-note'>ฝึกตามแผนนี้ นักเรียนส่วนใหญ่ขยับได้ <b>+" + plan.gainLow + " ถึง +" + plan.gainHigh + " คะแนน</b>" +
            (enough
              ? " — <span class='pp-ok'>ครอบคลุมเป้าหมายของนักเรียน</span>"
              : " — <span class='pp-short'>ยังไม่ถึงเป้า ลองเพิ่มวัน หรือเพิ่มเวลาต่อวันดู</span>") +
          "</div>" +
          "<p class='pp-disclaim'>* เป็นการประมาณจากชั่วโมงฝึกของนักเรียนที่ทำครบตามแผน ไม่ใช่การรับประกันคะแนน</p>";
        out.appendChild(proj);
      }

      /* day one */
      var d1 = el("div", "pp-dayone");
      d1.appendChild(el("h4", "pp-h4", "วันแรกของนักเรียน · " + fmtThaiDate(plan.startDate)));
      var list = el("ol", "pp-seq");
      plan.sequence.forEach(function (it) {
        var meta = SKILL_META[it.skill];
        var li = el("li", "pp-seq-item",
          "<span class='pp-seq-emoji'>" + meta.emoji + "</span>" +
          "<span class='pp-seq-th'>" + meta.th + "</span>" +
          "<span class='pp-seq-n'>×" + it.count + "</span>");
        list.appendChild(li);
      });
      d1.appendChild(list);
      d1.appendChild(el("p", "pp-seq-note", "ลำดับนี้ไม่ได้สุ่ม — เป็นชุดเดียวกับที่ระบบจ่ายให้ทุกคนในเวลา " + plan.minutes + " นาที และจะปรับตามจุดอ่อนของนักเรียนหลังทำไปสักพัก"));
      out.appendChild(d1);

      /* calendar */
      var cal = el("div", "pp-cal");
      cal.appendChild(el("h4", "pp-h4", "ปฏิทินของนักเรียน"));
      var months = el("div", "pp-months");
      for (var i = 0; i < state.months; i++) months.appendChild(monthGrid(plan, i));
      cal.appendChild(months);
      var legend = el("div", "pp-legend",
        "<span class='pp-lg'><i class='pp-sw pp-study'></i>วันฝึก</span>" +
        "<span class='pp-lg'><i class='pp-sw pp-mock'></i>ซ้อมสอบเต็มชุด</span>" +
        "<span class='pp-lg'><i class='pp-sw pp-rest'></i>วันพัก</span>");
      cal.appendChild(legend);
      out.appendChild(cal);

      /* milestones */
      var miles = el("div", "pp-miles");
      var checkIn = plan.days.filter(function (d) { return d.isCheckIn; })[0];
      var firstStretch = plan.days.filter(function (d) { return d.isMockTestDay && !d.isCheckIn; })[0];
      var items = [];
      items.push({ t: fmtThaiDate(plan.startDate), b: "เริ่มวันนี้", s: plan.perDayCount + " ข้อ · " + plan.minutes + " นาที" });
      if (checkIn) items.push({ t: fmtThaiDate(checkIn.date), b: "เช็คจุดยืนครั้งแรก", s: "ซ้อมสอบเต็มชุด ดูว่าขยับไปเท่าไหร่" });
      if (firstStretch) items.push({ t: fmtThaiDate(firstStretch.date), b: "เข้าโหมดโค้งสุดท้าย", s: "ซ้อมสอบ 2 ครั้ง/สัปดาห์ จนถึงวันสอบ" });
      if (!plan.freeform) items.push({ t: fmtThaiDate(plan.endDate), b: "วันสอบ", s: "จบแผนพอดี" });
      items.forEach(function (it) {
        miles.appendChild(el("div", "pp-mile",
          "<div class='pp-mile-d'>" + it.t + "</div>" +
          "<div class='pp-mile-b'>" + it.b + "</div>" +
          "<div class='pp-mile-s'>" + it.s + "</div>"));
      });
      out.appendChild(miles);

      /* CTA */
      var cta = el("div", "pp-cta");
      cta.innerHTML =
        "<a class='pp-btn' href='" + state.ctaHref + "'>เก็บแผนนี้ไว้ · สมัครฟรี</a>" +
        "<span class='pp-cta-sub'>ไม่ต้องใส่บัตร · แผนนี้จะอยู่ในบัญชีนักเรียน พร้อมเตือนทุกวันที่ต้องฝึก</span>";
      out.appendChild(cta);

      if (typeof opts.onRender === "function") opts.onRender(plan);
    }

    /* --- events --------------------------------------------------------- */
    dayBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var w = Number(b.dataset.w);
        var i = state.weekdays.indexOf(w);
        if (i >= 0) state.weekdays.splice(i, 1); else state.weekdays.push(w);
        render();
      });
    });
    minBtns.forEach(function (b) {
      b.addEventListener("click", function () { state.minutes = Number(b.dataset.m); render(); });
    });
    dateInput.addEventListener("change", function () {
      state.examDate = dateInput.value; state.hasExam = true; render();
    });
    noDate.addEventListener("click", function () { state.hasExam = !state.hasExam; render(); });
    if (curInput) {
      curInput.addEventListener("input", function () {
        state.current = Number(curInput.value);
        if (state.target < state.current) { state.target = state.current; tgtInput.value = String(state.target); }
        root.querySelector(".pp-cur-val").textContent = state.current;
        root.querySelector(".pp-tgt-val").textContent = state.target;
        render();
      });
      tgtInput.addEventListener("input", function () {
        state.target = Number(tgtInput.value);
        if (state.target < state.current) { state.current = state.target; curInput.value = String(state.current); }
        root.querySelector(".pp-cur-val").textContent = state.current;
        root.querySelector(".pp-tgt-val").textContent = state.target;
        render();
      });
    }

    render();
    return { state: state, render: render };
  }

  global.PlanPreview = { mount: mount, generatePlan: generatePlan, fmtThaiDate: fmtThaiDate, todayIso: todayIso, addDaysIso: addDaysIso };
})(window);
