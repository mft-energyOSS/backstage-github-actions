import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError } from '@backstage/errors';
import axios from 'axios';
import { examples } from './createGithubActionsDispatchAwaitAction.examples';
import { GithubCredentialsProvider } from '@backstage/integration';

interface TriggerWorkflowParams {
  ctx: any;
  owner: string;
  repo: string;
  workflow: string | number;
  branchName: string;
  inputs: { trigger_event?: string } & {
    [k: string]: string;
  };
  token: string;
}

interface AwaitWorkflowCompletionParams {
  ctx: any;
  owner: string;
  repo: string;
  workflow: string | number;
  inputs: { trigger_event?: string } & {
    [k: string]: string;
  };
  token: string;
}

async function triggerWorkflow({
  ctx,
  owner,
  repo,
  workflow,
  branchName,
  inputs,
  token,
}: TriggerWorkflowParams): Promise<void> {
  if (!inputs.trigger_event) {
    throw new Error(
        'Missing input `trigger_event`. Provide this input with unique value so that workflow can be uniquely identified.',
    );
  }

  ctx.logger.info(`Triggering workflow ${workflow} for repo ${owner}/${repo}`);
  return axios
    .post(
      `https://api.github.com/repos/${encodeURIComponent(
        owner,
      )}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(
        workflow,
      )}/dispatches`,
      {
        ref: branchName,
        inputs: inputs,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
    .then(({ status }) => {
      if (`${status}`.startsWith('2'))
        ctx.logger.info(
          `Workflow ${workflow} triggered successfully with status ${status}`,
        );
      else
        ctx.logger.error(
          `Successful response was not 2xx for ${workflow}. Response status was ${status}`,
        );
    });
}

async function awaitWorkflowCompletion({
  ctx,
  owner,
  repo,
  workflow,
  inputs,
  token,
}: AwaitWorkflowCompletionParams): Promise<{
  conclusion: string;
  workflowRunUrl: string;
}> {
  let completed = false;
  let conclusion = '';
  let workflowRunUrl = '';

  while (!completed) {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    const runs = response.data.workflow_runs;
    const latestRun = runs.find((run: any) =>
      run.name.includes(inputs.trigger_event),
    );

    if (latestRun) {
      workflowRunUrl = latestRun.html_url;
      ctx.logger.info(`Checking status for workflow run ${workflowRunUrl}`);
      if (latestRun.status === 'completed') {
        conclusion = latestRun.conclusion;
        if (conclusion !== 'success') {
          ctx.logger.error(
            `Workflow did not succeed. Conclusion: ${conclusion}`,
          );
          throw new Error(
            `Workflow did not succeed. Conclusion: ${conclusion}`,
          );
        }
        ctx.logger.info(
          `Workflow completed successfully. Conclusion: ${conclusion}`,
        );
        completed = true;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  return { conclusion, workflowRunUrl };
}

/**
 * Creates an `acme:example` Scaffolder action.
 *
 * @remarks
 *
 * See {@link https://example.com} for more information.
 *
 * @public
 */
export function createGithubActionsDispatchAwaitAction(options: {
  githubCredentialsProvider: GithubCredentialsProvider;
}) {
  const { githubCredentialsProvider } = options;

  return createTemplateAction({
    id: 'github:actions:dispatch:await',
    description: 'Trigger and await GitHub Action',
    examples,
    supportsDryRun: true,
    schema: {
      input: z => z.object({
        repo: z.string().describe('Name of the repository'),
        owner: z
          .string()
          .describe('Name of the owner. Could be organization or user'),
        workflow: z
          .string()
          .or(z.number())
          .describe('Id or filename of the workflow'),
        branchName: z
          .string()
          .describe('Name of the branch to trigger the workflow on'),
        inputs: z
          .object({
            trigger_event: z
              .string()
              .describe('Trigger event for the workflow'),
          })
          .catchall(z.string())
          .describe('Inputs to the workflow'),
      }),
      output: z => z.object({
        conclusion: z
          .string()
          .describe("Conclusion of the workflow"),
        workflowRunUrl: z
          .string()
          .describe("URL link to workflow run")
      }),
    },
    async handler(ctx) {
      const { owner, repo, workflow, branchName, inputs } = ctx.input;

      const { token } = await githubCredentialsProvider.getCredentials({
        url: `https://github.com/${encodeURIComponent(
          owner,
        )}/${encodeURIComponent(repo)}`,
      });

      if (!token) {
        ctx.logger.error(
          `Failed to retrieve token for: https://github.com/${owner}/${repo}`,
        );
        throw new InputError(
          `No token available for: https://github.com/${owner}/${repo}. Make sure GitHub auth is configured correctly. See https://backstage.io/docs/auth/github/provider for more details.`,
        );
      }

      if (ctx.isDryRun) {
        ctx.logger.info(
          `Requested credentials from https://github.com/repos/${owner}/${repo}`,
        );
        ctx.logger.info(
          `Will tigger the workflow ${workflow} for repo ${owner}/${repo} on branch ${branchName} with inputs ${inputs}`,
        );
        ctx.logger.info(
          `Will await completion of the workflow ${workflow} for repo ${owner}/${repo} with run_name containing ${inputs.trigger_event}`,
        );
        ctx.logger.info(`Dry run complete`);
        ctx.output('conclusion', 'dry-run');
        return;
      }

      await triggerWorkflow({
        ctx,
        owner,
        repo,
        workflow,
        branchName,
        inputs,
        token,
      });
      const { conclusion, workflowRunUrl } = await awaitWorkflowCompletion({
        ctx,
        owner,
        repo,
        workflow,
        inputs,
        token,
      });
      ctx.output('conclusion', conclusion);
      ctx.output('workflowRunUrl', workflowRunUrl);
    },
  });
}
