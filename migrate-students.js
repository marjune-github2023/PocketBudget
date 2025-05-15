// ES Module format migration script
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from 'ws';

// Setup database connection exactly like in server/db.js
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Initialize Neon database client with proper configuration
neonConfig.webSocketConstructor = ws;
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
    
    // Always create new columns, just in case they're missing
    console.log('Creating or ensuring new columns exist...');
    
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
      
      // Check if we need to transfer data from old columns
      if (nameColumnExists) {
        console.log('Migrating data from old columns to new columns...');
        
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
      } else {
        console.log('No old columns found to migrate data from.');
      }
      
      console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
    console.log('Migration completed, pool closed.');
  }
}

// Call and handle the migration
migrateStudentsTable()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error in migration script:', err);
    process.exit(1);
  });