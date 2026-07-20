const { PrismaClient } = require("@prisma/client");
const { performance } = require("node:perf_hooks");

const prisma = new PrismaClient();

const QUERIES = [
  {
    key: "newest",
    sql: `
      SELECT id, "createdAt"
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
  },
  {
    key: "oldest",
    sql: `
      SELECT id, "createdAt"
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
      LIMIT $1 OFFSET $2
    `,
  },
  {
    key: "popular",
    sql: `
      SELECT id, "likeCount"
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY "likeCount" DESC, "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
  },
  {
    key: "most_viewed",
    sql: `
      SELECT id, "viewCount"
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY "viewCount" DESC, "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
  },
  {
    key: "price_asc",
    sql: `
      SELECT id, price
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY price ASC, "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
  },
  {
    key: "price_desc",
    sql: `
      SELECT id, price
      FROM "Project"
      WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL
      ORDER BY price DESC, "createdAt" DESC
      LIMIT $1 OFFSET $2
    `,
  },
];

function parseArg(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  if (!arg) return fallback;
  const value = arg.split("=")[1];
  return value ?? fallback;
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
}

async function explain(limit, offset) {
  for (const query of QUERIES) {
    const planRows = await prisma.$queryRawUnsafe(
      `EXPLAIN (ANALYZE, BUFFERS) ${query.sql}`,
      limit,
      offset,
    );
    const text = planRows.map((row) => row["QUERY PLAN"]).join("\n");
    console.log(`\n=== EXPLAIN ${query.key} ===`);
    console.log(text);
  }
}

async function benchmark(limit, pages, runsPerPage) {
  const offsets = Array.from({ length: pages }, (_, i) => i * limit);

  for (const query of QUERIES) {
    const times = [];

    for (const offset of offsets) {
      for (let run = 0; run < runsPerPage; run += 1) {
        const start = performance.now();
        await prisma.$queryRawUnsafe(query.sql, limit, offset);
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }
    }

    times.sort((a, b) => a - b);
    const total = times.reduce((acc, val) => acc + val, 0);
    const avg = total / times.length;

    console.log(`\n=== BENCH ${query.key} ===`);
    console.log(
      JSON.stringify(
        {
          samples: times.length,
          minMs: Number(times[0].toFixed(3)),
          avgMs: Number(avg.toFixed(3)),
          p95Ms: Number(percentile(times, 95).toFixed(3)),
          maxMs: Number(times[times.length - 1].toFixed(3)),
          limit,
          pages,
          runsPerPage,
        },
        null,
        2,
      ),
    );
  }
}

async function main() {
  const mode = parseArg("mode", "all");
  const limit = Number(parseArg("limit", "20"));
  const pages = Number(parseArg("pages", "5"));
  const runsPerPage = Number(parseArg("runs", "10"));
  const offset = Number(parseArg("offset", "0"));

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("Invalid --limit value");
  }

  if (mode === "all" || mode === "explain") {
    await explain(limit, offset);
  }

  if (mode === "all" || mode === "bench") {
    await benchmark(limit, pages, runsPerPage);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
