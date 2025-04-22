import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "langchain/document";
import { generateEmbedding, summariseCode } from "./gemini";
import { db } from "@/server/db";

class RateLimitQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private readonly RATE_LIMIT_DELAY = 4000;

  enqueue(operation: () => Promise<void>) {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const operation = this.queue.shift();

    if (operation) {
      try {
        await operation();
      } catch (error) {
        console.error("Error in queue processing:", error);
      }

      // Wait before processing next operation
      await new Promise((resolve) =>
        setTimeout(resolve, this.RATE_LIMIT_DELAY),
      );
      this.processQueue();
    }
  }
}

export const loadGithubRepo = async (
  githubUrl: string,
  githubToken?: string,
) => {
  let docs = null;

  try {
    const loader = new GithubRepoLoader(githubUrl, {
      accessToken: githubToken || process.env.GITHUB_TOKEN,
      branch: "main",
      ignoreFiles: [
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "bun.lockb",
        ``,
      ],
      recursive: true,
      unknown: "warn",
      maxConcurrency: 5,
    });
    docs = await loader.load();
    if (!docs) throw Error;
  } catch (error) {
    console.log(error);
  }
  if (!docs) {
    throw new Error("Failed to load repository from main or master branch.");
  }
  return docs;
};

export const indexGithubRepo = async (
  projectId: string,
  githubUrl: string,
  githubToken?: string,
) => {
  const docs = await loadGithubRepo(githubUrl, githubToken);

  await Promise.allSettled(
    docs.map(async (doc) => {
      try {
        const summary = await summariseCode(doc);
        const embedding = await generateEmbedding(summary);

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
          data: {
            summary: summary,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source,
            projectId: projectId,
          },
        });

        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embeddings?.values}::vector
        WHERE "id" = ${sourceCodeEmbedding.id}
        `;

      } catch (error) {
        console.error(
          `Error processing document ${doc.metadata.source}:`,
          error,
        );
      }
    }),
  );
};
