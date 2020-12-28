const fetch = require('node-fetch')
const log = require('./colorLog')
let conf = require('./auth')

async function sendMail(title, content) {
  // synchronized process to get checked conf
  conf = await conf()
  const { graphApi } = conf.get('credentials')
  const { access_token } = conf.get('token')

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${access_token}`,
  }

  const message = {
    subject: `${title}`,
    importance: 'Low',
    body: {
      contentType: 'HTML',
      content: `${content}`,
    },
    toRecipients: [
      {
        emailAddress: {
          address: conf.get('email'),
        },
      },
    ],
  }

  const res = await fetch(`${graphApi}/v1.0/me/messages`, {
    headers,
    method: 'POST',
    body: JSON.stringify(message),
  })

  headers['content-length'] = 0
  const { id } = await res.json()
  const { status } = await fetch(`${graphApi}/v1.0/me/messages/${id}/send`, {
    headers,
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (status === 202) log.success('邮件发送成功')
}

module.exports = sendMail
