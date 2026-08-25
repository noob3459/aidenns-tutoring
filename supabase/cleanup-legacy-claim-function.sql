-- =====================================================================
-- Aidenn's Tutoring — cleanup migration (PHASE TWO)
--
-- Run this ONLY after all of the following are true:
--   1. supabase/schema.sql (phase one) has been run.
--   2. The updated application (api/book.js calling
--      claim_slot_and_book_v2, plus the new calendar UI) has been
--      deployed to production.
--   3. You have personally tested a real booking end-to-end against the
--      new deployment and confirmed it works (received both emails,
--      row appears correctly in Supabase, slot flips to 'booked').
--   4. Nothing in your codebase calls the legacy 11-parameter
--      `claim_slot_and_book` any more (grep the deployed code for
--      `.rpc('claim_slot_and_book'` — it should only ever match
--      `claim_slot_and_book_v2` after the phase-one/phase-two rollout).
--
-- This is the ONLY statement in this file. It drops the legacy function
-- definition — a code object, not data — so no booking, slot, or other
-- row is affected either way.
-- =====================================================================

drop function if exists public.claim_slot_and_book(
  uuid, text, text, text, text, date, text, text, text, text, text
);
