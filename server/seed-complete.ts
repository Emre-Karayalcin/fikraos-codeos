import "dotenv/config";
import { db } from './db';
import {
  users,
  organizations,
  organizationMembers,
  ideas,
  comments,
  metricsSets,
  ideaScores,
  auditLogs
} from '@shared/schema';
import { aiScoringProvider } from './providers/aiScoringProvider';
import { hashPassword } from './auth';

async function seedComplete() {
  try {
    console.log('🌱 Starting complete database seed...\n');

    // Step 1: Create admin user
    console.log('👤 Creating admin user...');
    // SECURITY: Use scrypt instead of bcrypt for password hashing
    const hashedPassword = await hashPassword('admin123');

    const [adminUser] = await db.insert(users).values({
      username: 'admin',
      email: 'mo@atoums.com',
      password: hashedPassword,
      firstName: 'Mohammed',
      lastName: 'Atoum',
      role: 'admin'
    }).returning();

    console.log(`  ✓ Admin user created: ${adminUser.username} (${adminUser.email})`);

    // Step 2: Create demo organization
    console.log('\n🏢 Creating demo workspace...');
    const [defaultOrg] = await db.insert(organizations).values({
      name: 'Demo Workspace',
      slug: 'demo',
      description: 'Demo Innovation Hub - Example workspace for testing',
      challengesEnabled: true,
      expertsEnabled: true,
      radarEnabled: true
    }).returning();

    console.log(`  ✓ Organization created: ${defaultOrg.name} (slug: ${defaultOrg.slug})`);

    // Step 3: Add admin as OWNER of organization
    console.log('\n👥 Adding admin to organization...');
    await db.insert(organizationMembers).values({
      userId: adminUser.id,
      orgId: defaultOrg.id,
      role: 'OWNER'
    });
    console.log(`  ✓ Admin added as OWNER`);

    // Step 4: Create sample users
    console.log('\n👥 Creating sample users...');
    const sampleUsers = [
      { username: 'sarah_johnson', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com' },
      { username: 'mike_chen', firstName: 'Mike', lastName: 'Chen', email: 'mike.chen@example.com' },
      { username: 'aisha_patel', firstName: 'Aisha', lastName: 'Patel', email: 'aisha.patel@example.com' },
      { username: 'carlos_rodriguez', firstName: 'Carlos', lastName: 'Rodriguez', email: 'carlos.rodriguez@example.com' },
      { username: 'emma_wilson', firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@example.com' }
    ];

    const createdUsers = [];
    // SECURITY: Use scrypt instead of bcrypt for password hashing
    const defaultPassword = await hashPassword('password123');

    for (const userData of sampleUsers) {
      const [user] = await db.insert(users).values({
        ...userData,
        password: defaultPassword
      }).returning();

      // Add user as MEMBER of organization
      await db.insert(organizationMembers).values({
        userId: user.id,
        orgId: defaultOrg.id,
        role: 'MEMBER'
      });

      createdUsers.push(user);
      console.log(`  ✓ Created user: ${user.username} (MEMBER)`);
    }

    // Step 5: Create sample ideas
    console.log('\n📝 Creating sample ideas...');
    const sampleIdeas = [
      {
        title: 'AI-Powered Code Review Platform',
        summary: 'Automated code review system that uses AI to detect bugs, security vulnerabilities, and suggest improvements in real-time.',
        tags: ['ai', 'devtools', 'saas'],
        status: 'BACKLOG' as const,
        details: { targetMarket: 'Software development teams', estimatedEffort: 'High' }
      },
      {
        title: 'Virtual Event Platform for Hybrid Conferences',
        summary: 'A comprehensive platform for hosting hybrid conferences with features like virtual booths, networking lounges, and interactive sessions.',
        tags: ['events', 'video', 'networking'],
        status: 'UNDER_REVIEW' as const,
        details: { targetMarket: 'Conference organizers', estimatedEffort: 'Very High' }
      },
      {
        title: 'Sustainable Fashion Marketplace',
        summary: 'E-commerce platform connecting ethical fashion brands with conscious consumers, featuring carbon footprint tracking and sustainability ratings.',
        tags: ['ecommerce', 'sustainability', 'fashion'],
        status: 'SHORTLISTED' as const,
        details: { targetMarket: 'Eco-conscious consumers', estimatedEffort: 'Medium' }
      },
      {
        title: 'Smart Home Energy Optimizer',
        summary: 'IoT system that learns household patterns and automatically optimizes energy consumption, reducing costs and environmental impact.',
        tags: ['iot', 'energy', 'automation'],
        status: 'IN_INCUBATION' as const,
        details: { targetMarket: 'Homeowners', estimatedEffort: 'High' }
      },
      {
        title: 'Decentralized Social Media Platform',
        summary: 'Privacy-focused social network built on blockchain technology, giving users full control over their data and content.',
        tags: ['blockchain', 'social', 'privacy'],
        status: 'BACKLOG' as const,
        details: { targetMarket: 'Privacy-conscious users', estimatedEffort: 'Very High' }
      },
      {
        title: 'Mental Health Companion App',
        summary: 'AI-powered mobile app providing personalized mental health support, mood tracking, and connections to licensed therapists.',
        tags: ['health', 'ai', 'mobile'],
        status: 'UNDER_REVIEW' as const,
        details: { targetMarket: 'Young adults 18-35', estimatedEffort: 'Medium' }
      },
      {
        title: 'Micro-Learning Platform for Professionals',
        summary: '5-minute daily lessons platform for professionals to learn new skills during commute or coffee breaks.',
        tags: ['education', 'mobile', 'micro-learning'],
        status: 'BACKLOG' as const,
        details: { targetMarket: 'Busy professionals', estimatedEffort: 'Medium' }
      },
      {
        title: 'Restaurant Waste Reduction System',
        summary: 'Analytics platform helping restaurants reduce food waste through AI-powered demand forecasting and inventory management.',
        tags: ['sustainability', 'ai', 'restaurant'],
        status: 'SHORTLISTED' as const,
        details: { targetMarket: 'Restaurant chains', estimatedEffort: 'High' }
      },
      {
        title: 'Freelancer Financial Management Tool',
        summary: 'All-in-one platform for freelancers to manage invoicing, expenses, taxes, and retirement planning.',
        tags: ['fintech', 'freelance', 'saas'],
        status: 'BACKLOG' as const,
        details: { targetMarket: 'Freelancers and contractors', estimatedEffort: 'Medium' }
      },
      {
        title: 'AR Furniture Visualization App',
        summary: 'Augmented reality mobile app allowing customers to visualize furniture in their home before purchasing.',
        tags: ['ar', 'ecommerce', 'mobile'],
        status: 'UNDER_REVIEW' as const,
        details: { targetMarket: 'Furniture retailers', estimatedEffort: 'High' }
      }
    ];

    const createdIdeas = [];
    for (let i = 0; i < sampleIdeas.length; i++) {
      const ideaData = sampleIdeas[i];
      const owner = createdUsers[i % createdUsers.length];

      const [idea] = await db.insert(ideas).values({
        ...ideaData,
        ownerId: owner.id,
        orgId: defaultOrg.id
      }).returning();

      createdIdeas.push(idea);
      console.log(`  ✓ Created: ${idea.title} by ${owner.username} (${idea.status})`);

      await db.insert(auditLogs).values({
        ideaId: idea.id,
        actorId: owner.id,
        type: 'STATUS_CHANGED',
        data: {
          from: null,
          to: idea.status,
          reason: 'Idea created during seed'
        }
      });
    }

    // Step 6: Add sample comments
    console.log('\n💬 Adding sample comments...');
    const ideasToComment = createdIdeas.slice(0, 4);
    for (let i = 0; i < ideasToComment.length; i++) {
      const idea = ideasToComment[i];
      const commenter = createdUsers[(i + 1) % createdUsers.length];

      const [comment] = await db.insert(comments).values({
        ideaId: idea.id,
        authorId: commenter.id,
        bodyMd: `This is a great idea! I think it has strong potential in the market.\n\nSome initial thoughts:\n- Market validation needed\n- Technical feasibility looks good\n- Should consider competitive landscape`,
      }).returning();

      await db.insert(auditLogs).values({
        ideaId: idea.id,
        actorId: commenter.id,
        type: 'COMMENT_ADDED',
        data: { commentId: comment.id }
      });

      console.log(`  ✓ Added comment by ${commenter.username} to: ${idea.title}`);
    }

    // Step 7: Create metrics set
    console.log('\n📊 Creating evaluation metrics...');
    const [metricsSet] = await db.insert(metricsSets).values({
      orgId: defaultOrg.id,
      name: 'Innovation Scoring Framework',
      createdBy: adminUser.id,
      payload: {
        metrics: [
          {
            metric: 'Market Opportunity',
            weight: 0.25,
            description: 'Size and growth potential of target market'
          },
          {
            metric: 'Technical Feasibility',
            weight: 0.20,
            description: 'Complexity and availability of required technology'
          },
          {
            metric: 'Competitive Advantage',
            weight: 0.20,
            description: 'Uniqueness and defensibility of the solution'
          },
          {
            metric: 'Team Capability',
            weight: 0.15,
            description: 'Skills and experience of the team'
          },
          {
            metric: 'Financial Viability',
            weight: 0.20,
            description: 'Revenue potential and cost structure'
          }
        ]
      }
    }).returning();
    console.log(`  ✓ Created metrics set: ${metricsSet.name}`);

    // Step 8: Score ideas (if Anthropic API key is available)
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('\n🎯 Scoring ideas with AI...');
      const ideasToScore = createdIdeas.slice(0, 5);
      for (const idea of ideasToScore) {
        try {
          console.log(`  ⏳ Scoring: ${idea.title}...`);
          const scoringResult = await aiScoringProvider.score(idea, metricsSet.payload);

          const [score] = await db.insert(ideaScores).values({
            ideaId: idea.id,
            metricsId: metricsSet.id,
            breakdown: scoringResult.breakdown,
            total: scoringResult.total
          }).returning();

          await db.insert(auditLogs).values({
            ideaId: idea.id,
            actorId: adminUser.id,
            type: 'SCORED',
            data: {
              scoreId: score.id,
              total: scoringResult.total,
              metricsId: metricsSet.id
            }
          });

          console.log(`  ✓ Scored ${scoringResult.total}/100`);
        } catch (error) {
          console.log(`  ⚠️  Skipped scoring (API error)`);
        }
      }
    } else {
      console.log('\n⚠️  Skipping AI scoring (ANTHROPIC_API_KEY not set)');
    }

    console.log('\n✅ Database seed completed successfully!\n');
    console.log('='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    console.log(`  👤 Admin User:`);
    console.log(`     Email: ${adminUser.email}`);
    console.log(`     Username: ${adminUser.username}`);
    console.log(`     Password: [REDACTED - default password should be changed immediately]`);
    console.log(`\n  🏢 Organization:`);
    console.log(`     Name: ${defaultOrg.name}`);
    console.log(`     Slug: ${defaultOrg.slug}`);
    console.log(`     URL: /w/${defaultOrg.slug}`);
    console.log(`\n  📊 Data Created:`);
    console.log(`     • ${createdUsers.length + 1} users (1 admin + ${createdUsers.length} members)`);
    console.log(`     • ${createdIdeas.length} ideas`);
    console.log(`     • ${ideasToComment.length} comments`);
    console.log(`     • 1 metrics set`);
    console.log('='.repeat(60));
    console.log('\n🚀 Ready to use!');
    console.log(`   Login: http://localhost:3000/w/${defaultOrg.slug}`);
    console.log(`   Admin Panel: http://localhost:3000/w/${defaultOrg.slug}/admin\n`);

  } catch (error) {
    console.error('\n❌ Error during seed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedComplete();
