import "dotenv/config";
import { db } from './db';
import { users } from '@shared/schema';

async function listUsers() {
  try {
    console.log('📋 Listing all users in database...\n');

    const allUsers = await db.select().from(users).limit(50);

    if (allUsers.length === 0) {
      console.log('❌ No users found in database');
    } else {
      console.log(`Found ${allUsers.length} user(s):\n`);
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email})`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
