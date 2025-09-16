import { createGithubActionsDispatchAwaitAction } from './createGithubActionsDispatchAwaitAction';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { ConfigReader } from '@backstage/config';
import {
  DefaultGithubCredentialsProvider,
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

describe('github:actions:dispatch:await', () => {
  const config = new ConfigReader({
    integrations: {
      github: [{ host: 'github.com', token: process.env.GH_TOKEN }],
    },
  });

  const integrations = ScmIntegrations.fromConfig(config);
  let githubCredentialsProvider: GithubCredentialsProvider;
  let action: ReturnType<typeof createGithubActionsDispatchAwaitAction>;

  jest.setTimeout(60000);

  beforeEach(() => {
    jest.resetAllMocks();
    githubCredentialsProvider =
      DefaultGithubCredentialsProvider.fromIntegrations(integrations);
    action = createGithubActionsDispatchAwaitAction({
      githubCredentialsProvider,
    });
  });

  it('should fail with invalid input', async () => {
    const mockContext = createMockActionContext({
      input: {
        owner: '',
        repo: '',
        workflow: -1,
        inputs: { trigger_event: 'test' },
        branchName: 'none',
      },
    });

    await expect(action.handler(mockContext)).rejects.toThrow();
  });
});
