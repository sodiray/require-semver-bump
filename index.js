const { Octokit } = require("@octokit/rest")
const github = require('@actions/github')
const core = require('@actions/core')
const request = require('request')
const semver = require('semver')

async function run() {

  // Type: https://developer.github.com/v3/activity/events/types/#pushevent
  const event = github.context.payload

  const repo = event.repository.name
  const owner = event.repository.owner.login
  const push_commmit_sha = event.after

  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // myToken: ${{ secrets.GITHUB_TOKEN }}
  // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
  const token = core.getInput('github-token')

  const octokit = new Octokit()

  const { data: pulls } = await octokit.pulls.list({ owner, repo })

  const pull = pulls.find(p => p.head.sha == push_commmit_sha)

  if (!pull) {
    // There will obviously be many pushes that are not to branches with
    // active PRs. So, this could mean nothing. It could however mean that
    // something is wrong because there really is a PR for this push but
    // we couldn't find it.
    console.warn('Could not find pull request for this push...')
    process.exit(0)
  }

  const base_commit_sha = pull.base.sha

  const head_version = await get_version_at_commit(owner, repo, push_commmit_sha)
  const base_version = await get_version_at_commit(owner, repo, base_commit_sha)

  console.log(`Head Version: ${head_version}`)
  console.log(`Base Version: ${base_version}`)

  const head_is_higher = semver.gt(head_version, base_version)

  if (!head_is_higher) {
    console.error(`The head version (${head_version}) is not greater than the base version (${base_version})`)
    process.exit(1)
  }

  console.log(`Success, the head version (${head_version}) has been validated to be higher than the base version (${base_version}).`)
  process.exit(0)

}

function http_get(url) {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) return reject(error)
      if (!response) return reject('No response recieved')
      if (response.statusCode > 299) return reject(`Bad response (${response.statusCode}) from ${url}`)
      resolve({ response, body })
    })
  })
}

function parse_version(str) {
  const regex = /VERSION\s?\=\s?\'(.+?)\'/
  const matches = str.regex.match(regex)
  return matches.length > 1 ? matches[1] : null
}

async function get_version_at_commit(owner, repo, hash) {
  const version_url = `https://raw.githubusercontent.com/${owner}/${repo}/${hash}/oapispec/version.py`
  try {
    const { response, body } = await http_get(version_url)
    console.log('\n\n####\n####  RESPONSE\n####\n####')
    console.log(response)
    console.log('\n\n####\n####  BODY\n####\n####')
    console.log(body)
    return parse_version(body)
  } catch(err) {
    console.log(err)
    process.exit(1)
  }

}

run()
