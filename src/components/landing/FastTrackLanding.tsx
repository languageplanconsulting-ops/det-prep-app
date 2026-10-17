"use client";

/**
 * FastTrackLanding — the Duolingo-style homepage selling the platform WITH the
 * English Plan Duolingo Fast Track course (Sep 2026 revamp).
 *
 * The page body is a static, self-contained HTML block (generated alongside the
 * approved artifact preview) rendered via dangerouslySetInnerHTML; nav, the
 * Fast Track VIP-request modal, and its submit flow are real JSX and reuse the
 * EXACT flow from AdminLandingPageClient so returning students see the same
 * "เข้าสู่ระบบ" / "เริ่มฟรี" buttons in the same top-right spots and the same
 * request modal (still auto-opened by /?fastTrack=1).
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mitr, Sarabun } from "next/font/google";

const mitr = Mitr({ weight: ["500", "600", "700"], subsets: ["thai", "latin"], variable: "--font-mitr", display: "swap" });
const sarabun = Sarabun({ weight: ["400", "500", "600", "700"], subsets: ["thai", "latin"], variable: "--font-sarabun", display: "swap" });

const CSS = `
  .ftl{
    --blue:#004AAD; --blue-d:#003279; --blue-l:#4A90E2; --blue-t:#E7EFF9;
    --yel:#FFCC00; --yel-d:#D9AD00; --yel-t:#FFF6CC; --yel-ink:#6B5500;
    --ink:#3C3C3C; --ink-2:#6E7A85; --ink-3:#AFAFAF;
    --line:#E5E5E5; --line-2:#D7D7D7; --ok:#2FA35F; --ok-t:#E6F5EC;
  }
  *{box-sizing:border-box}
  .ftl{margin:0;background:#FFFFFF;color:var(--ink);
    font-family:var(--font-sarabun),system-ui,sans-serif;font-size:16px;line-height:1.75;-webkit-font-smoothing:antialiased}
  h1,h2,h3,h4{font-family:var(--font-mitr),var(--font-sarabun),system-ui,sans-serif;margin:0;line-height:1.3;text-wrap:balance;font-weight:700}
  .dp{font-family:var(--font-mitr),var(--font-sarabun),system-ui,sans-serif;font-weight:700}
  .wrap{max-width:960px;margin:0 auto;padding:0 20px}
  a{text-decoration:none;color:inherit}
  svg{display:block}

  /* ---- Duolingo chunky buttons ---- */
  .btn{display:inline-block;font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:15px;
    letter-spacing:.05em;padding:14px 28px;border-radius:16px;border:none;text-transform:uppercase;
    transition:.08s;position:relative;top:0;text-align:center;cursor:pointer}
  .btn-p{background:var(--blue);color:#fff;box-shadow:0 4px 0 var(--blue-d)}
  .btn-p:hover{filter:brightness(1.07)}
  .btn-p:active{top:4px;box-shadow:0 0 0 var(--blue-d)}
  .btn-y{background:var(--yel);color:var(--yel-ink);box-shadow:0 4px 0 var(--yel-d)}
  .btn-y:hover{filter:brightness(1.04)}
  .btn-y:active{top:4px;box-shadow:0 0 0 var(--yel-d)}
  .btn-s{background:#fff;color:var(--blue);border:2px solid var(--line);box-shadow:0 4px 0 var(--line)}
  .btn-s:hover{border-color:var(--blue)}
  .btn-s:active{top:4px;box-shadow:0 0 0 var(--line)}
  .btn-lg{font-size:17px;padding:17px 36px}
  .btn-full{display:block;width:100%}

  /* ---- nav ---- */
  .nav{border-bottom:2px solid var(--line);background:#fff}
  .nav .wrap{display:flex;align-items:center;justify-content:space-between;height:68px;gap:14px}
  .brand{display:flex;align-items:center;gap:9px;font-family:var(--font-mitr);font-weight:700;font-size:18px;color:var(--blue)}
  .nav .btn{padding:9px 18px;font-size:13px}

  /* ---- hero ---- */
  .hero{padding:52px 0 0;display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:center}
  @media(max-width:820px){.hero{grid-template-columns:1fr;gap:28px;padding-top:36px}}
  .pill{display:inline-flex;align-items:center;gap:8px;background:var(--yel-t);color:var(--yel-ink);
    font-family:var(--font-mitr);font-weight:600;font-size:14px;border-radius:999px;padding:7px 16px;margin-bottom:18px}
  h1{font-size:clamp(30px,5vw,46px)}
  h1 em{font-style:normal;color:var(--blue)}
  .sub{font-size:17.5px;color:var(--ink-2);max-width:46ch;margin:16px 0 26px}
  .cta-row{display:flex;flex-wrap:wrap;gap:12px}
  .microcopy{font-size:14px;color:var(--ink-3);margin-top:15px}

  /* ---- stat cards ---- */
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(168px,1fr));gap:14px;margin:44px 0 0}
  .stat{background:#fff;border:2px solid var(--line);border-radius:18px;padding:20px;box-shadow:0 2px 0 var(--line)}
  .stat .ic{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:13px}
  .ic.b{background:var(--blue-t)} .ic.y{background:var(--yel-t)}
  .stat .n{font-family:var(--font-mitr);font-weight:700;font-size:31px;color:var(--blue);line-height:1.1;display:block}
  .stat .t{font-size:14px;color:var(--ink-2);display:block;margin-top:7px;line-height:1.55}
  .src{font-size:13px;color:var(--ink-3);margin-top:14px}

  /* ---- sections ---- */
  section.s{padding:66px 0 0;margin-top:60px;border-top:2px solid var(--line)}
  .head{text-align:center;max-width:62ch;margin:0 auto}
  h2{font-size:clamp(24px,3.6vw,35px)}
  h2 em{font-style:normal;color:var(--blue)}
  h2 .y{color:var(--yel-d)}
  .lede{font-size:17px;color:var(--ink-2);margin:14px 0 0}
  .head .lede{margin-left:auto;margin-right:auto}

  /* ---- loop ---- */
  .loop{display:grid;grid-template-columns:repeat(auto-fit,minmax(196px,1fr));gap:16px;margin-top:38px}
  .step{background:#fff;border:2px solid var(--line);border-radius:18px;padding:22px;box-shadow:0 2px 0 var(--line);text-align:center}
  .step .ring{width:60px;height:60px;margin:0 auto 14px}
  .step h3{font-size:17px;margin-bottom:6px}
  .step p{margin:0;font-size:14.5px;color:var(--ink-2);line-height:1.6}
  .course-link{display:flex;justify-content:center;margin-top:26px}

  /* ---- speech callout ---- */
  .say{position:relative;border-radius:22px;padding:26px 34px;margin:38px auto 0;max-width:640px;text-align:center;
    font-family:var(--font-mitr);font-weight:600;font-size:21px;line-height:1.5}
  .say.b{background:var(--blue);color:#fff}
  .say.y{background:var(--yel);color:var(--yel-ink)}
  .say::after{content:"";position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);
    border-left:15px solid transparent;border-right:15px solid transparent;border-top:15px solid var(--blue)}
  .say.y::after{border-top-color:var(--yel)}

  /* ---- exercise screens ---- */
  .ex-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:38px}
  @media(max-width:760px){.ex-grid{grid-template-columns:1fr}}
  .ex{background:#fff;border:2px solid var(--line);border-radius:22px;padding:18px 18px 20px;box-shadow:0 2px 0 var(--line)}
  .ex-bar{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .ex-bar .x{font-family:var(--font-mitr);font-weight:700;color:var(--ink-3);font-size:18px;line-height:1}
  .ex-bar .pg{flex:1;height:14px;background:var(--line);border-radius:999px;overflow:hidden}
  .ex-bar .pg i{display:block;height:100%;background:var(--blue);border-radius:999px;position:relative}
  .ex-bar .pg i::after{content:"";position:absolute;left:8px;right:8px;top:3px;height:4px;background:rgba(255,255,255,.35);border-radius:2px}
  .ex-bar .xp{display:flex;align-items:center;gap:4px;font-family:var(--font-mitr);font-weight:700;font-size:13px;color:var(--yel-d)}
  .ex-tag{display:inline-block;font-family:var(--font-mitr);font-weight:600;font-size:12px;color:var(--blue);
    background:var(--blue-t);border-radius:999px;padding:3px 11px;margin-bottom:8px}
  .ex h3{font-size:18px;margin-bottom:12px}
  .ex-prompt{font-size:15.5px;line-height:1.7;background:#fff;border:2px solid var(--line);border-radius:14px;padding:12px 15px}
  .blank{display:inline-block;min-width:74px;border-bottom:3px solid var(--blue);text-align:center;
    font-family:var(--font-mitr);font-weight:700;color:var(--blue);padding:0 6px}
  .opts{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .opt{font-family:var(--font-mitr);font-weight:600;font-size:15px;padding:9px 16px;border-radius:12px;
    border:2px solid var(--line);box-shadow:0 3px 0 var(--line);background:#fff;color:var(--ink)}
  .opt.on{border-color:var(--blue);box-shadow:0 3px 0 var(--blue);color:var(--blue);background:var(--blue-t)}
  .ex .btn{margin-top:16px;font-size:14px;padding:13px}
  .spk{display:flex;align-items:center;gap:12px;margin:4px 0 14px}
  .spk .big{width:74px;height:74px;border-radius:20px;background:var(--blue);box-shadow:0 4px 0 var(--blue-d);
    display:flex;align-items:center;justify-content:center}
  .spk .sm{width:46px;height:46px;border-radius:14px;background:#fff;border:2px solid var(--line);box-shadow:0 3px 0 var(--line);
    display:flex;align-items:center;justify-content:center}
  .field{border:2px solid var(--line);border-radius:14px;padding:12px 15px;font-size:15.5px;min-height:54px;background:#fff}
  .field .caret{display:inline-block;width:2px;height:18px;background:var(--blue);vertical-align:-3px;margin-left:1px}
  .meta{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px;color:var(--ink-3);
    font-family:var(--font-mitr);font-weight:600}
  .photo{border-radius:14px;overflow:hidden;border:2px solid var(--line);margin-bottom:12px}
  .mic{display:flex;align-items:center;gap:16px;margin-top:8px}
  .mic .m{width:78px;height:78px;border-radius:50%;background:var(--blue);box-shadow:0 5px 0 var(--blue-d);flex:none;
    display:flex;align-items:center;justify-content:center}
  .wave{display:flex;align-items:center;gap:4px;flex:1;height:44px}
  .wave i{display:block;width:5px;border-radius:3px;background:var(--blue-l)}
  .tclock{width:58px;height:58px;flex:none}

  /* ---- REAL APP LAYOUT (hub rows + calendar) ---- */
  .app2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:38px;align-items:start}
  @media(max-width:800px){.app2{grid-template-columns:1fr}}
  .appframe{background:#F6F8FB;border:2px solid var(--line);border-radius:24px;padding:16px;box-shadow:0 2px 0 var(--line)}
  .appframe .abar{display:flex;align-items:center;gap:8px;margin:2px 4px 12px}
  .appframe .abar i{width:10px;height:10px;border-radius:50%;background:var(--line-2);display:inline-block}
  .appframe .abar span{font-family:var(--font-mitr);font-weight:600;font-size:12.5px;color:var(--ink-3);margin-left:4px}
  .hubsec{font-family:var(--font-mitr);font-weight:600;font-size:14px;color:var(--ink);margin:14px 4px 8px}
  .hubsec:first-of-type{margin-top:2px}
  .trow{display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(255,255,255,.85);
    border:1px solid rgba(0,0,0,.05);border-radius:10px;padding:9px 13px;margin-bottom:7px;transition:.12s}
  .trow:hover{border-color:var(--blue);background:#fff;transform:translateX(2px)}
  .trow .tt{min-width:0}
  .trow .tt b{display:block;font-size:13.5px;color:#182230;font-weight:700;line-height:1.4}
  .trow .tt span{display:block;font-size:12px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trow .ar{color:var(--line-2);font-size:15px;flex:none}
  .trow:hover .ar{color:var(--blue)}
  .dpill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:2px 9px;
    font-family:var(--font-mitr);font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  .dpill i{width:6px;height:6px;border-radius:50%;display:inline-block}
  .dpill.e{background:#D9F2E4;color:#177A4B} .dpill.e i{background:#1FA05E}
  .dpill.m{background:var(--yel-t);color:var(--yel-ink)} .dpill.m i{background:var(--yel-d)}
  .dpill.h{background:#FCE3E0;color:#B23B2A} .dpill.h i{background:#D8503B}

  /* calendar */
  .cal-top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:2px 4px 10px;flex-wrap:wrap}
  .cal-top .mo{font-family:var(--font-mitr);font-weight:700;font-size:15px}
  .streak{display:inline-flex;align-items:center;gap:6px;background:var(--yel-t);color:var(--yel-ink);
    border-radius:999px;padding:4px 12px;font-family:var(--font-mitr);font-weight:600;font-size:12.5px}
  .mins{margin:0 4px 12px}
  .mins p{margin:0 0 6px;font-family:var(--font-mitr);font-weight:600;font-size:10.5px;letter-spacing:.1em;
    text-transform:uppercase;color:var(--ink-3)}
  .mins .row{display:flex;gap:8px;flex-wrap:wrap}
  .mchip{font-family:var(--font-mitr);font-weight:600;font-size:13.5px;padding:7px 14px;border-radius:12px;
    border:2px solid var(--line);background:#fff;box-shadow:0 3px 0 var(--line);color:var(--ink-2)}
  .mchip.on{border-color:var(--blue);box-shadow:0 3px 0 var(--blue);background:var(--blue-t);color:var(--blue)}
  .cal{background:#fff;border:1px solid rgba(0,0,0,.05);border-radius:14px;padding:12px}
  .cal .wd, .cal .days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .cal .wd span{font-family:var(--font-mitr);font-weight:600;font-size:10.5px;color:var(--ink-3);text-align:center;padding-bottom:4px}
  .d{aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;
    font-family:var(--font-mitr);font-weight:600;font-size:12px;color:var(--ink-2);background:#F3F5F8;position:relative}
  .d.off{background:transparent}
  .d.done{background:var(--ok-t);color:var(--ok)}
  .d.today{background:var(--blue);color:#fff;box-shadow:0 3px 0 var(--blue-d)}
  .d.mock{background:var(--yel-t);color:var(--yel-ink);border:2px solid var(--yel)}
  .d.exam{background:#fff;border:2px solid var(--blue);color:var(--blue)}
  .cal-leg{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:10px;font-size:12px;color:var(--ink-2)}
  .cal-leg i{display:inline-block;width:11px;height:11px;border-radius:4px;margin-right:5px;vertical-align:-1px}
  .plan{margin:12px 4px 2px}
  .plan p{margin:0 0 7px;font-family:var(--font-mitr);font-weight:600;font-size:12.5px;color:var(--ink)}
  .plan .row{display:flex;flex-wrap:wrap;gap:7px}
  .pchip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid rgba(0,0,0,.06);
    border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;color:var(--ink)}
  .pchip b{font-family:var(--font-mitr);color:var(--blue)}

  /* ---- ALL FEATURES accordion ---- */
  .acc{margin-top:38px;display:flex;flex-direction:column;gap:12px}
  details.f{background:#fff;border:2px solid var(--line);border-radius:18px;box-shadow:0 2px 0 var(--line);overflow:hidden}
  details.f[open]{border-color:var(--blue)}
  details.f summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px 20px}
  details.f summary::-webkit-details-marker{display:none}
  .f .fic{width:44px;height:44px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;font-size:21px}
  .f .fic.b{background:var(--blue-t)} .f .fic.y{background:var(--yel-t)}
  .f .ft{flex:1;min-width:0}
  .f .ft b{display:block;font-family:var(--font-mitr);font-weight:700;font-size:16.5px;color:var(--ink)}
  .f .ft span{display:block;font-size:13.5px;color:var(--ink-2);line-height:1.5}
  .f .chev{flex:none;transition:.18s;color:var(--ink-3)}
  details.f[open] .chev{transform:rotate(180deg);color:var(--blue)}
  .f .fbody{border-top:2px solid var(--line);padding:16px 20px 18px;background:#FBFCFE}
  .f .fbody ul{list-style:none;margin:0;padding:0}
  .f .fbody li{position:relative;padding:7px 0 7px 26px;font-size:14.5px;line-height:1.6;border-bottom:1px dashed var(--line)}
  .f .fbody li:last-child{border-bottom:none}
  .f .fbody li::before{content:"";position:absolute;left:2px;top:15px;width:9px;height:9px;border-radius:50%;background:var(--yel);box-shadow:0 1.5px 0 var(--yel-d)}
  .f .fbody li b{font-weight:700}

  /* ---- chat ---- */
  .feat{display:grid;grid-template-columns:1.05fr .95fr;gap:32px;align-items:start;margin-top:38px}
  @media(max-width:800px){.feat{grid-template-columns:1fr;gap:24px}}
  .chat{background:#fff;border:2px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 2px 0 var(--line)}
  .msg{display:flex;gap:11px;margin-bottom:15px;align-items:flex-end}
  .msg:last-child{margin-bottom:0}
  .av{width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
    font-family:var(--font-mitr);font-weight:700;font-size:12px}
  .av.q{background:var(--yel);color:var(--yel-ink)} .av.me{background:var(--blue);color:#fff}
  .bub{border-radius:18px;padding:12px 17px;font-size:14.5px;line-height:1.55;max-width:76%}
  .msg.q .bub{background:var(--yel-t);border-bottom-left-radius:5px}
  .msg.me{flex-direction:row-reverse}
  .msg.me .bub{background:var(--blue);color:#fff;border-bottom-right-radius:5px}
  .tmr{flex:none;display:flex;align-items:center;gap:5px;font-size:12px;color:var(--ink-3);font-family:var(--font-mitr);font-weight:600}
  ul.b{list-style:none;padding:0;margin:0}
  ul.b li{position:relative;padding-left:34px;margin-bottom:15px;font-size:15.5px;line-height:1.6}
  ul.b li .ck{position:absolute;left:0;top:3px;width:22px;height:22px;border-radius:50%;background:var(--yel);
    display:flex;align-items:center;justify-content:center}

  /* ---- vs ---- */
  .vs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:38px}
  @media(max-width:700px){.vs{grid-template-columns:1fr}}
  .vcol{border:2px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 2px 0 var(--line);background:#fff}
  .vcol.on{border-color:var(--blue)}
  .vhead{padding:16px;text-align:center;font-family:var(--font-mitr);font-weight:700;font-size:19px;border-bottom:2px solid var(--line)}
  .vcol.on .vhead{background:var(--blue);color:#fff;border-bottom-color:var(--blue)}
  .vcol.off .vhead{color:var(--ink-2)}
  .vrow{display:flex;gap:11px;padding:14px 18px;border-bottom:1px solid var(--line);font-size:14.5px;line-height:1.55}
  .vrow:last-child{border-bottom:none}
  .vrow .k{font-family:var(--font-mitr);font-weight:600;font-size:13px;color:var(--ink-3);flex:none;width:56px;padding-top:2px}

  /* ---- path + report ---- */
  .path-card{border:2px solid var(--line);border-radius:22px;padding:26px 20px;margin-top:38px;box-shadow:0 2px 0 var(--line)}
  .path-scroll{overflow-x:auto;padding-bottom:6px}
  .legend{display:flex;flex-wrap:wrap;gap:10px 22px;justify-content:center;margin-top:16px;font-size:13.5px;color:var(--ink-2)}
  .legend i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px}
  .report{background:#fff;border:2px solid var(--line);border-radius:22px;padding:28px;box-shadow:0 2px 0 var(--line);margin-top:20px}
  .rtop{display:flex;flex-wrap:wrap;gap:30px;align-items:center;justify-content:center}
  .bars{flex:1;min-width:262px;display:flex;flex-direction:column;gap:13px}
  .bar .bl{display:flex;justify-content:space-between;font-size:14px;margin-bottom:5px}
  .bar .bl b{font-family:var(--font-mitr);font-weight:600}
  .bar .tr{height:16px;background:var(--line);border-radius:999px;overflow:hidden}
  .bar .fl{height:100%;border-radius:999px;background:var(--blue);position:relative}
  .bar .fl::after{content:"";position:absolute;left:8px;right:8px;top:4px;height:4px;background:rgba(255,255,255,.35);border-radius:2px}
  .bar .fl.lo{background:var(--yel)}
  .weakbox{background:var(--yel-t);border:2px solid var(--yel);border-radius:16px;padding:16px 20px;margin-top:22px;
    font-size:15px;display:flex;gap:12px;align-items:flex-start}
  .weakbox b{font-family:var(--font-mitr);font-weight:600;color:var(--yel-ink)}
  .cap{font-size:13px;color:var(--ink-3);text-align:center;margin-top:14px}

  /* ---- final ---- */
  .final{border:2px solid var(--line);border-radius:26px;padding:50px 32px;text-align:center;margin:60px 0 0;box-shadow:0 2px 0 var(--line)}
  .final .crown{width:64px;height:64px;margin:0 auto 14px}
  .three{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;max-width:820px;margin:32px auto 0;text-align:left}
  .opt-c{background:#fff;border:2px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 2px 0 var(--line);display:flex;flex-direction:column}
  .opt-c.hi{border-color:var(--yel);background:var(--yel-t)}
  .opt-c h3{font-size:17.5px;margin-bottom:7px}
  .opt-c p{margin:0 0 17px;font-size:14.5px;color:var(--ink-2);flex:1}
  footer{padding:30px 0 50px;text-align:center;font-size:13.5px;color:var(--ink-3)}

  .ftl svg text{font-family:var(--font-mitr),var(--font-sarabun),sans-serif}

  /* ---- Testimonials / real student proof ---- */
  #reviews .rev-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:30px}
  @media(max-width:760px){#reviews .rev-grid{grid-template-columns:1fr}}
  .rev-card{background:#fff;border:2px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 2px 0 var(--line);display:flex;flex-direction:column}
  .rev-card blockquote{margin:0 0 14px;font-size:15.5px;line-height:1.75;color:var(--ink)}
  .rev-card .rev-hi{background:var(--yel-t);border-radius:4px;padding:0 4px;font-weight:600;color:var(--yel-ink)}
  .rev-card figcaption{font-family:var(--font-mitr),sans-serif;font-weight:600;font-size:13px;color:var(--blue);margin:0 0 14px}
  .rev-card img{width:100%;height:auto;border-radius:12px;border:1px solid var(--line);margin-top:auto}
`;

const BODY_HTML = `<div class="wrap">

  <!-- ============ HERO ============ -->
  <header class="hero">
    <div>
      <span class="pill">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#D9AD00"/></svg>
        Duolingo English Test · Fast Track
      </span>
      <h1>เรียนคอร์สแล้ว<br>มา<em>ลงสนามจริง</em>กัน</h1>
      <p class="sub">แพลตฟอร์มฝึกของคอร์ส <b>English Plan Duolingo Fast Track</b> — เอา Pattern ที่เรียนมา ลองใช้จริง แล้วรู้จุดอ่อนใน 1 นาที</p>
      <div class="cta-row">
        <a class="btn btn-p btn-lg" href="/mini-diagnosis/start">เช็กระดับฟรี</a>
        <a class="btn btn-y btn-lg" href="https://www.language-plan.com/courses/duolingo-fast-track">ดูคอร์ส Fast Track</a>
      </div>
      <p class="microcopy">ไม่ต้องสมัครสมาชิกก่อน · ใช้เวลา 12 นาที · รู้คะแนนทั้ง 4 ทักษะทันที</p>
    </div>

    <svg viewBox="0 0 380 300" width="100%" style="max-width:380px;margin:0 auto" role="img" aria-label="กราฟคะแนนสองคน: 85 ขึ้นไป 120 และ 110 ขึ้นไป 135">
      <rect x="8" y="8" width="364" height="284" rx="24" fill="#fff" stroke="#E5E5E5" stroke-width="2"/>
      <g stroke="#E5E5E5" stroke-width="1.5" stroke-dasharray="5 6">
        <line x1="42" y1="70" x2="344" y2="70"/><line x1="42" y1="130" x2="344" y2="130"/>
        <line x1="42" y1="190" x2="344" y2="190"/><line x1="42" y1="250" x2="344" y2="250"/>
      </g>
      <g font-size="11" fill="#AFAFAF" text-anchor="end" font-family="Sarabun">
        <text x="30" y="75">140</text><text x="30" y="135">120</text><text x="30" y="195">100</text><text x="30" y="255">80</text>
      </g>
      <path d="M70 160 C 120 154, 170 136, 220 118 S 285 94, 310 85" stroke="#FFCC00" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M70 244 C 120 238, 150 214, 180 196 S 250 148, 310 130" stroke="#004AAD" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="70" cy="244" r="10" fill="#fff" stroke="#AFAFAF" stroke-width="4"/>
      <circle cx="70" cy="160" r="10" fill="#fff" stroke="#D9AD00" stroke-width="4"/>
      <circle cx="310" cy="130" r="13" fill="#004AAD" stroke="#fff" stroke-width="4"/>
      <path d="M304 130l4.5 4.5 9-9" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g transform="translate(310,85)">
        <polygon points="0,-15 4.4,-4.7 15,-4.7 6.7,2 9.4,12.6 0,6.3 -9.4,12.6 -6.7,2 -15,-4.7 -4.4,-4.7" fill="#FFCC00" stroke="#D9AD00" stroke-width="2" stroke-linejoin="round"/>
      </g>
      <g font-family="Mitr, Sarabun" font-weight="700">
        <text x="70" y="276" font-size="14" fill="#AFAFAF" text-anchor="middle">85</text>
        <text x="46" y="165" font-size="14" fill="#D9AD00" text-anchor="end">110</text>
        <text x="340" y="136" font-size="16" fill="#004AAD" text-anchor="start">120</text>
        <text x="340" y="90" font-size="16" fill="#D9AD00" text-anchor="start">135</text>
      </g>
      <g transform="translate(184,34)">
        <rect x="0" y="0" width="164" height="36" rx="18" fill="#FFCC00"/>
        <rect x="0" y="32" width="164" height="4" rx="2" fill="#D9AD00"/>
        <text x="82" y="24" font-size="15" fill="#6B5500" text-anchor="middle" font-family="Mitr, Sarabun" font-weight="700">ขึ้นเฉลี่ย +30–40</text>
      </g>
    </svg>
  </header>

  <div class="stats">
    <div class="stat">
      <span class="ic b"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 18l5-6 4 4 7-9" stroke="#004AAD" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="7" r="2.4" fill="#004AAD"/></svg></span>
      <span class="n">+30–40</span><span class="t">คะแนนที่นักเรียนขยับได้ เมื่อเรียนคอร์ส + ฝึกควบคู่กัน</span>
    </div>
    <div class="stat">
      <span class="ic y"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#D9AD00"/></svg></span>
      <span class="n">40%</span><span class="t">เร็วกว่าเรียนอย่างเดียว กว่าจะถึงคะแนนเป้าหมาย</span>
    </div>
    <div class="stat">
      <span class="ic b"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="4" stroke="#004AAD" stroke-width="2.4"/><path d="M3 10h18M8 3v4M16 3v4" stroke="#004AAD" stroke-width="2.4" stroke-linecap="round"/></svg></span>
      <span class="n">2020–26</span><span class="t">เก็บข้อมูลจากนักเรียน English Plan ตลอด 6 ปี</span>
    </div>
    <div class="stat">
      <span class="ic y"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polygon points="12,2 14.9,8.6 22,9.3 16.6,14.1 18.2,21 12,17.4 5.8,21 7.4,14.1 2,9.3 9.1,8.6" fill="#D9AD00"/></svg></span>
      <span class="n">12</span><span class="t">แบบฝึก ครอบคลุมทั้ง 4 ทักษะที่ใช้คิดคะแนน</span>
    </div>
  </div>
  <p class="src">ข้อมูลบันทึกจากนักเรียน English Plan ปี 2020–2026</p>

  <!-- ============ LOOP ============ -->
  <section class="s">
    <div class="head">
      <h2>คอร์สสอน <em>Pattern</em><br>ที่นี่คือที่ที่คุณเอาไปใช้</h2>
      <p class="lede">รู้ Pattern แล้วยังไม่พอ — ต้องรู้ว่าเวลาลงสนามจริงและเวลาเดิน คุณพลาดตรงไหน</p>
    </div>
    <div class="loop">
      <div class="step">
        <svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#FFCC00"/>
          <path d="M19 22h22M19 30h22M19 38h14" stroke="#6B5500" stroke-width="3.4" stroke-linecap="round"/></svg>
        <h3>เรียน Pattern</h3><p>คอร์ส Fast Track ให้ Pattern เขียนระดับ 130+ มาเป็นโครง</p>
      </div>
      <div class="step">
        <svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#004AAD"/>
          <path d="M36 18l7 7-16 16-9 2 2-9 16-16z" stroke="#fff" stroke-width="3.4" fill="none" stroke-linejoin="round"/></svg>
        <h3>ลงสนามจริง</h3><p>เอา Pattern มาตอบโจทย์จริง จับเวลาเหมือนสอบ</p>
      </div>
      <div class="step">
        <svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#FFCC00"/>
          <circle cx="28" cy="28" r="9" stroke="#6B5500" stroke-width="3.4" fill="none"/><path d="M35 35l8 8" stroke="#6B5500" stroke-width="3.4" stroke-linecap="round"/></svg>
        <h3>เห็นจุดอ่อนทันที</h3><p>ชี้กลับมาว่าประโยคไหน คำไหน ที่ทำให้คะแนนไม่ถึง</p>
      </div>
      <div class="step">
        <svg class="ring" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#004AAD"/>
          <path d="M18 30l8 8 16-16" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>แก้ตรงจุด</h3><p>ไม่ต้องเดาว่าต้องพัฒนาอะไร ระบบบอกมาแล้ว</p>
      </div>
    </div>
    <div class="course-link"><a class="btn btn-y" href="https://www.language-plan.com/courses/duolingo-fast-track">ดูคอร์ส Duolingo Fast Track →</a></div>
    <div class="say b">เขียนเสร็จ รู้จุดอ่อนใน 1 นาที</div>
  </section>

  <!-- EXAMPLE SCREENS -->
  <section class="s" id="screens">
    <div class="head">
      <h2>หน้าตาแบบฝึก<span class="y">ทั้ง 12 ชนิด</span></h2>
      <p class="lede">กดเปิดดูทีละทักษะ — ตัวอย่างหน้าจอจริงของทุกแบบฝึก ทุกข้อจับเวลา ตอบเสร็จรู้ผลทันที</p>
    </div>

    <div class="acc">

      <!-- ═══ READING ═══ -->
      <details class="f" open>
        <summary><span class="fic b">📖</span><span class="ft"><b>อ่าน · 3 แบบฝึก</b><span>อ่านเชิงโต้ตอบ · ศัพท์ในบทความ · คำจริง–คำหลอก</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><div class="ex-grid">
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:45%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">อ่าน · Interactive Reading</span>
            <h3>เติมคำที่หายไปในบทความ</h3>
            <div class="ex-prompt">Many students <span class="blank">prefer</span> to study in the library because it is quiet, and the librarians are always <span class="blank">&nbsp;</span> to help.</div>
            <div class="opts"><span class="opt">willing</span><span class="opt on">happy</span><span class="opt">afraid</span><span class="opt">unable</span></div>
            <span class="btn btn-p btn-full">ตรวจคำตอบ</span>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:20%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">อ่าน · Vocabulary in Context</span>
            <h3>เลือกคำใส่ช่องว่างให้ถูกบริบท</h3>
            <div class="ex-prompt">Solar panels are becoming a popular <span class="blank">source</span> of clean energy because installation costs have <span class="blank">&nbsp;</span> in recent years.</div>
            <div class="opts"><span class="opt on">dropped</span><span class="opt">risen</span><span class="opt">amount</span><span class="opt">refused</span></div>
            <div class="meta"><span>เหลือ 8 ช่อง</span><span>6:40</span></div>
            <span class="btn btn-p btn-full">ตรวจคำตอบ</span>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:60%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">อ่าน · Read and Select</span>
            <h3>คำนี้เป็นคำอังกฤษจริงไหม</h3>
            <div class="ex-prompt" style="text-align:center;padding:22px 15px">
              <span class="dp" style="font-size:27px;letter-spacing:.02em">confidental</span>
            </div>
            <div class="opts"><span class="opt on" style="flex:1;text-align:center">✓ คำจริง</span><span class="opt" style="flex:1;text-align:center">✕ คำปลอม</span></div>
            <div class="meta"><span>ข้อ 12 / 20</span><span>0:05</span></div>
          </div>
        </div></div>
      </details>

      <!-- ═══ LISTENING ═══ -->
      <details class="f">
        <summary><span class="fic y">🎧</span><span class="ft"><b>ฟัง · 3 แบบฝึก</b><span>ฟังแล้วพิมพ์ · ฟังบทสนทนา · สรุปบทสนทนา</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><div class="ex-grid">
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:70%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">ฟัง · Listen and Type</span>
            <h3>ฟังแล้วพิมพ์ตามให้ตรง</h3>
            <div class="spk">
              <span class="big"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span>
              <span class="sm"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#004AAD"/><path d="M16 10a3 3 0 010 4" stroke="#004AAD" stroke-width="2.2" stroke-linecap="round"/></svg></span>
            </div>
            <div class="field">The meeting has been moved to Thursday afternoon<span class="caret"></span></div>
            <div class="meta"><span>ฟังได้อีก 2 ครั้ง</span><span>0:42</span></div>
            <span class="btn btn-p btn-full">ตรวจคำตอบ</span>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:40%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">ฟัง · Interactive Listening</span>
            <h3>เลือกประโยคตอบกลับที่ดีที่สุด</h3>
            <div class="ex-prompt">🎓 "Have you decided on a topic for your term paper yet?"</div>
            <div class="opts" style="flex-direction:column">
              <span class="opt on" style="width:100%">I'm still choosing between two ideas.</span>
              <span class="opt" style="width:100%">Yes, the cafeteria food is great.</span>
              <span class="opt" style="width:100%">I took that class last year.</span>
            </div>
            <div class="meta"><span>ฉาก 2 / 5</span><span>ฟังได้อีก 2 ครั้ง</span></div>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:90%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">ฟัง · Summarize the Conversation</span>
            <h3>ฟังจบแล้วเขียนสรุป</h3>
            <div class="ex-prompt" style="font-size:13.5px;color:#6E7A85">🎧 บทสนทนา: นักศึกษาขอเลื่อนส่งงานกับอาจารย์ เพราะป่วยช่วงสอบ…</div>
            <div class="field" style="margin-top:12px">A student asked her professor for an extension because she was sick during exams. The professor agreed and<span class="caret"></span></div>
            <div class="meta"><span>ขั้นต่ำ 20 คำ · เขียนแล้ว 18</span><span>1:12</span></div>
            <span class="btn btn-p btn-full">ส่งสรุป</span>
          </div>
        </div></div>
      </details>

      <!-- ═══ WRITING ═══ -->
      <details class="f">
        <summary><span class="fic b">✍️</span><span class="ft"><b>เขียน · 3 แบบฝึก</b><span>เขียนบรรยายภาพ · อ่านแล้วเขียน · เติมคำในช่องว่าง</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><div class="ex-grid">
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:30%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">เขียน · Write About the Photo</span>
            <h3>เขียนบรรยายภาพ</h3>
            <div class="photo"><img src="/landing/river-valley.jpg" alt="แม่น้ำไหลผ่านหุบเขาสีเขียว มีภูเขาและป่าอยู่ด้านหลัง" style="width:100%;display:block"></div>
            <div class="field">The photo shows a river winding through a green valley. There are mountains covered in forest behind it, and<span class="caret"></span></div>
            <div class="meta"><span>21 คำ</span><span>0:47</span></div>
            <span class="btn btn-p btn-full">ส่งคำตอบ</span>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:55%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">เขียน · Read, Then Write</span>
            <h3>อ่านโจทย์แล้วเขียนเรียงความ</h3>
            <div class="ex-prompt" style="font-size:14px">Some people prefer to study alone, while others like studying in groups. Which do you prefer, and why?</div>
            <div class="field" style="margin-top:12px">In my opinion, studying alone is more effective because I can control my own pace and focus without distractions. For example, when I prepared for<span class="caret"></span></div>
            <div class="meta"><span>ขั้นต่ำ 50 คำ · เขียนแล้ว 64</span><span>4:10</span></div>
            <span class="btn btn-p btn-full">ส่งคำตอบ</span>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:65%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">เขียน · Fill in the Blanks (C-Test)</span>
            <h3>เติมคำที่หาย มีตัวขึ้นต้นให้</h3>
            <div class="ex-prompt">Everyone was tired beca<span class="blank" style="min-width:52px">use</span> the meeting las<span class="blank" style="min-width:52px">&nbsp;</span> three hours.</div>
            <div class="meta" style="margin-top:12px"><span>💡 คำใบ้: กินเวลานาน</span><span>เหลือ 5 ช่อง · 1:30</span></div>
            <span class="btn btn-p btn-full">ตรวจคำตอบ</span>
          </div>
        </div></div>
      </details>

      <!-- ═══ SPEAKING ═══ -->
      <details class="f">
        <summary><span class="fic y">🎤</span><span class="ft"><b>พูด · 3 แบบฝึก</b><span>พูดโต้ตอบ · อ่านแล้วพูด · พูดบรรยายภาพ</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><div class="ex-grid">
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:85%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">พูด · Interactive Speaking</span>
            <h3>พูดโต้ตอบ เทิร์นที่ 2 / 6</h3>
            <div class="ex-prompt">You mentioned a café — what makes that one different from others?</div>
            <div class="mic">
              <span class="m"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M6 11a6 6 0 0012 0M12 17v4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span>
              <span class="wave"><i style="height:12px"></i><i style="height:26px"></i><i style="height:40px"></i><i style="height:22px"></i><i style="height:34px"></i><i style="height:16px"></i><i style="height:30px"></i><i style="height:42px"></i><i style="height:20px"></i><i style="height:28px"></i></span>
              <svg class="tclock" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="none" stroke="#E5E5E5" stroke-width="6"/>
                <circle cx="29" cy="29" r="24" fill="none" stroke="#FFCC00" stroke-width="6" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="52" transform="rotate(-90 29 29)"/>
                <text x="29" y="35" text-anchor="middle" font-family="Mitr, Sarabun" font-weight="700" font-size="17" fill="#3C3C3C">23</text></svg>
            </div>
            <div class="meta"><span>กำลังอัดเสียง…</span><span>สูงสุด 35 วิ</span></div>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:15%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">พูด · Read, Then Speak</span>
            <h3>อ่านหัวข้อ เตรียมตัว แล้วพูด</h3>
            <div class="ex-prompt">Describe a skill you would like to learn.<br><span style="color:#6E7A85;font-size:14px">· Why do you want to learn it?<br>· How would it help you in the future?</span></div>
            <div class="opts"><span class="opt on">เตรียมตัว 3:00 ⏳</span><span class="opt">เริ่มพูดเลย</span></div>
            <div class="meta"><span>มีวิดีโอเฉลยจากครู 🎬</span><span>อัดสูงสุด 5 นาที</span></div>
          </div>
          <div class="ex">
            <div class="ex-bar"><span class="x">✕</span><span class="pg"><i style="width:50%"></i></span>
              <span class="xp"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" fill="#FFCC00"/></svg>+10</span></div>
            <span class="ex-tag">พูด · Speak About the Photo</span>
            <h3>ดูภาพ เตรียม 1 นาที แล้วพูด</h3>
            <div class="photo"><img src="/landing/corner-cafe.jpg" alt="คาเฟ่หัวมุมถนน มีร่มสีแดงและดอกไม้" style="width:100%;display:block"></div>
            <div class="mic">
              <span class="m"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" fill="#fff"/><path d="M6 11a6 6 0 0012 0M12 17v4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span>
              <span class="wave"><i style="height:18px"></i><i style="height:32px"></i><i style="height:14px"></i><i style="height:38px"></i><i style="height:24px"></i><i style="height:40px"></i><i style="height:16px"></i><i style="height:30px"></i></span>
              <svg class="tclock" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="none" stroke="#E5E5E5" stroke-width="6"/>
                <circle cx="29" cy="29" r="24" fill="none" stroke="#FFCC00" stroke-width="6" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="95" transform="rotate(-90 29 29)"/>
                <text x="29" y="35" text-anchor="middle" font-family="Mitr, Sarabun" font-weight="700" font-size="17" fill="#3C3C3C">52</text></svg>
            </div>
            <div class="meta"><span>กำลังอัดเสียง…</span><span>สูงสุด 1:30</span></div>
          </div>
        </div></div>
      </details>

    </div>
  </section>

  <!-- REAL APP LAYOUT -->
  <section class="s" id="app">
    <div class="head">
      <h2>ข้างในแอป<em>หน้าตาแบบนี้</em></h2>
      <p class="lede">เลย์เอาต์จริงจากแอป — เมนูฝึกทั้งหมดในหน้าเดียว และปฏิทินแผนอ่านหนังสือของคุณเอง</p>
    </div>

    <div class="app2">
      <!-- practice hub (real layout) -->
      <div class="appframe">
        <div class="abar"><i></i><i></i><i></i><span>languageplanprep.co/practice</span></div>
        <p class="hubsec">🏆 ทำ Mock Test ก่อน</p>
        <div class="trow"><span class="tt"><b>ข้อสอบเสมือนจริง 20 ข้อ · ~1 ชม.</b><span>ดูว่าจุดแข็ง / จุดอ่อน อยู่ที่ทักษะไหน</span></span><span class="ar">→</span></div>
        <p class="hubsec">🎯 ฝึกตามจุดอ่อน</p>
        <div class="trow"><span class="tt"><b>ตามคำบอก</b><span>ฟังแล้วพิมพ์ตาม</span></span><span class="dpill e"><i></i>easy</span></div>
        <div class="trow"><span class="tt"><b>เติมคำในช่องว่าง</b><span>เติมคำที่หาย</span></span><span class="dpill m"><i></i>medium</span></div>
        <div class="trow"><span class="tt"><b>คำจริง–คำหลอก</b><span>แยกคำจริง/ปลอม</span></span><span class="dpill e"><i></i>easy</span></div>
        <div class="trow"><span class="tt"><b>ศัพท์ในบทความ</b><span>คำศัพท์ในบริบท · เลือกคำให้ตรง</span></span><span class="dpill h"><i></i>hard</span></div>
        <div class="trow"><span class="tt"><b>การอ่าน</b><span>บทอ่าน · 5 รอบ · หา title + MCQ</span></span><span class="ar">→</span></div>
        <div class="trow"><span class="tt"><b>ฟังบทสนทนา</b><span>ฟังบทสนทนา · 5 ฉาก</span></span><span class="ar">→</span></div>
        <div class="trow"><span class="tt"><b>พูดบรรยายภาพ</b><span>พูดบรรยายภาพ · 1 นาที</span></span><span class="ar">→</span></div>
        <div class="trow"><span class="tt"><b>อ่านแล้วพูด</b><span>อ่านแล้วพูดด้วยคำของคุณ</span></span><span class="ar">→</span></div>
        <p class="hubsec">📊 อ่านรายงานคะแนน</p>
        <div class="trow"><span class="tt"><b>รายงานผลของฉัน</b><span>คะแนนแยก 4 ทักษะ + จุดที่ต้องแก้</span></span><span class="ar">→</span></div>
      </div>

      <!-- study calendar (real layout) -->
      <div class="appframe">
        <div class="abar"><i></i><i></i><i></i><span>languageplanprep.co/study-plan</span></div>
        <div class="cal-top">
          <span class="mo">กันยายน 2026</span>
          <span class="streak">🔥 ซ้อมต่อเนื่อง 6 วัน</span>
        </div>
        <div class="mins">
          <p>มีเวลากี่นาที</p>
          <div class="row">
            <span class="mchip">5 นาที</span><span class="mchip">10 นาที</span>
            <span class="mchip on">20 นาที</span><span class="mchip">30 นาที</span>
          </div>
        </div>
        <div class="cal">
          <div class="wd"><span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span></div>
          <div class="days">
            <span class="d off"></span><span class="d off"></span>
            <span class="d done">✓</span><span class="d done">✓</span><span class="d done">✓</span><span class="d done">✓</span><span class="d done">✓</span>
            <span class="d">6</span><span class="d done">✓</span><span class="d done">✓</span><span class="d done">✓</span><span class="d today">10</span><span class="d">11</span><span class="d">12</span>
            <span class="d">13</span><span class="d">14</span><span class="d mock">📝</span><span class="d">16</span><span class="d">17</span><span class="d">18</span><span class="d mock">📝</span>
            <span class="d">20</span><span class="d">21</span><span class="d mock">📝</span><span class="d">23</span><span class="d">24</span><span class="d mock">📝</span><span class="d">26</span>
            <span class="d">27</span><span class="d exam">🎯</span><span class="d off"></span><span class="d off"></span><span class="d off"></span><span class="d off"></span><span class="d off"></span>
          </div>
          <div class="cal-leg">
            <span><i style="background:#E6F5EC"></i>ฝึกแล้ว</span>
            <span><i style="background:#004AAD"></i>วันนี้</span>
            <span><i style="background:#FFF6CC;border:1px solid #FFCC00"></i>📝 วัน Mock</span>
            <span><i style="background:#fff;border:1px solid #004AAD"></i>🎯 วันสอบจริง</span>
          </div>
        </div>
        <div class="plan">
          <p>แผนของวันนี้ · 20 นาที</p>
          <div class="row">
            <span class="pchip">🎧 ตามคำบอก <b>×3</b></span>
            <span class="pchip">✏️ เติมคำ <b>×2</b></span>
            <span class="pchip">📚 ศัพท์ <b>×1</b></span>
            <span class="pchip">📖 การอ่าน <b>×1</b></span>
            <span class="pchip">🔤 คำจริง <b>×1</b></span>
          </div>
        </div>
      </div>
    </div>

    <p class="lede" style="text-align:center;max-width:62ch;margin:32px auto 0">
      <b>ปฏิทินอ่านหนังสือส่วนตัว</b> — บอกวันสอบ แล้วเลือกว่าแต่ละวันมีเวลา 5 / 10 / 20 / 30 นาที
      ระบบจัดแผนให้ทุกวันจนถึงวันสอบ วันไหนพลาดก็เก็บตามให้ และ <b>2 สัปดาห์สุดท้ายจะจัด Mock Test ให้สัปดาห์ละ 2 ครั้ง</b>อัตโนมัติ
    </p>
  </section>

  <!-- ALL FEATURES -->
  <section class="s" id="features">
    <div class="head">
      <h2>ฟีเจอร์ทั้งหมด<span class="y">ในแพลตฟอร์ม</span></h2>
      <p class="lede">กดเปิดดูทีละหมวดได้เลย — นี่คือทุกอย่างที่อยู่ข้างใน</p>
    </div>

    <div class="acc">
      <details class="f" open>
        <summary><span class="fic b">📝</span><span class="ft"><b>แบบฝึกครบ 12 ชนิด · 4 ทักษะ</b><span>ฝึกแยกทีละแบบ แบ่งระดับ easy / medium / hard</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li><b>อ่าน:</b> อ่านเชิงโต้ตอบ 6 ขั้น (เติมคำ → หาประโยคที่หาย → ไฮไลต์คำตอบ → เลือกใจความ → ตั้งชื่อเรื่อง) · ศัพท์ในบทความ · คำจริง–คำหลอก</li>
          <li><b>ฟัง:</b> ตามคำบอก (ฟังแล้วพิมพ์) · ฟังบทสนทนา 5 ฉาก · สรุปบทสนทนา (ตรวจให้ทันที)</li>
          <li><b>เขียน:</b> เขียนบรรยายภาพ 1 นาที · อ่านแล้วเขียนเรียงความเต็ม · เติมคำในช่องว่าง (C-Test)</li>
          <li><b>พูด:</b> พูดโต้ตอบ 6 เทิร์น · อ่านแล้วพูดด้วยคำของคุณ · พูดบรรยายภาพ 1 นาที</li>
          <li>ทุกแบบมี 3 ระดับความยาก และแยกเป็นรอบ ๆ ให้เล่นเก็บทีละด่าน</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic y">🗓️</span><span class="ft"><b>ปฏิทินแผนอ่านหนังสือส่วนตัว</b><span>จัดตารางจากวันสอบ + เวลาว่างของคุณ 5–30 นาที/วัน</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>บอกวันสอบ → ระบบวางแผนให้ทุกวันจนถึงวันสอบ</li>
          <li>เลือกเวลาที่มีจริงต่อวัน: <b>5 / 10 / 20 / 30 นาที</b> — แผนแต่ละวันจัดชุดฝึกให้พอดีเวลา (เช่น 20 นาที = ตามคำบอก ×3, เติมคำ ×2, ศัพท์, การอ่าน, คำจริง)</li>
          <li>นับสตรีค 🔥 ฝึกต่อเนื่องกี่วัน · วันไหนพลาด ระบบจัดเก็บตามให้</li>
          <li><b>2 สัปดาห์สุดท้ายก่อนสอบ</b> ใส่ Mock Test ให้อัตโนมัติสัปดาห์ละ 2 ครั้ง</li>
          <li>ฝึกอิสระนอกแผนก็นับ — ปฏิทินบันทึกว่าวันนี้ฝึกไปกี่นาที</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic b">🏆</span><span class="ft"><b>ข้อสอบเสมือนจริง (Mock Test)</b><span>20 ข้อ ~1 ชั่วโมง เรียงเหมือนสอบจริง</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>20 ข้อเรียงตามโครงสร้างข้อสอบจริง มีพัก 45 วินาที 4 ช่วง</li>
          <li>ได้คะแนนรวม 0–160 และแยก <b>ฟัง · พูด · อ่าน · เขียน</b> เทียบกับคะแนนเป้าหมายที่ตั้งไว้</li>
          <li>ชี้ 2 ทักษะที่อ่อนที่สุด พร้อมปุ่มกดไปฝึกตรงจุดทันที</li>
          <li>ตารางรายข้อ ข้อไหนได้–เสีย + คำแนะนำว่าควรทำอะไรต่อ</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic y">💬</span><span class="ft"><b>รายงานผลละเอียดระดับประโยค</b><span>ตรวจเขียน–พูดให้ใน 1 นาที พร้อมตัวอย่างแก้</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>คะแนนแยก 4 ด้าน: ไวยากรณ์ · คำศัพท์ · ความลื่นไหล · ตอบตรงโจทย์ (อธิบายเป็นภาษาไทย)</li>
          <li>ไฮไลต์ในคำตอบของคุณเลยว่า จุดไหนดี จุดไหนฉุดคะแนน</li>
          <li><b>เขียนคำตอบของคุณใหม่ให้ดู 2 ระดับ</b> — ถ้าเขียนแบบนี้จะได้คะแนนขั้นถัดไป</li>
          <li>พาร์ทพูด: ยกประโยคที่คุณพูดจริงมาสอนสูงสุด 10 ประโยค + สำนวนอเมริกันที่ใช้แทนได้</li>
          <li>แนะนำศัพท์อัปเกรดระดับ B2 → C1 จากคำที่คุณใช้เอง</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic b">📚</span><span class="ft"><b>บทเรียนปูพื้น (Lessons)</b><span>เส้นทางเรียนปลดล็อกทีละด่าน 3 ระดับ ตามคะแนนเป้าหมาย</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>3 ระดับตามเป้าหมาย: ~90 / ~115 / 125+ — ปลดล็อกทีละหน่วย หน่วยละ 10 ข้อ</li>
          <li><b>แกรมมาร์เติมคำ 3 ด่าน</b> (ต้องได้ 100% ถึงปลดด่านถัดไป) — tense, passive, adverb, คำเชื่อม</li>
          <li><b>ศัพท์ชีวิตมหาลัย</b> — ฉากจริงในแคมปัส + เติมคำ 3 จุดต่อคำ</li>
          <li><b>สอนพูดทีละขั้น</b> — ประกอบประโยคต้นแบบ แล้วพูดตามจนออกเสียงถูก ≥90% ถึงผ่าน</li>
          <li><b>สอนเขียนทีละขั้น</b> — ประกอบเรียงความต้นแบบจากตัวเลือก แล้วฝึกเขียนเอง</li>
          <li><b>ทักษะการอ่านแยกดริล</b> — เติมคำ / หาย่อหน้าที่หาย / หาข้อมูล / ใจความหลัก + ทริคภาษาไทย</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic y">⚡</span><span class="ft"><b>มินิเลิร์น 16 บท + ฝึกจับเวลา</b><span>บทเรียนสั้น สอนแล้วฝึกทันทีในหน้าเดียว</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li><b>Mini-Study 16 บท</b> — อธิบายสั้น ๆ เป็นไทย แล้วต่อด้วยแบบฝึกของเรื่องนั้นทันที</li>
          <li><b>ฝึกแบบจับเวลา</b> — เลือก 5–30 นาที ระบบสุ่มข้อจากทุกรอบทุกระดับมาให้ทำจนหมดเวลา แล้วบันทึกลงปฏิทิน</li>
          <li>เช็กระดับฟรี (Mini Diagnosis) 9 ข้อ ~12 นาที — รู้คะแนนทั้ง 4 ทักษะโดยไม่ต้องสมัครก่อน</li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic b">📒</span><span class="ft"><b>สมุดโน้ตส่วนตัว + เกมทบทวน</b><span>เก็บจุดที่เคยผิด แล้วทบทวนเป็นเกม</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>กดเก็บจากรายงานผลได้ทุกจุด — แกรมมาร์ / ศัพท์ / ฟีดแบ็กการเขียน-พูด</li>
          <li>แยกหมวดให้อัตโนมัติ และสร้างหมวดของตัวเองได้</li>
          <li>ทบทวน 3 แบบ: <b>การ์ดพลิก</b> · <b>เกมจับคู่</b> · <b>ควิซความหมาย</b></li>
        </ul></div>
      </details>

      <details class="f">
        <summary><span class="fic y">🎓</span><span class="ft"><b>คอร์ส Fast Track ในแอป (VIP)</b><span>วิดีโอบทเรียน + วัดระดับรายทักษะ + วิดีโอเฉลยจากครู</span></span>
          <svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
        <div class="fbody"><ul>
          <li>บทเรียนวิดีโอของคอร์ส Duolingo Fast Track ดูในแอปได้เลย พร้อมติดตามความคืบหน้า</li>
          <li><b>วัดระดับรายทักษะ</b>ก่อนเริ่ม — ระบบจัดว่าควรเริ่มเรียนจากจุดไหน</li>
          <li>วางแผนรายสัปดาห์แบบลาก-วาง + คะแนนรายสัปดาห์</li>
          <li><b>วิดีโอเฉลยจากครู</b>ในโจทย์พูด — ดูวิธีตอบคะแนนสูงของจริง</li>
          <li>สมัครคอร์สได้ที่ <a href="https://www.language-plan.com/courses/duolingo-fast-track" style="color:var(--blue);font-weight:700;text-decoration:underline">language-plan.com/courses/duolingo-fast-track</a></li>
        </ul></div>
      </details>
    </div>
  </section>

  <!-- ============ INTERACTIVE SPEAKING ============ -->
  <section class="s">
    <div class="head">
      <span class="pill">ของใหม่ล่าสุด</span>
      <h2>Duolingo เพิ่งเพิ่มพาร์ท<br><em>พูดโต้ตอบ</em> — เราฝึกให้แล้ว</h2>
      <p class="lede">ไม่ใช่พูดคนเดียวแล้วจบ — ระบบถามคำถามถัดไปจากสิ่งที่คุณเพิ่งพูด เหมือนคุยกับคนจริง</p>
    </div>
    <div class="feat">
      <div class="chat">
        <div class="msg q"><span class="av q">ถาม</span><span class="bub">Tell me about a place you go to relax.</span>
          <span class="tmr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5.4l3.4 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>35</span></div>
        <div class="msg me"><span class="av me">คุณ</span><span class="bub">I usually go to a café near my university…</span></div>
        <div class="msg q"><span class="av q">ถาม</span><span class="bub">You mentioned a café — what makes that one different?</span>
          <span class="tmr"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5.4l3.4 2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>35</span></div>
        <div class="msg me"><span class="av me">คุณ</span><span class="bub">It's quiet, and they have a garden at the back…</span></div>
        <div class="msg q"><span class="av q">ถาม</span><span class="bub">คำถามเทิร์นถัดไป มาจากสิ่งที่คุณเพิ่งพูดทุกครั้ง — รวม 6 เทิร์น</span></div>
      </div>
      <div>
        <ul class="b">
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l5 5L19 7" stroke="#6B5500" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>6 เทิร์น</b> — เปิดด้วยคำถามจากครู แล้วระบบถามต่ออีก 5 คำถาม</li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l5 5L19 7" stroke="#6B5500" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>35 วินาที</b> ต่อคำตอบ ฟังคำถามได้ครั้งเดียว เวลาเดินทันที</li>
          <li><span class="ck"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l5 5L19 7" stroke="#6B5500" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>ตรวจเสร็จ ยก<b>ประโยคของคุณเองมาให้ดูสูงสุด 10 ประโยค</b> ว่าควรพูดใหม่ว่ายังไง พร้อมสำนวนอเมริกันที่ใช้แทนได้</li>
        </ul>
        <div class="stat" style="margin-top:22px;text-align:center"><span class="n" style="font-size:36px">+20–30</span><span class="t">คะแนนที่นักเรียนขยับได้จากการฝึกพาร์ทนี้โดยเฉพาะ</span></div>
      </div>
    </div>
  </section>

  <!-- ============ VS IELTS ============ -->
  <section class="s">
    <div class="head">
      <h2>แล้วมันต่างจาก <em>IELTS</em> ยังไง?</h2>
      <p class="lede">ถ้าคุณเตรียมตัวแบบ IELTS คุณจะพลาด — เพราะมันคนละแบบกันเลย</p>
    </div>
    <div class="vs">
      <div class="vcol on"><div class="vhead">Duolingo</div>
        <div class="vrow"><span class="k">รูปแบบ</span><span>ข้อสอบสั้นหลายสิบข้อ สลับทักษะไปมา</span></div>
        <div class="vrow"><span class="k">อ่าน</span><span>หาประโยคที่หายไป, เลือกใจความที่ถูก, ตั้งชื่อเรื่อง</span></div>
        <div class="vrow"><span class="k">คำศัพท์</span><span>วัดตรง ๆ — แยกคำจริงจากคำหลอก และเติมคำให้ถูกบริบท</span></div>
        <div class="vrow"><span class="k">พูด</span><span>พูดโต้ตอบ ระบบถามต่อจากสิ่งที่คุณพูด</span></div>
        <div class="vrow"><span class="k">ฟัง</span><span>ฟังแล้วต้องพิมพ์ตามให้ตรงทุกคำ</span></div>
        <div class="vrow"><span class="k">เวลา</span><span><b>จบใน 1 ชั่วโมง</b> จับเวลาแยกทุกข้อ</span></div></div>
      <div class="vcol off"><div class="vhead">IELTS</div>
        <div class="vrow"><span class="k">รูปแบบ</span><span>4 พาร์ทยาว แยกกันชัดเจน</span></div>
        <div class="vrow"><span class="k">อ่าน</span><span>ตอบคำถามจากบทความยาว</span></div>
        <div class="vrow"><span class="k">คำศัพท์</span><span>ไม่มีพาร์ทวัดคำศัพท์แยก</span></div>
        <div class="vrow"><span class="k">พูด</span><span>พูดกับคน คำถามกำหนดไว้ล่วงหน้า</span></div>
        <div class="vrow"><span class="k">ฟัง</span><span>ฟังแล้วตอบคำถาม</span></div>
        <div class="vrow"><span class="k">เวลา</span><span>เกือบ 3 ชั่วโมง</span></div></div>
    </div>
    <div class="say y">เพราะข้อสอบสั้นและเยอะ<br>ความเร็วจึงเป็นคะแนน</div>
    <p class="lede" style="text-align:center;max-width:56ch;margin:34px auto 0">คนทำไม่ทันส่วนใหญ่ ไม่ใช่เพราะภาษาไม่ดี แต่เพราะไม่เคยเจอรูปแบบมาก่อน</p>
  </section>

  <!-- MOCK -->
  <section class="s" id="mock">
    <div class="head">
      <h2>สอบเสมือนจริง <em>1 ชั่วโมง</em><br>รู้เลยว่าอะไรฉุดคุณอยู่</h2>
      <p class="lede">20 ข้อ เรียงเหมือนข้อสอบจริง มีพักระหว่างทาง — จบแล้วได้คะแนนแยกทีละทักษะ</p>
    </div>
    <div class="path-card">
      <div class="path-scroll">
        <svg viewBox="0 0 880 200" width="880" height="200" role="img" aria-label="เส้นทางข้อสอบ 20 ข้อ พร้อมจุดพัก 4 ครั้ง">
          <path d="M40 100 C 130 35, 200 165, 290 100 S 450 35, 540 100 S 700 165, 840 100" stroke="#E5E5E5" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="1 15"/>
          <g font-family="Mitr, Sarabun" font-weight="700" font-size="13" text-anchor="middle">
            <g><circle cx="40" cy="104" r="19" fill="#003279"/><circle cx="40" cy="100" r="19" fill="#004AAD"/><text x="40" y="105" fill="#fff">1</text></g>
            <g><circle cx="107" cy="72" r="19" fill="#003279"/><circle cx="107" cy="68" r="19" fill="#004AAD"/><text x="107" y="73" fill="#fff">2</text></g>
            <g><circle cx="174" cy="79" r="19" fill="#003279"/><circle cx="174" cy="75" r="19" fill="#004AAD"/><text x="174" y="80" fill="#fff">3</text></g>
            <g><circle cx="228" cy="127" r="19" fill="#003279"/><circle cx="228" cy="123" r="19" fill="#004AAD"/><text x="228" y="128" fill="#fff">4</text></g>
            <g><circle cx="290" cy="104" r="19" fill="#003279"/><circle cx="290" cy="100" r="19" fill="#004AAD"/><text x="290" y="105" fill="#fff">5</text></g>
            <g transform="translate(345,69)"><rect x="-15" y="-9" width="30" height="24" rx="5" fill="#D9AD00"/><rect x="-15" y="-13" width="30" height="24" rx="5" fill="#FFCC00"/><rect x="-15" y="-13" width="30" height="9" rx="4" fill="#D9AD00" opacity=".55"/><circle cx="0" cy="1" r="3" fill="#6B5500"/></g>
            <g><circle cx="404" cy="67" r="19" fill="#003279"/><circle cx="404" cy="63" r="19" fill="#004AAD"/><text x="404" y="68" fill="#fff">8</text></g>
            <g><circle cx="470" cy="85" r="19" fill="#003279"/><circle cx="470" cy="81" r="19" fill="#004AAD"/><text x="470" y="86" fill="#fff">10</text></g>
            <g><circle cx="540" cy="104" r="19" fill="#003279"/><circle cx="540" cy="100" r="19" fill="#004AAD"/><text x="540" y="105" fill="#fff">12</text></g>
            <g><circle cx="600" cy="131" r="19" fill="#003279"/><circle cx="600" cy="127" r="19" fill="#004AAD"/><text x="600" y="132" fill="#fff">13</text></g>
            <g transform="translate(660,141)"><rect x="-15" y="-9" width="30" height="24" rx="5" fill="#D9AD00"/><rect x="-15" y="-13" width="30" height="24" rx="5" fill="#FFCC00"/><rect x="-15" y="-13" width="30" height="9" rx="4" fill="#D9AD00" opacity=".55"/><circle cx="0" cy="1" r="3" fill="#6B5500"/></g>
            <g><circle cx="720" cy="137" r="19" fill="#003279"/><circle cx="720" cy="133" r="19" fill="#004AAD"/><text x="720" y="138" fill="#fff">17</text></g>
            <g><circle cx="782" cy="118" r="27" fill="#003279"/><circle cx="782" cy="113" r="27" fill="#004AAD"/><text x="782" y="119" fill="#fff" font-size="15">19</text></g>
            <g transform="translate(840,100)"><polygon points="0,-22 6.5,-7 22,-7 10,3 14,18 0,9 -14,18 -10,3 -22,-7 -6.5,-7" fill="#FFCC00" stroke="#D9AD00" stroke-width="2.5" stroke-linejoin="round"/></g>
          </g>
          <g font-family="Sarabun" font-size="12" fill="#AFAFAF" text-anchor="middle">
            <text x="345" y="98">พัก</text><text x="660" y="172">พัก</text>
            <text x="782" y="160" font-weight="600" fill="#004AAD">พูดโต้ตอบ 8 นาที</text>
          </g>
        </svg>
      </div>
      <div class="legend">
        <span><i style="background:#004AAD"></i>20 ข้อ เรียงตามข้อสอบจริง</span>
        <span><i style="background:#FFCC00"></i>พัก 45 วินาที · 4 ครั้ง</span>
        <span><i style="background:#FFCC00;border-radius:2px"></i>จบแล้วได้ผลคะแนนทันที</span>
      </div>
    </div>

    <div class="report">
      <div class="rtop">
        <svg width="172" height="172" viewBox="0 0 172 172" role="img" aria-label="คะแนนรวม 115 จาก 160">
          <circle cx="86" cy="86" r="67" fill="none" stroke="#E5E5E5" stroke-width="19"/>
          <circle cx="86" cy="86" r="67" fill="none" stroke="#004AAD" stroke-width="19" stroke-linecap="round" stroke-dasharray="421" stroke-dashoffset="118" transform="rotate(-90 86 86)"/>
          <text x="86" y="86" text-anchor="middle" font-family="Mitr, Sarabun" font-weight="700" font-size="44" fill="#004AAD">115</text>
          <text x="86" y="110" text-anchor="middle" font-family="Sarabun" font-size="14" fill="#AFAFAF">จาก 160</text>
        </svg>
        <div class="bars">
          <div class="bar"><div class="bl"><b>ฟัง</b><span>125</span></div><div class="tr"><div class="fl" style="width:78%"></div></div></div>
          <div class="bar"><div class="bl"><b>อ่าน</b><span>130</span></div><div class="tr"><div class="fl" style="width:81%"></div></div></div>
          <div class="bar"><div class="bl"><b>พูด</b><span>100</span></div><div class="tr"><div class="fl lo" style="width:63%"></div></div></div>
          <div class="bar"><div class="bl"><b>เขียน</b><span>105</span></div><div class="tr"><div class="fl lo" style="width:66%"></div></div></div>
        </div>
      </div>
      <div class="weakbox">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style="flex:none;margin-top:1px"><polygon points="12,2 14.9,8.6 22,9.3 16.6,14.1 18.2,21 12,17.4 5.8,21 7.4,14.1 2,9.3 9.1,8.6" fill="#D9AD00"/></svg>
        <span><b>2 ทักษะที่ต้องเก็บก่อน: พูด และ เขียน</b><br>กดเข้าไปฝึกตรงจุดได้จากหน้านี้เลย</span>
      </div>
      <p class="cap">ตัวอย่างหน้าผลสอบ · ตัวเลขเป็นตัวอย่างประกอบ</p>
    </div>

    <div class="say b">Duolingo บอกคุณว่าได้กี่คะแนน<br>เราบอกว่า<span style="color:#FFCC00">ทำไม</span></div>
    <p class="lede" style="text-align:center;max-width:62ch;margin:34px auto 0">
      Official report ของ Duolingo ให้ตัวเลขกับคะแนนแยกหมวดมา แล้วหยุดแค่นั้น
      มันไม่บอกว่าข้อไหนที่คุณพลาด ประโยคไหนที่ฉุดคะแนน และพรุ่งนี้ควรฝึกอะไรต่อ
    </p>
  </section>

  <!-- ============ Testimonials / real student proof ============ -->
  <section class="s" id="reviews">
    <div class="head">
      <h2>เสียงจริงจากนักเรียน <em>English Plan</em></h2>
      <p class="lede">ครูและวิธีสอนเดียวกับที่อยู่เบื้องหลังแพลตฟอร์มนี้ — นี่คือผลจริงจากนักเรียนที่เรียนกับพี่ดอย</p>
    </div>
    <div class="rev-grid">
      <figure class="rev-card">
        <blockquote>
          &ldquo;ประทับใจสุด ๆ คือ Writing ของพี่ดอยครับ ผมเริ่มจากแค่ band 5.5 พอได้มาเรียนกับพี่ดอย ได้เทคนิคการเขียน แนวคิด pattern ทำให้ภายใน 3–4 เดือน ผมกระโดดมา <span class="rev-hi">7–7.5</span> ได้เลยครับ ... ส่วนคอร์ส reading &amp; speaking พี่ดอยช่วยผมเยอะมาก ทำให้เข้าใจจริง ๆ ว่าข้อสอบต้องการวัดอะไร&rdquo;
        </blockquote>
        <figcaption>— นักเรียนคอร์สเขียน/อ่าน/พูด · ผลสอบ IELTS Writing 5.5 → 7.5</figcaption>
        <img src="/images/reviews/featured-chat.png" alt="ข้อความรีวิวจากนักเรียน English Plan เล่าว่าคะแนน IELTS Writing เพิ่มจาก band 5.5 เป็น 7.5 ภายใน 3–4 เดือน หลังเรียนเทคนิคการเขียนแบบ pattern กับพี่ดอย" loading="lazy" width="1480" height="520">
      </figure>
      <figure class="rev-card">
        <blockquote>
          &ldquo;พี่ดอย ผมไปสอบมาเมื่อวาน คะแนนออกแล้ว ได้ตามเป้าแล้วครับ — Speaking เพิ่มจาก <span class="rev-hi">6 → 6.5</span> และ Reading <span class="rev-hi">6.0 → 7.0</span>&rdquo;
        </blockquote>
        <figcaption>— นักเรียน English Plan · ผลสอบ IELTS Overall 7.0 (Listening 7.5 · Reading 7.0 · Writing 7.5 · Speaking 6.5)</figcaption>
        <img src="/images/reviews/featured-score.png" alt="ภาพผลสอบ IELTS ของนักเรียน English Plan คะแนนรวม overall band 7 โดย Listening 7.5, Reading 7.0, Writing 7.5 และ Speaking 6.5" loading="lazy" width="1480" height="360">
      </figure>
    </div>
    <p class="cap" style="text-align:center;margin-top:22px">ผลสอบข้างต้นเป็นผลสอบ IELTS ของนักเรียนที่เรียนกับครูผู้สอนคนเดียวกับที่ออกแบบคอร์ส Duolingo English Test Fast Track · ผลลัพธ์ของแต่ละคนแตกต่างกันได้</p>
  </section>

  <!-- ============ CTA ============ -->
  <div class="final" id="fast-track">
    <svg class="crown" viewBox="0 0 64 64"><path d="M8 46L4 18l14 12 14-20 14 20 14-12-4 28z" fill="#FFCC00" stroke="#D9AD00" stroke-width="3" stroke-linejoin="round"/><rect x="8" y="46" width="48" height="10" rx="3" fill="#D9AD00"/></svg>
    <h2>พร้อมเริ่มแล้วใช่ไหม</h2>
    <p class="lede" style="max-width:44ch;margin:14px auto 0">เลือกทางที่ตรงกับคุณได้เลย</p>
    <div class="three">
      <div class="opt-c hi">
        <h3>ยังไม่ได้เรียนคอร์ส</h3>
        <p>คอร์ส English Plan Duolingo Fast Track — เรียนกับครู + ใช้แพลตฟอร์มนี้ได้ 6 เดือน</p>
        <a class="btn btn-y" href="https://www.language-plan.com/courses/duolingo-fast-track">ดูคอร์ส Fast Track</a>
      </div>
      <div class="opt-c">
        <h3>เรียนคอร์สแล้ว</h3>
        <p>กรอกอีเมลขอสิทธิ์ VIP ทีมงานยืนยันแล้วส่งรหัสให้ทางอีเมล</p>
        <a class="btn btn-p" href="#fast-track" data-ft="1">ขอสิทธิ์ใช้แพลตฟอร์ม</a>
      </div>
      <div class="opt-c">
        <h3>อยากลองก่อน</h3>
        <p>เช็กระดับฟรี 12 นาที รู้คะแนนทั้ง 4 ทักษะ แล้วค่อยตัดสินใจ</p>
        <a class="btn btn-s" href="/mini-diagnosis/start">เช็กระดับฟรี</a>
      </div>
    </div>
  </div>

  <footer>English Plan · Duolingo English Test Fast Track · <a href="/login" style="color:#004AAD;font-weight:600">เข้าสู่ระบบ</a></footer>
</div>`;

export function FastTrackLanding({
  initialFastTrackOpen = false,
}: {
  initialFastTrackOpen?: boolean;
}) {
  const [fastTrackOpen, setFastTrackOpen] = useState(initialFastTrackOpen);
  const [ftEmail, setFtEmail] = useState("");
  const [ftName, setFtName] = useState("");
  const [ftLoading, setFtLoading] = useState(false);
  const [ftErr, setFtErr] = useState<string | null>(null);
  const [ftMsg, setFtMsg] = useState<string | null>(null);
  const [ftLinkedEmail, setFtLinkedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (initialFastTrackOpen) setFastTrackOpen(true);
  }, [initialFastTrackOpen]);

  const submitFastTrack = useCallback(async () => {
    setFtLoading(true);
    setFtErr(null);
    setFtMsg(null);
    setFtLinkedEmail(null);
    try {
      const res = await fetch("/api/enrollment/fast-track-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ftEmail.trim(), fullName: ftName.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setFtErr(data.error ?? "Something went wrong.");
        return;
      }
      if (ftEmail.trim().includes("@")) setFtLinkedEmail(ftEmail.trim().toLowerCase());
      setFtMsg(
        data.message ??
          "Request received. After we verify your course enrollment, you will get an email from English Plan with VIP access and your password.",
      );
    } catch {
      setFtErr("Network error. Try again.");
    } finally {
      setFtLoading(false);
    }
  }, [ftEmail, ftName]);

  /* Buttons inside the static HTML marked data-ft open the same modal. */
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[data-ft]");
      if (a) {
        e.preventDefault();
        setFastTrackOpen(true);
      }
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  return (
    <div className={`ftl ${mitr.variable} ${sarabun.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Nav — brand left; เข้าสู่ระบบ + เริ่มฟรี kept in the SAME top-right spots as the old page */}
      <nav className="nav">
        <div className="wrap">
          <Link href="/" className="brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="2" y="3" width="20" height="18" rx="6" fill="#004AAD" />
              <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            English Plan
          </Link>
          <div className="hidden items-center gap-6 text-sm text-gray-500 md:flex">
            <a href="#screens" className="transition-colors hover:text-[#004AAD]">หน้าตาแบบฝึก</a>
            <a href="#app" className="transition-colors hover:text-[#004AAD]">ฟังก์ชันในแอป</a>
            <a href="#features" className="transition-colors hover:text-[#004AAD]">ฟีเจอร์ทั้งหมด</a>
            <a href="#mock" className="transition-colors hover:text-[#004AAD]">Mock test</a>
            <button
              type="button"
              onClick={() => setFastTrackOpen(true)}
              className="transition-colors hover:text-[#004AAD]"
            >
              นักเรียนคอร์ส
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden px-3 py-2 text-sm text-gray-500 transition-colors hover:text-[#004AAD] sm:block"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/explore"
              className="flex min-h-[44px] items-center rounded-lg bg-[#004AAD] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              เริ่มฟรี
            </Link>
          </div>
        </div>
      </nav>

      <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: BODY_HTML }} />

      {/* Fast Track VIP-request modal — identical markup + flow to the previous landing page */}
      {fastTrackOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="fast-track-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="fast-track-title" className="text-xl font-bold text-gray-900">
                Duolingo Fast Track course / นักเรียนคอร์ส Fast Track
              </h2>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100"
                onClick={() => {
                  setFastTrackOpen(false);
                  setFtErr(null);
                  setFtMsg(null);
                  setFtLinkedEmail(null);
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              If you are a student from the <strong>Duolingo Fast Track</strong> course, type the email you
              will use to sign in. We will email our team to verify your enrollment. After approval, you will
              receive an email from <strong>English Plan</strong> with <strong>VIP access for 6 months</strong>{" "}
              (counted from the date you submit this form) and your <strong>personal password</strong>.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              หากคุณเป็นนักเรียนจากคอร์ส <strong>Duolingo Fast Track</strong> ให้ใส่อีเมลที่จะใช้ล็อกอิน
              เราจะส่งเรื่องให้ทีมตรวจสอบ หลังอนุมัติ คุณจะได้รับอีเมลจาก <strong>English Plan</strong> พร้อมสิทธิ์{" "}
              <strong>VIP 6 เดือน</strong> (นับจากวันที่ส่งคำขอ) และ<strong>รหัสผ่านส่วนตัว</strong>
            </p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-gray-700">
              Email
              <input
                type="email"
                autoComplete="email"
                value={ftEmail}
                onChange={(e) => setFtEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-gray-700">
              Full name / ชื่อ-นามสกุล
              <input
                type="text"
                autoComplete="name"
                value={ftName}
                onChange={(e) => setFtName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            {ftErr ? <p className="mt-4 text-sm font-bold text-red-700">{ftErr}</p> : null}
            {ftMsg ? (
              <div className="mt-4 rounded-lg border-2 border-green-800/30 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-900">{ftMsg}</p>
                {ftLinkedEmail ? (
                  <p className="mt-2 text-sm text-green-900">
                    <span className="font-bold uppercase tracking-wide text-green-800">
                      Linked email / อีเมลที่ผูกไว้
                    </span>
                    <br />
                    <span className="break-all font-mono text-base font-black text-gray-900">{ftLinkedEmail}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              disabled={ftLoading || !ftEmail.trim().includes("@")}
              onClick={() => void submitFastTrack()}
              className="mt-6 w-full rounded-xl bg-[#004AAD] py-4 text-sm font-bold uppercase text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {ftLoading ? "…" : "Send request / ส่งคำขอ"}
            </button>
            {!ftMsg ? (
              <p className="mt-4 text-center text-xs text-gray-500">
                After you receive our approval email, use{" "}
                <Link href="/login" className="font-bold text-[#004AAD] underline">
                  Sign in
                </Link>{" "}
                with Google or email + password. / หลังได้รับอีเมลอนุมัติแล้วค่อยเข้า Sign in
              </p>
            ) : (
              <p className="mt-4 text-center text-xs text-gray-500">
                Watch your inbox for an email from English Plan. / รออีเมลจาก English Plan
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
