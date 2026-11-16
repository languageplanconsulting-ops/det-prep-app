"use client";

/**
 * OldSchoolLanding — Thai, "old school" home page (Nov 2026 revamp): big type,
 * lots of space and visuals. Sections: hero (login / sign up), beginner guide +
 * Nong Nine's LINE story, DET exam structure (13 question types as realistic
 * screens in skill dropdowns), what the app does for students, P'Doy's YouTube
 * videos, final CTA, and real Duolingo score reviews.
 *
 * The body is static HTML generated from the approved mockup
 * (public/landing-oldschool-th.html) and rendered via dangerouslySetInnerHTML,
 * same approach as FastTrackLanding. All CSS is scoped under `.osl`.
 * Links marked data-ft open the Fast Track VIP-request modal (also auto-opened
 * by /?fastTrack=1); the big video is a click-to-play facade (data-yt).
 */

import { Prompt, Sarabun } from "next/font/google";
import { useEffect, useRef, useState } from "react";

import { FastTrackRequestModal } from "@/components/landing/FastTrackRequestModal";

const prompt = Prompt({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});
const sarabun = Sarabun({
  weight: ["400", "600", "700", "800"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

const CSS = `
.osl{--blue:#004aad; --blue-dark:#003a87; --blue-soft:#e8f0fb;
  --yellow:#ffcc00; --yellow-soft:#fff6cc;
  --green:#0fa47f; --red:#d8443a;
  --ink:#141414; --soft:#4a4a4a; --faint:#8a8a8a; --line:#d9d6cf;
  --paper:#fbfaf6;
  --head:var(--font-prompt),"Prompt",sans-serif;
  --body:var(--font-sarabun),"Sarabun",var(--font-inter),Arial,sans-serif;
  --hw:700;}
.osl *{box-sizing:border-box}
.osl,.osl{margin:0;padding:0}
.osl{background:var(--paper);color:var(--ink);font-family:var(--body);font-synthesis:none;font-size:20px;line-height:1.75;-webkit-font-smoothing:antialiased}
.osl img{max-width:100%;display:block}
.osl a{color:var(--blue)}
.osl .w{max-width:1080px;margin:0 auto;padding:0 24px}
.osl .w-narrow{max-width:800px;margin:0 auto;padding:0 24px}
.osl h1,.osl h2,.osl h3{font-family:var(--head);margin:0;line-height:1.4;color:var(--ink)}
.osl h1{font-size:clamp(38px,6vw,72px);font-weight:800;letter-spacing:-.01em}
.osl h2{font-size:clamp(34px,4.6vw,56px);font-weight:800}
.osl h3{font-size:clamp(24px,2.6vw,30px);font-weight:700}
.osl .kicker{display:inline-block;font-weight:800;font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);border-bottom:3px solid var(--yellow);padding-bottom:4px;margin-bottom:22px}
.osl .lead{font-size:clamp(20px,2.2vw,25px);color:var(--soft);margin:22px 0 0}
.osl section{padding:120px 0;border-top:2px solid var(--ink)}
.osl section.alt{background:#fff}
.osl section.blue{background:var(--blue);color:#fff;border-top:none}
.osl section.blue h2,.osl section.blue h3{color:#fff}
.osl section.blue .kicker{color:var(--yellow)}
.osl section.blue .lead{color:#dbe6f7}
.osl .top{background:#fff;border-bottom:2px solid var(--ink)}
.osl .top .w{display:flex;align-items:center;justify-content:space-between;height:78px}
.osl .logo{display:flex;align-items:center;gap:12px;font-family:var(--head);font-weight:800;font-size:24px;color:var(--blue);text-decoration:none}
.osl .logo img{height:40px}
.osl .top nav{display:flex;gap:28px;align-items:center;font-size:17px;font-weight:600}
.osl .top nav a{text-decoration:none;color:var(--ink)}
.osl .top nav a.btn-sm{background:var(--blue);color:#fff;padding:8px 18px;border:2px solid var(--ink)}
@media(max-width:760px){.osl .top nav a:not(.btn-sm){display:none}
}
.osl .btn{display:block;text-decoration:none;border:3px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:26px 30px;font-weight:800;transition:transform .1s,box-shadow .1s}
.osl .btn:hover{transform:translate(3px,3px);box-shadow:3px 3px 0 var(--ink)}
.osl .btn small{display:block;font-size:16px;font-weight:600;letter-spacing:.08em;opacity:.8;margin-bottom:2px}
.osl .btn span{font-size:clamp(24px,2.6vw,32px);font-family:var(--head)}
.osl .btn.blue{background:var(--blue);color:#fff}
.osl .btn.yellow{background:var(--yellow);color:var(--ink)}
.osl .btn.white{background:#fff;color:var(--ink)}
.osl .btns{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:48px}
@media(max-width:700px){.osl .btns{grid-template-columns:1fr}
}
.osl .hero{padding:100px 0 120px;border-top:none}
.osl .hero h1 .hl{background:linear-gradient(transparent 62%,var(--yellow) 62%);padding:0 4px}
.osl .hero h1 .bl{color:var(--blue)}
.osl .hero .for{margin-top:28px;font-size:clamp(20px,2.3vw,26px);font-weight:700}
.osl .hero .for b{color:var(--blue)}
.osl .shot{border:3px solid var(--ink);background:#fff;box-shadow:12px 12px 0 var(--blue)}
.osl .shot .bar{height:34px;border-bottom:3px solid var(--ink);display:flex;align-items:center;gap:8px;padding:0 12px;background:var(--yellow-soft)}
.osl .shot .bar i{width:12px;height:12px;border-radius:50%;border:2px solid var(--ink);background:#fff}
.osl .shot .bar i:first-child{background:var(--red)}
.osl .shot .bar i:nth-child(2){background:var(--yellow)}
.osl .shot .bar i:nth-child(3){background:var(--green)}
.osl .hero .shot{margin-top:80px}
.osl .caption{font-size:16px;color:var(--faint);text-align:center;margin-top:22px;font-style:italic}
.osl .steps{margin-top:70px;display:grid;gap:0}
.osl .step{display:grid;grid-template-columns:140px 1fr;gap:36px;padding:48px 0;border-top:2px dashed var(--line)}
.osl .step:first-child{border-top:none}
.osl .step .num{font-family:var(--head);font-size:120px;font-weight:800;line-height:.9;color:var(--blue)}
.osl .step h3{margin-bottom:14px}
.osl .step ul{margin:0;padding-left:1.1em}
.osl .step li{margin:6px 0}
.osl .flow{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px}
.osl .flow span{background:var(--blue-soft);border:2px solid var(--blue);color:var(--blue);font-weight:700;padding:6px 14px;font-size:18px}
.osl .flow em{font-style:normal;font-weight:800;color:var(--faint)}
@media(max-width:700px){.osl .step{grid-template-columns:1fr;gap:6px}
.osl .step .num{font-size:80px}
}
.osl .story{margin-top:80px;border:3px solid var(--ink);background:#fff;box-shadow:12px 12px 0 var(--yellow)}
.osl .story .head{background:var(--ink);color:#fff;padding:22px 34px;font-family:var(--head);font-size:28px;font-weight:700}
.osl .story .body{padding:44px 34px}
.osl .scores{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;text-align:center}
.osl .scores .s{font-family:var(--head);font-size:clamp(80px,12vw,150px);font-weight:800;line-height:1}
.osl .scores .s.from{color:var(--faint)}
.osl .scores .s.to{color:var(--blue)}
.osl .scores .lbl{font-size:18px;font-weight:700;color:var(--soft)}
.osl .scores .arrow{font-size:60px;font-weight:800;color:var(--yellow);-webkit-text-stroke:2px var(--ink)}
.osl .timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:52px;border-top:3px solid var(--ink)}
.osl .timeline>div{padding:22px 18px 0 0;position:relative;font-size:18px}
.osl .timeline>div::before{content:"";position:absolute;top:-12px;left:0;width:20px;height:20px;border-radius:50%;background:var(--yellow);border:3px solid var(--ink)}
.osl .timeline b{display:block;font-size:15px;letter-spacing:.1em;color:var(--blue)}
.osl .weak{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.osl .weak span{background:#fdeceb;color:var(--red);border:2px solid var(--red);font-size:15px;font-weight:700;padding:2px 10px}
@media(max-width:760px){.osl .timeline{grid-template-columns:1fr 1fr;row-gap:30px}
.osl .scores{grid-template-columns:1fr}
.osl .scores .arrow{transform:rotate(90deg)}
}
.osl .facts{display:grid;grid-template-columns:repeat(4,1fr);margin-top:70px;border:3px solid #fff}
.osl .facts div{padding:34px 22px;border-right:3px solid #fff;text-align:center}
.osl .facts div:last-child{border-right:none}
.osl .facts b{display:block;font-family:var(--head);font-size:clamp(54px,7vw,88px);line-height:1;color:var(--yellow)}
.osl .facts span{font-size:19px;font-weight:600}
@media(max-width:760px){.osl .facts{grid-template-columns:1fr 1fr}
.osl .facts div:nth-child(2){border-right:none}
.osl .facts div:nth-child(-n+2){border-bottom:3px solid #fff}
}
.osl details.skill{margin-top:34px;background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink)}
.osl details.skill:first-of-type{margin-top:70px}
.osl details.skill summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:22px;flex-wrap:wrap;padding:26px 32px}
.osl details.skill summary::-webkit-details-marker{display:none}
.osl details.skill[open] summary{border-bottom:3px solid var(--ink);background:var(--yellow-soft)}
.osl .skill .en{font-family:var(--head);font-size:clamp(40px,5.4vw,64px);line-height:1.1}
.osl .skill .th{font-size:24px;font-weight:700;color:var(--soft)}
.osl .skill .types{flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px;margin-top:-6px}
.osl .skill .types span{font-size:15px;font-weight:700;border:2px solid var(--line);padding:1px 10px;color:var(--soft);background:#fff}
.osl .skill .cnt{margin-left:auto;background:var(--yellow);border:2px solid var(--ink);font-weight:800;padding:4px 14px;font-size:18px}
.osl .skill .pm{font-size:44px;font-weight:800;color:var(--blue);transition:transform .2s;line-height:1}
.osl details.skill[open] .pm{transform:rotate(45deg)}
.osl .skill-body{padding:40px 32px 44px;background:var(--paper)}
.osl .qgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:40px 36px}
@media(max-width:820px){.osl .qgrid{grid-template-columns:1fr}
.osl .skill-body{padding:28px 16px}
.osl details.skill summary{padding:20px}
.osl .skill .cnt{margin-left:0}
}
.osl .q .txt{padding:18px 4px 0}
.osl .q .txt h3{font-size:24px;font-family:var(--head);font-weight:400}
.osl .q .txt .meta{font-size:15px;font-weight:700;color:var(--blue);letter-spacing:.03em;margin:2px 0 6px}
.osl .q .txt p{margin:0;font-size:18px;color:var(--soft);line-height:1.7}
.osl .tag-new{display:inline-block;background:var(--red);color:#fff;font-size:13px;font-weight:800;padding:1px 8px;margin-left:8px;vertical-align:middle;font-family:var(--body)}
.osl .exam{font-family:var(--font-inter),"Inter",system-ui,sans-serif;background:#fff;border:1px solid #cfd4da;border-radius:12px;box-shadow:0 1px 0 #cfd4da,0 10px 28px rgba(20,30,50,.10);overflow:hidden;color:#262b33;font-size:14px;line-height:1.5}
.osl .exam .chrome{height:26px;background:#eceef1;border-bottom:1px solid #d9dde2;display:flex;align-items:center;gap:6px;padding:0 10px}
.osl .exam .chrome i{width:9px;height:9px;border-radius:50%;background:#c9ced5}
.osl .exam .chrome b{margin-left:10px;font-size:11px;font-weight:500;color:#8a929c;background:#fff;border-radius:4px;padding:1px 10px;flex:1;max-width:220px}
.osl .exam .top{display:flex;align-items:center;gap:12px;padding:12px 18px 0}
.osl .exam .prog{flex:1;height:6px;border-radius:6px;background:#e7eaee;overflow:hidden}
.osl .exam .prog i{display:block;height:100%;background:#3c4a5c;border-radius:6px}
.osl .exam .clock{font-size:12px;font-weight:700;color:#3c4a5c;background:#f1f3f6;border:1px solid #dde1e6;border-radius:20px;padding:2px 10px;font-variant-numeric:tabular-nums}
.osl .exam .clock.hot{color:#c0392b;border-color:#f1c4bf;background:#fdf1ef}
.osl .exam .ttl{font-size:17px;font-weight:700;text-align:center;padding:16px 20px 4px;color:#1d2229}
.osl .exam .sub{font-size:12px;text-align:center;color:#7a838e;margin-top:-2px}
.osl .exam .bd{padding:14px 20px 4px;min-height:150px;display:flex;flex-direction:column;justify-content:center;gap:10px}
.osl .exam .ft{display:flex;justify-content:flex-end;padding:10px 18px 14px}
.osl .exam .next{font-size:12px;font-weight:800;letter-spacing:.08em;color:#fff;background:#3c4a5c;border-radius:8px;padding:8px 22px;box-shadow:0 3px 0 #253041}
.osl .exam .next.off{background:#d5d9df;box-shadow:0 3px 0 #bcc2ca;color:#fff}
.osl .e-words{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.osl .e-words span{border:2px solid #dde1e6;border-radius:8px;text-align:center;padding:7px 4px;font-weight:600;position:relative}
.osl .e-words span.on{border-color:#3c4a5c;background:#f1f4f8}
.osl .e-words span.on::after{content:"✓";position:absolute;right:6px;top:6px;font-size:11px;color:#fff;background:#3c4a5c;border-radius:50%;width:15px;height:15px;line-height:15px}
.osl .e-text{font-size:14.5px;line-height:2.15;color:#333a44}
.osl .e-text .lb{display:inline-flex;gap:2px;vertical-align:middle}
.osl .e-text .lb i{display:inline-block;width:12px;height:19px;border-bottom:2px solid #3c4a5c;font-style:normal;text-align:center;font-weight:700;color:#1d2229;line-height:19px}
.osl .e-text .lb i.f{border-bottom-color:#9aa3ad}
.osl .e-split{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}
.osl .e-pass{font-size:12.5px;line-height:1.75;color:#4b535e;border:1px solid #e3e6ea;border-radius:8px;padding:10px 12px;background:#fafbfc;max-height:150px;overflow:hidden}
.osl .e-pass mark{background:#ffe98a;padding:0 2px}
.osl .e-qs{display:flex;flex-direction:column;gap:7px;font-size:12.5px}
.osl .e-qs b{font-size:12.5px}
.osl .e-opt{border:2px solid #dde1e6;border-radius:8px;padding:6px 10px;display:flex;gap:8px;align-items:center}
.osl .e-opt::before{content:"";width:13px;height:13px;border-radius:50%;border:2px solid #b4bcc6;flex:none}
.osl .e-opt.on{border-color:#3c4a5c;background:#f1f4f8}
.osl .e-opt.on::before{border-color:#3c4a5c;background:radial-gradient(#3c4a5c 45%,#fff 50%)}
.osl .e-sel{border:2px solid #3c4a5c;border-radius:6px;padding:0 6px;font-weight:700;font-size:13px;display:inline-block;line-height:1.5}
.osl .e-sel::after{content:" ▾";color:#7a838e}
.osl .e-speaker{display:flex;align-items:center;justify-content:center;gap:14px}
.osl .e-speaker .sp{width:74px;height:74px;border-radius:50%;background:#3c4a5c;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 0 #253041}
.osl .e-speaker .sp svg{width:34px;height:34px;fill:#fff}
.osl .e-speaker small{color:#7a838e;font-size:12px}
.osl .e-area{border:2px solid #cfd4da;border-radius:8px;padding:9px 12px;min-height:58px;font-size:13.5px;color:#333a44;background:#fff}
.osl .e-area .cur{display:inline-block;width:2px;height:15px;background:#3c4a5c;vertical-align:middle;animation:osl-blink 1s infinite}
@keyframes osl-blink{50%{opacity:0}}
.osl .e-area.tall{min-height:96px}
.osl .e-count{font-size:11.5px;color:#7a838e;text-align:right;margin-top:-6px}
.osl .e-scene{font-size:12.5px;background:#f1f4f8;border-radius:8px;padding:8px 12px;color:#3c4a5c}
.osl .e-scene b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#7a838e}
.osl .e-bar{display:flex;align-items:center;gap:10px;border:1px solid #dde1e6;border-radius:30px;padding:6px 12px}
.osl .e-bar .pl{width:24px;height:24px;border-radius:50%;background:#3c4a5c;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center}
.osl .e-bar .tr{flex:1;height:4px;background:#e2e6eb;border-radius:4px;position:relative}
.osl .e-bar .tr::after{content:"";position:absolute;left:0;top:0;bottom:0;width:62%;background:#3c4a5c;border-radius:4px}
.osl .e-bar small{font-size:11px;color:#7a838e;font-variant-numeric:tabular-nums}
.osl .e-photo{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:stretch}
.osl .e-photo .img{border-radius:8px;min-height:150px;background:center/cover no-repeat}
.osl .e-rec{display:flex;flex-direction:column;align-items:center;gap:8px}
.osl .e-rec .wv{display:flex;gap:3px;align-items:center;height:36px}
.osl .e-rec .wv i{width:4px;border-radius:3px;background:#3c4a5c;animation:osl-wv 1s ease-in-out infinite}
.osl .e-rec .wv i:nth-child(2n){animation-delay:.2s}
.osl .e-rec .wv i:nth-child(3n){animation-delay:.45s}
@keyframes osl-wv{50%{transform:scaleY(.4)}}
.osl .e-rec .dot{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#c0392b}
.osl .e-rec .dot::before{content:"";width:9px;height:9px;border-radius:50%;background:#c0392b;animation:osl-blink 1s infinite}
.osl .e-prompt{border-left:4px solid #3c4a5c;background:#f7f8fa;padding:10px 14px;font-size:14px;font-weight:600;border-radius:0 8px 8px 0}
.osl .e-prompt ul{margin:6px 0 0;padding-left:18px;font-weight:400;font-size:13px;color:#4b535e}
.osl .e-intv{display:flex;gap:10px;align-items:flex-start}
.osl .e-intv .av{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#9fb3c8,#5d7590);flex:none;border:2px solid #fff;box-shadow:0 0 0 1px #cfd4da}
.osl .e-intv .bub{background:#f1f4f8;border-radius:4px 12px 12px 12px;padding:8px 12px;font-size:13.5px}
.osl .e-prep{display:flex;justify-content:center;gap:18px;font-size:12px;color:#7a838e}
.osl .e-prep b{color:#1d2229;font-size:16px;display:block;text-align:center}
.osl .nine{display:grid;grid-template-columns:1fr 400px;gap:60px;align-items:center;margin-top:90px}
@media(max-width:900px){.osl .nine{grid-template-columns:1fr}
.osl .phone{margin:0 auto}
}
.osl .nine .scores{grid-template-columns:auto auto auto;justify-content:start;text-align:left}
.osl .nine .scores .s{font-size:clamp(70px,9vw,110px)}
.osl .nine-steps{margin:34px 0 0;padding:0;list-style:none;counter-reset:n}
.osl .nine-steps li{counter-increment:n;position:relative;padding:8px 0 8px 52px;font-size:19px;border-top:2px dashed var(--line)}
.osl .nine-steps li::before{content:counter(n);position:absolute;left:0;top:8px;width:34px;height:34px;background:var(--yellow);border:2px solid var(--ink);font-weight:800;display:flex;align-items:center;justify-content:center}
.osl .phone{width:100%;max-width:400px;border:10px solid #111;border-radius:44px;overflow:hidden;background:#fff;box-shadow:14px 14px 0 #06c755;font-family:var(--font-inter),"Inter",var(--body);font-size:14px}
.osl .ph-status{display:flex;justify-content:space-between;padding:8px 22px 4px;font-size:12px;font-weight:700;background:#fff}
.osl .ph-head{display:flex;align-items:center;gap:10px;padding:8px 14px 10px;background:#fff;border-bottom:1px solid #e6e6e6}
.osl .ph-head .bk{font-size:26px;line-height:1;color:#111}
.osl .ph-head .av{width:36px;height:36px;border-radius:50%;background:#d8c3a5;color:#5a4630;font-weight:800;display:flex;align-items:center;justify-content:center}
.osl .ph-head b{display:block;font-size:15px}
.osl .ph-head small{display:block;font-size:11px;color:#8a8a8a;font-family:var(--body)}
.osl .ph-head .ic{margin-left:auto;color:#333;letter-spacing:8px;font-size:15px}
.osl .ph-chat{background:#8cabd8;padding:14px 12px 18px;display:flex;flex-direction:column;gap:10px;font-family:var(--body)}
.osl .ph-chat .day{align-self:center;background:rgba(0,0,0,.18);color:#fff;font-size:11.5px;font-weight:600;border-radius:12px;padding:2px 12px;margin:4px 0}
.osl .m{display:flex;align-items:flex-end;gap:6px}
.osl .m.out{justify-content:flex-end}
.osl .m .av{width:30px;height:30px;border-radius:50%;background:#d8c3a5;color:#5a4630;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex:none;align-self:flex-start;font-family:var(--font-inter),sans-serif}
.osl .m .bb{max-width:74%;background:#fff;border-radius:18px;padding:9px 13px;font-size:14.5px;line-height:1.55;color:#111;position:relative}
.osl .m.out .bb{background:#a5e887}
.osl .m.in .bb{border-top-left-radius:6px}
.osl .m.out .bb{border-top-right-radius:6px}
.osl .m time{font-size:10px;color:#3d4f6b;line-height:1.3;text-align:right;font-family:var(--font-inter),sans-serif;flex:none}
.osl .m.in time{text-align:left}
.osl .bb.card{padding:8px}
.osl .bb.card>div{margin-bottom:8px}
.osl .rep{background:#f4f6fb;border-radius:12px;padding:10px 12px;font-size:12px}
.osl .rep b{display:block;font-size:12.5px;margin-bottom:6px;color:var(--blue)}
.osl .rr{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:6px;margin:3px 0;font-family:var(--font-inter),sans-serif}
.osl .rr i{height:7px;border-radius:7px;background:#e3e7ee;position:relative;overflow:hidden}
.osl .rr i::after{content:"";position:absolute;inset:0;width:var(--v);background:var(--red);border-radius:7px}
.osl .score115{background:var(--blue);color:#fff;border-radius:12px;padding:12px 14px;text-align:center;font-family:var(--font-inter),sans-serif}
.osl .score115 small{display:block;font-size:11px;letter-spacing:.08em;opacity:.8}
.osl .score115 b{font-size:48px;line-height:1;color:var(--yellow)}
.osl .sticker{font-size:64px;line-height:1}
.osl .ph-input{display:flex;align-items:center;gap:12px;padding:10px 14px 18px;background:#fff;border-top:1px solid #e6e6e6;color:#666}
.osl .ph-input i{font-style:normal;font-size:16px}
.osl .ph-input span{flex:1;background:#f1f1f1;border-radius:18px;padding:6px 12px;font-size:13px;color:#999}
.osl .phone{max-width:390px}
.osl .ph-status{align-items:center}
.osl .ph-status .notch{width:90px;height:22px;background:#111;border-radius:14px}
.osl .ph-head{position:relative;justify-content:space-between;padding:8px 14px 12px}
.osl .ph-head .bk{font-size:24px;display:flex;align-items:center;gap:2px}
.osl .ph-head .bk small{font-size:12px;font-weight:600;display:inline;color:#111}
.osl .ph-head .nm{position:absolute;left:50%;transform:translateX(-50%);font-size:16px}
.osl .ph-head .ic{display:flex;gap:14px;letter-spacing:0}
.osl .ph-head .ic svg{width:21px;height:21px;fill:none;stroke:#222;stroke-width:1.8;stroke-linecap:round}
.osl .ph-chat{height:640px;overflow-y:auto;gap:4px;scrollbar-width:thin;background:#7f9cc9}
.osl .ph-chat .day{margin:12px 0 8px}
.osl .m.first{margin-top:8px}
.osl .m .av.sp{visibility:hidden}
.osl .m:not(.first) .bb{border-radius:18px}
.osl .m .bb{font-size:14.5px}
.osl .photo{max-width:62%;border-radius:16px;overflow:hidden;background:#fff}
.osl .photo img{width:100%;height:240px;object-fit:cover;object-position:top}
.osl .scoreshot{width:200px;background:#fff;padding:18px 16px 16px;text-align:center;font-family:var(--font-inter),sans-serif;border:1px solid #e3e3e3;border-radius:16px}
.osl .scoreshot small{display:block;font-size:10px;letter-spacing:.06em;color:#888;text-transform:uppercase}
.osl .scoreshot span{display:block;font-size:12px;color:#444;margin-top:8px}
.osl .scoreshot b{display:block;font-size:56px;line-height:1.05;color:#1d2229}
.osl .scoreshot em{display:inline-block;font-style:normal;font-size:10px;font-weight:700;color:#0a7d55;background:#e3f6ee;padding:2px 8px;border-radius:10px;margin-top:4px}
.osl .sticker{font-size:76px;line-height:1;filter:drop-shadow(2px 3px 0 rgba(0,0,0,.15))}
.osl .ph-input{gap:14px}
.osl .ph-input .ic2{font-size:17px;color:#555;flex:none;background:none;padding:0}
.osl .ph-input .box{flex:1;background:#f1f1f1;border-radius:18px;padding:6px 12px;font-size:13px;color:#999}
.osl .chat-hint{text-align:center;font-size:15px;color:var(--faint);margin-top:14px}
.osl .repshot{width:210px;background:#f4f6fb;padding:12px;font-family:var(--font-inter),sans-serif;border-radius:16px}
.osl .repshot .rs-top{display:flex;justify-content:space-between;font-size:9px;color:#888;margin-bottom:8px}
.osl .repshot .rs-top b{color:var(--blue);font-size:9px;font-family:monospace}
.osl .repshot small{display:block;text-align:center;font-size:8.5px;color:#999;font-family:var(--body)}
.osl .repshot .big{text-align:center;font-size:40px;font-weight:800;color:var(--blue);line-height:1.1;margin-bottom:8px}
.osl .rs-row{display:grid;grid-template-columns:86px 1fr;gap:6px;align-items:center;font-size:10px;margin:4px 0;background:#fff;padding:4px 6px;border-radius:6px}
.osl .rs-row i{height:6px;border-radius:6px;background:#e3e7ee;position:relative;overflow:hidden}
.osl .rs-row i::after{content:"";position:absolute;inset:0;width:var(--v);background:var(--red);border-radius:6px}
.osl .rs-row.ok i::after{background:var(--green)}
.osl .photo.shot-m{width:214px;max-width:62%;height:535px;border-radius:16px;position:relative;border:1px solid rgba(0,0,0,.08)}
.osl .appshot{width:390px;transform:scale(.5487);transform-origin:top left;background:#f4f6fb;font-family:var(--font-inter),Inter,"Prompt",sans-serif;color:#1d2229;position:absolute;top:0;left:0}
.osl .ap-st{display:flex;justify-content:space-between;padding:10px 26px 4px;font-size:15px;font-weight:700;background:#fff}
.osl .ap-nav{display:flex;justify-content:space-between;align-items:center;padding:12px 18px 14px;background:#fff;border-bottom:2px solid #e6e9ef}
.osl .ap-nav b{font-family:"Courier New",monospace;font-weight:800;color:#004aad;font-size:20px;letter-spacing:.02em}
.osl .ap-nav .hb{width:42px;height:42px;border:1.5px solid #dfe3ea;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px}
.osl .ap-body{padding:18px 16px;display:flex;flex-direction:column;gap:16px}
.osl .ap-msg{display:flex;gap:12px;align-items:center}
.osl .ap-msg .mas{font-size:34px}
.osl .ap-msg div{background:#eaf1fc;border:1px solid #cfdcf3;border-radius:14px;padding:10px 14px;font-size:15px;font-weight:600;font-family:"Prompt",sans-serif}
.osl .ap-card{background:#fff;border:1.5px solid #e1e5ec;border-radius:22px;padding:18px 20px;box-shadow:0 2px 6px rgba(0,0,0,.04)}
.osl .ap-card.c{text-align:center}
.osl .ap-card small{font-size:13px;color:#8b93a1;font-weight:600;font-family:"Prompt",sans-serif}
.osl .ap-big{font-size:72px;font-weight:800;color:#004aad;line-height:1.05;letter-spacing:-.02em}
.osl .ap-pills{display:flex;justify-content:center;gap:8px;margin:6px 0 14px}
.osl .ap-pills span{font-size:13px;font-weight:700;border-radius:20px;padding:5px 12px;font-family:"Prompt",sans-serif}
.osl .ap-pills .y{background:#ffe9a3}
.osl .ap-pills .b{background:#eaf1fc;color:#004aad}
.osl .ap-bar{height:10px;background:#eef1f5;border-radius:10px;overflow:hidden}
.osl .ap-bar.lg{height:14px}
.osl .ap-bar i{display:block;height:100%;background:#004aad;border-radius:10px}
.osl .ap-bar i.w{background:#f2667a}
.osl .ap-scale{display:flex;justify-content:space-between;font-size:12px;color:#8b93a1;margin-top:6px;font-weight:600}
.osl .ap-card h5{margin:0 0 12px;font-size:17px;font-family:"Prompt",sans-serif;font-weight:600}
.osl .ap-sk{margin-bottom:14px}
.osl .ap-skh{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;font-size:16px}
.osl .ap-skh b{font-family:"Prompt",sans-serif;font-weight:600}
.osl .ap-skh em{font-style:normal;font-size:12px;font-weight:700;color:#8b93a1;letter-spacing:.04em}
.osl .ap-skh .fix{font-size:11px;font-weight:700;color:#e0394f;background:#fde8eb;border-radius:10px;padding:1px 8px;margin-left:6px;font-family:"Prompt",sans-serif}
.osl .ap-skh .v{font-weight:800;color:#004aad;font-size:18px}
.osl .ap-skh .v.w{color:#e0394f}
.osl .ap-skh .v small{font-size:12px;color:#8b93a1;font-weight:600}
.osl .ap-focus{background:#fff1f2;border:1.5px solid #f8d3d8;border-radius:20px;padding:14px 18px}
.osl .ap-focus b{font-size:13px;color:#e0394f;font-family:"Prompt",sans-serif}
.osl .ap-focus .t{font-size:20px;font-weight:700;margin:4px 0;font-family:"Prompt",sans-serif}
.osl .ap-focus p{margin:0;font-size:13.5px;color:#5b6370;font-family:"Prompt",sans-serif}
.osl .nine2{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap;margin-top:100px}
.osl .nine2 .scores{grid-template-columns:auto auto auto;text-align:left;gap:16px}
.osl .nine2 .scores .s{font-size:clamp(64px,8vw,100px)}
.osl .collage{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:56px;align-items:start}
.osl .lshot{margin:0;position:relative}
.osl .lshot .ls-frame{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.08);font-family:var(--font-inter),"Inter",var(--body);font-size:14px}
.osl .lshot .ph-chat{height:auto;overflow:visible;padding-bottom:16px}
.osl .lshot .photo.shot-m{width:176px;max-width:none;height:440px;flex:none}
.osl .lshot .photo.shot-m .appshot{transform:scale(.4513)}
.osl .lshot .m .bb{max-width:78%}
.osl .lshot.s1{transform:rotate(-2.5deg);margin-top:30px}
.osl .lshot.s2{transform:rotate(1.2deg);z-index:2}
.osl .lshot.s3{transform:rotate(-1deg);margin-top:50px}
.osl .lshot:hover{z-index:5}
.osl .lshot figcaption{margin-top:18px;text-align:center;font-size:19px;font-weight:700;font-family:var(--body)}
.osl .lshot figcaption b{display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;background:var(--yellow);border:2px solid var(--ink);margin-right:8px;font-family:var(--head)}
.osl .lshot::before{content:"";position:absolute;top:-14px;left:50%;width:90px;height:26px;transform:translateX(-50%) rotate(-3deg);background:rgba(255,204,0,.75);z-index:3;box-shadow:0 1px 2px rgba(0,0,0,.1)}
@media(max-width:1000px){.osl .collage{grid-template-columns:1fr;max-width:400px;margin-left:auto;margin-right:auto;gap:50px}
.osl .lshot.s1,.osl .lshot.s3{margin-top:0}
}
.osl .lshot .ph-head .nm{filter:blur(5px);user-select:none}
.osl .lshot .m .av:not(.sp){filter:blur(3px);background:#c9a98a}
.osl .grp-label{margin-top:56px;font-weight:800;font-size:16px;letter-spacing:.12em;color:var(--blue);display:flex;align-items:center;gap:14px}
.osl .grp-label::after{content:"";flex:1;height:3px;background:var(--ink)}
.osl .feat{display:flex;flex-direction:column;gap:22px}
.osl .fblk h4{margin:0 0 8px;font-family:var(--head);font-size:21px;font-weight:600;color:var(--ink);padding-bottom:6px;border-bottom:2px solid var(--yellow)}
.osl .fblk ul{margin:0;padding-left:1.15em}
.osl .acc-body .fblk li{padding:0;counter-increment:none;list-style:disc}
.osl .acc-body .fblk li::before{content:none}
.osl .fblk li{font-size:17.5px;line-height:1.7;margin:5px 0;color:#2b2b2b}
.osl .fblk li b{color:var(--blue)}
.osl .stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:26px;border:3px solid var(--ink);background:#fff}
.osl .stats div{padding:14px 8px;text-align:center;border-right:3px solid var(--ink)}
.osl .stats div:last-child{border-right:none}
.osl .stats b{display:block;font-family:var(--head);font-size:32px;line-height:1.1;color:var(--blue)}
.osl .stats span{font-size:14px;font-weight:600;color:var(--soft)}
.osl .rev{margin-top:110px}
.osl .rev-grid{columns:2;column-gap:28px;margin-top:44px}
.osl .rcard{break-inside:avoid;margin:0 0 28px;background:#fff;border:3px solid var(--ink);box-shadow:8px 8px 0 var(--blue);position:relative}
.osl .rcard img{width:100%;display:block;border-bottom:3px solid var(--ink)}
.osl .rcard figcaption{padding:14px 18px;font-size:17px;font-weight:600;line-height:1.6}
.osl .rcard{display:flex;flex-direction:column}
.osl .rcard img{order:1}
.osl .rbadge{order:2;align-self:flex-start;margin:14px 0 0 16px;background:var(--yellow);border:3px solid var(--ink);font-family:var(--head);font-weight:700;font-size:24px;padding:0 14px;transform:rotate(-2deg)}
.osl .rbadge::before{content:"DET ";font-size:14px;letter-spacing:.06em}
.osl .rcard figcaption{order:3;padding-top:8px!important}
@media(max-width:700px){.osl .rev-grid{columns:1}
}
.osl .ben-h{font-weight:800;font-size:15px;letter-spacing:.1em;color:var(--blue)}
.osl .ben{border:3px solid var(--ink);background:#fff}
.osl .ben .pain{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:#fdeceb;font-size:18px;font-weight:600;line-height:1.55;border-bottom:2px dashed var(--ink)}
.osl .ben .pain span{font-size:28px;line-height:1;flex:none}
.osl .ben .fix{padding:14px 16px;font-size:18px;font-weight:700;color:var(--blue);line-height:1.55;background:#eaf7f1}
.osl ul.simple{margin:0;padding-left:1.2em}
.osl ul.simple li{font-size:17.5px;margin:6px 0;line-height:1.6}
.osl .acc-body ul.simple li{padding:0;counter-increment:none;list-style:disc}
.osl .acc-body ul.simple li::before{content:none}
.osl details.acc{background:#fff;border:3px solid var(--ink);margin-top:28px;box-shadow:8px 8px 0 var(--ink)}
.osl details.acc summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:22px;padding:28px 32px}
.osl details.acc summary::-webkit-details-marker{display:none}
.osl details.acc summary .ic{width:70px;height:70px;flex:none;display:flex;align-items:center;justify-content:center;font-size:36px;border:3px solid var(--ink);background:var(--yellow)}
.osl details.acc summary .t{font-family:var(--head);font-size:clamp(28px,3.4vw,40px);font-weight:800;line-height:1.2}
.osl details.acc summary .t small{display:block;font-family:var(--body);font-size:18px;font-weight:600;color:var(--faint)}
.osl details.acc summary .pm{margin-left:auto;font-size:44px;font-weight:800;color:var(--blue);transition:transform .2s}
.osl details.acc[open] summary .pm{transform:rotate(45deg)}
.osl details.acc[open] summary{border-bottom:3px solid var(--ink);background:var(--blue-soft)}
.osl .acc-body{display:grid;grid-template-columns:1.15fr 1fr;gap:44px;padding:40px 32px}
.osl .acc-body .shot{box-shadow:8px 8px 0 var(--yellow)}
.osl .acc-body ol{margin:0;padding:0;list-style:none;counter-reset:b}
.osl .acc-body li{counter-increment:b;position:relative;padding:0 0 18px 56px;font-size:19px}
.osl .acc-body li::before{content:counter(b);position:absolute;left:0;top:0;width:38px;height:38px;background:var(--blue);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-family:var(--head);font-size:20px}
.osl .acc-body li b{display:block;font-size:20px}
.osl .vid-mini{display:flex;gap:14px;align-items:center;margin-top:22px;padding:12px;border:2px solid var(--ink);background:var(--yellow-soft);text-decoration:none;color:var(--ink)}
.osl .vid-mini img{width:130px;flex:none;border:2px solid var(--ink)}
.osl .vid-mini b{display:block;font-size:16px;line-height:1.45}
.osl .vid-mini small{font-size:14px;color:var(--soft)}
@media(max-width:800px){.osl .acc-body{grid-template-columns:1fr}
.osl details.acc summary{padding:20px}
.osl details.acc summary .ic{width:54px;height:54px;font-size:28px}
}
.osl .vid-main{margin-top:60px;border:3px solid var(--ink);box-shadow:12px 12px 0 var(--yellow);background:#000;aspect-ratio:16/9}
.osl .vid-main{position:relative;cursor:pointer;overflow:hidden}
.osl .vid-main img{width:100%;height:100%;object-fit:cover}
.osl .vid-main iframe{width:100%;height:100%;border:0;display:block}
.osl .vid-main .bigplay{position:absolute;inset:0;margin:auto;width:120px;height:120px;border-radius:50%;background:var(--red);color:#fff;border:5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:46px;box-shadow:6px 6px 0 var(--ink)}
.osl .vid-main:hover .bigplay{transform:scale(1.06)}
.osl .vid-main .vlabel{position:absolute;left:0;bottom:0;background:var(--yellow);color:var(--ink);font-weight:800;padding:10px 20px;border-top:3px solid var(--ink);border-right:3px solid var(--ink);font-size:20px}
.osl .vgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:60px}
@media(max-width:760px){.osl .vgrid{grid-template-columns:1fr}
}
.osl .vcard{text-decoration:none;color:var(--ink);background:#fff;border:3px solid var(--ink);display:block}
.osl .vcard .th{position:relative;border-bottom:3px solid var(--ink);aspect-ratio:16/9;overflow:hidden}
.osl .vcard .th img{width:100%;height:100%;object-fit:cover}
.osl .vcard .th::after{content:"▶";position:absolute;inset:0;margin:auto;width:64px;height:64px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;border:3px solid #fff}
.osl .vcard .tt{padding:16px 18px;font-weight:700;font-size:18px;line-height:1.5}
.osl .vcard .tt small{display:block;font-weight:600;color:var(--faint);font-size:14px;margin-top:6px}
.osl .final{text-align:center}
.osl .final h2{font-size:clamp(40px,6vw,72px)}
.osl footer{background:var(--ink);color:#bbb;padding:50px 0;font-size:16px}
.osl footer .w{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px}
.osl footer a{color:#fff}
.osl h1,.osl h2,.osl h3,.osl .logo,.osl .btn span,.osl .step .num,.osl .story .head,.osl .scores .s,.osl .facts b,.osl .skill .en,.osl .q .txt h3,.osl details.acc summary .t{font-weight:var(--hw)!important}
@media(max-width:600px){.osl{font-size:18px}
.osl .w,.osl .w-narrow{padding:0 16px}
.osl section{padding:72px 0}
.osl .hero{padding:56px 0 72px}
.osl .hero .shot{margin-top:48px}
.osl .btns{gap:18px;margin-top:32px}
.osl .btn{padding:18px 20px;box-shadow:5px 5px 0 var(--ink)}
.osl .shot{box-shadow:7px 7px 0 var(--blue)}
.osl .step{padding:32px 0}
.osl .facts div{padding:22px 10px}
.osl .nine2{margin-top:64px}
.osl details.skill,.osl details.acc{box-shadow:5px 5px 0 var(--ink)}
.osl details.acc summary{gap:14px;padding:18px 16px}
.osl details.acc summary .pm{font-size:34px}
.osl .acc-body{padding:24px 16px;gap:28px}
.osl .skill .types{display:none}
.osl .e-split{grid-template-columns:1fr}
.osl .e-pass{max-height:none}
.osl .exam .ttl{font-size:15px;padding:14px 14px 2px}
.osl .exam .bd{padding:12px 14px 4px}
.osl .e-photo{grid-template-columns:1fr}
.osl .e-photo .img{min-height:140px}
.osl .stats b{font-size:26px}
.osl .stats span{font-size:12.5px}
.osl .ben .pain,.osl .ben .fix{font-size:16.5px;padding:12px 14px}
.osl .vid-mini img{width:104px}
.osl .vid-main .bigplay{width:80px;height:80px;font-size:30px}
.osl .vid-main .vlabel{font-size:15px;padding:6px 12px}
.osl .rcard{box-shadow:6px 6px 0 var(--blue)}
.osl footer .w{flex-direction:column}
}
.osl .ftline{margin:26px 0 0;font-size:18px;font-weight:600;color:var(--soft)}
.osl .ftline a{font-weight:800}
`;

const BODY_HTML = `
<!-- ============ TOP BAR ============ -->
<header class="top">
  <div class="w">
    <a class="logo" href="/"><img src="/images/language-plan/logo-blue.png" alt=""> English Plan</a>
    <nav>
      <a href="#guide">เริ่มต้นยังไง</a>
      <a href="#exam">ข้อสอบมีอะไรบ้าง</a>
      <a href="#app">แอปทำงานยังไง</a>
      <a href="#videos">วิดีโอพี่ดอย</a>
      <a class="btn-sm" href="/login">เข้าสู่ระบบ</a>
    </nav>
  </div>
</header>

<!-- ============ HERO ============ -->
<section class="hero">
  <div class="w">
    <div class="kicker">Duolingo English Test · สำหรับคนไทย</div>
    <h1>แพลตฟอร์มฝึกและ<br><span class="hl" style="white-space:nowrap">เพิ่มคะแนน</span><br><span class="bl">Duolingo English Test</span></h1>
    <p class="for">สำหรับนักเรียน <b>คอร์ส Duolingo Fast Track</b> ของ English Plan</p>

    <div class="btns">
      <a class="btn blue" href="/login"><small>นักเรียนปัจจุบัน</small><span>เข้าสู่ระบบที่นี่ →</span></a>
      <a class="btn yellow" href="/signup"><small>นักเรียนใหม่</small><span>สมัครที่นี่ →</span></a>
    </div>
    <p class="ftline">นักเรียนคอร์ส Duolingo Fast Track? <a href="/?fastTrack=1" data-ft="1">ขอสิทธิ์ VIP ฟรีที่นี่ →</a></p>

    <div class="shot">
      <div class="bar"><i></i><i></i><i></i></div>
      <img src="/images/landing/diag-report-desktop.png" alt="รายงานผลสอบ แยกคะแนนแต่ละทักษะ">
    </div>
    <p class="caption">ทำ Mock test เสร็จ → ได้รายงานทันทีว่าทักษะไหนแข็ง ทักษะไหนต้องรีบแก้</p>
  </div>
</section>

<!-- ============ GUIDE FOR BEGINNERS ============ -->
<section id="guide" class="alt">
  <div class="w-narrow">
    <div class="kicker">เพิ่งรู้จัก DET?</div>
    <h2>มือใหม่ เริ่มแบบนี้<br>ง่ายที่สุด</h2>
    <p class="lead">ไม่ต้องอ่านอะไรเยอะ ทำตาม 3 ขั้นนี้ก็พอ</p>

    <div class="steps">
      <div class="step">
        <div class="num">1</div>
        <div>
          <h3>ทำ Mock test ของเรา (15–20 นาที)</h3>
          <ul>
            <li>ดีกว่า Mock ทั่วไป เพราะได้ <b>รายงานจุดอ่อน</b> ของตัวเองทันที</li>
            <li>ได้เห็น <b>ข้อสอบครบทุกแบบ</b> รู้เลยว่าต้องเตรียมอะไร</li>
          </ul>
          <a class="btn white" style="display:inline-block;margin-top:22px;padding:14px 24px" href="/mini-diagnosis/start"><span style="font-size:22px">เริ่มทำ Mock test ฟรี →</span></a>
        </div>
      </div>
      <div class="step">
        <div class="num">2</div>
        <div>
          <h3>สมัครคอร์ส Duolingo Fast Track</h3>
          <div class="flow">
            <span>เรียนเทคนิคแต่ละข้อ</span><em>→</em>
            <span>ดูข้อสอบจริงกับพี่ดอย</span><em>→</em>
            <span>ฝึก + ได้ feedback</span><em>→</em>
            <span>ดูพัฒนาการในแอปนี้</span>
          </div>
        </div>
      </div>
      <div class="step">
        <div class="num">3</div>
        <div>
          <h3>ทำแผนรายวันจนถึงวันสอบ</h3>
          <ul>
            <li>แอปจัดแผนให้ทุกวัน เน้นเฉพาะ <b>จุดที่อ่อน</b></li>
            <li>วันละ 10–30 นาที ทำได้บนมือถือ</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Nine story (LINE screenshots) -->
  <div class="w">
    <div class="nine2">
      <div>
        <div class="kicker">เรื่องจริงจาก LINE</div>
        <h2 style="font-size:clamp(32px,4vw,52px)">น้องไนน์ จาก 85 → 115<br>ใน 2 เดือน</h2>
      </div>
      <div class="scores">
        <div><div class="s from">85</div><div class="lbl">ตอนเริ่ม</div></div>
        <div class="arrow">→</div>
        <div><div class="s to">115</div><div class="lbl">สอบจริง</div></div>
      </div>
    </div>
    <div class="collage">
      <figure class="lshot s1">
        <div class="ls-frame">
          <div class="ph-status"><span>20:17</span><span class="notch"></span><span>▂▄▆ ᯤ 82</span></div>
          <div class="ph-head"><span class="bk">‹ <small>99+</small></span><b class="nm">Nine Chanapat</b><span class="ic"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><svg viewBox="0 0 24 24"><path d="M6.6 3.5l2.6 3.4-1.7 2.2a12 12 0 0 0 5.4 5.4l2.2-1.7 3.4 2.6-1.4 3.1C10 18.8 5.2 14 4.5 7.5z"/></svg><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span></div>
          <div class="ph-chat"><div class="day">ศ. 12/9</div><div class="m in first"><span class="av">N</span><div class="bb">พี่ดอยครับบ</div></div><div class="m in"><span class="av sp"></span><div class="bb">ผมสอบ duolingo มาได้ 85 เองงง 😭😭</div></div><div class="m in"><span class="av sp"></span><div class="bb">อยากได้ 115 อะครับ ต้องยื่นมหาลัยอีก 3 เดือน ทันมั้ยครับพี่</div><time>20:14</time></div><div class="m out first"><div class="bb">ทันครับบ ไม่ต้องตกใจ 555</div></div><div class="m out"><div class="bb">ลองไปทำ mock test ในแอปก่อนน้า แป๊บเดียว 15-20 นาทีเอง</div></div><div class="m out"><time>Read<br>20:16</time><div class="bb">เดี๋ยวมันบอกเองว่าเราอ่อนตรงไหน</div></div><div class="m in first"><span class="av">N</span><div class="bb">ได้ครับผม 🙏</div><time>20:17</time></div></div>
          <div class="ph-input"><span class="ic2">＋</span><span class="ic2">📷</span><span class="ic2">🖼</span><span class="box">Aa</span><span class="ic2">☺</span><span class="ic2">🎙</span></div>
        </div>
        <figcaption><b>1</b> วันแรก · คะแนน 85</figcaption>
      </figure>
      <figure class="lshot s2">
        <div class="ls-frame">
          <div class="ph-status"><span>09:50</span><span class="notch"></span><span>▂▄▆ ᯤ 82</span></div>
          <div class="ph-head"><span class="bk">‹ <small>99+</small></span><b class="nm">Nine Chanapat</b><span class="ic"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><svg viewBox="0 0 24 24"><path d="M6.6 3.5l2.6 3.4-1.7 2.2a12 12 0 0 0 5.4 5.4l2.2-1.7 3.4 2.6-1.4 3.1C10 18.8 5.2 14 4.5 7.5z"/></svg><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span></div>
          <div class="ph-chat"><div class="day">ส. 13/9</div><div class="m in first"><span class="av">N</span><div class="photo shot-m"><div class="appshot"><div class="ap-st"><span>21:01</span><span>▂▄▆ ᯤ ▭</span></div><div class="ap-nav"><b>ENGLISH PLAN</b><span class="hb">☰</span></div><div class="ap-body"><div class="ap-msg"><span class="mas">🧑🏻‍💻</span><div>ทำครบทั้ง 9 ข้อแล้ว เก่งมาก! 🎉 นี่คือระดับของคุณตอนนี้</div></div><div class="ap-card c"><small>คะแนนประเมิน (เทียบสเกล DET 10–160)</small><div class="ap-big">≈85</div><div class="ap-pills"><span class="y">CEFR ≈ B1</span><span class="b">Getting there / ต้องฝึกเพิ่ม</span></div><div class="ap-bar lg"><i style="width:50%"></i></div><div class="ap-scale"><span>10</span><span>85</span><span>160</span></div></div><div class="ap-card"><h5>4 ทักษะของคุณ</h5><div class="ap-sk"><div class="ap-skh"><span>📖 <b>อ่าน</b> <em>READING</em></span><span class="v w">80<small> /160</small></span></div><div class="ap-bar"><i class="w" style="width:50%"></i></div></div><div class="ap-sk"><div class="ap-skh"><span>🎧 <b>ฟัง</b> <em>LISTENING</em><span class="fix">แก้ก่อน</span></span><span class="v w">72<small> /160</small></span></div><div class="ap-bar"><i class="w" style="width:45%"></i></div></div><div class="ap-sk"><div class="ap-skh"><span>✍️ <b>เขียน</b> <em>WRITING</em></span><span class="v w">78<small> /160</small></span></div><div class="ap-bar"><i class="w" style="width:49%"></i></div></div><div class="ap-sk"><div class="ap-skh"><span>🗣️ <b>พูด</b> <em>SPEAKING</em></span><span class="v">104<small> /160</small></span></div><div class="ap-bar"><i class="" style="width:65%"></i></div></div></div><div class="ap-focus"><b>🎯 โฟกัสอันนี้ก่อน</b><div class="t">🎧 ฟัง · 72/160</div><p>ฝึก Listen and Type + Interactive Listening (บทสนทนา) ก่อน</p></div></div></div></div></div><div class="m in"><span class="av sp"></span><div class="bb">พี่ ผมอ่อนเยอะมากกก</div></div><div class="m in"><span class="av sp"></span><div class="bb">listen and type, เขียนบรรยายรูป, ข้อที่เป็นบทสนทนา แล้วก็ reading 🥲</div><time>09:42</time></div><div class="m out first"><div class="bb">โอเคดีเลย รู้แล้วจะได้แก้ถูกจุด 👍</div></div><div class="m out"><div class="bb">ไปเรียนเทคนิค 4 บทนี้ในคอร์สก่อนนะ แล้วทำแผนรายวันในแอปทุกวันพอ</div></div><div class="m out"><time>Read<br>09:50</time><div class="bb">อย่าโดดนะะ 😂</div></div></div>
          <div class="ph-input"><span class="ic2">＋</span><span class="ic2">📷</span><span class="ic2">🖼</span><span class="box">Aa</span><span class="ic2">☺</span><span class="ic2">🎙</span></div>
        </div>
        <figcaption><b>2</b> ส่งผล Mock test · รู้จุดอ่อน</figcaption>
      </figure>
      <figure class="lshot s3">
        <div class="ls-frame">
          <div class="ph-status"><span>10:33</span><span class="notch"></span><span>▂▄▆ ᯤ 82</span></div>
          <div class="ph-head"><span class="bk">‹ <small>99+</small></span><b class="nm">Nine Chanapat</b><span class="ic"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><svg viewBox="0 0 24 24"><path d="M6.6 3.5l2.6 3.4-1.7 2.2a12 12 0 0 0 5.4 5.4l2.2-1.7 3.4 2.6-1.4 3.1C10 18.8 5.2 14 4.5 7.5z"/></svg><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span></div>
          <div class="ph-chat"><div class="day">ศ. 14/11</div><div class="m in first"><span class="av">N</span><div class="bb">พี่ดอยยยยยยย</div></div><div class="m in"><span class="av sp"></span><div class="photo"><div class="scoreshot"><small>Duolingo English Test</small><span>Overall score</span><b>115</b><em>Results available</em></div></div></div><div class="m in"><span class="av sp"></span><div class="bb">ได้ 115 แล้วครับบบบ 😭😭😭</div></div><div class="m in"><span class="av sp"></span><div class="bb">ขอบคุณพี่มากๆเลยครับ ไม่คิดว่าจะทัน</div><time>10:31</time></div><div class="m out first"><div class="bb">เห้ยยยย ยินดีด้วยครับบบ 🎉🎉🎉</div></div><div class="m out"><time>Read<br>10:32</time><div class="bb">ทำแผนครบทุกวันจริงงง เก่งมากก</div></div><div class="m in first"><span class="av">N</span><div class="sticker">🥹</div><time>10:33</time></div></div>
          <div class="ph-input"><span class="ic2">＋</span><span class="ic2">📷</span><span class="ic2">🖼</span><span class="box">Aa</span><span class="ic2">☺</span><span class="ic2">🎙</span></div>
        </div>
        <figcaption><b>3</b> 2 เดือนต่อมา · ได้ 115</figcaption>
      </figure>
    </div>

  </div>
</section>

<!-- ============ EXAM BREAKDOWN ============ -->
<section id="exam" class="blue">
  <div class="w">
    <div class="kicker">รู้จักข้อสอบ</div>
    <h2>Duolingo English Test<br>มีข้อสอบย่อยกี่แบบ?</h2>
    <p class="lead">สอบออนไลน์ที่บ้าน ประมาณ 1 ชั่วโมง วัดครบ 4 ทักษะ</p>
    <div class="facts">
      <div><b>13</b><span>แบบข้อสอบ</span></div>
      <div><b>4</b><span>ทักษะ</span></div>
      <div><b>~60</b><span>นาที</span></div>
      <div><b>160</b><span>คะแนนเต็ม</span></div>
    </div>
  </div>
</section>

<section class="alt" style="border-top:none;padding-top:10px">
  <div class="w">
    <p class="lead" style="margin-top:50px;text-align:center">👇 กดที่ทักษะเพื่อดูหน้าตาข้อสอบแต่ละแบบ</p>

    <!-- READING -->
    <details class="skill" open>
      <summary>
        <span class="en">Reading</span><span class="th">การอ่าน</span><span class="cnt">4 แบบ</span><span class="pm">+</span>
        <span class="types"><span>Read and Select</span><span>Fill in the Blanks</span><span>Read and Complete</span><span>Interactive Reading</span></span>
      </summary>
      <div class="skill-body"><div class="qgrid">

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:22%"></i></div><span class="clock">0:41</span></div>
            <div class="ttl">Select the real English words in this list</div>
            <div class="bd"><div class="e-words"><span class="on">honest</span><span>plake</span><span class="on">window</span><span>brinth</span><span class="on">survive</span><span>fendle</span><span>trovish</span><span class="on">gather</span><span>clomp­er</span></div></div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Read and Select</h3><div class="meta">คำไหนเป็นคำจริง? · 1 นาที / ชุด</div><p>เห็นคำทั้งจริงและปลอมปนกัน เลือกเฉพาะคำที่มีอยู่จริง ยิ่งเลือกผิดยิ่งเสียคะแนน</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:30%"></i></div><span class="clock">2:12</span></div>
            <div class="ttl">Type the missing letters to complete the sentence</div>
            <div class="bd"><div class="e-text" style="text-align:center;font-size:16px">The new policy will <span class="lb"><i>a</i><i>f</i><i>f</i><i class="f"></i><i class="f"></i><i class="f"></i></span> every student who lives on campus.</div></div>
            <div class="ft"><span class="next off">NEXT</span></div>
          </div>
          <div class="txt"><h3>Fill in the Blanks <span class="tag-new">ใหม่</span></h3><div class="meta">เติมคำให้ประโยคสมบูรณ์</div><p>มีตัวอักษรต้นคำให้ ต้องเดาคำที่ถูกทั้งความหมายและไวยากรณ์ (เช่น affect / effect)</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:45%"></i></div><span class="clock hot">0:58</span></div>
            <div class="ttl">Type the missing letters to complete the text below</div>
            <div class="bd"><div class="e-text">Many students enjoy lea<span class="lb"><i>r</i><i>n</i><i>i</i><i class="f"></i></span> new langu<span class="lb"><i class="f"></i><i class="f"></i><i class="f"></i></span> because it op<span class="lb"><i class="f"></i><i class="f"></i></span> doors to n<span class="lb"><i class="f"></i><i class="f"></i></span> jobs and frie<span class="lb"><i class="f"></i><i class="f"></i><i class="f"></i></span> around the wo<span class="lb"><i class="f"></i><i class="f"></i></span>.</div></div>
            <div class="ft"><span class="next off">NEXT</span></div>
          </div>
          <div class="txt"><h3>Read and Complete</h3><div class="meta">เติมตัวอักษรที่หายไป · 3 นาที</div><p>ย่อหน้าที่คำขาดครึ่งหลัง ต้องเติมให้ครบทุกช่อง วัดทั้งศัพท์และไวยากรณ์ (C-Test)</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:60%"></i></div><span class="clock">5:20</span></div>
            <div class="ttl" style="font-size:15px">Select the best option for each missing word</div>
            <div class="bd">
              <div class="e-split">
                <div class="e-pass">Coral reefs cover less than one percent of the ocean floor, yet they <span class="e-sel">support</span> about a quarter of all marine species. <mark>Rising sea temperatures cause corals to lose the algae that feed them</mark>, a process known as bleaching…</div>
                <div class="e-qs"><b>Which sentence explains why corals turn white?</b><div class="e-opt on">Highlighted sentence</div><div class="e-opt">The first sentence</div><div class="e-opt">None of these</div></div>
              </div>
            </div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Interactive Reading</h3><div class="meta">บทความเดียว ตอบ 6 คำถาม · 7–8 นาที</div><p>เลือกคำเติมช่อง, หาประโยคตอบคำถาม, เลือกหัวข้อ main idea และชื่อเรื่อง</p></div>
        </div>

      </div></div>
    </details>

    <!-- LISTENING -->
    <details class="skill">
      <summary>
        <span class="en">Listening</span><span class="th">การฟัง</span><span class="cnt">2 แบบ</span><span class="pm">+</span>
        <span class="types"><span>Listen and Type</span><span>Interactive Listening</span></span>
      </summary>
      <div class="skill-body"><div class="qgrid">

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:35%"></i></div><span class="clock">0:47</span></div>
            <div class="ttl">Type the statement that you hear</div>
            <div class="bd">
              <div class="e-speaker"><div class="sp"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg></div><small>Plays remaining: 2</small></div>
              <div class="e-area">She has been working at the library since<span class="cur"></span></div>
            </div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Listen and Type</h3><div class="meta">ฟังแล้วพิมพ์ตาม · ฟังได้ 3 ครั้ง</div><p>ฟังประโยคสั้น ๆ แล้วพิมพ์ให้ถูกทุกคำ ตกหล่น -s, -ed ก็โดนหักคะแนน</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:52%"></i></div><span class="clock">3:05</span></div>
            <div class="ttl" style="font-size:15px">Listen and select the best response</div>
            <div class="bd">
              <div class="e-scene"><b>Scenario</b>You are talking to your professor about a late assignment.</div>
              <div class="e-bar"><span class="pl">▶</span><span class="tr"></span><small>0:06 / 0:09</small></div>
              <div class="e-qs"><div class="e-opt">I don't really care about the grade.</div><div class="e-opt on">Would it be possible to submit it on Friday?</div><div class="e-opt">The library closes at nine.</div></div>
            </div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Interactive Listening</h3><div class="meta">ฟังบทสนทนา เลือกคำตอบ + สรุป</div><p>คุยกับคนในสถานการณ์จริง เลือกคำตอบที่เหมาะสมทีละรอบ แล้วเขียนสรุปบทสนทนาปิดท้าย</p></div>
        </div>

      </div></div>
    </details>

    <!-- WRITING -->
    <details class="skill">
      <summary>
        <span class="en">Writing</span><span class="th">การเขียน</span><span class="cnt">3 แบบ</span><span class="pm">+</span>
        <span class="types"><span>Write About the Photo</span><span>Interactive Writing</span><span>Writing Sample</span></span>
      </summary>
      <div class="skill-body"><div class="qgrid">

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:40%"></i></div><span class="clock">0:38</span></div>
            <div class="ttl">Write one or more sentences that describe the image</div>
            <div class="bd"><div class="e-photo"><div class="img" style="background-image:url(/landing/corner-cafe.jpg)"></div><div class="e-area" style="min-height:150px">People are sitting outside a small café on a sunny afternoon. A waiter is<span class="cur"></span></div></div></div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Write About the Photo</h3><div class="meta">เขียนบรรยายภาพ · 1 นาที</div><p>ดูรูปแล้วเขียนว่าเห็นอะไร ใคร ทำอะไร ที่ไหน ยิ่งใช้ศัพท์หลากหลายยิ่งได้คะแนน</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:55%"></i></div><span class="clock">4:12</span></div>
            <div class="ttl" style="font-size:15px">Respond to the question in at least 50 words</div>
            <div class="bd">
              <div class="e-prompt">Do you prefer studying alone or with a group? Explain why.</div>
              <div class="e-area tall">I prefer studying alone because I can focus better and choose my own pace. When I study with friends, we often<span class="cur"></span></div>
              <div class="e-count">31 words</div>
            </div>
            <div class="ft"><span class="next off">NEXT</span></div>
          </div>
          <div class="txt"><h3>Interactive Writing <span class="tag-new">ใหม่</span></h3><div class="meta">เขียนตอบ 2 รอบ · 5 + 3 นาที</div><p>เขียนตอบคำถามก่อน แล้วระบบถามต่อจากที่เราเขียน ต้องเขียนเพิ่มอีกรอบ</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:95%"></i></div><span class="clock">4:47</span></div>
            <div class="ttl">Write about the topic below for 3–5 minutes</div>
            <div class="bd">
              <div class="e-prompt">Describe a skill you would like to learn in the future. Why is it important to you?</div>
              <div class="e-area tall"><span class="cur"></span></div>
            </div>
            <div class="ft"><span class="next off">SUBMIT</span></div>
          </div>
          <div class="txt"><h3>Writing Sample</h3><div class="meta">เรียงความสั้น · 3–5 นาที</div><p>เขียนเรียงความตอบโจทย์ (ไม่คิดคะแนน แต่ส่งให้มหาวิทยาลัยอ่าน)</p></div>
        </div>

      </div></div>
    </details>

    <!-- SPEAKING -->
    <details class="skill">
      <summary>
        <span class="en">Speaking</span><span class="th">การพูด</span><span class="cnt">4 แบบ</span><span class="pm">+</span>
        <span class="types"><span>Speak About the Photo</span><span>Read, Then Speak</span><span>Interactive Speaking</span><span>Speaking Sample</span></span>
      </summary>
      <div class="skill-body"><div class="qgrid">

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:65%"></i></div><span class="clock">0:52</span></div>
            <div class="ttl">Speak about the photo for at least 30 seconds</div>
            <div class="bd"><div class="e-photo"><div class="img" style="background-image:url(/landing/river-valley.jpg)"></div>
              <div class="e-rec" style="justify-content:center"><div class="wv"><i style="height:14px"></i><i style="height:30px"></i><i style="height:22px"></i><i style="height:36px"></i><i style="height:18px"></i><i style="height:28px"></i><i style="height:12px"></i><i style="height:32px"></i><i style="height:20px"></i></div><div class="dot">Recording 0:38</div></div>
            </div></div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Speak About the Photo</h3><div class="meta">พูดบรรยายภาพ · 30–90 วินาที</div><p>เตรียม 20 วินาที แล้วพูดอธิบายภาพให้ละเอียด ห้ามเงียบนาน</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:70%"></i></div><span class="clock">0:14</span></div>
            <div class="ttl">Prepare to speak about the topic below</div>
            <div class="bd">
              <div class="e-prompt">Talk about a place you enjoy visiting.<ul><li>Where is it?</li><li>What do you do there?</li><li>Why do you like it?</li></ul></div>
              <div class="e-prep"><div><b>0:14</b>prepare</div><div><b>1:30</b>max speak</div></div>
            </div>
            <div class="ft"><span class="next">RECORD NOW</span></div>
          </div>
          <div class="txt"><h3>Read, Then Speak</h3><div class="meta">อ่านโจทย์แล้วพูด · 30–90 วินาที</div><p>อ่านคำถามพร้อมหัวข้อย่อย 20 วินาที แล้วพูดตอบให้ครบทุกข้อ</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:78%"></i></div><span class="clock hot">0:21</span></div>
            <div class="ttl">Answer the question</div>
            <div class="bd">
              <div class="e-intv"><span class="av"></span><div class="bub">That sounds interesting! Why did you choose that subject for university?</div></div>
              <div class="e-rec"><div class="wv"><i style="height:12px"></i><i style="height:26px"></i><i style="height:34px"></i><i style="height:18px"></i><i style="height:30px"></i><i style="height:14px"></i><i style="height:24px"></i></div><div class="dot">Recording 0:14 / 0:35</div></div>
            </div>
            <div class="ft"><span class="next">NEXT</span></div>
          </div>
          <div class="txt"><h3>Interactive Speaking <span class="tag-new">ใหม่</span></h3><div class="meta">คุยโต้ตอบ · ตอบข้อละ 35 วินาที</div><p>ตอบคำถามต่อเนื่อง 6–8 คำถามเหมือนคุยกับคนจริง ไม่มีเวลาเตรียม</p></div>
        </div>

        <div class="q">
          <div class="exam">
            <div class="chrome"><i></i><i></i><i></i><b>englishtest · practice</b></div>
            <div class="top"><div class="prog"><i style="width:98%"></i></div><span class="clock">0:30</span></div>
            <div class="ttl">Prepare to speak for 1–3 minutes</div>
            <div class="bd">
              <div class="e-prompt">Describe a challenge you have overcome. What did you learn from it?</div>
              <div class="e-prep"><div><b>0:30</b>prepare</div><div><b>3:00</b>max speak</div></div>
            </div>
            <div class="ft"><span class="next">RECORD NOW</span></div>
          </div>
          <div class="txt"><h3>Speaking Sample</h3><div class="meta">พูดยาว · 1–3 นาที</div><p>อัดวิดีโอพูดตอบหัวข้อ (ไม่คิดคะแนน แต่ส่งให้มหาวิทยาลัยดู)</p></div>
        </div>

      </div></div>
    </details>

  </div>
</section>

<!-- ============ HOW THE APP WORKS ============ -->
<section id="app">
  <div class="w">
    <div class="kicker">แอปของเรา</div>
    <h2>แอปช่วยน้องยังไง?</h2>
    <p class="lead">กดเปิดดูทีละอย่าง — แต่ละอันแก้ปัญหาที่คนเตรียมสอบ Duolingo เจอบ่อยที่สุด</p>
    <div class="grp-label">5 ฟีเจอร์หลัก</div>
    <details class="acc" open>
      <summary><span class="ic">📝</span><span class="t">ข้อสอบเสมือนจริง<small>Mock test ฟรี · Mock เต็ม 1 ชั่วโมง · ฝึกทีละแบบ</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/mock-start-desktop.png" alt="หน้าเลือกชุด Mock test" loading="lazy"></div>
          <div class="stats"><div><b>ฟรี</b><span>Mock แรก</span></div><div><b>~1 ชม.</b><span>เหมือนสอบจริง</span></div><div><b>13</b><span>แบบข้อสอบ</span></div></div>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>😰</span>“ไม่รู้ตัวเองได้กี่คะแนน กลัวเสียค่าสอบจริงหลายพันฟรี ๆ”</div><div class="fix">→ ทำ Mock ฟรีก่อน รู้คะแนนโดยประมาณ แล้วค่อยตัดสินใจจองสอบ</div></div><div class="ben"><div class="pain"><span>😵</span>“ไม่เคยเห็นข้อสอบจริง กลัวตื่นเต้นจนทำไม่ทัน”</div><div class="fix">→ ซ้อม Mock จับเวลาเหมือนจริงจนชิน วันสอบจริงจะไม่ตกใจ</div></div>
          <div class="ben-h" style="margin-top:6px">มีอะไรบ้าง</div>
          <ul class="simple"><li>Mock ฟรี ~25 นาที ไม่ต้องสมัครก็ทำได้</li><li>Mock เต็ม ~1 ชั่วโมง ครบทุกแบบเหมือนห้องสอบ</li><li>ว่างแค่ 5 นาที? กด 🎲 ให้แอปสุ่มข้อให้ฝึก</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">📊</span><span class="t">ตรวจให้ทันที<small>ได้คะแนน + จุดที่ต้องแก้ เป็นภาษาไทย</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/diag-report-desktop.png" alt="หน้ารายงานผลคะแนน" loading="lazy"></div>
          <div class="stats"><div><b>ทันที</b><span>ไม่ต้องรอครู</span></div><div><b>ไทย</b><span>อธิบายเข้าใจง่าย</span></div><div><b>10–160</b><span>สเกลเดียวกับ DET</span></div></div>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>✍️</span>“เขียน/พูดไปแล้ว ไม่มีใครตรวจให้ ไม่รู้ผิดตรงไหน”</div><div class="fix">→ ส่งปุ๊บได้คะแนนปั๊บ พร้อมชี้ว่าประโยคไหนผิด ควรแก้ยังไง</div></div><div class="ben"><div class="pain"><span>🤔</span>“ฝึกเยอะแต่คะแนนไม่ขึ้น ไม่รู้ควรเน้นอะไร”</div><div class="fix">→ รายงานบอกเลยว่าห่างเป้าหมายกี่คะแนน และทักษะไหนต้องแก้ก่อน</div></div>
          <div class="ben-h" style="margin-top:6px">มีอะไรบ้าง</div>
          <ul class="simple"><li>คะแนนรวม + คะแนนแยก 4 ทักษะ</li><li>ประโยคตัวอย่างที่ดีกว่า เอาไปใช้ต่อได้เลย</li><li>จุดแข็ง 💪 และสิ่งที่ควรโฟกัสก่อน 🎯</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">📅</span><span class="t">แผนรายวัน<small>เปิดแอปมา รู้เลยว่าวันนี้ต้องทำอะไร</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/planner-calendar-desktop.png" alt="ปฏิทินแผนการเรียน" loading="lazy"></div>
          <div class="stats"><div><b>5–30</b><span>นาที/วัน</span></div><div><b>🔥</b><span>นับวันต่อเนื่อง</span></div><div><b>🔔</b><span>เตือนบนมือถือ</span></div></div>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>😩</span>“เปิดหนังสือแล้วไม่รู้จะเริ่มตรงไหน สุดท้ายก็ไม่ได้อ่าน”</div><div class="fix">→ เปิดแอปเจอแผนของวันนี้เลย กดปุ่มเดียวเริ่มได้ทันที</div></div><div class="ben"><div class="pain"><span>⏰</span>“เรียน/ทำงานยุ่ง ไม่มีเวลานั่งอ่านทีละหลายชั่วโมง”</div><div class="fix">→ วันละ 5–30 นาทีก็พอ ขาดไปบางวันก็ไม่เป็นไร แผนปรับให้เอง</div></div>
          <div class="ben-h" style="margin-top:6px">มีอะไรบ้าง</div>
          <ul class="simple"><li>ใส่วันสอบ แอปนับถอยหลังให้</li><li>แผนเน้นจุดอ่อนของน้องเอง ไม่ใช่แผนเดียวกับทุกคน</li><li>ใกล้สอบมี Mock ให้ซ้อมสัปดาห์ละ 2 ครั้ง</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">🎬</span><span class="t">บทเรียนกับพี่ดอย<small>วิดีโอเทคนิค + ฝึกต่อทันที</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/lesson-dictation-desktop.png" alt="บทเรียนแบบด่าน" loading="lazy"></div>
          <div class="stats"><div><b>VIP</b><span>นักเรียนคอร์สฟรี</span></div><div><b>~15</b><span>นาที/เทคนิค</span></div><div><b>3</b><span>ระดับ</span></div></div>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>📚</span>“ดูคลิปเองใน YouTube กระจัดกระจาย ไม่รู้ควรดูอะไรก่อน”</div><div class="fix">→ เรียงบทให้แล้ว ดูวิดีโอเทคนิคจบ ฝึกโจทย์ต่อได้ในแอปเลย</div></div><div class="ben"><div class="pain"><span>😓</span>“พื้นฐานไม่แน่น กลัวเรียนแล้วตามไม่ทัน”</div><div class="fix">→ เริ่มจากระดับง่าย ทีละด่าน ด่านละ 10 ข้อ ค่อย ๆ ปลดล็อก</div></div>
          <div class="ben-h" style="margin-top:6px">มีอะไรบ้าง</div>
          <ul class="simple"><li>วิดีโอแยกตามประเภทข้อสอบ</li><li>เทคนิคสั้นครั้งละ ~15 นาที เลือกเรียนข้อไหนก่อนก็ได้</li><li>เรียนค้างไว้ กลับมาต่อจากเดิมได้</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">📓</span><span class="t">Notebook<small>สมุดจดศัพท์และจุดผิดของตัวเอง</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/notebook-desktop.png" alt="หน้า Notebook" loading="lazy"></div>
          <div class="stats"><div><b>🔖</b><span>กดเดียวเก็บ</span></div><div><b>🎴</b><span>ทบทวน 3 แบบ</span></div><div><b>📱</b><span>มือถือ + คอม</span></div></div>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>📝</span>“จดศัพท์ไว้หลายที่ ถึงเวลาจะทวนหาไม่เจอ”</div><div class="fix">→ กดปุ่มเดียวเก็บเข้า Notebook ทุกอย่างอยู่ที่เดียว</div></div><div class="ben"><div class="pain"><span>😴</span>“ท่องศัพท์แล้วลืม น่าเบื่อ”</div><div class="fix">→ ทวนแบบแฟลชการ์ด เกมจับคู่ หรือควิซ สนุกกว่าท่องจำ</div></div>
          <div class="ben-h" style="margin-top:6px">มีอะไรบ้าง</div>
          <ul class="simple"><li>เก็บศัพท์ แกรมม่า และผลตรวจไว้อ่านก่อนสอบ</li><li>แยกหมวด + ค้นหาได้</li><li>เปิดได้ทั้งมือถือและคอม</li></ul>
        </div>
      </div>
    </details>

    <div class="grp-label" style="margin-top:80px">แยกตามทักษะ</div>
    <details class="acc">
      <summary><span class="ic">📖</span><span class="t">Reading<small>การอ่าน</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/reading-practice-desktop.png" alt="หน้าฝึกอ่าน" loading="lazy"></div>
          <a class="vid-mini" href="https://www.youtube.com/watch?v=hEpvIkZgdcA" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/hEpvIkZgdcA/mqdefault.jpg" alt="" loading="lazy"><div><b>เทคนิคเพิ่มคะแนน Literacy / Comprehension จากคนที่ได้ 155/160</b><small>▶ ดูคลิปพี่ดอยบน YouTube</small></div></a>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>🐢</span>“อ่านช้า เวลาหมดก่อนอ่านจบ”</div><div class="fix">→ ฝึกจับเวลาเหมือนจริง จนอ่านทันและเดาคำตอบเป็น</div></div><div class="ben"><div class="pain"><span>🤯</span>“เจอศัพท์ไม่รู้จักเยอะ”</div><div class="fix">→ ฝึกคำที่ออกบ่อย แล้วเก็บคำที่ไม่รู้เข้า Notebook ไว้ทวน</div></div>
          <div class="ben-h" style="margin-top:6px">ฝึกอะไรได้บ้าง</div>
          <ul class="simple"><li>Interactive Reading, Fill in the Blanks, Read and Select</li><li>มีระดับง่าย กลาง ยาก</li><li>รู้ผลถูก/ผิดทันทีหลังทำ</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">🎧</span><span class="t">Listening<small>การฟัง</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/literacy-dictation-desktop.png" alt="หน้าฝึกฟังแล้วพิมพ์" loading="lazy"></div>
          <a class="vid-mini" href="https://www.youtube.com/watch?v=ZyuypmJgJTk" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/ZyuypmJgJTk/mqdefault.jpg" alt="" loading="lazy"><div><b>โจทย์ Interactive Listening ใน DUOLINGO</b><small>▶ ดูคลิปพี่ดอยบน YouTube</small></div></a>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>👂</span>“ฟังทันแต่พิมพ์ตก ๆ หล่น ๆ เสียคะแนนแบบไม่รู้ตัว”</div><div class="fix">→ แอปไฮไลต์ให้เห็นเลยว่าพิมพ์ผิด/ตกตรงไหน</div></div><div class="ben"><div class="pain"><span>💬</span>“ฟังบทสนทนายาว ๆ แล้วหลง”</div><div class="fix">→ ฝึกบทสนทนาเหมือนจริงทีละรอบ จนจับประเด็นได้</div></div>
          <div class="ben-h" style="margin-top:6px">ฝึกอะไรได้บ้าง</div>
          <ul class="simple"><li>Listen and Type มากกว่า 300 ประโยค</li><li>Interactive Listening + สรุปบทสนทนา</li><li>อยู่ในแผนรายวันทุกวัน</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">✍️</span><span class="t">Writing<small>การเขียน</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/write-about-photo-desktop.png" alt="หน้าฝึกเขียนบรรยายภาพ" loading="lazy"></div>
          <a class="vid-mini" href="https://www.youtube.com/watch?v=aFSUgYElCaE" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/aFSUgYElCaE/mqdefault.jpg" alt="" loading="lazy"><div><b>4 เทคนิคเพิ่มคะแนน Writing ใน Duolingo English Test</b><small>▶ ดูคลิปพี่ดอยบน YouTube</small></div></a>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>😶</span>“เห็นรูปแล้วนึกไม่ออกว่าจะเขียนอะไร”</div><div class="fix">→ ได้โครงประโยคและคำศัพท์ที่ใช้ได้กับทุกรูป</div></div><div class="ben"><div class="pain"><span>❓</span>“เขียนเสร็จไม่รู้ว่าดีหรือยัง”</div><div class="fix">→ ได้คะแนน + จุดที่ต้องแก้ทันที อธิบายเป็นภาษาไทย</div></div>
          <div class="ben-h" style="margin-top:6px">ฝึกอะไรได้บ้าง</div>
          <ul class="simple"><li>Write About the Photo, Read Then Write, Interactive Writing</li><li>ตัวอย่างประโยคที่ดีกว่าของเรา</li><li>เก็บผลตรวจไว้อ่านก่อนสอบ</li></ul>
        </div>
      </div>
    </details>
    <details class="acc">
      <summary><span class="ic">🎤</span><span class="t">Speaking<small>การพูด</small></span><span class="pm">+</span></summary>
      <div class="acc-body">
        <div>
          <div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="/images/landing/read-and-speak-desktop.png" alt="หน้าฝึกพูด" loading="lazy"></div>
          <a class="vid-mini" href="https://www.youtube.com/watch?v=Pedx6VPhR1o" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/Pedx6VPhR1o/mqdefault.jpg" alt="" loading="lazy"><div><b>เทคนิคเพิ่มคะแนน Describe the picture ง่าย ๆ ep.1</b><small>▶ ดูคลิปพี่ดอยบน YouTube</small></div></a>
        </div>
        <div class="feat">
          <div class="ben-h">ช่วยน้องยังไง</div>
          <div class="ben"><div class="pain"><span>😳</span>“ไม่กล้าพูด ไม่มีใครให้ซ้อมด้วย”</div><div class="fix">→ อัดเสียงซ้อมในแอปได้ทุกเวลา ไม่ต้องอายใคร</div></div><div class="ben"><div class="pain"><span>🫥</span>“พูดแล้วเงียบ คิดไม่ออกกลางทาง”</div><div class="fix">→ ฝึกตอบคำถามต่อเนื่องเหมือนคุยกับคนจริง จนพูดได้ลื่นขึ้น</div></div>
          <div class="ben-h" style="margin-top:6px">ฝึกอะไรได้บ้าง</div>
          <ul class="simple"><li>Speak About the Photo, Read Then Speak, Interactive Speaking</li><li>เห็นข้อความที่ตัวเองพูด รู้ว่าตรงไหนต้องแก้</li><li>คำและประโยคแนะนำให้ฟังเป็นธรรมชาติ</li></ul>
        </div>
      </div>
    </details>
  </div>
</section>

<!-- ============ VIDEOS ============ -->
<section id="videos" class="alt">
  <div class="w">
    <div class="kicker">ดูก่อนสอบ</div>
    <h2>เรียนฟรีกับพี่ดอย<br>บน YouTube</h2>
    <p class="lead">อธิบายข้อสอบ DET ครบทุกเรื่องในคลิปเดียว (30 นาทีเต็ม)</p>

    <div class="vid-main" data-yt="lhXPCsYTE4A" role="button" tabindex="0" aria-label="เล่นวิดีโอ">
      <img src="https://i.ytimg.com/vi/lhXPCsYTE4A/maxresdefault.jpg" alt="ทุกอย่างเกี่ยวกับ Duolingo English Test">
      <span class="bigplay">▶</span>
      <span class="vlabel">ทุกอย่างเกี่ยวกับ Duolingo English Test · 30 นาที</span>
    </div>

    <div class="vgrid">
      <a class="vcard" href="https://www.youtube.com/watch?v=zmlM7luRla4" target="_blank" rel="noopener">
        <div class="th"><img src="https://i.ytimg.com/vi/zmlM7luRla4/hqdefault.jpg" alt=""></div>
        <div class="tt">อัพเดทข้อสอบ DET ปี 2026 + แนะนำการใช้แอปเพื่อฝึก<small>ENGLISH PLAN · YouTube</small></div>
      </a>
      <a class="vcard" href="https://www.youtube.com/watch?v=VdWL09VxsNU" target="_blank" rel="noopener">
        <div class="th"><img src="https://i.ytimg.com/vi/VdWL09VxsNU/hqdefault.jpg" alt=""></div>
        <div class="tt">สอบ Duolingo ครั้งแรกกับคะแนน 120–150 · เทคนิค ข้อควรระวัง<small>ENGLISH PLAN · YouTube</small></div>
      </a>
      <a class="vcard" href="https://www.youtube.com/watch?v=wE8HtArquF0" target="_blank" rel="noopener">
        <div class="th"><img src="https://i.ytimg.com/vi/wE8HtArquF0/hqdefault.jpg" alt=""></div>
        <div class="tt">Subscores “Individual & Integrated” คืออะไร ต่างกันยังไง?<small>ENGLISH PLAN · YouTube</small></div>
      </a>
    </div>
  </div>
</section>

<!-- ============ FINAL CTA ============ -->
<section class="final">
  <div class="w-narrow">
    <div class="kicker">พร้อมแล้วใช่ไหม</div>
    <h2>เริ่มฝึกวันนี้<br>เห็นคะแนนขึ้นจริง</h2>
    <div class="btns">
      <a class="btn blue" href="/login"><small>นักเรียนปัจจุบัน</small><span>เข้าสู่ระบบ →</span></a>
      <a class="btn yellow" href="/signup"><small>นักเรียนใหม่</small><span>สมัครที่นี่ →</span></a>
    </div>
    <p style="margin-top:40px;font-size:19px">ยังไม่ได้ลงคอร์ส? <a href="https://www.language-plan.com/courses/duolingo-fast-track"><b>ดูรายละเอียดคอร์ส Duolingo Fast Track</b></a></p>
  </div>
</section>

<!-- ============ REVIEWS ============ -->
<section id="reviews" class="alt">
  <div class="w">
    <div class="rev" style="margin-top:0">
      <div class="kicker">ไม่ใช่แค่ไนน์</div>
      <h2 style="font-size:clamp(30px,4vw,48px)">ผลสอบจริงจากนักเรียน<br>Duolingo Fast Track</h2>
      <div class="rev-grid">
        <figure class="rcard"><div class="rbadge">125</div><img src="/images/reviews/det-125.png" alt="รีวิวนักเรียน ได้ Duolingo 125" loading="lazy"><figcaption>"ไปลองสอบมาอีกรอบ ได้คะแนนเพิ่มขึ้นมาเป็น 125 ค่ะ"</figcaption></figure>
        <figure class="rcard"><div class="rbadge">130</div><img src="/images/reviews/det-130.png" alt="รีวิวนักเรียน ได้ Duolingo 130" loading="lazy"><figcaption>"หนูผ่านแล้วนะคะ ขอบคุณพี่มาก ๆ"</figcaption></figure>
        <figure class="rcard"><div class="rbadge">120</div><img src="/images/reviews/det-120.jpg" alt="รีวิวนักเรียน ได้ Duolingo 120" loading="lazy"><figcaption>"สอบ writing ผมฝึกตามที่พี่ดอยสอน ก็ได้คะแนนออกมาอย่างที่ต้องการ"</figcaption></figure>
        <figure class="rcard"><div class="rbadge">110</div><img src="/images/reviews/det-110.png" alt="รีวิวนักเรียน ได้ Duolingo 110" loading="lazy"><figcaption>"ไม่คิดว่าจะได้เยอะขนาดนี้ โดยเฉพาะ writing เทคนิคครูใช้ได้จริง"</figcaption></figure>
      </div>
    </div>

  </div>
</section>

<footer>
  <div class="w">
    <div>© English Plan · ติว Duolingo English Test สำหรับคนไทย</div>
    <div><a href="https://www.youtube.com/@DoyLanguagePlan">YouTube</a> · <a href="/privacy">นโยบายความเป็นส่วนตัว</a></div>
  </div>
</footer>
`;

export function OldSchoolLanding({
  initialFastTrackOpen = false,
}: {
  initialFastTrackOpen?: boolean;
}) {
  const [fastTrackOpen, setFastTrackOpen] = useState(initialFastTrackOpen);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFastTrackOpen) setFastTrackOpen(true);
  }, [initialFastTrackOpen]);

  /* Delegated clicks inside the static HTML: Fast Track links + video facade. */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const playVideo = (box: HTMLElement) => {
      const id = box.dataset.yt;
      if (!id || box.querySelector("iframe")) return;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
      iframe.title = "YouTube video";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      box.replaceChildren(iframe);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("a[data-ft]")) {
        e.preventDefault();
        setFastTrackOpen(true);
        return;
      }
      const box = t?.closest?.("[data-yt]") as HTMLElement | null;
      if (box) playVideo(box);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const box = (e.target as HTMLElement | null)?.closest?.("[data-yt]") as HTMLElement | null;
      if (box) {
        e.preventDefault();
        playVideo(box);
      }
    };
    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={`osl ${prompt.variable} ${sarabun.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={bodyRef} dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
      {fastTrackOpen ? <FastTrackRequestModal onClose={() => setFastTrackOpen(false)} /> : null}
    </div>
  );
}
