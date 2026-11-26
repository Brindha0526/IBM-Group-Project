// app/api/goals/route.ts
// GET  — returns all goals for the current user, ordered by createdAt
// POST — replaces all goals for the current user with the submitted list

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Zod schema for a single goal in the POST body
// ---------------------------------------------------------------------------

const GoalSourceEnum = z.enum(['GUIDELINES', 'CARE_TEAM', 'USER_DEFINED', 'CURATED'])

const NutrientTargetSchema = z.object({
  nutrient: z.string().min(1),
  targetMin: z.number().optional().nullable(),
  targetMax: z.number().optional().nullable(),
  unit: z.string(), // may be '' for free-text goals with no measurable target
  label: z.string().optional().nullable(),
  source: GoalSourceEnum,
})

const PostBodySchema = z.object({
  goals: z.array(NutrientTargetSchema),
})

// ---------------------------------------------------------------------------
// Helper — resolve authenticated user's DB record
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  })
  return user
}

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ goals })
}

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PostBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { goals } = parsed.data

  // Delete all existing goals for this user, then insert the new list.
  await prisma.$transaction([
    prisma.goal.deleteMany({ where: { userId: user.id } }),
    prisma.goal.createMany({
      data: goals.map((g) => ({
        userId: user.id,
        nutrient: g.nutrient,
        targetMin: g.targetMin ?? null,
        targetMax: g.targetMax ?? null,
        unit: g.unit,
        source: g.source,
        label: g.label ?? null,
      })),
    }),
  ])

  return NextResponse.json({ success: true, count: goals.length })
}
