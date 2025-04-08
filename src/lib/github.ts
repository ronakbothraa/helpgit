import { db } from "@/server/db";
import { Octokit } from "octokit";
import axios from "axios";
import { aiSummariseCommit } from "./gemini";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

type Response = {
  commitMessage: String;
  commitHash: String;
  commitAuthorName: String;
  commitAuthorAvatar: String;
  commitDate: String;
};

export const getCommitsHashes = async (
  githubUrl: string,
): Promise<Response[]> => {
  const [owner, repo] = githubUrl.split("/").slice(-2);

  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  const { data } = await octokit.rest.repos.listCommits({
    owner: owner,
    repo: repo,
  });

  const sortedCommits = data.sort(
    (a: any, b: any) =>
      new Date(b.commit.author.date).getTime() -
      new Date(a.commit.author.date).getTime(),
  ) as any[];

  return sortedCommits.slice(0, 10).map((commit: any) => ({
    commitHash: commit.sha as string,
    commitMessage: commit.commit.message ?? "",
    commitAuthorName: commit.commit.author.name ?? "",
    commitAuthorAvatar: commit.author?.avatar_url ?? "",
    commitDate: commit.commit.author.date ?? "",
  }));
};

export const pollCommits = async (ProjectId: string) => {
  const { project, githubUrl } = await fetchProjectGirhubUrl(ProjectId);
  const commitHashes = await getCommitsHashes(githubUrl);

  const unprocessedCommits = await filterUnprocessedCommits(
    ProjectId,
    commitHashes,
  );

  const summaryResponse = await Promise.allSettled(
    unprocessedCommits.map((commit) => {
      return summariseCommits(githubUrl, commit.commitHash as string);
    }),
  );

  console.log("summaryResponse: ", summaryResponse);

  const summaries = summaryResponse.map((response) => {
    if (response.status === "fulfilled" && response.value) {
      return response.value as string;
    }
    return "";
  });

  const commit = await db.commit.createMany({
    data: summaries.map((summary, index) => {
      console.log(
        `processing commits ${index} of ${summary.length} token summary`,
      );
      return {
        projectId: ProjectId,
        commitHash: unprocessedCommits[index]?.commitHash as string,
        commitMessage: unprocessedCommits[index]?.commitMessage as string,
        commitAuthorName: unprocessedCommits[index]?.commitAuthorName as string,
        commitAuthorAvatar: unprocessedCommits[index]
          ?.commitAuthorAvatar as string,
        commitDate: unprocessedCommits[index]?.commitDate as string,
        summary: summary,
      };
    }),
  });

  return commit;
};

async function summariseCommits(githubUrl: string, commitHash: string) {
  const { data } = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
    headers: {
      Accept: "application/vnd.github.v3.diff",
    },
  });

  const summary = await aiSummariseCommit(data);
  return summary;
}

async function fetchProjectGirhubUrl(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      githubUrl: true,
    },
  });
  if (!project) {
    throw new Error("Project not found");
  }
  return { project, githubUrl: project.githubUrl! };
}

async function filterUnprocessedCommits(
  projectId: string,
  commitHashes: Response[],
) {
  const processedCommits = await db.commit.findMany({
    where: { projectId },
  });
  const unprocessedCommits = commitHashes.filter(
    (commit) =>
      !processedCommits.some(
        (processedCommit) => processedCommit.commitHash === commit.commitHash,
      ),
  );
  return unprocessedCommits;
}

console.log(await pollCommits("cm96t0pv00005eh0wtb3cs573"));
