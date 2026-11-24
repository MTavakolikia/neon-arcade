'use server';

import { revalidatePath } from 'next/cache';
import { currentUser, can } from '@/auth';
import { db } from '@/lib/db';
import { fail, ok, describeDbError, fieldErrorsFrom } from '@/lib/action-result';
import { postSchema, toBool } from '@/lib/validation';
import { slugify } from '@/lib/constants';
import type { ActionResult } from '@/lib/action-result';

const PUBLIC_BLOG = '/';
const ADMIN_BLOG = '/admin/blog';

const REVOKE = () => {
  revalidatePath(ADMIN_BLOG);
  revalidatePath(`${ADMIN_BLOG}/[id]`, 'page');
  revalidatePath(PUBLIC_BLOG);
  revalidatePath('/blog', 'page');
};

/** Ensure a slug is unique by appending -2, -3, … */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  // Bounded loop; a collision storm here means something is wrong upstream.
  for (let i = 0; i < 50; i += 1) {
    const clash = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
  return `${root}-${Date.now()}`;
}

export async function savePostAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser();
  if (!can(user, 'managePosts')) return fail('You do not have permission to edit posts.');

  const id = String(formData.get('id') ?? '').trim();
  const rawTags = String(formData.get('tags') ?? '');

  const parsed = postSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug') ?? '',
    excerpt: formData.get('excerpt'),
    body: formData.get('body'),
    emoji: formData.get('emoji'),
    accent: formData.get('accent'),
    tags: rawTags,
    readMin: formData.get('readMin'),
    status: formData.get('status'),
    featured: toBool(formData.get('featured')),
    authorId: formData.get('authorId') ?? '',
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsFrom(parsed.error));

  const { title, excerpt, body, emoji, accent, readMin, status } = parsed.data;
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  // Editors may only publish under their own name unless an admin overrides.
  const requestedAuthor = String(formData.get('authorId') ?? '').trim();
  const authorId = user?.role === 'ADMIN' && requestedAuthor ? requestedAuthor : (user?.id ?? '');

  const publishedAt = status === 'PUBLISHED' ? new Date() : null;

  try {
    if (id) {
      const existing = await db.post.findUnique({ where: { id }, select: { id: true } });
      if (!existing) return fail('That post no longer exists.');

      await db.post.update({
        where: { id },
        data: {
          title,
          slug: await uniqueSlug(parsed.data.slug || title, id),
          excerpt,
          body,
          emoji,
          accent,
          tags: JSON.stringify(tags),
          readMin,
          status,
          featured: parsed.data.featured ?? false,
          authorId,
          ...(publishedAt ? { publishedAt } : {}),
        },
      });
      REVOKE();
      return ok({ id });
    }

    const created = await db.post.create({
      data: {
        title,
        slug: await uniqueSlug(parsed.data.slug || title),
        excerpt,
        body,
        emoji,
        accent,
        tags: JSON.stringify(tags),
        readMin,
        status,
        featured: parsed.data.featured ?? false,
        authorId,
        publishedAt,
      },
    });
    REVOKE();
    return ok({ id: created.id });
  } catch (error) {
    return fail(describeDbError(error));
  }
}

export async function togglePostStatusAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'managePosts')) return fail('You do not have permission.');

  const post = await db.post.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!post) return fail('That post no longer exists.');

  const next = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  await db.post.update({
    where: { id },
    data: { status: next, publishedAt: next === 'PUBLISHED' ? new Date() : post.status === 'PUBLISHED' ? null : undefined },
  });

  REVOKE();
  return ok();
}

export async function togglePostFeaturedAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'managePosts')) return fail('You do not have permission.');

  const post = await db.post.findUnique({ where: { id }, select: { featured: true } });
  if (!post) return fail('That post no longer exists.');

  await db.post.update({ where: { id }, data: { featured: !post.featured } });
  REVOKE();
  return ok();
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  const user = await currentUser();
  if (!can(user, 'managePosts')) return fail('You do not have permission.');

  try {
    await db.post.delete({ where: { id } });
  } catch {
    return fail('That post no longer exists.');
  }

  REVOKE();
  return ok();
}