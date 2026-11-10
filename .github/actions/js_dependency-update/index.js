const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

const validateBranchName = ({ branchName }) => /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);
const validateDirectory = ({ directory }) => /^[a-zA-Z0-9_\-\/]+$/.test(directory);

const setupGitConfig = async () => {
    await exec.exec(`git config --global user.name "github-actions[bot]"`);
    await exec.exec(`git config --global user.email "github-actions[bot]@users.noreply.github.com"`);
};

const setupLogger = ({ debug, prefix } = {debug: false, prefix: ''}) => ({
    debug: (message) => {
        if (debug) {
            core.info(`DEBUG ${prefix}${prefix ? ' : ' : ''}${message}`);
        }
    },
    error: (message) => {
        core.error(`${prefix}${prefix ? ' : ' : ''}${message}`);
    },
    info: (message) => {
        core.info(`${prefix}${prefix ? ' : ' : ''}${message}`);
    }
});

async function run() {
    const baseBranch = core.getInput('base-branch', { required: true });
    const headBranch = core.getInput('head-branch', { required: true });
    const workingDirectory = core.getInput('working-directory', { required: true });
    const ghToken = core.getInput('gh-token', { required: true });
    const debug = core.getBooleanInput('debug');
    const logger = setupLogger({ debug, prefix: '[js-dependency-update]' });

    const commonExecOptions = { cwd: workingDirectory };

    core.setSecret(ghToken);

    logger.debug(`Validate base branch, head branch and working directory`);
    if (!validateBranchName({ branchName: baseBranch })) {
        core.setFailed(`Invalid base branch name: ${baseBranch}`);
    }
    if (!validateBranchName({ branchName: headBranch })) {
        core.setFailed(`Invalid head branch name: ${headBranch}`);
    }
    if (!validateDirectory({ directory: workingDirectory })) {
        core.setFailed(`Invalid working directory: ${workingDirectory}`);
    }

    logger.debug(`Base branch is ${baseBranch}`);
    logger.debug(`Head branch is ${headBranch}`);
    logger.debug(`Working directory is ${workingDirectory}`);

    await exec.exec('npm update', [], commonExecOptions);

    const gitStatus = await exec.getExecOutput('git status - s package*.json', [], commonExecOptions);

    if (gitStatus.stdout.length > 0) {
        logger.debug(`Changes detected in package*.json files`);
        await setupGitConfig();
        await exec.exec(`git checkout -b ${headBranch}`, [], commonExecOptions);
        await exec.exec(`git add package*.json`, [], commonExecOptions);
        await exec.exec(`git commit -m "chore: update dependencies"`, [], commonExecOptions);
        await exec.exec(`git push origin ${headBranch} --force`, [], commonExecOptions);

        const oktoken = github.getOctokit(ghToken);

        try {
            await oktoken.rest.pulls.create({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                head: headBranch,
                base: baseBranch,
                title: `chore: update NPM dependencies`,
                body: `Automated dependency update by js-dependency-update action`
            });
        } catch (error) {
            logger.error(`Failed to create pull request`);
            core.setFailed(error.message);
            logger.error(error);
        }
        
    } else {
        logger.info(`No changes detected in package*.json files`);
    }

}

run()