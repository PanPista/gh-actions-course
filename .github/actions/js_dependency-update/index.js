const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectory = ({ directory }) => /^[a-zA-Z0-9_\-\/]+$/.test(directory);

async function run() {
    const baseBranch = core.getInput('base-branch', { required: true });
    const targetBranch = core.getInput('target-branch', { required: true });
    const workingDirectory = core.getInput('working-directory', { required: true });
    const ghToken = core.getInput('gh-token', { required: true });
    const debug = core.getBooleanInput('debug');

    const commonExecOptions = { cwd: workingDirectory };

    core.setSecret(ghToken);

    if (!validateBranchName({ branchName: baseBranch })) {
        core.error(`Invalid base branch name: ${baseBranch}`);
    }
    if (!validateBranchName({ branchName: targetBranch })) {
        core.error(`Invalid target branch name: ${targetBranch}`);
    }
    if (!validateDirectory({ directory: workingDirectory })) {
        core.error(`Invalid working directory: ${workingDirectory}`);
    }

    core.info(`[js-dependency-update] : base branch is ${baseBranch}`);
    core.info(`[js-dependency-update] : target branch is ${targetBranch}`);
    core.info(`[js-dependency-update] : working directory is ${workingDirectory}`);

    await exec.exec('npm update', [], commonExecOptions);

    const gitStatus = await exec.getExecOutput('git status - s package*.json', [], commonExecOptions);

    if (gitStatus.stdout.length > 0) {
        core.info(`[js-dependency-update] : Changes detected in package*.json files`);
        await exec.exec(`git config --global user.name "github-actions[bot]"`);
        await exec.exec(`git config --global user.email "github-actions[bot]@users.noreply.github.com"`);
        await exec.exec(`git checkout -b ${targetBranch}`, [], commonExecOptions);
        await exec.exec(`git add package*.json`, [], commonExecOptions);
        await exec.exec(`git commit -m "chore: update dependencies"`, [], commonExecOptions);
        await exec.exec(`git push origin ${targetBranch} --force`, [], commonExecOptions);

        const oktoken = github.getOctokit(ghToken);

        try {
            await oktoken.rest.pulls.create({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                head: targetBranch,
                base: baseBranch,
                title: `chore: update NPM dependencies`,
                body: `Automated dependency update by js-dependency-update action`
            });
        } catch (error) {
            core.warning(`[js-dependency-update] : Failed to create pull request`);
            core.warning(error.message);
        }
        
    } else {
        core.info(`[js-dependency-update] : No changes detected in package*.json files`);
    }




}

run()