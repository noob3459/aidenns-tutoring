-- =====================================================================
-- Aidenn's Tutoring — verification tests for claim_slot_and_book_v2,
-- update_booking_status, and phase-one backward compatibility with the
-- legacy claim_slot_and_book.
--
-- NOT part of the application migration and not run automatically.
-- Paste into the Supabase SQL Editor AFTER applying schema.sql (phase
-- one), ideally in a staging project first. I have no live Postgres/
-- Supabase connection in my environment, so this has been written and
-- reviewed carefully but never actually executed — treat it as a strong
-- starting point, not a guarantee-free result.
--
-- Each test creates its own throwaway slot(s), mostly dated far in the
-- future ('2999-01-06', a Monday) so they never collide with real
-- availability, and deletes them again at the end via plain DML (this
-- script runs as the table owner directly in the SQL editor, not
-- through the app's service_role API — using DELETE here for test
-- cleanup is not a contradiction of "the app never deletes slots").
-- Safe to run repeatedly; every test cleans up after itself.
-- =====================================================================

do $$
declare
  v_slot_id uuid;
  v_booking_id uuid;
  v_booking2_id uuid;
  v_result public.bookings;
  v_error_caught boolean;
  v_past_date date;
begin
  -------------------------------------------------------------------
  -- Test 1: canonical date/time come from the locked slot, not the
  -- caller — there is nothing to forge since v2 no longer accepts
  -- date/time parameters at all.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '15:30:00', 30) returning id into v_slot_id;

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Test Parent', 'Test Student', 'K', 'Online',
    'parent@example.com', '5551234567', ''
  );

  assert v_result.requested_date = date '2999-01-06', 'Test 1 FAILED: requested_date did not come from the slot';
  assert v_result.requested_time = '3:30 PM', format('Test 1 FAILED: requested_time was "%s", expected "3:30 PM"', v_result.requested_time);
  raise notice 'Test 1 PASSED: date/time are derived server-side from the slot, not caller input';

  delete from public.bookings where id = v_result.id;
  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 2: cancel booking A (reopens its slot), booking B claims the
  -- now-open slot, then attempting to reconfirm A must be rejected.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '16:00:00', 30) returning id into v_slot_id;

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Parent A', 'Student A', '1', 'Online', 'a@example.com', '5551234567', ''
  );
  v_booking_id := v_result.id;

  perform public.update_booking_status(v_booking_id, 'confirmed');
  perform public.update_booking_status(v_booking_id, 'cancelled'); -- reopens the slot

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Parent B', 'Student B', '2', 'Online', 'b@example.com', '5559876543', ''
  );
  v_booking2_id := v_result.id;

  v_error_caught := false;
  begin
    perform public.update_booking_status(v_booking_id, 'confirmed'); -- reconfirm A: must fail
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 2 FAILED: reconfirming a cancelled booking was allowed';
  raise notice 'Test 2 PASSED: a cancelled booking cannot be reactivated after its slot was reclaimed';

  delete from public.bookings where id in (v_booking_id, v_booking2_id);
  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 3: repeating the same status transition is rejected
  -- (confirmed -> confirmed is not in the allowed matrix).
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '16:30:00', 30) returning id into v_slot_id;

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Parent C', 'Student C', '3', 'Online', 'c@example.com', '5551112222', ''
  );
  v_booking_id := v_result.id;
  perform public.update_booking_status(v_booking_id, 'confirmed');

  v_error_caught := false;
  begin
    perform public.update_booking_status(v_booking_id, 'confirmed');
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 3 FAILED: repeating confirmed -> confirmed was allowed';
  raise notice 'Test 3 PASSED: repeating the same transition is rejected';

  delete from public.bookings where id = v_booking_id;
  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 4: moving a terminal booking to any other status is rejected.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '17:00:00', 30) returning id into v_slot_id;

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Parent D', 'Student D', '4', 'In-Person', 'd@example.com', '5553334444', ''
  );
  v_booking_id := v_result.id;
  perform public.update_booking_status(v_booking_id, 'declined');

  v_error_caught := false;
  begin
    perform public.update_booking_status(v_booking_id, 'pending');
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 4 FAILED: declined -> pending was allowed';
  raise notice 'Test 4 PASSED: a terminal booking cannot move to any other status';

  delete from public.bookings where id = v_booking_id;
  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 5: two claims for one slot — only the first can win. (True
  -- concurrent-session locking needs two separate DB connections to
  -- fully exercise the FOR UPDATE row lock; this test verifies the
  -- resulting invariant — status flips to 'booked' after the first
  -- claim, so a second claim sees status <> 'open' and is rejected —
  -- which is exactly what the row lock guarantees holds under real
  -- concurrent sessions too.)
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '17:30:00', 30) returning id into v_slot_id;

  perform public.claim_slot_and_book_v2(
    v_slot_id, 'Parent E', 'Student E', '5', 'Online', 'e@example.com', '5555556666', ''
  );

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent F', 'Student F', '6', 'Online', 'f@example.com', '5557778888', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 5 FAILED: a second claim on an already-booked slot succeeded';
  raise notice 'Test 5 PASSED: a second claim on the same slot is rejected';

  delete from public.bookings where slot_id = v_slot_id;
  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 6: an archived slot cannot be claimed, even though its status
  -- may still say 'open'.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes, archived_at)
  values ('2999-01-06', '18:00:00', 30, now()) returning id into v_slot_id;

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent G', 'Student G', '7', 'Online', 'g@example.com', '5559990000', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 6 FAILED: an archived slot was claimable';
  raise notice 'Test 6 PASSED: archived slots cannot be claimed';

  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 7: invalid grade and format values are rejected.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '18:30:00', 30) returning id into v_slot_id;

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent H', 'Student H', '10', 'Online', 'h@example.com', '5551230000', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 7a FAILED: grade "10" was accepted';

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent I', 'Student I', '5', 'Remote', 'i@example.com', '5551230001', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 7b FAILED: format "Remote" was accepted';
  raise notice 'Test 7 PASSED: invalid grade and format are rejected';

  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 8: a slot on a CLOSED date cannot be claimed, enforced INSIDE
  -- claim_slot_and_book_v2 itself — not merely by the public list API.
  -- This is the real DB-level test for the race condition described:
  -- the date is closed BEFORE the claim is attempted, in a separate,
  -- already-committed statement, simulating "admin closed it, then the
  -- visitor tried anyway."
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-07', '15:00:00', 30) returning id into v_slot_id;

  insert into public.availability_days (day, is_closed)
  values ('2999-01-07', true)
  on conflict (day) do update set is_closed = true;

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent J', 'Student J', '8', 'Online', 'j@example.com', '5551110000', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 8a FAILED: a slot on a closed date was claimable';
  raise notice 'Test 8a PASSED: a slot on a closed date is rejected inside claim_slot_and_book_v2';

  -- Reopen the date and confirm the SAME slot becomes claimable again —
  -- proving the check is a live gate, not a one-way poison of the slot.
  update public.availability_days set is_closed = false where day = '2999-01-07';

  v_result := public.claim_slot_and_book_v2(
    v_slot_id, 'Parent K', 'Student K', '8', 'Online', 'k@example.com', '5552220000', ''
  );
  assert v_result.id is not null, 'Test 8b FAILED: reopening the date did not allow the slot to be claimed';
  raise notice 'Test 8b PASSED: reopening the date makes its slots claimable again';

  delete from public.bookings where slot_id = v_slot_id;
  delete from public.availability_slots where id = v_slot_id;
  delete from public.availability_days where day = '2999-01-07';

  -------------------------------------------------------------------
  -- Test 9: a slot dated in the past (relative to America/Los_Angeles
  -- "today") cannot be claimed.
  -------------------------------------------------------------------
  v_past_date := (now() at time zone 'America/Los_Angeles')::date - 1;

  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values (v_past_date, '10:00:00', 30) returning id into v_slot_id;

  v_error_caught := false;
  begin
    perform public.claim_slot_and_book_v2(
      v_slot_id, 'Parent L', 'Student L', '9', 'Online', 'l@example.com', '5553330000', ''
    );
  exception when others then
    v_error_caught := true;
  end;
  assert v_error_caught, 'Test 9 FAILED: a past-dated slot was claimable';
  raise notice 'Test 9 PASSED: a past-dated slot cannot be claimed';

  delete from public.availability_slots where id = v_slot_id;

  -------------------------------------------------------------------
  -- Test 10: phase-one backward compatibility — the LEGACY 11-parameter
  -- claim_slot_and_book (unchanged) still works after this migration,
  -- proving a currently-deployed frontend/API calling it is undisturbed
  -- during the rollout window.
  -------------------------------------------------------------------
  insert into public.availability_slots (slot_date, start_time, duration_minutes)
  values ('2999-01-06', '19:00:00', 30) returning id into v_slot_id;

  v_result := public.claim_slot_and_book(
    v_slot_id, 'Legacy Parent', 'Legacy Student', '2', 'Online',
    '2999-01-06', 'Mon, Jan 6', '7:00 PM', 'legacy@example.com', '5554440000', ''
  );
  assert v_result.id is not null, 'Test 10 FAILED: the legacy claim_slot_and_book no longer works';
  assert v_result.requested_time = '7:00 PM', 'Test 10 FAILED: legacy function stopped honoring caller-supplied time (expected — this is the OLD, pre-fix trust behavior, and proves the function is genuinely untouched)';
  raise notice 'Test 10 PASSED: the legacy claim_slot_and_book remains fully available during phase one';

  delete from public.bookings where id = v_result.id;
  delete from public.availability_slots where id = v_slot_id;

  raise notice '=== ALL TESTS PASSED ===';
end $$;
