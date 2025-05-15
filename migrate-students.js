// CommonJS format migration script
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql } = require('drizzle-orm');
const ws = require('ws');

// Setup database connection exactly like in server/db.js
// since we can't directly import ES modules
const { NEON_DB_URL } = process.env;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Initialize Neon database client with proper configuration
require('@neondatabase/serverless').neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

async function migrateStudentsTable() {
  try {
    console.log('Starting students table migration...');
    
    // Check if the name column exists
    const checkNameColumn = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'name'
      );
    `);
    
    const nameColumnExists = checkNameColumn?.[0]?.exists === true;
    
    if (nameColumnExists) {
      console.log('Name column exists. Migrating data structure...');
      
      // Add all new columns
      await db.execute(sql`
        ALTER TABLE students 
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS middle_name TEXT,
        ADD COLUMN IF NOT EXISTS suffix_name TEXT,
        ADD COLUMN IF NOT EXISTS full_name TEXT,
        ADD COLUMN IF NOT EXISTS college_name TEXT,
        ADD COLUMN IF NOT EXISTS program_code TEXT,
        ADD COLUMN IF NOT EXISTS major_name TEXT,
        ADD COLUMN IF NOT EXISTS date_admitted TIMESTAMP,
        ADD COLUMN IF NOT EXISTS academic_year TEXT,
        ADD COLUMN IF NOT EXISTS term TEXT,
        ADD COLUMN IF NOT EXISTS campus TEXT,
        ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP,
        ADD COLUMN IF NOT EXISTS age INTEGER,
        ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
        ADD COLUMN IF NOT EXISTS civil_status TEXT,
        ADD COLUMN IF NOT EXISTS mobile_no TEXT,
        ADD COLUMN IF NOT EXISTS residence_address TEXT,
        ADD COLUMN IF NOT EXISTS guardian_last_name TEXT,
        ADD COLUMN IF NOT EXISTS guardian_first_name TEXT,
        ADD COLUMN IF NOT EXISTS guardian_middle_name TEXT,
        ADD COLUMN IF NOT EXISTS guardian_full_name TEXT,
        ADD COLUMN IF NOT EXISTS guardian_occupation TEXT,
        ADD COLUMN IF NOT EXISTS guardian_tel_no TEXT,
        ADD COLUMN IF NOT EXISTS guardian_mobile_no TEXT,
        ADD COLUMN IF NOT EXISTS guardian_email TEXT,
        ADD COLUMN IF NOT EXISTS guardian_address TEXT
      `);
      
      // Transfer data from old to new columns
      await db.execute(sql`
        UPDATE students
        SET full_name = name,
            program_name = course,
            major_name = major,
            student_status = student_type,
            mobile_no = phone
      `);
      
      // Make sure full_name is filled
      await db.execute(sql`
        UPDATE students 
        SET full_name = name
        WHERE full_name IS NULL
      `);
      
      // Extract first and last names from name
      await db.execute(sql`
        UPDATE students
        SET last_name = (
            CASE 
                WHEN position(' ' in name) > 0 
                THEN substring(name from position(' ' in name) + 1)
                ELSE name
            END
        ),
        first_name = (
            CASE 
                WHEN position(' ' in name) > 0 
                THEN substring(name from 1 for position(' ' in name) - 1)
                ELSE name
            END
        )
        WHERE last_name IS NULL OR first_name IS NULL
      `);
      
      console.log('Migration completed successfully!');
    } else {
      console.log('Name column does not exist. The schema is likely already migrated.');
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    process.exit(0);
  }
}

migrateStudentsTable();