const { prompt } = require('inquirer')
const fetch = require('node-fetch')
const Conf = require('conf')

const conf = new Conf()
const log = require('./colorLog')

const headers = {
  'content-type': 'application/x-www-form-urlencoded',
}

const timestamp = () => (Date.now() / 1000) | 0
async function storeToken(res) {
  const { expires_in, access_token, refresh_token } = await res.json()
  const expires_at = timestamp() + expires_in
  const token = { expires_at, access_token, refresh_token }
  conf.set('token', token)
}

/**
 * Prompt and acquire code, store it, return it
 *
 * @return {Object} credentials for further acquiration
 */
async function init() {
  let questions = [
    {
      type: 'list',
      name: 'type',
      message: '请选择 Outlook 账户类型',
      choices: [
        {
          value: 1,
          name: 'global',
        },
        {
          value: 0,
          name: 'operated by 21Vianet in China',
        },
      ],
    },
    {
      type: 'input',
      name: 'client_id',
      message: 'client_id:',
    },
    {
      type: 'input',
      name: 'redirect_uri',
      message: 'redirect_uri:',
    },
  ]

  let res = await prompt(questions)
  let authUrl, graphApi
  if (res.type) {
    authUrl = 'login.microsoftonline.com'
    graphApi = 'https://graph.microsoft.com'
  } else {
    authUrl = 'https://login.partner.microsoftonline.cn'
    graphApi = 'https://microsoftgraph.chinacloudapi.cn'
  }

  const authEndpoint = `${authUrl}/common/oauth2/v2.0/token`

  if (!res.type) accountType = 'CN'
  const { client_id, redirect_uri } = res

  questions = [
    {
      type: 'input',
      name: 'code',
      message: `登录地址:${authUrl}/common/oauth2/v2.0/authorize?${new URLSearchParams(
        {
          client_id,
          scope: 'Mail.Send offline_access Mail.ReadWrite',
          response_type: 'code',
        }
      ).toString()}&redirect_uri=${redirect_uri}\n请输入浏览器返回的地址:`,
    },
  ]

  res = await prompt(questions)
  const code = new URL(res.code).searchParams.get('code')
  const credentials = {
    code,
    client_id,
    redirect_uri,
    authEndpoint,
    graphApi,
  }

  conf.set('credentials', credentials)
  return credentials
}

/**
 * Acquire token with credentials, then store it
 *
 * @param {Object} credentials for further acquiration
 */
async function acquireToken({ code, client_id, redirect_uri, authEndpoint }) {
  try {
    const res = await fetch(authEndpoint, {
      method: 'POST',
      body: `${new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id,
      }).toString()}&redirect_uri=${redirect_uri}`,
      headers,
    })
    await storeToken(res)
  } catch (e) {
    log.object(e)
  }
}

async function updateToken({ refresh_token }) {
  const { client_id, redirect_uri, authEndpoint } = conf.get('credentials')

  try {
    const res = await fetch(authEndpoint, {
      method: 'POST',
      //   body: `client_id=${client_id}&redirect_uri=${redirect_uri}&client_secret=${config.client_secret}
      //         &refresh_token=${refresh_token}&grant_type=refresh_token`,
      body: `${new URLSearchParams({
        grant_type: 'refresh_token',
        client_id,
        refresh_token,
      }).toString()}&redirect_uri=${redirect_uri}`,
      headers,
    })
    await storeToken(res)
  } catch (e) {
    log.object(e)
  }
}

/**
 * If the access_token expires, update it
 *
 * @param {Object} token including refresh_token
 */
async function checkExpired(token) {
  const { expires_at } = token
  if (timestamp() > expires_at) {
    await updateToken()
  }
}

;(async () => {
  if (process.argv[2] === '-e') conf.set('email', process.argv[3])
  const token = conf.get('token')
  if (!token) {
    const credentials = await init()
    await acquireToken(credentials)
  } else {
    await checkExpired(token)
    log.warning('Using stored token')
  }
})()

module.exports = conf
