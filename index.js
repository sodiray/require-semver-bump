const { Octokit } = require("@octokit/rest")
const github = require('@actions/github')
const core = require('@actions/core')
const request = require('request')
const semver = require('semver')

// This should be a token with access to your repository scoped in as a secret.
// The YML workflow will need to set myToken with the GitHub Secret Token
// myToken: ${{ secrets.GITHUB_TOKEN }}
// https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
const token = core.getInput('github-token', { required: true })
const regex = core.getInput('version-regex-pattern') || `VERSION = [\\'\\"](.+?)[\\'\\"]`
const file_path = core.getInput('version-file-path') || 'version.py'

async function run() {

  // Type: https://developer.github.com/v3/activity/events/types/#pushevent
  const event = github.context.payload

  const repo = event.repository.name
  const owner = event.repository.owner.login
  const push_commmit_sha = event.after

  const octokit = new Octokit({ auth: token })

  const { data: pulls } = await octokit.pulls.list({ owner, repo })

  const pull = pulls.find(p => p.head.sha == push_commmit_sha)

  if (!pull) {
    // There will obviously be many pushes that are not to branches with
    // active PRs. So, this could mean nothing. It could however mean that
    // something is wrong because there really is a PR for this push but
    // we couldn't find it.
    core.warning('Could not find pull request for this push...')
    return
  }

  const base_commit_sha = pull.base.sha

  const head_version = await get_version_at_commit(owner, repo, push_commmit_sha, token)
  const base_version = await get_version_at_commit(owner, repo, base_commit_sha, token)

  core.debug(`Head Version: ${head_version}`)
  core.debug(`Base Version: ${base_version}`)

  const head_is_higher = semver.gt(head_version, base_version)

  if (!head_is_higher) {
    core.setFailed(`The head version (${head_version}) is not greater than the base version (${base_version})`)
    return
  }

  core.debug(`Success, the head version (${head_version}) has been validated to be higher than the base version (${base_version}).`)

}

function http_get(url, token) {
  return new Promise((resolve, reject) => {
    request({ 
      url, 
      headers: {
        'Authorization': `token ${token}`
      }
    }, (error, response, body) => {
      if (error) return reject(error)
      if (!response) return reject('No response recieved')
      if (response.statusCode > 299) return reject(`Bad response (${response.statusCode}) from ${url}`)
      resolve({ response, body })
    })
  })
}

function parse_version(str) {
  core.debug(`RegExp: ${regex}`)
  core.debug(`Version Input: ${str}`)
  const matches = str.match(new RegExp(regex))
  return matches && matches.length > 1 ? matches[1] : null
}

async function get_version_at_commit(owner, repo, hash, token) {
  const version_url = `https://raw.githubusercontent.com/${owner}/${repo}/${hash}/${file_path}`
  core.debug(`Pulling version from ${version_url}`)
  try {
    const { response, body } = await http_get(version_url, token)
    return parse_version(body)
  } catch(err) {
    core.error(err.toString())
    core.setFailed(err.toString())
    throw `Failed to get and parse version from ${version_url}`
  }

}

run().catch(err => {
  console.error(err)
  console.trace()
  process.exit(1)
})
