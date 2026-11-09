import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
const timeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("date_only"),
    value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    type: z.literal("instant"),
    value: z.iso.datetime({ offset: true }),
    sourceTimeZone: z.string().nullable().optional(),
  }),
]);
function time(value: Prisma.JsonValue | null): Prisma.JsonValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value.time
    : undefined;
}
function canonical(value: Prisma.JsonValue | undefined): string | undefined {
  if (value && typeof value === "object") {
    if (Array.isArray(value))
      return JSON.stringify(value.map((v) => canonical(v)));
    return JSON.stringify(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  }
  return JSON.stringify(value);
}
// Client JSON-path filter + bounded keyset scan: skip title-only history without a raw JSONB query.
export async function previousChangedTime(
  tx: Prisma.TransactionClient,
  eventId: string,
) {
  let after: { id: string; catalog_revision: bigint } | undefined;
  for (;;) {
    const history = await tx.event_change.findMany({
      where: {
        event_id: eventId,
        AND: [
          {
            OR: [
              { before_value: { path: ["time", "type"], equals: "instant" } },
              { before_value: { path: ["time", "type"], equals: "date_only" } },
            ],
          },
          ...(after
            ? [
                {
                  OR: [
                    { catalog_revision: { lt: after.catalog_revision } },
                    {
                      catalog_revision: after.catalog_revision,
                      id: { lt: after.id },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        catalog_revision: true,
        before_value: true,
        after_value: true,
      },
      orderBy: [{ catalog_revision: "desc" }, { id: "desc" }],
      take: 100,
    });
    for (const row of history) {
      const before = time(row.before_value),
        next = time(row.after_value);
      if (canonical(before) !== canonical(next)) {
        const parsed = timeSchema.safeParse(before);
        if (parsed.success) return parsed.data;
      }
    }
    if (history.length < 100) return null;
    after = history.at(-1)!;
  }
}
