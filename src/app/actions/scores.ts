'use server';

import { db } from '@/lib/db';
import { currentUser } from '@/auth';
import { fail, ok, fieldErrorsFrom } from '@/lib/action-result';
import { scoreSchema } from '@/lib/validation';
import type { ActionResult } from '@/lib/action-result';

/**
 * Records a finished round. Deliberately does NOT award XP or coins here — the
 * arcade's authoritative balance lives in the player's localStorage, and a
 * client-supplied score is not something the server should pay out for.
 * These rows exist so the admin dashboard can show real activity and per-game
 * leaderboards.
 */
export async function recordScoreAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = scoreSchema.safeParse({
    gameId: formData.get('gameId'),
    difficulty: formData.get('difficulty'),
    score: formData.get('score'),
    stars: formData.get('stars') ?? undefined,
    won: formData.get('won'),
    xpEarned: formData.get('xpEarned') ?? 0,
    coinsEarned: formData.get('coinsEarned') ?? 0,
    durationMs: formData.get('durationMs') ?? undefined,
    sessionKey: formData.get('sessionKey') ?? '',
  });

  if (!parsed.success) {
    // Telemetry should never interrupt play, so this is a soft failure.
    console.warn('[scores] rejected', fieldErrorsFrom(parsed.error));
    return fail('Invalid score payload.', fieldErrorsFrom(parsed.error));
  }

  const { gameId, difficulty, score, stars, won, xpEarned, coinsEarned, durationMs, sessionKey } = parsed.data;
  const user = await currentUser();

  try {
    await db.gameScore.create({
      data: {
        gameId,
        difficulty,
        score,
        stars: stars ?? null,
        won,
        xpEarned,
        coinsEarned,
        durationMs: durationMs ?? null,
        sessionKey: sessionKey || null,
        userId: user?.id ?? null,
      },
    });
  } catch (error) {
    console.warn('[scores] write failed', error);
    return fail('Could not record that round.');
  }

  return ok();
}