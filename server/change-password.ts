import "dotenv/config";
import { db } from './db';
import { users } from '@shared/schema';
import { hashPassword } from './auth';
import { eq } from 'drizzle-orm';

async function changePassword() {
  try {
    const email = 'bernardo.s.betley@infinitepl.com';
    const newPassword = 'Bern_25@';

    console.log(`🔐 Changing password for ${email}...`);

    // SECURITY: Hash the new password using scrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email))
      .returning();

    if (result.length === 0) {
      console.log(`❌ User with email ${email} not found`);
    } else {
      console.log(`✅ Password changed successfully for ${email}`);
      console.log(`   Username: ${result[0].username}`);
      console.log(`   New password: [REDACTED - password has been updated]`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

changePassword();
