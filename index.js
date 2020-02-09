const act = require('@actions/core')
const github = require('@actions/github')
const request = require('request')
const semvar = require('semvar')

if (process.env.GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN")
  process.exit(1)
}

async function run() {

  // Type: https://developer.github.com/v3/activity/events/types/#pushevent
  const event = JSON.stringify(github.context.payload)

  const repo = event.repository.name
  const owner = event.repository.owner.login
  const push_commmit_sha = event.after

  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // myToken: ${{ secrets.GITHUB_TOKEN }}
  // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
  const token = core.getInput('github-token')

  const octokit = new github.GitHub(token)

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

  const head_version_url = `https://github.com/${owner}/${repo}/tree/${push_commmit_sha}/oapispec/version.py`
  const base_version_url = `https://github.com/${owner}/${repo}/tree/${base_commit_sha}/oapispec/version.py`

  const head_version_file = await http_get(head_version_url)
  const base_version_file = await http_get(base_version_url)

  const head_version = parse_version(head_version_file)
  const base_version = parse_version(base_version_file)

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
      if (response.statusCode > 299) return reject(`Bad response. Code ${response.statusCode}`)
      resolve({ response, body })
    })
  })
}

function parse_version(str) {
  const regex = /VERSION\s?\=\s?\'(.+?)\'/
  const matches = str.regex.match(regex)
  return matches.length > 1 ? matches[1] : null
}

run()
