import { TemplateExample } from '@backstage/plugin-scaffolder-node';
import * as yaml from 'yaml';

export const examples: TemplateExample[] = [
  {
    description: 'GitHub Action Workflow Await only with required input.',
    example: yaml.stringify({
      steps: [
        {
          action: 'github:actions:dispatch:await',
          name: 'Dispatch Github Action Workflow & Await',
          input: {
            repo: 'test-repo',
            owner: 'my-org',
            workflow: 'test.yml',
            branchName: 'main',
            inputs: {
              trigger_event: 'unique_identifier',
            },
          },
        },
      ],
    }),
  },
];
