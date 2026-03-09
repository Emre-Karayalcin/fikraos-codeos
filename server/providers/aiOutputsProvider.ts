import { db } from '../db';
import { aiOutputs } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AiOutput {
  id: string;
  ideaId: string;
  kind: string;
  content: Record<string, any>;
  createdAt: Date | null;
}

export interface AiOutputsProvider {
  list(ideaId: string): Promise<AiOutput[]>;
  create(ideaId: string, kind: string, content: Record<string, any>): Promise<AiOutput>;
}

// Mock implementation
class MockAiOutputsProvider implements AiOutputsProvider {
  async list(ideaId: string): Promise<AiOutput[]> {
    return db.select().from(aiOutputs).where(eq(aiOutputs.ideaId, ideaId));
  }

  async create(ideaId: string, kind: string, content: Record<string, any>): Promise<AiOutput> {
    const [output] = await db.insert(aiOutputs).values({
      ideaId,
      kind,
      content
    }).returning();
    return output;
  }
}

export const aiOutputsProvider: AiOutputsProvider = new MockAiOutputsProvider();
