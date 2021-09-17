const core = require("@actions/core");
const github = require("@actions/github");
const { Octokit } = require("@octokit/core");
const fs = require("fs");
const { exit } = require("process");
const os = require("os");
const path = require("path");
const execFileSync = require("child_process").execFileSync;
const octokit = new Octokit({ auth: process.argv[6] });

function paramValidation(param) {
  const value = core.getInput(param);
  if (value === "") {
    core.setFailed(`missing ${param}`);
    exit(1);
  }
}

paramValidation("reviewers");
paramValidation("result");
paramValidation("run");

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
const code = core.getMultilineInput("run");

/**
 * this func will help to add feature owners to PR reviewer.
 */
function addReviewers(reviewers, conscript) {
  if (conscript <= 0) {
    conscript = reviewers.length;
  }
  octokit
    .request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.pull_number,
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
  if (out.includes(`::set-output name=${result}::`)) {
  }
}

/**
 * this func will execute user mannualed script.
 */
function run(lan, code, result) {
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

  const dirPath = path.join(os.homedir(), "action");
  const filePath = path.join(dirPath, `assign-reviewer.${suffix}`);

  try {
    fs.mkdirSync(dirPath);
    fs.writeFileSync(filePath, code, {
      encoding: "utf8",
      mode: 0o777,
    });

    const stdout = execFileSync(filePath).toString();
    return stdout;
  } catch (err) {
    console.error(err);
  } finally {
    fs.rmdirSync(dirPath, { recursive: true });
  }
}

console.log(run(lan, code, result));