import { config } from 'dotenv'
import { resolve } from 'path'
import { createAdminClient } from '../src/lib/supabase-admin'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function checkUsers() {
  const supabase = createAdminClient()

  console.log('Checking remaining users...\n')

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')

    if (error) {
      console.error('Error:', error)
      return
    }

    console.log('Users found:', users?.length || 0)
    if (users && users.length > 0) {
      console.log('\nUser details:')
      users.forEach(u => {
        console.log(`- ID: ${u.id}`)
        console.log(`  Email: ${u.email}`)
        console.log(`  Username: ${u.username}`)
        console.log(`  Created: ${u.created_at}`)
        console.log('')
      })
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

checkUsers()
