import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle/client';
import { libraryResources } from '@/lib/db/drizzle/schema';
import { ok, serverError } from '@/lib/server/api-response';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const query = db
      .select({
        id: libraryResources.id,
        title: libraryResources.title,
        url: libraryResources.url,
        source: libraryResources.source,
        category: libraryResources.category,
        subcategory: libraryResources.subcategory,
        description: libraryResources.description,
        author: libraryResources.author,
        language: libraryResources.language,
      })
      .from(libraryResources)
      .orderBy(asc(libraryResources.sortOrder), asc(libraryResources.title));

    const rows = category
      ? await query.where(eq(libraryResources.category, category))
      : await query;

    // Get unique categories for filter
    const allCategories = await db
      .selectDistinct({ category: libraryResources.category })
      .from(libraryResources)
      .orderBy(asc(libraryResources.category));

    return ok({
      resources: rows,
      categories: allCategories.map((c) => c.category),
    });
  } catch (error) {
    console.error('Library GET error:', error);
    return serverError('Failed to load library');
  }
}
