# Backstage Scaffolder GitHub Actions extension

The github-actions-dispatch-await module
for [@backstage/plugin-scaffolder-backend](https://www.npmjs.com/package/@backstage/plugin-scaffolder-backend).

_This plugin was created through the Backstage CLI_

This plugins add the following actions to the scaffolder-backend:

- `github:actions:dispatch:await` - This action will wait for dispatched GitHub actions to complete before continuing.

### Installation

```bash
npm i @mft-energyoss/github-actions
```

Install package

```bash
yarn --cwd packages/backend add @mft-energyoss/github-actions
```

Then add the plugin to your backend, typically in packages/backend/src/index.ts:

```ts
const backend = createBackend();
// ...
backend.add(import('@mft-energyoss/github-actions'));
```

### Usage

Make sure that your GitHub workflow has this minimal configuration:

```yaml
run-name: Triggered by ${{ inputs.trigger_event }}

on:
  workflow_dispatch:
    inputs:
      trigger_event:
        description: 'A unique trigger event in order to await the workflow after. This could be a GUID or a simple string.'
        required: true
        type: string
        default: "unqiue_id"
```

Then, in your scaffolder template, you can use the action like this:

```yaml
  steps:
    - id: run_and_wait_for_workflow
      name: Run And Wait For Workflow
      action: github:actions:dispatch:await
      input:
        owner: mft-energyoss
        repo: backstage-github-actions
        workflow: example-workflow.yml
        branchName: main
        inputs:
          trigger_event: ${{ user.entity.spec.profile.email ~ ' ' ~ context.task.id }}
```