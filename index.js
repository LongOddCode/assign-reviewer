const core = require("@actions/core");
const github = require("@actions/github");
const fs = require("fs-extra");
const { exit } = require("process");
const os = require("os");
const path = require("path");
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);

function paramValidation(param) {
  const value = core.getInput(param);
  if (value === "") {
    core.setFailed(`missing ${param}`);
    exit(1);
  }
}

paramValidation("reviewers");
paramValidation("token");
paramValidation("result");
paramValidation("run");

const octokit = github.getOctokit(core.getInput("token"));

/**
 * reviewers are json array.
 */
const reviewersString = core.getInput("reviewers");
let reviewers = [];
try {
  reviewers = JSON.parse(reviewersString);
} catch (err) {
  core.setFailed("invalid reviewers");
  exit(1);
}

/**
 * lan could be empty.
 * Set bash as default on Linux & Mac.
 * Set PowerShell as default on Windows.
 */
const lan = core.getInput("script");
if (lan === "") {
  switch (os.type()) {
    case "Linux":
      lan = "bash";
      break;
    case "Darwin":
      lan = "bash";
      break;
    case "Windows_NT":
      lan = "pwsh";
      break;
    default:
      lan = "bash";
  }
}

/**
 * conscript could be empty. Set reviewers.length as default.
 */
const conscriptString = core.getInput("conscript");
let conscript = reviewers.length;
try {
  conscript = parseInt(conscriptString, 10);
} catch (err) {
  core.setFailed("invalid conscript");
  exit(1);
}

const result = core.getInput("result");
const code = core.getMultilineInput("run").join(os.EOL);

/**
 * this func will help to add feature owners to PR reviewer.
 */
function addReviewers() {
  if (conscript <= 0) {
    conscript = reviewers.length;
  }
  octokit
    .request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.payload.number,
        reviewers: (reviewers = reviewers.slice(0, conscript)),
      }
    )
    .then(() => {
      console.log("Add reviewers successfully");
    })
    .catch((err) => {
      console.error(err);
      exit(1);
    });
}

/**
 * out will flow github action pattern, like '::set-output name=TELEMETRY_RESULT::true'.
 * return result's value if included.
 */
function matchResult(out, result) {
  if (out.includes(`::set-output name=${result}::true`)) {
    return true;
  } else {
    return false;
  }
}

/**
 * this func will execute user mannualed script.
 */
async function run(lan, code, result) {
  let suffix = "";
  switch (lan) {
    case "bash":
      code = `#!/bin/bash${os.EOL}` + code;
      suffix = "sh";
      break;
    case "sh":
      code = `#!/bin/sh${os.EOL}` + code;
      suffix = "sh";
      break;
    case "pwsh":
      suffix = "ps1";
      break;
    default:
      console.error("unsupported script");
      exit(1);
  }

  let dirPath = path.join(os.homedir(), "action");
  try {
    dirPath = await fs.mkdtemp(dirPath);
    const filePath = path.join(dirPath, `assign-reviewer.${suffix}`);

    await fs.writeFile(filePath, code, {
      encoding: "utf8",
      mode: 0o777,
    });

    const { stdout } = await execFile(filePath);
    if (matchResult(stdout, result)) {
      addReviewers();
    }
    console.log(stdout);
  } catch (err) {
    console.error(err);
  } finally {
    fs.rmdirSync(dirPath, { recursive: true });
  }
}

run(lan, code, result).then();
