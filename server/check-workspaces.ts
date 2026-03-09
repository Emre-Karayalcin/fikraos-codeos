import "dotenv/config";
import { db } from './db';
import { organizations } from '@shared/schema';

async function checkWorkspaces() {
  try {
    console.log('🔍 Checking all workspaces in Railway database...\n');

    const allOrgs = await db.select().from(organizations).limit(10);

    if (allOrgs.length === 0) {
      console.log('❌ No workspaces found in database');
    } else {
      console.log(`Found ${allOrgs.length} workspace(s):\n`);
      allOrgs.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name}`);
        console.log(`   Slug: ${org.slug}`);
        console.log(`   ID: ${org.id}`);
        console.log(`   Created: ${org.createdAt}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkWorkspaces();
