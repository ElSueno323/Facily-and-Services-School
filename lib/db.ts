import fs from "fs"
import path from "path"
import { DatabaseSync } from "node:sqlite"
import { EXAMPLE_VIDEO, TRIAL_EMAIL } from "@/lib/constants"
import { hashPassword, verifyPassword } from "@/lib/password"
import { fold } from "@/lib/search"

export type Role = "user" | "responsable" | "admin"
export type PlaceKind = "magasin" | "restaurant"
export type VideoStatus = "new" | "started" | "done"

export type Place = {
  id: string
  name: string
  kind: PlaceKind
}

export type User = {
  id: string
  email: string
  name: string
  image: string | null
  role: Role
  active: boolean
  placeId: string | null
  placeName: string | null
  placeKind: PlaceKind | null
  createdAt: string
}

type UserRow = {
  id: string
  email: string
  name: string
  image: string | null
  role: Role
  active: number
  place_id: string | null
  place_name: string | null
  place_kind: string | null
  created_at: string
}

type ModuleRow = {
  id: string
  title: string
  summary: string
  sort_order: number
}

type VideoRow = {
  id: string
  module_id: string
  title: string
  summary: string
  src: string
  is_example: number
  sort_order: number
  created_at: string
}

type ProgressRow = {
  user_id: string
  video_id: string
  position_seconds: number
  max_seconds: number
  completed: number
  started_at: string | null
  updated_at: string | null
  completed_at: string | null
}

export type VideoView = {
  id: string
  moduleId: string
  title: string
  summary: string
  src: string
  isExample: boolean
  sortOrder: number
  status: VideoStatus
  watched: boolean
  questionCount: number
  correctCount: number
  position: number
  maxSeconds: number
  updatedAt: string | null
  completedAt: string | null
  startedAt: string | null
  tags: string[]
}

export type QuizChoice = { id: string; label: string }
export type QuizQuestion = { id: string; prompt: string; choices: QuizChoice[] }
export type AdminQuestion = {
  id: string
  videoId: string
  prompt: string
  choices: { id: string; label: string; correct: boolean }[]
}

export type ModuleView = {
  id: string
  title: string
  summary: string
  sortOrder: number
  videos: VideoView[]
}

export type Catalog = {
  modules: ModuleView[]
  done: number
  total: number
  hasExample: boolean
  resume: { video: VideoView; moduleTitle: string } | null
}

const globalForDb = globalThis as unknown as { facilyDb?: DatabaseSync }

function openDatabase() {
  const dir = path.join(process.cwd(), "data")
  fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(process.cwd(), "public", "uploads"), { recursive: true })
  const database = new DatabaseSync(path.join(dir, "facily.db"))
  database.exec("PRAGMA journal_mode = WAL")
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      image TEXT,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      src TEXT NOT NULL,
      is_example INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      position_seconds REAL NOT NULL DEFAULT 0,
      max_seconds REAL NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      updated_at TEXT,
      completed_at TEXT,
      PRIMARY KEY (user_id, video_id)
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS choices (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS answers (
      user_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      correct INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      PRIMARY KEY (user_id, question_id)
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS video_tags (
      video_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (video_id, tag_id)
    );
  `)
  seed(database)
  ensurePasswordColumn(database)
  ensureExampleQuestions(database)
  ensureExampleTags(database)
  return database
}

const EXAMPLE_QUESTIONS: Record<string, { prompt: string; answers: string[]; correct: number }[]> = {
  "Ouvrir la caisse le matin": [
    {
      prompt: "Quand faut-il ouvrir la caisse ?",
      answers: ["Avant le premier client", "Le soir, en fermant", "Seulement si un client le demande"],
      correct: 0,
    },
    {
      prompt: "Où range-t-on l'argent ?",
      answers: ["Dans le tiroir", "Dans sa poche", "Sur le comptoir"],
      correct: 0,
    },
  ],
  "Encaisser un client": [
    {
      prompt: "Que fait-on de la monnaie à rendre ?",
      answers: ["On la donne au client", "On la garde", "On la pose sans rien dire"],
      correct: 0,
    },
  ],
  "Fermer la caisse le soir": [
    {
      prompt: "Que fait-on le soir ?",
      answers: ["On compte et on note", "On laisse le tiroir ouvert", "On part sans compter"],
      correct: 0,
    },
  ],
  "Le ticket ne sort pas": [
    {
      prompt: "Que regarde-t-on en premier ?",
      answers: ["Le papier et le capot", "On tape sur la machine", "On coupe le courant"],
      correct: 0,
    },
  ],
  "Le tiroir ne s'ouvre pas": [
    {
      prompt: "Avant d'appeler, que fait-on ?",
      answers: ["On vérifie ce qui bloque", "On force avec un outil", "On abandonne la caisse"],
      correct: 0,
    },
  ],
}

function ensureExampleQuestions(database: DatabaseSync) {
  const flag = database.prepare("SELECT value FROM app_meta WHERE key = ?").get("example_questions")
  if (flag) return
  const videos = database.prepare("SELECT id, title FROM videos WHERE is_example = 1").all() as {
    id: string
    title: string
  }[]
  const insertQuestion = database.prepare(
    "INSERT INTO questions (id, video_id, prompt, sort_order) VALUES (?, ?, ?, ?)",
  )
  const insertChoice = database.prepare(
    "INSERT INTO choices (id, question_id, label, is_correct, sort_order) VALUES (?, ?, ?, ?, ?)",
  )
  for (const video of videos) {
    const pack = EXAMPLE_QUESTIONS[video.title]
    if (!pack) continue
    const existing = database.prepare("SELECT COUNT(*) AS n FROM questions WHERE video_id = ?").get(video.id) as {
      n: number
    }
    if (Number(existing.n) > 0) continue
    pack.forEach((question, index) => {
      const questionId = crypto.randomUUID()
      insertQuestion.run(questionId, video.id, question.prompt, index + 1)
      question.answers.forEach((label, choiceIndex) => {
        insertChoice.run(
          crypto.randomUUID(),
          questionId,
          label,
          choiceIndex === question.correct ? 1 : 0,
          choiceIndex + 1,
        )
      })
    })
  }
  database.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("example_questions", "1")
}

const EXAMPLE_TAGS: Record<string, string[]> = {
  "Ouvrir la caisse le matin": ["ouverture", "matin", "tiroir"],
  "Encaisser un client": ["encaisser", "monnaie", "carte"],
  "Fermer la caisse le soir": ["fermeture", "soir", "comptage"],
  "Le ticket ne sort pas": ["ticket", "papier", "panne"],
  "Le tiroir ne s'ouvre pas": ["tiroir", "panne", "bloqué"],
}

function ensureExampleTags(database: DatabaseSync) {
  const flag = database.prepare("SELECT value FROM app_meta WHERE key = ?").get("example_tags")
  if (flag) return
  const videos = database.prepare("SELECT id, title FROM videos WHERE is_example = 1").all() as {
    id: string
    title: string
  }[]
  const findTag = database.prepare("SELECT id FROM tags WHERE slug = ?")
  const insertTag = database.prepare("INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)")
  const link = database.prepare("INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)")
  for (const video of videos) {
    const names = EXAMPLE_TAGS[video.title]
    if (!names) continue
    const existing = database.prepare("SELECT COUNT(*) AS n FROM video_tags WHERE video_id = ?").get(video.id) as {
      n: number
    }
    if (Number(existing.n) > 0) continue
    for (const name of names) {
      const slug = fold(name)
      let tag = findTag.get(slug) as { id: string } | undefined
      if (!tag) {
        const id = crypto.randomUUID()
        insertTag.run(id, slug, name)
        tag = { id }
      }
      link.run(video.id, tag.id)
    }
  }
  database.prepare("INSERT INTO app_meta (key, value) VALUES (?, ?)").run("example_tags", "1")
}

function seed(database: DatabaseSync) {
  const count = database.prepare("SELECT COUNT(*) AS n FROM modules").get() as { n: number }
  if (Number(count.n) > 0) return
  const now = new Date().toISOString()
  const subjects = [
    {
      title: "La caisse",
      summary: "Ouvrir le matin, encaisser, fermer le soir.",
      videos: [
        ["Ouvrir la caisse le matin", "À faire avant le premier client."],
        ["Encaisser un client", "Espèces, carte, et rendu de monnaie."],
        ["Fermer la caisse le soir", "Compter, noter, et ranger."],
      ],
    },
    {
      title: "Quand ça bloque",
      summary: "Les pannes les plus courantes.",
      videos: [
        ["Le ticket ne sort pas", "Papier, capot, et message à l'écran."],
        ["Le tiroir ne s'ouvre pas", "Quoi vérifier avant d'appeler."],
      ],
    },
  ]
  const insertModule = database.prepare(
    "INSERT INTO modules (id, title, summary, sort_order) VALUES (?, ?, ?, ?)",
  )
  const insertVideo = database.prepare(
    "INSERT INTO videos (id, module_id, title, summary, src, is_example, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
  )
  subjects.forEach((subject, subjectIndex) => {
    const moduleId = crypto.randomUUID()
    insertModule.run(moduleId, subject.title, subject.summary, subjectIndex + 1)
    subject.videos.forEach(([title, summary], videoIndex) => {
      insertVideo.run(
        crypto.randomUUID(),
        moduleId,
        title,
        summary,
        EXAMPLE_VIDEO,
        videoIndex + 1,
        now,
      )
    })
  })
}

function ensurePasswordColumn(database: DatabaseSync) {
  const columns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[]
  if (!columns.some((column) => column.name === "password_hash")) {
    database.exec("ALTER TABLE users ADD COLUMN password_hash TEXT")
  }
}

function ensurePlaces(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS account_switch (
      actor_id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL
    );
  `)
  const columns = database.prepare("PRAGMA table_info(users)").all() as { name: string }[]
  if (!columns.some((column) => column.name === "place_id")) {
    database.exec("ALTER TABLE users ADD COLUMN place_id TEXT")
  }
}

const USER_SQL = `
  SELECT u.id, u.email, u.name, u.image, u.role, u.active, u.created_at, u.place_id,
         p.name AS place_name, p.kind AS place_kind
  FROM users u
  LEFT JOIN places p ON p.id = u.place_id
`

const db = globalForDb.facilyDb ?? openDatabase()
db.exec("PRAGMA journal_mode = WAL")
ensurePasswordColumn(db)
ensurePlaces(db)
db.exec(`
  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS choices (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    label TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    correct INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT,
    PRIMARY KEY (user_id, question_id)
  );
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS video_tags (
    video_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (video_id, tag_id)
  );
`)
ensureExampleQuestions(db)
ensureExampleTags(db)
if (process.env.NODE_ENV !== "production") globalForDb.facilyDb = db

function mapUser(row: UserRow): User {
  const kind = row.place_kind === "magasin" || row.place_kind === "restaurant" ? row.place_kind : null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: row.role,
    active: row.active === 1,
    placeId: row.place_id ?? null,
    placeName: row.place_name ?? null,
    placeKind: kind,
    createdAt: row.created_at,
  }
}

function mapVideo(
  row: VideoRow,
  progress: ProgressRow | undefined,
  questionCount: number,
  correctCount: number,
  tags: string[],
): VideoView {
  const watched = progress?.completed === 1
  const quizDone = questionCount === 0 || correctCount >= questionCount
  let status: VideoStatus = "new"
  if (watched && quizDone) status = "done"
  else if (watched || correctCount > 0 || (progress && (progress.position_seconds > 0 || progress.started_at))) {
    status = "started"
  }
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    summary: row.summary,
    src: row.src,
    isExample: row.is_example === 1,
    sortOrder: row.sort_order,
    status,
    watched,
    questionCount,
    correctCount,
    position: progress?.position_seconds ?? 0,
    maxSeconds: progress?.max_seconds ?? 0,
    updatedAt: progress?.updated_at ?? null,
    completedAt: progress?.completed_at ?? null,
    startedAt: progress?.started_at ?? null,
    tags,
  }
}

function loadVideoTags() {
  const rows = db
    .prepare(
      `SELECT vt.video_id AS video_id, t.name AS name
       FROM video_tags vt
       JOIN tags t ON t.id = vt.tag_id
       ORDER BY t.name`,
    )
    .all() as { video_id: string; name: string }[]
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const list = map.get(row.video_id) ?? []
    list.push(row.name)
    map.set(row.video_id, list)
  }
  return map
}

function questionCounts() {
  const rows = db.prepare("SELECT video_id, COUNT(*) AS n FROM questions GROUP BY video_id").all() as {
    video_id: string
    n: number
  }[]
  return new Map(rows.map((row) => [row.video_id, Number(row.n)]))
}

function correctCounts(userId: string) {
  const rows = db
    .prepare(
      `SELECT q.video_id AS video_id, COUNT(*) AS n
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = ? AND a.correct = 1
       GROUP BY q.video_id`,
    )
    .all(userId) as { video_id: string; n: number }[]
  return new Map(rows.map((row) => [row.video_id, Number(row.n)]))
}

export function createAccount(input: {
  email: string
  name: string
  role: Role
  password: string
  placeId?: string | null
}): { ok: true } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!email.includes("@") || !name) return { ok: false, error: "compte" }
  if (input.password.trim().length < 8) return { ok: false, error: "motdepasse" }
  const existing = getUserByEmail(email)
  if (existing) return { ok: false, error: "adresse" }
  const placeId = input.role === "admin" ? null : input.placeId ?? null
  if (input.role !== "admin" && !getPlace(placeId ?? "")) return { ok: false, error: "lieu" }
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO users (id, email, name, image, role, active, created_at, password_hash, place_id) VALUES (?, ?, ?, NULL, ?, 1, ?, ?, ?)",
  ).run(id, email, name, input.role, createdAt, hashPassword(input.password.trim()), placeId)
  return { ok: true }
}

export function authenticateAccount(email: string, password: string) {
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.image, u.role, u.active, u.created_at, u.place_id, u.password_hash,
              p.name AS place_name, p.kind AS place_kind
       FROM users u
       LEFT JOIN places p ON p.id = u.place_id
       WHERE u.email = ?`,
    )
    .get(email.trim().toLowerCase()) as (UserRow & { password_hash: string | null }) | undefined
  if (!row || row.active !== 1 || !row.password_hash) return null
  if (!verifyPassword(password, row.password_hash)) return null
  return mapUser(row)
}

export function getUserByEmail(email: string) {
  const row = db.prepare(`${USER_SQL} WHERE u.email = ?`).get(email.trim().toLowerCase()) as UserRow | undefined
  return row ? mapUser(row) : null
}

export function getUserById(id: string) {
  const row = db.prepare(`${USER_SQL} WHERE u.id = ?`).get(id) as UserRow | undefined
  return row ? mapUser(row) : null
}

export function listUsers() {
  const rows = db.prepare(`${USER_SQL}`).all() as UserRow[]
  return rows
    .map(mapUser)
    .sort((a, b) => {
      if (a.email === TRIAL_EMAIL) return 1
      if (b.email === TRIAL_EMAIL) return -1
      return a.name.localeCompare(b.name, "fr")
    })
}

export function upsertUser(input: { email: string; name: string; image?: string | null }) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim() || email
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined
  if (existing) {
    const image = input.image ?? existing.image
    db.prepare("UPDATE users SET name = ?, image = ? WHERE id = ?").run(name, image, existing.id)
    return mapUser({ ...existing, name, image })
  }
  const admins = db.prepare(
    "SELECT email FROM users WHERE role = 'admin' AND active = 1",
  ).all() as { email: string }[]
  const hasRealAdmin = admins.some((admin) => admin.email !== TRIAL_EMAIL)
  const role: Role = hasRealAdmin ? "user" : "admin"
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    "INSERT INTO users (id, email, name, image, role, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
  ).run(id, email, name, input.image ?? null, role, createdAt)
  return mapUser({
    id,
    email,
    name,
    image: input.image ?? null,
    role,
    active: 1,
    place_id: null,
    place_name: null,
    place_kind: null,
    created_at: createdAt,
  })
}

function otherActiveAdmins(id: string) {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?")
    .get(id) as { n: number }
  return Number(row.n)
}

export function setUserRole(id: string, role: Role): { ok: true } | { ok: false; error: string } {
  const user = getUserById(id)
  if (!user) return { ok: false, error: "personne" }
  if (user.role === "admin" && role !== "admin" && otherActiveAdmins(id) === 0) {
    return { ok: false, error: "dernier" }
  }
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id)
  return { ok: true }
}

export function setUserActive(id: string, active: boolean): { ok: true } | { ok: false; error: string } {
  const user = getUserById(id)
  if (!user) return { ok: false, error: "personne" }
  if (!active && user.role === "admin" && otherActiveAdmins(id) === 0) {
    return { ok: false, error: "dernier" }
  }
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id)
  if (!active) clearSwitch(id)
  return { ok: true }
}

export function listPlaces(): Place[] {
  const rows = db.prepare("SELECT id, name, kind FROM places ORDER BY name").all() as {
    id: string
    name: string
    kind: string
  }[]
  return rows.flatMap((row) => {
    if (row.kind !== "magasin" && row.kind !== "restaurant") return []
    return [{ id: row.id, name: row.name, kind: row.kind }]
  })
}

export function getPlace(id: string) {
  return listPlaces().find((place) => place.id === id) ?? null
}

export function createPlace(name: string, kind: PlaceKind) {
  const id = crypto.randomUUID()
  db.prepare("INSERT INTO places (id, name, kind, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    name,
    kind,
    new Date().toISOString(),
  )
  return id
}

export function deletePlace(id: string): { ok: true } | { ok: false; error: string } {
  const used = db.prepare("SELECT COUNT(*) AS n FROM users WHERE place_id = ?").get(id) as { n: number }
  if (Number(used.n) > 0) return { ok: false, error: "lieu-occupe" }
  db.prepare("DELETE FROM places WHERE id = ?").run(id)
  return { ok: true }
}

export function assignPerson(
  id: string,
  role: Role,
  placeId: string | null,
): { ok: true } | { ok: false; error: string } {
  const user = getUserById(id)
  if (!user) return { ok: false, error: "personne" }
  if (user.role === "admin" && role !== "admin" && otherActiveAdmins(id) === 0) {
    return { ok: false, error: "dernier" }
  }
  if (role === "admin") {
    db.prepare("UPDATE users SET role = 'admin', place_id = NULL WHERE id = ?").run(id)
    clearSwitch(id)
    return { ok: true }
  }
  if (!placeId || !getPlace(placeId)) return { ok: false, error: "lieu" }
  db.prepare("UPDATE users SET role = ?, place_id = ? WHERE id = ?").run(role, placeId, id)
  if (role !== "responsable") clearSwitch(id)
  return { ok: true }
}

export function employeesOf(placeId: string) {
  return listUsers().filter((user) => user.role === "user" && user.active && user.placeId === placeId)
}

function canViewEmployee(actor: User | null, target: User | null) {
  return Boolean(
    actor?.active &&
      actor.role === "responsable" &&
      actor.placeId &&
      target?.active &&
      target.role === "user" &&
      target.placeId === actor.placeId,
  )
}

export function clearSwitch(actorId: string) {
  db.prepare("DELETE FROM account_switch WHERE actor_id = ?").run(actorId)
}

export function visibleEmployee(actorId: string, preferredId?: string | null) {
  const actor = getUserById(actorId)
  if (preferredId) {
    const preferred = getUserById(preferredId)
    if (canViewEmployee(actor, preferred)) return preferred
  }
  return activeSwitch(actorId)
}

export function activeSwitch(actorId: string) {
  const row = db.prepare("SELECT target_id FROM account_switch WHERE actor_id = ?").get(actorId) as
    | { target_id: string }
    | undefined
  if (!row) return null
  const actor = getUserById(actorId)
  const target = getUserById(row.target_id)
  if (!canViewEmployee(actor, target)) return null
  return target
}

export function setSwitch(actorId: string, targetId: string): { ok: true } | { ok: false; error: string } {
  const actor = getUserById(actorId)
  const target = getUserById(targetId)
  if (!actor?.active || actor.role !== "responsable" || !actor.placeId) return { ok: false, error: "personne" }
  if (!target?.active || target.role !== "user" || target.placeId !== actor.placeId) {
    return { ok: false, error: "personne" }
  }
  db.prepare(
    "INSERT INTO account_switch (actor_id, target_id) VALUES (?, ?) ON CONFLICT(actor_id) DO UPDATE SET target_id = excluded.target_id",
  ).run(actorId, targetId)
  return { ok: true }
}

export function getCatalog(userId: string): Catalog {
  const modules = db.prepare("SELECT * FROM modules ORDER BY sort_order, title").all() as ModuleRow[]
  const videos = db.prepare("SELECT * FROM videos ORDER BY sort_order, title").all() as VideoRow[]
  const progress = db.prepare("SELECT * FROM progress WHERE user_id = ?").all(userId) as ProgressRow[]
  const progressByVideo = new Map(progress.map((item) => [item.video_id, item]))
  const totals = questionCounts()
  const solved = correctCounts(userId)
  const tagsByVideo = loadVideoTags()
  let done = 0
  let resume: Catalog["resume"] = null
  const views = modules.map((moduleRow) => {
    const moduleVideos = videos
      .filter((video) => video.module_id === moduleRow.id)
      .map((video) => {
        const view = mapVideo(
          video,
          progressByVideo.get(video.id),
          totals.get(video.id) ?? 0,
          solved.get(video.id) ?? 0,
          tagsByVideo.get(video.id) ?? [],
        )
        if (view.status === "done") done += 1
        if (view.status === "started") {
          const time = view.updatedAt ?? ""
          const current = resume?.video.updatedAt ?? ""
          if (!resume || time > current) {
            resume = { video: view, moduleTitle: moduleRow.title }
          }
        }
        return view
      })
    return {
      id: moduleRow.id,
      title: moduleRow.title,
      summary: moduleRow.summary,
      sortOrder: moduleRow.sort_order,
      videos: moduleVideos,
    }
  })
  return {
    modules: views,
    done,
    total: videos.length,
    hasExample: videos.some((video) => video.is_example === 1),
    resume,
  }
}

export function getModulePage(moduleId: string, userId: string) {
  const catalog = getCatalog(userId)
  return catalog.modules.find((moduleItem) => moduleItem.id === moduleId) ?? null
}

export function getVideoPage(videoId: string, userId: string) {
  const catalog = getCatalog(userId)
  for (const moduleItem of catalog.modules) {
    const index = moduleItem.videos.findIndex((video) => video.id === videoId)
    if (index === -1) continue
    const video = moduleItem.videos[index]
    const next = moduleItem.videos[index + 1] ?? null
    return { module: moduleItem, video, index, next }
  }
  return null
}

export function listSubjects() {
  return db.prepare("SELECT * FROM modules ORDER BY sort_order, title").all() as ModuleRow[]
}

export function createModule(title: string, summary: string) {
  const row = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM modules").get() as { n: number }
  const id = crypto.randomUUID()
  db.prepare("INSERT INTO modules (id, title, summary, sort_order) VALUES (?, ?, ?, ?)").run(
    id,
    title,
    summary,
    Number(row.n) + 1,
  )
  return id
}

export function renameModule(id: string, title: string, summary: string) {
  db.prepare("UPDATE modules SET title = ?, summary = ? WHERE id = ?").run(title, summary, id)
}

export function createVideo(input: { moduleId: string; title: string; summary: string; src: string }) {
  const moduleRow = db.prepare("SELECT id FROM modules WHERE id = ?").get(input.moduleId)
  if (!moduleRow) return null
  const row = db
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM videos WHERE module_id = ?")
    .get(input.moduleId) as { n: number }
  const id = crypto.randomUUID()
  db.prepare(
    "INSERT INTO videos (id, module_id, title, summary, src, is_example, sort_order, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
  ).run(id, input.moduleId, input.title, input.summary, input.src, Number(row.n) + 1, new Date().toISOString())
  return id
}

export function renameVideo(id: string, title: string, summary: string) {
  db.prepare("UPDATE videos SET title = ?, summary = ? WHERE id = ?").run(title, summary, id)
}

function deleteTagsForVideo(videoId: string) {
  db.prepare("DELETE FROM video_tags WHERE video_id = ?").run(videoId)
  db.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM video_tags)").run()
}

export function setVideoTags(videoId: string, labels: string[]) {
  const video = db.prepare("SELECT id FROM videos WHERE id = ?").get(videoId)
  if (!video) return false
  db.prepare("DELETE FROM video_tags WHERE video_id = ?").run(videoId)
  const findTag = db.prepare("SELECT id FROM tags WHERE slug = ?")
  const insertTag = db.prepare("INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)")
  const link = db.prepare("INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)")
  for (const label of labels) {
    const slug = fold(label)
    let tag = findTag.get(slug) as { id: string } | undefined
    if (!tag) {
      const id = crypto.randomUUID()
      insertTag.run(id, slug, label)
      tag = { id }
    }
    link.run(videoId, tag.id)
  }
  db.prepare("DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM video_tags)").run()
  return true
}

function deleteQuestionsForVideo(videoId: string) {
  const questions = db.prepare("SELECT id FROM questions WHERE video_id = ?").all(videoId) as { id: string }[]
  for (const question of questions) {
    db.prepare("DELETE FROM answers WHERE question_id = ?").run(question.id)
    db.prepare("DELETE FROM choices WHERE question_id = ?").run(question.id)
  }
  db.prepare("DELETE FROM questions WHERE video_id = ?").run(videoId)
}

export function deleteVideo(id: string) {
  const row = db.prepare("SELECT src FROM videos WHERE id = ?").get(id) as { src: string } | undefined
  if (!row) return null
  deleteTagsForVideo(id)
  deleteQuestionsForVideo(id)
  db.prepare("DELETE FROM progress WHERE video_id = ?").run(id)
  db.prepare("DELETE FROM videos WHERE id = ?").run(id)
  return row.src
}

export function deleteModule(id: string) {
  const rows = db.prepare("SELECT src FROM videos WHERE module_id = ?").all(id) as { src: string }[]
  const ids = db.prepare("SELECT id FROM videos WHERE module_id = ?").all(id) as { id: string }[]
  for (const video of ids) {
    deleteTagsForVideo(video.id)
    deleteQuestionsForVideo(video.id)
    db.prepare("DELETE FROM progress WHERE video_id = ?").run(video.id)
  }
  db.prepare("DELETE FROM videos WHERE module_id = ?").run(id)
  db.prepare("DELETE FROM modules WHERE id = ?").run(id)
  return rows.map((row) => row.src)
}

export function deleteExamples() {
  const rows = db.prepare("SELECT id, src FROM videos WHERE is_example = 1").all() as {
    id: string
    src: string
  }[]
  for (const row of rows) {
    deleteTagsForVideo(row.id)
    deleteQuestionsForVideo(row.id)
    db.prepare("DELETE FROM progress WHERE video_id = ?").run(row.id)
  }
  db.prepare("DELETE FROM videos WHERE is_example = 1").run()
  return rows.map((row) => row.src)
}

export function saveProgress(userId: string, videoId: string, position: number, completed: boolean) {
  const video = db.prepare("SELECT id FROM videos WHERE id = ?").get(videoId)
  if (!video) return false
  const now = new Date().toISOString()
  const existing = db
    .prepare("SELECT * FROM progress WHERE user_id = ? AND video_id = ?")
    .get(userId, videoId) as ProgressRow | undefined
  const pos = Math.max(0, position)
  if (!existing) {
    db.prepare(
      `INSERT INTO progress
        (user_id, video_id, position_seconds, max_seconds, completed, started_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, videoId, pos, pos, completed ? 1 : 0, now, now, completed ? now : null)
    return true
  }
  const max = Math.max(existing.max_seconds, pos)
  const done = existing.completed === 1 || completed
  db.prepare(
    `UPDATE progress
     SET position_seconds = ?, max_seconds = ?, completed = ?, updated_at = ?, completed_at = COALESCE(completed_at, ?)
     WHERE user_id = ? AND video_id = ?`,
  ).run(pos, max, done ? 1 : 0, now, done ? now : null, userId, videoId)
  return true
}

export function getQuiz(videoId: string, userId: string) {
  const questions = db
    .prepare("SELECT id, prompt FROM questions WHERE video_id = ? ORDER BY sort_order")
    .all(videoId) as { id: string; prompt: string }[]
  const solvedRows = db
    .prepare(
      `SELECT a.question_id AS id
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = ? AND q.video_id = ? AND a.correct = 1`,
    )
    .all(userId, videoId) as { id: string }[]
  return {
    questions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      choices: (
        db.prepare("SELECT id, label FROM choices WHERE question_id = ? ORDER BY sort_order").all(question.id) as {
          id: string
          label: string
        }[]
      ).map((choice) => ({ id: choice.id, label: choice.label })),
    })),
    solvedIds: solvedRows.map((row) => row.id),
  }
}

export function listQuestionsForAdmin(): AdminQuestion[] {
  const questions = db.prepare("SELECT id, video_id, prompt FROM questions ORDER BY sort_order").all() as {
    id: string
    video_id: string
    prompt: string
  }[]
  return questions.map((question) => ({
    id: question.id,
    videoId: question.video_id,
    prompt: question.prompt,
    choices: (
      db
        .prepare("SELECT id, label, is_correct FROM choices WHERE question_id = ? ORDER BY sort_order")
        .all(question.id) as { id: string; label: string; is_correct: number }[]
    ).map((choice) => ({ id: choice.id, label: choice.label, correct: choice.is_correct === 1 })),
  }))
}

export function createQuestion(
  videoId: string,
  prompt: string,
  choices: { label: string; correct: boolean }[],
) {
  const video = db.prepare("SELECT id FROM videos WHERE id = ?").get(videoId)
  if (!video || !choices.some((choice) => choice.correct)) return null
  const row = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM questions WHERE video_id = ?").get(videoId) as {
    n: number
  }
  const questionId = crypto.randomUUID()
  db.prepare("INSERT INTO questions (id, video_id, prompt, sort_order) VALUES (?, ?, ?, ?)").run(
    questionId,
    videoId,
    prompt,
    Number(row.n) + 1,
  )
  choices.forEach((choice, index) => {
    db.prepare(
      "INSERT INTO choices (id, question_id, label, is_correct, sort_order) VALUES (?, ?, ?, ?, ?)",
    ).run(crypto.randomUUID(), questionId, choice.label, choice.correct ? 1 : 0, index + 1)
  })
  return questionId
}

export function deleteQuestion(id: string) {
  db.prepare("DELETE FROM answers WHERE question_id = ?").run(id)
  db.prepare("DELETE FROM choices WHERE question_id = ?").run(id)
  db.prepare("DELETE FROM questions WHERE id = ?").run(id)
}

export function answerQuestion(userId: string, questionId: string, choiceId: string) {
  const question = db.prepare("SELECT id, video_id FROM questions WHERE id = ?").get(questionId) as
    | { id: string; video_id: string }
    | undefined
  if (!question) return { error: "Cette question n'existe plus." }
  const progress = db
    .prepare("SELECT completed FROM progress WHERE user_id = ? AND video_id = ?")
    .get(userId, question.video_id) as { completed: number } | undefined
  if (!progress || progress.completed !== 1) {
    return { error: "Regardez d'abord la vidéo jusqu'au bout." }
  }
  const choice = db
    .prepare("SELECT is_correct FROM choices WHERE id = ? AND question_id = ?")
    .get(choiceId, questionId) as { is_correct: number } | undefined
  if (!choice) return { error: "Cette réponse n'existe plus." }
  if (choice.is_correct !== 1) return { correct: false, finished: false }
  const now = new Date().toISOString()
  const existing = db
    .prepare("SELECT user_id FROM answers WHERE user_id = ? AND question_id = ?")
    .get(userId, questionId)
  if (existing) {
    db.prepare("UPDATE answers SET correct = 1, updated_at = ? WHERE user_id = ? AND question_id = ?").run(
      now,
      userId,
      questionId,
    )
  } else {
    db.prepare("INSERT INTO answers (user_id, question_id, correct, updated_at) VALUES (?, ?, 1, ?)").run(
      userId,
      questionId,
      now,
    )
  }
  const total = db.prepare("SELECT COUNT(*) AS n FROM questions WHERE video_id = ?").get(question.video_id) as {
    n: number
  }
  const correct = db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = ? AND q.video_id = ? AND a.correct = 1`,
    )
    .get(userId, question.video_id) as { n: number }
  return { correct: true, finished: Number(correct.n) >= Number(total.n) }
}

export function getTracking() {
  const users = listUsers()
  const catalog = users[0] ? getCatalog(users[0].id) : getCatalog("__none__")
  const progress = db.prepare("SELECT * FROM progress").all() as ProgressRow[]
  const totals = questionCounts()
  const tagsByVideo = loadVideoTags()
  const correctRows = db
    .prepare(
      `SELECT a.user_id AS user_id, q.video_id AS video_id
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.correct = 1`,
    )
    .all() as { user_id: string; video_id: string }[]
  return {
    modules: catalog.modules.map((moduleItem) => ({
      id: moduleItem.id,
      title: moduleItem.title,
      videos: moduleItem.videos.map((video) => ({
        id: video.id,
        title: video.title,
        moduleTitle: moduleItem.title,
      })),
    })),
    people: users.map((user) => ({
      user,
      lines: catalog.modules.flatMap((moduleItem) =>
        moduleItem.videos.map((video) => {
          const row = progress.find((item) => item.user_id === user.id && item.video_id === video.id)
          const correctCount = correctRows.filter((item) => item.user_id === user.id && item.video_id === video.id).length
          const view = mapVideo(
            {
              id: video.id,
              module_id: video.moduleId,
              title: video.title,
              summary: video.summary,
              src: video.src,
              is_example: video.isExample ? 1 : 0,
              sort_order: video.sortOrder,
              created_at: "",
            },
            row,
            totals.get(video.id) ?? 0,
            correctCount,
            tagsByVideo.get(video.id) ?? [],
          )
          return { ...view, moduleTitle: moduleItem.title }
        }),
      ),
    })),
  }
}
