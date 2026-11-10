const core = require('@actions/core');
const exec = require('@actions/exec');

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectory = ({ directory }) => /^[a-zA-Z0-9_\-\/]+$/.test(directory);
    
async function run() {
    const baseBranch = core.getInput('base-branch');
    const targetBranch = core.getInput('target-branch');
    const workingDirectory = core.getInput('working-directory');
    const ghToken = core.getInput('gh-token');
    const debug = core.getBooleanInput('debug');

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

    await exec.exec('npm update', [], { cwd: workingDirectory });

    const gitStatus = await exec.getExecOutput('git status - s package*.json', [], { cwd: workingDirectory });

    if(gitStatus.stdout.length > 0) {
        core.info(`[js-dependency-update] : Changes detected in package*.json files`);
    } else {
        core.info(`[js-dependency-update] : No changes detected in package*.json files`);
    }
}

run()