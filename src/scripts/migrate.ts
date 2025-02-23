import * as createExercisesTable from './migrations/01_create_exercises_table'
import * as seedExercises from './migrations/02_seed_exercises'

async function migrate() {
  try {
    console.log('Starting migrations...')

    // Run migrations in order
    await createExercisesTable.up()
    console.log('Created exercises table')

    await seedExercises.up()
    console.log('Seeded exercises data')

    console.log('All migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run migrations
migrate()
