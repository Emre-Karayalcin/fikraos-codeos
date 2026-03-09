import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import * as readline from 'readline';

/**
 * SECURITY: Secure password reset utility
 *
 * Usage: npx tsx scripts/reset-password.ts
 *
 * This script prompts for email and password instead of hardcoding credentials.
 * Never commit credentials to version control!
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function resetPassword() {
  try {
    console.log('\n🔐 FikraOS Password Reset Utility\n');
    console.log('⚠️  This utility directly modifies the database.');
    console.log('⚠️  Use only for emergency password resets.\n');

    // Prompt for email
    const email = await question('Enter user email: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    // Prompt for new password
    const newPassword = await question('Enter new password (min 8 chars): ');

    // SECURITY: Validate password strength
    if (newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    if (!/[a-z]/.test(newPassword)) {
      console.error('❌ Password must contain at least one lowercase letter');
      process.exit(1);
    }
    if (!/[A-Z]/.test(newPassword)) {
      console.error('❌ Password must contain at least one uppercase letter');
      process.exit(1);
    }
    if (!/[0-9]/.test(newPassword)) {
      console.error('❌ Password must contain at least one number');
      process.exit(1);
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      console.error('❌ Password must contain at least one special character');
      process.exit(1);
    }

    // Confirm action
    const confirm = await question(`\n⚠️  Reset password for ${email}? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }

    console.log('\n🔄 Hashing password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log('💾 Updating database...');
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email))
      .returning();

    if (updatedUser) {
      console.log('\n✅ Password reset successfully!');
      console.log(`\nUser: ${email}`);
      console.log('Password: [SET - not displayed for security]');
      console.log('\n⚠️  Make sure to use a strong, unique password.');
    } else {
      console.log(`\n❌ User not found with email: ${email}`);
      console.log('\nAvailable users in database:');
      const allUsers = await db.select({ email: users.email }).from(users);
      allUsers.forEach(u => console.log(`  - ${u.email}`));
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error resetting password:', error);
    rl.close();
    process.exit(1);
  }
}

resetPassword();
