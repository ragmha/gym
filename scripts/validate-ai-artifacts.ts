import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type RequiredSkill = {
  name: string
  requiredTerms: string[]
}

type RequiredAgent = {
  file: string
  name: string
  readOnly: boolean
  requiredTerms: string[]
}

const root = process.cwd()

const requiredSkills: RequiredSkill[] = [
  {
    name: 'expo-sdk-upgrade',
    requiredTerms: ['expo install --fix', 'expo-doctor', 'release notes'],
  },
  {
    name: 'new-zustand-store',
    requiredTerms: ['create<State>()', 'partialize', 'useShallow'],
  },
  {
    name: 'supabase-migration',
    requiredTerms: ['RLS', 'generate-types', 'validators'],
  },
  {
    name: 'eas-release',
    requiredTerms: ['eas update --auto', 'build.yml', 'runtimeVersion'],
  },
  {
    name: 'new-screen-route',
    requiredTerms: ['(tabs)', '_layout.tsx', 'typed routes'],
  },
  {
    name: 'platform-gate',
    requiredTerms: [
      "Platform.OS === 'ios'",
      'Platform.select',
      'generateMockData',
    ],
  },
]

const requiredAgents: RequiredAgent[] = [
  {
    file: 'healthkit-data-pipeline-auditor.agent.md',
    name: 'HealthKit Data Pipeline Auditor',
    readOnly: true,
    requiredTerms: [
      'daily_health_snapshots',
      'generateMockData',
      'READ_PERMISSIONS',
    ],
  },
  {
    file: 'supabase-schema-reviewer.agent.md',
    name: 'Supabase Schema Reviewer',
    readOnly: true,
    requiredTerms: ['RLS', 'database.types.ts', 'validators.ts'],
  },
  {
    file: 'expo-dependency-auditor.agent.md',
    name: 'Expo Dependency Auditor',
    readOnly: true,
    requiredTerms: ['expo-doctor', 'expo install --check', '@expo/fingerprint'],
  },
]

const deprecatedToolNames = new Set([
  'codebase',
  'changes',
  'extensions',
  'fetch',
  'findTestFiles',
  'githubRepo',
  'new',
  'openSimpleBrowser',
  'problems',
  'runCommands',
  'runTasks',
  'runTests',
  'searchResults',
  'terminalCommand',
  'terminalLastCommand',
  'terminalSelection',
  'testFailure',
  'usages',
  'vscodeAPI',
])

const allowedUnnamespacedTools = new Set(['search'])
const editTools = new Set(['edit/editFiles'])

function fail(message: string): never {
  throw new Error(message)
}

function readArtifact(path: string) {
  const fullPath = join(root, path)

  if (!existsSync(fullPath)) {
    fail(`Missing artifact: ${path}`)
  }

  return readFileSync(fullPath, 'utf8')
}

function parseFrontmatter(markdown: string, path: string) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown)

  if (!match) {
    fail(`${path}: missing YAML frontmatter`)
  }

  const frontmatter: Record<string, string> = {}

  for (const line of match[1].split('\n')) {
    const separatorIndex = line.indexOf(':')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    frontmatter[key] = value.replace(/^['"]|['"]$/g, '')
  }

  return frontmatter
}

function parseInlineArray(value: string | undefined) {
  if (!value) {
    return []
  }

  const match = /^\[(.*)\]$/.exec(value.trim())

  if (!match) {
    return []
  }

  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function assertIncludes(markdown: string, path: string, term: string) {
  if (!markdown.includes(term)) {
    fail(`${path}: expected content to include "${term}"`)
  }
}

function validateSkill(skill: RequiredSkill) {
  const path = `.github/skills/${skill.name}/SKILL.md`
  const markdown = readArtifact(path)
  const frontmatter = parseFrontmatter(markdown, path)

  if (frontmatter.name !== skill.name) {
    fail(`${path}: frontmatter name must be "${skill.name}"`)
  }

  if (!frontmatter.description) {
    fail(`${path}: missing frontmatter description`)
  }

  if (frontmatter.description.length > 1024) {
    fail(`${path}: description must be 1024 characters or fewer`)
  }

  assertIncludes(frontmatter.description, path, 'Use when')
  assertIncludes(markdown, path, '## Quick start')
  assertIncludes(markdown, path, '## Workflow')
  assertIncludes(markdown, path, '## Validation')

  for (const term of skill.requiredTerms) {
    assertIncludes(markdown, path, term)
  }
}

function validateAgent(agent: RequiredAgent) {
  const path = `.github/agents/${agent.file}`
  const markdown = readArtifact(path)
  const frontmatter = parseFrontmatter(markdown, path)
  const tools = parseInlineArray(frontmatter.tools)

  if (frontmatter.name !== agent.name) {
    fail(`${path}: frontmatter name must be "${agent.name}"`)
  }

  if (!frontmatter.description) {
    fail(`${path}: missing frontmatter description`)
  }

  if (tools.length === 0) {
    fail(`${path}: read-only diagnostic agents must declare tools`)
  }

  for (const tool of tools) {
    if (deprecatedToolNames.has(tool)) {
      fail(`${path}: deprecated un-namespaced tool "${tool}"`)
    }

    if (!tool.includes('/') && !allowedUnnamespacedTools.has(tool)) {
      fail(`${path}: tool "${tool}" must be namespaced`)
    }

    if (agent.readOnly && editTools.has(tool)) {
      fail(`${path}: read-only agent must not include edit tool "${tool}"`)
    }
  }

  assertIncludes(markdown, path, '## When to use')
  assertIncludes(markdown, path, '## Investigation workflow')
  assertIncludes(markdown, path, '## Report format')

  for (const term of agent.requiredTerms) {
    assertIncludes(markdown, path, term)
  }
}

for (const skill of requiredSkills) {
  validateSkill(skill)
}

for (const agent of requiredAgents) {
  validateAgent(agent)
}

console.log(
  `Validated ${requiredSkills.length} skills and ${requiredAgents.length} custom agents.`,
)
