/**
 * MOCK TEST ENGINE V2 — WHERE TO EDIT WHAT
 * =========================================
 *
 * Stage 1–4 slot counts & order (per routed band):
 *   → src/lib/mock-test/v2/stage-sequences.ts
 *      STAGE1_TEMPLATES, stage2Templates(), stage3Templates(), stage4Templates()
 *
 * Routing thresholds (stage1_det_like → 85 / 125 / 150 internal band):
 *   → src/lib/mock-test/v2/config.ts — ROUTING_THRESHOLDS, routeFromStage1DetLike()
 *
 * Stage 1 anchor formulas (per-task 0–100, then aggregate & det-like for routing):
 *   → src/lib/mock-test/v2/config.ts — STAGE1_FORMULAS
 *
 * Final DET-like continuous score (NOT the routing band):
 *   → src/lib/mock-test/v2/config.ts — DET_LIKE_FORMULAS
 *   → src/lib/mock-test/v2/final-placement.ts — computeFinalPlacement()
 *
 * Subscore weights (reading / listening / writing / speaking); missing types renormalized:
 *   → src/lib/mock-test/v2/config.ts — SUBSCORE_WEIGHTS
 *
 * CEFR bands (from final_score_raw on ~10–160 scale):
 *   → src/lib/mock-test/v2/config.ts — CEFR_BANDS, cefrFromFinalScoreRaw()
 *
 * Anti-repeat (in-attempt families + 30-day family skip):
 *   → src/lib/mock-test/v2/config.ts — ANTI_REPEAT
 *   → src/lib/mock-test/v2/anti-repeat.ts
 *   → src/lib/mock-test/v2/pool-picker.ts — pickPoolQuestion()
 *
 * Task label → DB question_type:
 *   → src/lib/mock-test/v2/task-registry.ts — TASK
 *
 * API:
 *   POST /api/mock-test/v2/session — create attempt (Stage 1 assembly)
 *   POST /api/mock-test/v2/session/[id]/submit-stage — score & expand stages / finalize
 *
 * DB migration (target_band, content_family, result columns):
 *   → supabase/migrations/011_mock_test_v2_engine.sql
 */

export {};
